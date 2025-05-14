
export interface Customer {
  id: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  email?: string; 
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: 'fish' | 'chicken' | string | null;
  stock: number;
  image_url?: string | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  products: Product; // This matches the Supabase response structure
  quantity: number;
  unit_price: number;
  product?: Product; // Optional property to maintain compatibility
}

// Add a utility function to convert Supabase order item to our OrderItem type
export function processOrderItems(items: any[]): OrderItem[] {
  return items.map(item => ({
    ...item,
    product: item.products // For backward compatibility
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
  // Customer info computed from profiles and user data
  customer?: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    address: string | null;
    created_at: string;
  };
}

// Add a utility function to process orders from Supabase
export function processOrder(order: any): Order {
  const processedOrder = {
    ...order,
    items: processOrderItems(order.items || []),
    customer: {
      id: order.profiles?.id || order.user_id,
      name: order.profiles?.full_name || 'Unknown',
      // Get email from user_id - we'll use admin functions to retrieve this
      email: order.user?.email || '',
      phone: order.profiles?.phone || '',
      address: order.profiles?.address || '',
      created_at: order.profiles?.created_at || order.created_at,
    }
  };
  
  return processedOrder;
}

export interface DashboardStats {
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  totalRevenue: number;
  lowStockProducts: number;
  recentOrders: Order[];
}
