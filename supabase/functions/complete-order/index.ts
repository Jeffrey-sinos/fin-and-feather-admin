import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
}

interface Order {
  id: string;
  user_id: string;
  status: string;
  total_amount: number;
  created_at: string;
}

interface CompleteOrderRequest {
  orderId: string;
}

interface CompleteOrderResponse {
  success: boolean;
  order?: Order;
  stockUpdates?: Array<{ productId: string; oldStock: number; newStock: number; }>;
  message?: string;
  error?: string;
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
    
    // Create client for validating user session
    const supabaseClient = createClient(
      supabaseUrl, 
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    console.log('Complete order function called');

    // Validate JWT and get user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse request body
    const { orderId }: CompleteOrderRequest = await req.json();
    if (!orderId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Order ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Processing order completion for order ID: ${orderId}`);

    // Fetch the order using service role to bypass RLS
    const { data: order, error: orderError } = await supabaseService
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order not found:', orderError);
      return new Response(
        JSON.stringify({ success: false, error: 'Order not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if user owns the order or is admin
    const { data: userRole } = await supabaseService
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    const isAdmin = !!userRole;
    const ownsOrder = order.user_id === user.id;

    if (!isAdmin && !ownsOrder) {
      console.error('User does not own order and is not admin');
      return new Response(
        JSON.stringify({ success: false, error: 'Access denied' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if order is already completed (idempotent)
    if (order.status === 'completed') {
      console.log('Order already completed, returning early');
      return new Response(
        JSON.stringify({ 
          success: true, 
          order,
          message: 'Order was already completed'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Fetch order items
    const { data: orderItems, error: itemsError } = await supabaseService
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    if (itemsError || !orderItems || orderItems.length === 0) {
      console.error('Error fetching order items:', itemsError);
      return new Response(
        JSON.stringify({ success: false, error: 'Could not fetch order items' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Found ${orderItems.length} items to process`);

    // Process stock updates
    const stockUpdates: Array<{ productId: string; oldStock: number; newStock: number; }> = [];
    
    for (const item of orderItems as OrderItem[]) {
      // Get current product stock
      const { data: product, error: productError } = await supabaseService
        .from('products')
        .select('stock')
        .eq('id', item.product_id)
        .single();

      if (productError || !product) {
        console.error(`Error fetching product ${item.product_id}:`, productError);
        continue;
      }

      const oldStock = product.stock;
      const newStock = Math.max(0, oldStock - item.quantity);

      // Update product stock
      const { error: updateError } = await supabaseService
        .from('products')
        .update({ stock: newStock })
        .eq('id', item.product_id);

      if (updateError) {
        console.error(`Error updating stock for product ${item.product_id}:`, updateError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to update stock for product ${item.product_id}` 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      stockUpdates.push({
        productId: item.product_id,
        oldStock,
        newStock
      });

      console.log(`Updated product ${item.product_id} stock: ${oldStock} -> ${newStock}`);
    }

    // Update order status to completed
    const { data: updatedOrder, error: statusUpdateError } = await supabaseService
      .from('orders')
      .update({ status: 'completed' })
      .eq('id', orderId)
      .select()
      .single();

    if (statusUpdateError) {
      console.error('Error updating order status:', statusUpdateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update order status' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Successfully completed order ${orderId} with ${stockUpdates.length} stock updates`);

    const response: CompleteOrderResponse = {
      success: true,
      order: updatedOrder,
      stockUpdates,
      message: `Order completed successfully with ${stockUpdates.length} stock updates`
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Unexpected error in complete-order function:', error);
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