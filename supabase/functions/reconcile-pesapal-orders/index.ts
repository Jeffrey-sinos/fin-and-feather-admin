import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting Pesapal orders reconciliation...');

    // Find all orders where Pesapal transaction is COMPLETED but order payment_status is not
    const { data: mismatchedOrders, error: queryError } = await supabaseService
      .from('orders')
      .select(`
        id,
        payment_status,
        delivery_status,
        total_amount,
        user_id,
        pesapal_transaction:pesapal_transactions!pesapal_transactions_order_id_fkey(
          id,
          status,
          pesapal_tracking_id,
          merchant_reference
        )
      `)
      .neq('payment_status', 'completed')
      .not('pesapal_transaction', 'is', null);

    if (queryError) {
      console.error('Error querying mismatched orders:', queryError);
      throw new Error('Failed to query orders');
    }

    console.log(`Found ${mismatchedOrders?.length || 0} orders to check`);

    const results = {
      total_checked: mismatchedOrders?.length || 0,
      fixed: [] as string[],
      already_completed: [] as string[],
      errors: [] as { orderId: string; error: string }[],
    };

    // Process each mismatched order
    for (const order of mismatchedOrders || []) {
      const txArray = order.pesapal_transaction as any[];
      
      if (!txArray || txArray.length === 0) {
        console.log(`Order ${order.id} has no transaction, skipping`);
        continue;
      }

      const transaction = txArray[0]; // Take the first/latest transaction
      
      console.log(`Checking order ${order.id} with transaction status: ${transaction.status}`);

      // If transaction is COMPLETED but order is not
      if (transaction.status === 'COMPLETED' && order.payment_status !== 'completed') {
        console.log(`Fixing order ${order.id} - transaction is COMPLETED but order is ${order.payment_status}`);

        try {
          // Call complete-order function
          const { data: completeData, error: completeError } = await supabaseService.functions.invoke('complete-order', {
            body: { orderId: order.id }
          });

          if (completeError) {
            console.error(`Error completing order ${order.id}:`, completeError);
            results.errors.push({
              orderId: order.id,
              error: completeError.message || 'Unknown error'
            });
            continue;
          }

          if (!completeData?.success) {
            console.error(`complete-order returned error for ${order.id}:`, completeData);
            results.errors.push({
              orderId: order.id,
              error: completeData?.error || 'Unknown error'
            });
            continue;
          }

          console.log(`Successfully fixed order ${order.id}`);
          results.fixed.push(order.id);

        } catch (err) {
          console.error(`Exception fixing order ${order.id}:`, err);
          results.errors.push({
            orderId: order.id,
            error: err instanceof Error ? err.message : 'Unknown error'
          });
        }
      } else if (order.payment_status === 'completed') {
        results.already_completed.push(order.id);
      }
    }

    console.log('Reconciliation complete:', JSON.stringify(results, null, 2));

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Reconciliation complete',
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in reconcile-pesapal-orders:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
