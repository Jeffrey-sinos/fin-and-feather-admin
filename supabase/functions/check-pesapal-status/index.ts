import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PesapalStatusRequest {
  trackingId: string;
}

interface PesapalAuthResponse {
  token: string;
  expiryDate: string;
  error: string | null;
  status: string;
  message: string;
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
  error: {
    error_type: string | null;
    code: string | null;
    message: string | null;
    call_back_url: string | null;
  };
  status: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const pesapalConsumerKey = Deno.env.get('PESAPAL_CONSUMER_KEY')!;
    const pesapalConsumerSecret = Deno.env.get('PESAPAL_CONSUMER_SECRET')!;
    
    // Use production URL - change to sandbox if needed
    const pesapalBaseUrl = 'https://pay.pesapal.com/v3';
    
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    console.log('check-pesapal-status function called');

    const { trackingId }: PesapalStatusRequest = await req.json();
    
    if (!trackingId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Tracking ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Checking Pesapal status for tracking ID:', trackingId);

    // Step 1: Get Pesapal OAuth token
    console.log('Requesting Pesapal OAuth token...');
    const authResponse = await fetch(`${pesapalBaseUrl}/api/Auth/RequestToken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        consumer_key: pesapalConsumerKey,
        consumer_secret: pesapalConsumerSecret,
      }),
    });

    if (!authResponse.ok) {
      const authError = await authResponse.text();
      console.error('Pesapal auth failed:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to authenticate with Pesapal' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authData: PesapalAuthResponse = await authResponse.json();
    const token = authData.token;
    console.log('Successfully obtained Pesapal token');

    // Step 2: Query transaction status
    console.log('Querying transaction status from Pesapal...');
    const statusResponse = await fetch(
      `${pesapalBaseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${trackingId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
    );

    if (!statusResponse.ok) {
      const statusError = await statusResponse.text();
      console.error('Failed to get transaction status:', statusError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to get transaction status from Pesapal' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const statusData: PesapalStatusResponse = await statusResponse.json();
    console.log('Pesapal status response:', JSON.stringify(statusData, null, 2));

    const paymentStatus = statusData.payment_status_description;
    const statusCode = statusData.status_code;

    // Map Pesapal status to our status
    let mappedStatus: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' = 'PENDING';
    
    if (statusCode === 1 || paymentStatus === 'Completed') {
      mappedStatus = 'COMPLETED';
    } else if (statusCode === 2 || paymentStatus === 'Failed') {
      mappedStatus = 'FAILED';
    } else if (statusCode === 3 || paymentStatus === 'Cancelled') {
      mappedStatus = 'CANCELLED';
    }

    console.log('Mapped status:', mappedStatus, 'from Pesapal status:', paymentStatus);

    // Step 3: Find and update the transaction
    const { data: transaction, error: transactionError } = await supabaseService
      .from('pesapal_transactions')
      .select('*')
      .eq('pesapal_tracking_id', trackingId)
      .maybeSingle();

    if (transactionError || !transaction) {
      console.error('Transaction not found:', transactionError);
      return new Response(
        JSON.stringify({ success: false, error: 'Transaction not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found transaction:', transaction.id, 'for order:', transaction.order_id);

    // Update transaction status
    const { error: updateError } = await supabaseService
      .from('pesapal_transactions')
      .update({ status: mappedStatus })
      .eq('id', transaction.id);

    if (updateError) {
      console.error('Error updating transaction:', updateError);
    } else {
      console.log('Updated transaction status to:', mappedStatus);
    }

    // Step 4: Handle order status based on payment result
    if (mappedStatus === 'COMPLETED') {
      console.log('Payment completed, invoking complete-order function...');
      
      const { data: completeOrderData, error: completeOrderError } = await supabaseService.functions.invoke(
        'complete-order',
        { body: { orderId: transaction.order_id } }
      );

      if (completeOrderError) {
        console.error('Error calling complete-order:', completeOrderError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to complete order: ' + completeOrderError.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!completeOrderData?.success) {
        console.error('complete-order returned error:', completeOrderData);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to complete order: ' + (completeOrderData?.error || 'Unknown error')
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Successfully completed order:', transaction.order_id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          status: mappedStatus,
          orderId: transaction.order_id,
          message: 'Payment completed and order processed'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (mappedStatus === 'FAILED' || mappedStatus === 'CANCELLED') {
      console.log('Payment failed/cancelled, updating order status...');
      
      await supabaseService
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', transaction.order_id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          status: mappedStatus,
          orderId: transaction.order_id,
          message: 'Payment failed/cancelled, order marked as cancelled'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      console.log('Payment still pending');
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          status: mappedStatus,
          orderId: transaction.order_id,
          message: 'Payment still pending'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Unexpected error in check-pesapal-status:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
