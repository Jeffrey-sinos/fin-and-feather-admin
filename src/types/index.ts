
export interface Customer {
  id: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  email: string | null; 
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
  deleted_at?: string | null;
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
export const processOrderItems = (items: any[]): OrderItem[] => {
  return items.map(item => ({
    ...item,
    product: item.products // For backward compatibility
  }));
}

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type DeliveryStatus = 'pending' | 'confirmed' | 'in_transit' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  user_id: string;
  payment_status: PaymentStatus;
  delivery_status: DeliveryStatus;
  total_amount: number;
  created_at: string;
  items: OrderItem[];
  // Optional profiles from Supabase joins
  profiles?: {
    id: string;
    full_name: string | null;
    phone: string | null;
    address: string | null;
    email: string | null;
    created_at: string;
    updated_at: string;
  };
  // Customer info computed from profiles
  customer?: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    created_at: string;
  };
}

// Add a utility function to process orders from Supabase
export const processOrder = (order: any): Order => {
  const processedOrder = {
    ...order,
    items: processOrderItems(order.items || []),
    customer: {
      id: order.profiles?.id || order.user_id,
      name: order.profiles?.full_name || 'Unknown',
      email: order.profiles?.email || null,
      phone: order.profiles?.phone || null,
      address: order.profiles?.address || null,
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
