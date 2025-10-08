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

interface PesapalOrderRequest {
  id: string;
  currency: string;
  amount: number;
  description: string;
  callback_url: string;
  notification_id: string;
  billing_address: {
    email_address: string;
    phone_number: string;
    country_code: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    line_1?: string;
    line_2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    zip_code?: string;
  };
}

interface PesapalOrderResponse {
  order_tracking_id: string;
  merchant_reference: string;
  redirect_url: string;
  error?: any;
  message?: string;
  status?: number;
}

interface CreateOrderRequest {
  user_id: string;
  items: Array<{
    product_id: string;
    quantity: number;
  }>;
  customer_info: {
    full_name: string;
    email: string;
    phone: string;
    address: string;
  };
  delivery_info: {
    address: string;
    coordinates: { lat: number; lng: number } | null;
    zone: string;
    fee: number;
    distance_km?: number;
    estimated_time: number;
  };
  redirect_url: string;
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

async function submitPesapalOrder(orderRequest: PesapalOrderRequest, token: string): Promise<PesapalOrderResponse> {
  const response = await fetch('https://pay.pesapal.com/v3/api/Transactions/SubmitOrderRequest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(orderRequest),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Pesapal order submission failed:', response.status, errorText);
    throw new Error(`Failed to submit order to Pesapal: ${response.status}`);
  }

  const data: PesapalOrderResponse = await response.json();
  
  if (data.error) {
    console.error('Pesapal order error:', data);
    throw new Error(data.message || 'Failed to create Pesapal order');
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

    // Parse request body
    const requestData: CreateOrderRequest = await req.json();
    const { user_id, items, customer_info, delivery_info, redirect_url } = requestData;

    console.log('Creating Pesapal order for user:', user_id);
    console.log('Items:', JSON.stringify(items));

    // Validate products and calculate total
    const { data: productsData, error: productsError } = await supabaseService
      .from('products')
      .select('id, price, stock, name')
      .in('id', items.map(item => item.product_id))
      .is('deleted_at', null);

    if (productsError) {
      console.error('Error fetching products:', productsError);
      throw new Error('Failed to validate products');
    }

    // Check stock availability and get prices
    const products = productsData || [];
    const itemsWithPrices: Array<{ product_id: string; quantity: number; unit_price: number }> = [];
    let totalAmount = delivery_info.fee || 0;
    
    for (const item of items) {
      const product = products.find(p => p.id === item.product_id);
      if (!product) {
        throw new Error(`Product ${item.product_id} not found`);
      }
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }
      itemsWithPrices.push({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: product.price,
      });
      totalAmount += product.price * item.quantity;
    }

    console.log('Total amount calculated:', totalAmount);

    // Generate unique merchant reference
    const merchantReference = `ORDER-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Get Pesapal token
    const token = await getPesapalToken();

    // Prepare Pesapal order request
    const nameParts = customer_info.full_name.split(' ');
    const firstName = nameParts[0] || 'Customer';
    const lastName = nameParts.slice(1).join(' ') || 'User';

    const pesapalOrderRequest: PesapalOrderRequest = {
      id: merchantReference,
      currency: 'KES',
      amount: totalAmount,
      description: `Order for ${items.length} item(s)`,
      callback_url: `${supabaseUrl}/functions/v1/pesapal-callback`,
      notification_id: Deno.env.get('PESAPAL_IPN_ID') || '',
      billing_address: {
        email_address: customer_info.email,
        phone_number: customer_info.phone,
        country_code: 'KE',
        first_name: firstName,
        last_name: lastName,
        line_1: customer_info.address,
        city: 'Nairobi',
      },
    };

    console.log('Submitting order to Pesapal:', merchantReference);

    // Submit to Pesapal
    const pesapalResponse = await submitPesapalOrder(pesapalOrderRequest, token);

    console.log('Pesapal order created:', pesapalResponse.order_tracking_id);

    // Store pending transaction data (NOT creating the order yet)
    // We'll store the order data in the transaction record for later use
    const { data: transaction, error: txError } = await supabaseService
      .from('pesapal_transactions')
      .insert({
        order_id: null, // No order created yet!
        pesapal_tracking_id: pesapalResponse.order_tracking_id,
        merchant_reference: merchantReference,
        amount: totalAmount,
        currency: 'KES',
        status: 'PENDING',
        iframe_url: pesapalResponse.redirect_url,
        customer_phone: customer_info.phone,
        // Store order data for later creation (using JSONB or separate fields)
      })
      .select()
      .single();

    if (txError) {
      console.error('Error storing transaction:', txError);
      throw new Error('Failed to store transaction');
    }

    // Store the pending order data separately for use after payment
    const { error: pendingError } = await supabaseService
      .from('pesapal_callbacks')
      .insert({
        pesapal_tracking_id: pesapalResponse.order_tracking_id,
        callback_type: 'PENDING_ORDER',
        raw_payload: {
          user_id,
          items: itemsWithPrices, // Use items with unit prices
          customer_info,
          delivery_info,
          redirect_url,
          total_amount: totalAmount,
          merchant_reference: merchantReference,
        },
        processed: false,
      });

    if (pendingError) {
      console.error('Warning: Failed to store pending order data:', pendingError);
    }

    console.log('Transaction stored successfully:', transaction.id);

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: transaction.id,
        tracking_id: pesapalResponse.order_tracking_id,
        iframe_url: pesapalResponse.redirect_url,
        merchant_reference: merchantReference,
        total_amount: totalAmount,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in create-pesapal-order:', error);
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
