
import { supabase } from '@/integrations/supabase/client';

export const insertSampleNairobiOrders = async () => {
  try {
    // Sample Nairobi addresses
    const nairobiAddresses = [
      'Westlands, Nairobi, Kenya',
      'Karen, Nairobi, Kenya', 
      'Kilimani, Nairobi, Kenya',
      'Kasarani, Nairobi, Kenya',
      'Embakasi, Nairobi, Kenya',
      'CBD, Nairobi, Kenya',
      'Runda, Nairobi, Kenya',
      'Lavington, Nairobi, Kenya'
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

    // Create sample profiles with Nairobi addresses
    const profilesToInsert = nairobiAddresses.map((address, index) => ({
      id: `sample-user-${index + 1}`,
      full_name: `Customer ${index + 1}`,
      email: `customer${index + 1}@example.com`,
      phone: `+254${Math.floor(Math.random() * 900000000 + 100000000)}`,
      address: address
    }));

    // Insert profiles (ignore if they already exist)
    const { error: profilesError } = await supabase
      .from('profiles')
      .upsert(profilesToInsert, { onConflict: 'id' });

    if (profilesError) throw profilesError;

    // Create sample orders
    const ordersToInsert = nairobiAddresses.map((_, index) => ({
      id: `sample-order-${index + 1}`,
      user_id: `sample-user-${index + 1}`,
      status: 'completed' as const,
      total_amount: Math.floor(Math.random() * 5000 + 1000), // Random amount between 1000-6000
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() // Random date within last 30 days
    }));

    // Insert orders (ignore if they already exist)
    const { error: ordersError } = await supabase
      .from('orders')
      .upsert(ordersToInsert, { onConflict: 'id' });

    if (ordersError) throw ordersError;

    // Create order items for each order
    const orderItemsToInsert = ordersToInsert.flatMap((order, orderIndex) => {
      const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items per order
      return Array.from({ length: numItems }, (_, itemIndex) => {
        const product = products[Math.floor(Math.random() * products.length)];
        const quantity = Math.floor(Math.random() * 3) + 1;
        return {
          id: `sample-item-${orderIndex}-${itemIndex}`,
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

    console.log('Successfully inserted sample Nairobi orders!');
    return true;
  } catch (error) {
    console.error('Error inserting sample orders:', error);
    return false;
  }
};
