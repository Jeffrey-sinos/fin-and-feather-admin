import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PesapalAuthResponse {
  token: string;
  expiryDate: string;
  error?: any;
  message?: string;
}

interface PesapalStatusResponse {
  payment_method: string;
  amount: number;
  created_date: string;
  confirmation_code: string;
  payment_status_description: string;
  description: string;
  message: string;
  payment_account: string;
  call_back_url: string;
  status_code: number;
  merchant_reference: string;
  payment_status_code: string;
  currency: string;
  error?: any;
}

async function getPesapalToken(): Promise<string> {
  const consumerKey = Deno.env.get('PESAPAL_CONSUMER_KEY');
  const consumerSecret = Deno.env.get('PESAPAL_CONSUMER_SECRET');
  
  if (!consumerKey || !consumerSecret) {
    throw new Error('Pesapal credentials not configured');
  }

  const response = await fetch('https://pay.pesapal.com/v3/api/Auth/RequestToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      consumer_key: consumerKey,
      consumer_secret: consumerSecret,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Pesapal auth failed:', response.status, errorText);
    throw new Error(`Failed to authenticate with Pesapal: ${response.status}`);
  }

  const data: PesapalAuthResponse = await response.json();
  
  if (data.error || !data.token) {
    console.error('Pesapal auth error:', data);
    throw new Error(data.message || 'Failed to get Pesapal token');
  }

  return data.token;
}

async function queryPesapalStatus(orderTrackingId: string, token: string): Promise<PesapalStatusResponse> {
  const response = await fetch(
    `https://pay.pesapal.com/v3/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
    {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Pesapal status query failed:', response.status, errorText);
    throw new Error(`Failed to query Pesapal status: ${response.status}`);
  }

  const data: PesapalStatusResponse = await response.json();
  
  // Only treat as error if error object has meaningful content
  if (data.error && (data.error.message || data.error.code || data.error.error_type)) {
    console.error('Pesapal status error:', data);
    throw new Error(data.message || data.error.message || 'Failed to get transaction status');
  }

  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // Safely parse body and allow fallback to query params
    let body: any = {};
    try {
      body = await req.json().catch(() => ({}));
    } catch (_) {
      body = {};
    }

    let orderTrackingId = body?.orderTrackingId ?? null;
    let orderId = body?.orderId ?? null;

    // Fallback to URL query params if not provided in body
    if (!orderTrackingId || !orderId) {
      const url = new URL(req.url);
      orderTrackingId = orderTrackingId || url.searchParams.get('orderTrackingId') || url.searchParams.get('OrderTrackingId');
      const merchantRef = url.searchParams.get('OrderMerchantReference') || url.searchParams.get('merchantReference');
      // Pesapal merchant reference is often in the format ORDER-<orderId>
      orderId = orderId || url.searchParams.get('orderId') || (merchantRef?.startsWith('ORDER-') ? merchantRef.substring(6) : null);
    }

    if (!orderTrackingId && !orderId) {
      return new Response(
        JSON.stringify({ success: false, error: 'orderTrackingId or orderId required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Checking Pesapal status for:', { orderTrackingId, orderId });

    // If orderId provided, get the tracking ID from the transaction
    let trackingId = orderTrackingId;
    let transactionId = null;

    if (orderId && !trackingId) {
      const { data: transaction, error: txError } = await supabaseService
        .from('pesapal_transactions')
        .select('pesapal_tracking_id, id')
        .eq('order_id', orderId)
        .maybeSingle();

      if (txError || !transaction) {
        console.error('Transaction not found for orderId:', orderId, txError);
        return new Response(
          JSON.stringify({ success: false, error: 'Transaction not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      trackingId = transaction.pesapal_tracking_id;
      transactionId = transaction.id;
    } else {
      // Get transaction ID from tracking ID
      const { data: transaction } = await supabaseService
        .from('pesapal_transactions')
        .select('id, order_id')
        .eq('pesapal_tracking_id', trackingId)
        .maybeSingle();

      if (transaction) {
        transactionId = transaction.id;
        orderId = transaction.order_id;
      }
    }

    if (!trackingId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Tracking ID not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Pesapal token
    console.log('Authenticating with Pesapal...');
    const token = await getPesapalToken();

    // Query transaction status
    console.log('Querying transaction status from Pesapal...');
    const statusData = await queryPesapalStatus(trackingId, token);

    console.log('Pesapal status response:', JSON.stringify(statusData, null, 2));

    // Map Pesapal status codes to our status using status_code (number)
    // 0 = Invalid, 1 = Completed, 2 = Failed, 3 = Reversed
    let newStatus: string;
    let paymentStatus: string;
    
    switch (statusData.status_code) {
      case 1:
        newStatus = 'COMPLETED';
        paymentStatus = 'completed';
        break;
      case 2:
        newStatus = 'FAILED';
        paymentStatus = 'failed';
        break;
      case 3:
        // Reversed - map to FAILED for enum safety, refunded for orders
        newStatus = 'FAILED';
        paymentStatus = 'refunded';
        break;
      case 0:
      default:
        newStatus = 'PENDING';
        paymentStatus = 'pending';
        break;
    }

    // Check if payment description contains "cancel" - override status
    const descriptionLower = (statusData.payment_status_description || '').toLowerCase();
    if (descriptionLower.includes('cancel')) {
      newStatus = 'FAILED'; // enum-safe
      paymentStatus = 'cancelled';
    }

    console.log('Mapped status:', { 
      statusCode: statusData.status_code, 
      description: statusData.payment_status_description,
      newStatus, 
      paymentStatus 
    });

    // Update transaction status if we have one
    if (transactionId) {
      const { error: updateError } = await supabaseService
        .from('pesapal_transactions')
        .update({ status: newStatus, pesapal_status: newStatus })
        .eq('id', transactionId);

      if (updateError) {
        console.error('Error updating transaction:', updateError);
      }
    }

    // If payment is completed, call complete-order function
    if (newStatus === 'COMPLETED' && orderId) {
      console.log('Payment completed, calling complete-order function...');
      
      const { data: order } = await supabaseService
        .from('orders')
        .select('payment_status')
        .eq('id', orderId)
        .single();

      if (order && order.payment_status !== 'completed') {
        const { data: completeData, error: completeError } = await supabaseService.functions.invoke('complete-order', {
          body: { orderId }
        });

        if (completeError || !completeData?.success) {
          console.error('Error completing order:', completeError || completeData);
        } else {
          console.log('Order completed successfully');
        }
      } else {
        console.log('Order already completed');
      }
    } else if ((newStatus === 'FAILED' || newStatus === 'REVERSED') && orderId) {
      // Update order to failed/refunded
      const { error: orderError } = await supabaseService
        .from('orders')
        .update({ 
          payment_status: paymentStatus,
          delivery_status: 'cancelled'
        })
        .eq('id', orderId);

      if (orderError) {
        console.error('Error updating order:', orderError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: newStatus,
        paymentStatus,
        pesapalData: statusData,
        orderId
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error checking Pesapal status:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
