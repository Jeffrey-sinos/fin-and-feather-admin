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
  payment_status: string;
  delivery_status: string;
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

    // Try to validate JWT and get user, but allow server-to-server calls
    let user = null;
    let isServerCall = false;

    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser();
      if (!authError && authUser) {
        user = authUser;
      } else {
        console.log('JWT validation failed, treating as server call:', authError?.message);
        isServerCall = true;
      }
    } else {
      console.log('No authorization header, treating as server call');
      isServerCall = true;
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

    // Authorization check - skip for server calls, check ownership/admin for user calls
    if (!isServerCall && user) {
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
    } else if (isServerCall) {
      console.log('Server-to-server call, skipping user authorization');
    }

    // Check if payment is already completed (idempotent)
    if (order.payment_status === 'completed') {
      console.log('Payment already completed, returning early');
      return new Response(
        JSON.stringify({ 
          success: true, 
          order,
          message: 'Payment was already completed'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Stock reduction is now handled by a DB trigger when payment_status changes to 'completed'
    // Keeping this function idempotent and focused on status update only
    const stockUpdates: Array<{ productId: string; oldStock: number; newStock: number; }> = []; // legacy response shape
    console.log('Skipping manual stock updates - handled by trigger_reduce_stock_on_completion');

    // Update order payment_status to completed (delivery_status remains unchanged)
    const { data: updatedOrder, error: statusUpdateError } = await supabaseService
      .from('orders')
      .update({ payment_status: 'completed' })
      .eq('id', orderId)
      .select()
      .single();

    if (statusUpdateError) {
      console.error('Error updating order payment status:', statusUpdateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update payment status' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Successfully completed payment for order ${orderId} with ${stockUpdates.length} stock updates`);

    const response: CompleteOrderResponse = {
      success: true,
      order: updatedOrder,
      stockUpdates,
      message: `Payment completed successfully with ${stockUpdates.length} stock updates`
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