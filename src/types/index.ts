

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
  products: Product; // Match the Supabase response
  quantity: number;
  unit_price: number;
}

export interface Order {
  id: string;
  user_id: string; // Changed from customer_id to match database
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  total_amount: number;
  created_at: string;
  items: OrderItem[];
  profiles?: { // Optional to handle the relationship
    id: string;
    full_name: string | null;
    phone: string | null;
    address: string | null;
    created_at: string;
    updated_at: string;
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
