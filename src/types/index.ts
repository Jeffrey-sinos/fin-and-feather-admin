
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
  // Add alias for backward compatibility
  get product(): Product {
    return this.products;
  }
}

export interface Order {
  id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  total_amount: number;
  created_at: string;
  items: OrderItem[];
  profiles?: {
    id: string;
    full_name: string | null;
    phone: string | null;
    address: string | null;
    created_at: string;
    updated_at: string;
  };
  // Add customer as a computed property to maintain compatibility
  get customer(): {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    created_at: string;
  } {
    return {
      id: this.profiles?.id || this.user_id,
      name: this.profiles?.full_name || 'Unknown',
      email: '', // No email in profiles table
      phone: this.profiles?.phone || '',
      address: this.profiles?.address || '',
      created_at: this.profiles?.created_at || this.created_at,
    };
  }
}

export interface DashboardStats {
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  totalRevenue: number;
  lowStockProducts: number;
  recentOrders: Order[];
}
