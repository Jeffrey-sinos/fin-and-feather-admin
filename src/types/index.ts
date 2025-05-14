
export interface Customer {
  id: string;
  full_name: string;
  phone: string;
  address: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'fish' | 'chicken';
  stock: number;
  image_url?: string;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  products: Product; // This matches the Supabase response structure
  quantity: number;
  unit_price: number;
}

// Add a utility function to convert Supabase order item to our OrderItem type
export function processOrderItems(items: any[]): OrderItem[] {
  return items.map(item => ({
    ...item,
    // Maintain compatibility with code expecting the product property
    get product() { 
      return item.products; 
    }
  }));
}

export interface Order {
  id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  total_amount: number;
  created_at: string;
  items: OrderItem[];
  // Optional profiles from Supabase joins
  profiles?: {
    id: string;
    full_name: string | null;
    phone: string | null;
    address: string | null;
    created_at: string;
    updated_at: string;
  };
}

// Add a utility function to process orders from Supabase
export function processOrder(order: any): Order {
  return {
    ...order,
    items: processOrderItems(order.items || []),
    // Add customer as a computed property
    get customer() {
      return {
        id: order.profiles?.id || order.user_id,
        name: order.profiles?.full_name || 'Unknown',
        email: '', // No email in profiles table
        phone: order.profiles?.phone || '',
        address: order.profiles?.address || '',
        created_at: order.profiles?.created_at || order.created_at,
      };
    }
  };
}

export interface DashboardStats {
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  totalRevenue: number;
  lowStockProducts: number;
  recentOrders: Order[];
}
