
export interface Customer {
  id: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  email?: string; // Add email field
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
  // Computed property to maintain backward compatibility
  get product(): Product {
    return this.products;
  }
}

// Add a utility function to convert Supabase order item to our OrderItem type
export function processOrderItems(items: any[]): OrderItem[] {
  return items.map(item => ({
    ...item,
    // Add getter for backward compatibility
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
    email?: string; // Add email field that might come from auth.users
    created_at: string;
    updated_at: string;
  };
  // Add a computed property for customer
  get customer(): {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    address: string | null;
    created_at: string;
  } {
    return {
      id: this.profiles?.id || this.user_id,
      name: this.profiles?.full_name || 'Unknown',
      email: this.profiles?.email || '',
      phone: this.profiles?.phone || '',
      address: this.profiles?.address || '',
      created_at: this.profiles?.created_at || this.created_at,
    };
  }
}

// Add a utility function to process orders from Supabase
export function processOrder(order: any): Order {
  const processedOrder = {
    ...order,
    items: processOrderItems(order.items || []),
  };
  
  // Add the customer getter to the processed order
  Object.defineProperty(processedOrder, 'customer', {
    get() {
      return {
        id: order.profiles?.id || order.user_id,
        name: order.profiles?.full_name || 'Unknown',
        email: order.profiles?.email || '',
        phone: order.profiles?.phone || '',
        address: order.profiles?.address || '',
        created_at: order.profiles?.created_at || order.created_at,
      };
    }
  });
  
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
