
import { supabase } from '@/integrations/supabase/client';

export const insertSampleNairobiOrders = async () => {
  try {
    // More diverse Nairobi addresses for better map visualization
    const nairobiAddresses = [
      'Westlands, Nairobi, Kenya',
      'Karen, Nairobi, Kenya', 
      'Kilimani, Nairobi, Kenya',
      'Kasarani, Nairobi, Kenya',
      'Embakasi, Nairobi, Kenya',
      'CBD, Nairobi, Kenya',
      'Runda, Nairobi, Kenya',
      'Lavington, Nairobi, Kenya',
      'Upper Hill, Nairobi, Kenya',
      'Gigiri, Nairobi, Kenya',
      'South C, Nairobi, Kenya',
      'Parklands, Nairobi, Kenya',
      'Eastleigh, Nairobi, Kenya',
      'Donholm, Nairobi, Kenya',
      'Langata, Nairobi, Kenya',
      'Kileleshwa, Nairobi, Kenya'
    ];

    // Get some existing products to use in orders
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, price')
      .limit(5);

    if (productsError) throw productsError;

    if (!products || products.length === 0) {
      throw new Error('No products found. Please add some products first.');
    }

    // Create sample profiles with diverse Nairobi addresses
    const profilesToInsert = nairobiAddresses.slice(0, 16).map((address, index) => ({
      id: `sample-user-nairobi-${index + 1}`,
      full_name: `Customer ${index + 1}`,
      email: `customer.nairobi${index + 1}@example.com`,
      phone: `+254${Math.floor(Math.random() * 900000000 + 100000000)}`,
      address: address
    }));

    // Insert profiles (ignore if they already exist)
    const { error: profilesError } = await supabase
      .from('profiles')
      .upsert(profilesToInsert, { onConflict: 'id' });

    if (profilesError) throw profilesError;

    // Create sample orders with varied amounts and dates
    const ordersToInsert = nairobiAddresses.slice(0, 16).map((_, index) => ({
      id: `sample-order-nairobi-${index + 1}`,
      user_id: `sample-user-nairobi-${index + 1}`,
      status: 'completed' as const,
      total_amount: Math.floor(Math.random() * 8000 + 500), // Random amount between 500-8500
      created_at: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString() // Random date within last 60 days
    }));

    // Insert orders (ignore if they already exist)
    const { error: ordersError } = await supabase
      .from('orders')
      .upsert(ordersToInsert, { onConflict: 'id' });

    if (ordersError) throw ordersError;

    // Create order items for each order with more variety
    const orderItemsToInsert = ordersToInsert.flatMap((order, orderIndex) => {
      const numItems = Math.floor(Math.random() * 4) + 1; // 1-4 items per order
      return Array.from({ length: numItems }, (_, itemIndex) => {
        const product = products[Math.floor(Math.random() * products.length)];
        const quantity = Math.floor(Math.random() * 5) + 1; // 1-5 quantity
        return {
          id: `sample-item-nairobi-${orderIndex}-${itemIndex}`,
          order_id: order.id,
          product_id: product.id,
          quantity: quantity,
          unit_price: product.price
        };
      });
    });

    // Insert order items (ignore if they already exist)
    const { error: itemsError } = await supabase
      .from('order_items')
      .upsert(orderItemsToInsert, { onConflict: 'id' });

    if (itemsError) throw itemsError;

    console.log(`Successfully inserted ${ordersToInsert.length} sample Nairobi orders from diverse locations!`);
    return true;
  } catch (error) {
    console.error('Error inserting sample orders:', error);
    return false;
  }
};
