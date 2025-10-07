import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PesapalCallback {
  OrderTrackingId: string;
  OrderMerchantReference: string;
  OrderNotificationType: string;
  OrderCreatedDate: string;
}

interface CompleteOrderRequest {
  orderId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create service role client for bypassing RLS
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Pesapal callback function called');
    console.log('Request method:', req.method);
    console.log('Content-Type:', req.headers.get('content-type'));

    // Parse request data - handle multiple formats (JSON, form-urlencoded, query params)
    let callbackData: PesapalCallback;
    
    try {
      const url = new URL(req.url);
      const contentType = req.headers.get('content-type') || '';
      
      if (req.method === 'GET') {
        // Handle GET request with query parameters
        console.log('Processing GET request with query params');
        callbackData = {
          OrderTrackingId: url.searchParams.get('OrderTrackingId') || '',
          OrderMerchantReference: url.searchParams.get('OrderMerchantReference') || '',
          OrderNotificationType: url.searchParams.get('OrderNotificationType') || '',
          OrderCreatedDate: url.searchParams.get('OrderCreatedDate') || ''
        };
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        // Handle form-urlencoded POST
        console.log('Processing form-urlencoded data');
        const formData = await req.formData();
        callbackData = {
          OrderTrackingId: formData.get('OrderTrackingId')?.toString() || '',
          OrderMerchantReference: formData.get('OrderMerchantReference')?.toString() || '',
          OrderNotificationType: formData.get('OrderNotificationType')?.toString() || '',
          OrderCreatedDate: formData.get('OrderCreatedDate')?.toString() || ''
        };
      } else {
        // Try JSON parsing as fallback
        console.log('Attempting JSON parsing');
        const text = await req.text();
        if (text.trim()) {
          callbackData = JSON.parse(text);
        } else {
          // Empty body, try query params
          callbackData = {
            OrderTrackingId: url.searchParams.get('OrderTrackingId') || '',
            OrderMerchantReference: url.searchParams.get('OrderMerchantReference') || '',
            OrderNotificationType: url.searchParams.get('OrderNotificationType') || '',
            OrderCreatedDate: url.searchParams.get('OrderCreatedDate') || ''
          };
        }
      }
    } catch (parseError) {
      console.error('Error parsing request data:', parseError);
      const url = new URL(req.url);
      // Fallback to query parameters
      callbackData = {
        OrderTrackingId: url.searchParams.get('OrderTrackingId') || '',
        OrderMerchantReference: url.searchParams.get('OrderMerchantReference') || '',
        OrderNotificationType: url.searchParams.get('OrderNotificationType') || '',
        OrderCreatedDate: url.searchParams.get('OrderCreatedDate') || ''
      };
    }

    console.log('Parsed Pesapal callback data:', JSON.stringify(callbackData, null, 2));

    const { OrderTrackingId, OrderMerchantReference, OrderNotificationType } = callbackData;

