
import { createClient } from '@supabase/supabase-js';
import { Customer, Order, Product, DashboardStats, OrderItem } from '../types';
import { toast } from '../components/ui/sonner';

// Supabase configuration
// These would need to be replaced with your actual Supabase URL and anon key
// Note: In a real application, these should be environment variables
const supabaseUrl = 'https://your-project-url.supabase.co';
const supabaseAnonKey = 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Dashboard statistics
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Get total number of orders
    const { count: totalOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    // Get total number of customers
    const { count: totalCustomers } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });

    // Get total number of products
    const { count: totalProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });
      
    // Get low stock products count
    const { count: lowStockProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .lt('stock', 10);
      
    // Get total revenue
    const { data: revenueData } = await supabase
      .from('orders')
      .select('total_amount');
    
    const totalRevenue = revenueData?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
    
    // Get recent orders
    const { data: recentOrdersRaw } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers(*)
      `)
      .order('created_at', { ascending: false })
      .limit(5);
    
    // Get order items for each order
    const recentOrders = await Promise.all((recentOrdersRaw || []).map(async (order) => {
      const { data: items } = await supabase
        .from('order_items')
        .select(`
          *,
          product:products(*)
        `)
        .eq('order_id', order.id);
      
      return {
        ...order,
        items: items || []
      };
    }));

    return {
      totalOrders: totalOrders || 0,
      totalCustomers: totalCustomers || 0,
      totalProducts: totalProducts || 0,
      totalRevenue,
      lowStockProducts: lowStockProducts || 0,
      recentOrders: recentOrders as Order[]
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    toast.error('Failed to load dashboard statistics');
    return {
      totalOrders: 0,
      totalCustomers: 0,
      totalProducts: 0,
      totalRevenue: 0,
      lowStockProducts: 0,
      recentOrders: []
    };
  }
}

// Products API
export async function getProducts(): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    return data as Product[];
  } catch (error) {
    console.error('Error fetching products:', error);
    toast.error('Failed to load products');
    return [];
  }
}

export async function getProduct(id: string): Promise<Product | null> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    return data as Product;
  } catch (error) {
    console.error(`Error fetching product ${id}:`, error);
    toast.error('Failed to load product details');
    return null;
  }
}

export async function createProduct(product: Omit<Product, 'id' | 'created_at'>): Promise<Product | null> {
  try {
    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select()
      .single();
    
    if (error) throw error;
    
    toast.success('Product created successfully');
    return data as Product;
  } catch (error) {
    console.error('Error creating product:', error);
    toast.error('Failed to create product');
    return null;
  }
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
  try {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    toast.success('Product updated successfully');
    return data as Product;
  } catch (error) {
    console.error(`Error updating product ${id}:`, error);
    toast.error('Failed to update product');
    return null;
  }
}

export async function deleteProduct(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    toast.success('Product deleted successfully');
    return true;
  } catch (error) {
    console.error(`Error deleting product ${id}:`, error);
    toast.error('Failed to delete product');
    return false;
  }
}

// Customers API
export async function getCustomers(): Promise<Customer[]> {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    return data as Customer[];
  } catch (error) {
    console.error('Error fetching customers:', error);
    toast.error('Failed to load customers');
    return [];
  }
}

export async function getCustomer(id: string): Promise<Customer | null> {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    return data as Customer;
  } catch (error) {
    console.error(`Error fetching customer ${id}:`, error);
    toast.error('Failed to load customer details');
    return null;
  }
}

// Orders API
export async function getOrders(): Promise<Order[]> {
  try {
    const { data: ordersRaw, error } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers(*)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Get order items for each order
    const orders = await Promise.all((ordersRaw || []).map(async (order) => {
      const { data: items } = await supabase
        .from('order_items')
        .select(`
          *,
          product:products(*)
        `)
        .eq('order_id', order.id);
      
      return {
        ...order,
        items: items || []
      };
    }));
    
    return orders as Order[];
  } catch (error) {
    console.error('Error fetching orders:', error);
    toast.error('Failed to load orders');
    return [];
  }
}

export async function getOrder(id: string): Promise<Order | null> {
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    // Get order items
    const { data: items } = await supabase
      .from('order_items')
      .select(`
        *,
        product:products(*)
      `)
      .eq('order_id', id);
    
    return {
      ...order,
      items: items || []
    } as Order;
  } catch (error) {
    console.error(`Error fetching order ${id}:`, error);
    toast.error('Failed to load order details');
    return null;
  }
}

export async function createOrder(
  customerId: string, 
  items: { productId: string, quantity: number }[]
): Promise<Order | null> {
  try {
    // Start a transaction
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('id, price, stock')
      .in('id', items.map(item => item.productId));
    
    if (productsError) throw productsError;
    
    const products = productsData as Pick<Product, 'id' | 'price' | 'stock'>[];
    
    // Calculate total amount and validate stock
    let totalAmount = 0;
    const insufficientStock = items.some(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) return true;
      if (product.stock < item.quantity) return true;
      totalAmount += product.price * item.quantity;
      return false;
    });
    
    if (insufficientStock) {
      toast.error('Insufficient stock for some products');
      return null;
    }
    
    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_id: customerId,
        total_amount: totalAmount,
        status: 'pending'
      })
      .select()
      .single();
    
    if (orderError) throw orderError;
    
    // Create order items
    const orderItems = items.map(item => {
      const product = products.find(p => p.id === item.productId)!;
      return {
        order_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: product.price
      };
    });
    
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);
    
    if (itemsError) throw itemsError;
    
    // Note: Stock will be reduced when payment is completed and order status changes to 'completed'
    
    toast.success('Order created successfully');
    
    // Return the complete order
    return getOrder(order.id);
  } catch (error) {
    console.error('Error creating order:', error);
    toast.error('Failed to create order');
    return null;
  }
}

export async function updateOrderStatus(id: string, status: Order['status']): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id);
    
    if (error) throw error;
    
    toast.success(`Order status updated to ${status}`);
    return true;
  } catch (error) {
    console.error(`Error updating order ${id} status:`, error);
    toast.error('Failed to update order status');
    return false;
  }
}