    if (!OrderTrackingId || !OrderMerchantReference) {
      console.error('Missing required callback data');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required callback data' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Log the callback to our database for auditing
    const { error: logError } = await supabaseService
      .from('pesapal_callbacks')
      .insert({
        pesapal_tracking_id: OrderTrackingId,
        callback_type: OrderNotificationType || 'unknown',
        raw_payload: callbackData,
        processed: false
      });

    if (logError) {
      console.error('Error logging callback:', logError);
    }

    // Find the transaction by tracking ID or merchant reference
    let transaction = null;
    let transactionError = null;

    // First try by tracking ID
    if (OrderTrackingId) {
      const result = await supabaseService
        .from('pesapal_transactions')
        .select('*')
        .eq('pesapal_tracking_id', OrderTrackingId)
        .maybeSingle();
      
      transaction = result.data;
      transactionError = result.error;
    }

    // If not found and we have merchant reference, try that
    if (!transaction && OrderMerchantReference) {
      console.log('Transaction not found by tracking ID, trying merchant reference:', OrderMerchantReference);
      const result = await supabaseService
        .from('pesapal_transactions')
        .select('*')
        .eq('merchant_reference', OrderMerchantReference)
        .maybeSingle();
      
      transaction = result.data;
      transactionError = result.error;
    }

    if (transactionError || !transaction) {
      console.error('Transaction not found for tracking ID:', OrderTrackingId, transactionError);
      return new Response(
        JSON.stringify({ success: false, error: 'Transaction not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Found transaction:', transaction.id, 'for order:', transaction.order_id);

    // Check if this is a successful payment notification
    if (OrderNotificationType === 'COMPLETED' || OrderNotificationType === 'SUCCESS') {
      console.log('Processing successful payment for order:', transaction.order_id);

      // Update transaction status to COMPLETED
      const { error: updateTransactionError } = await supabaseService
        .from('pesapal_transactions')
        .update({ status: 'COMPLETED' })
        .eq('id', transaction.id);

      if (updateTransactionError) {
        console.error('Error updating transaction status:', updateTransactionError);
      }

      // Get the order to check if payment is already completed
      const { data: order, error: orderError } = await supabaseService
        .from('orders')
        .select('payment_status')
        .eq('id', transaction.order_id)
        .single();

      if (orderError || !order) {
        console.error('Order not found:', transaction.order_id, orderError);
        return new Response(
          JSON.stringify({ success: false, error: 'Order not found' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Only complete payment if not already completed (idempotent)
      if (order.payment_status !== 'completed') {
        console.log('Completing payment and reducing stock for order:', transaction.order_id);

        // Call the complete-order function to handle stock reduction and order completion
        const { data: completeOrderData, error: completeOrderError } = await supabaseService.functions.invoke('complete-order', {
          body: { orderId: transaction.order_id }
        });

        if (completeOrderError) {
          console.error('Error calling complete-order function:', completeOrderError);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Failed to complete order: ' + completeOrderError.message 
            }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        if (!completeOrderData?.success) {
          console.error('complete-order function returned error:', completeOrderData);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Failed to complete order: ' + (completeOrderData?.error || 'Unknown error')
            }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        console.log('Successfully completed payment for order:', transaction.order_id, 'with stock updates');
      } else {
        console.log('Payment for order', transaction.order_id, 'is already completed, skipping stock reduction');
      }

      // Mark callback as processed
      await supabaseService
        .from('pesapal_callbacks')
        .update({ processed: true })
        .eq('pesapal_tracking_id', OrderTrackingId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Payment processed successfully',
          orderId: transaction.order_id
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );

    } else if (OrderNotificationType === 'FAILED' || OrderNotificationType === 'CANCELLED') {
      console.log('Processing failed/cancelled payment for order:', transaction.order_id);

      // Update transaction status
      const newStatus = OrderNotificationType === 'FAILED' ? 'FAILED' : 'CANCELLED';
      await supabaseService
        .from('pesapal_transactions')
        .update({ status: newStatus })
        .eq('id', transaction.id);

      // Update order payment_status to failed/cancelled and delivery_status to cancelled
      await supabaseService
        .from('orders')
        .update({ 
          payment_status: newStatus.toLowerCase(),
          delivery_status: 'cancelled'
        })
        .eq('id', transaction.order_id);

      // Mark callback as processed
      await supabaseService
        .from('pesapal_callbacks')
        .update({ processed: true })
        .eq('pesapal_tracking_id', OrderTrackingId);

      console.log('Marked order as cancelled:', transaction.order_id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Payment failure processed',
          orderId: transaction.order_id
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );

    } else if (OrderNotificationType === 'IPNCHANGE' || !OrderNotificationType) {
      console.log('Received IPNCHANGE or empty notification type, querying Pesapal status...');
      
      // Call check-pesapal-status function to get actual status
      const { data: statusData, error: statusError } = await supabaseService.functions.invoke('check-pesapal-status', {
        body: { orderTrackingId: OrderTrackingId }
      });

      if (statusError) {
        console.error('Error querying Pesapal status:', statusError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to query payment status: ' + statusError.message 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Mark callback as processed
      await supabaseService
        .from('pesapal_callbacks')
        .update({ processed: true })
        .eq('pesapal_tracking_id', OrderTrackingId);

      console.log('Status query result:', statusData);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Status queried successfully',
          status: statusData?.status,
          orderId: transaction.order_id
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );

    } else {
      console.log('Received unhandled notification type:', OrderNotificationType);
      
      // Mark callback as processed even if we don't handle it
      await supabaseService
        .from('pesapal_callbacks')
        .update({ processed: true })
        .eq('pesapal_tracking_id', OrderTrackingId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Callback received but not processed',
          notificationType: OrderNotificationType
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    console.error('Unexpected error in pesapal-callback function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});