
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/dashboard/layout/DashboardLayout';
import StatsCard from '@/components/dashboard/overview/StatsCard';
import RecentOrdersList from '@/components/dashboard/overview/RecentOrdersList';
import { Package, ShoppingCart, Users, DollarSign, Mail, FileText, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Order } from '@/types';

const fetchDashboardStats = async () => {
  try {
    // Get total number of orders
    const { count: totalOrders, error: ordersError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });
    
    if (ordersError) throw ordersError;

    // Get total number of customers
    const { count: totalCustomers, error: customersError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    if (customersError) throw customersError;

    // Get total number of products
    const { count: totalProducts, error: productsError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });
    
    if (productsError) throw productsError;
      
    // Get low stock products count
    const { count: lowStockProducts, error: lowStockError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .lt('stock', 10);
    
    if (lowStockError) throw lowStockError;
      
    // Get total revenue
    const { data: revenueData, error: revenueError } = await supabase
      .from('orders')
      .select('total_amount');
    
    if (revenueError) throw revenueError;
    
    const totalRevenue = revenueData?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;
    
    // Get newsletter subscribers count
    const { count: totalNewsletterSubscribers, error: newsletterError } = await supabase
      .from('newsletter_subscriptions')
      .select('*', { count: 'exact', head: true });
    
    if (newsletterError) throw newsletterError;

    // Get blog posts count
    const { count: totalBlogPosts, error: blogError } = await supabase
      .from('blog_posts')
      .select('*', { count: 'exact', head: true });
    
    if (blogError) throw blogError;

    // Get SMS subscribers count
    const { count: totalContactSubscribers, error: contactsError } = await supabase
      .from('contact_numbers')
      .select('*', { count: 'exact', head: true });
    
    if (contactsError) throw contactsError;
    
    // Get recent orders
    const { data: recentOrdersData, error: recentOrdersError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (recentOrdersError) throw recentOrdersError;
    
    // Get order items and customer data for each order
    const recentOrders = await Promise.all((recentOrdersData || []).map(async (order) => {
      // Get order items
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          products(*)
        `)
        .eq('order_id', order.id);
      
      if (itemsError) throw itemsError;
      
      // Get customer data
      const { data: customerData, error: customerError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', order.user_id)
        .single();
      
      if (customerError) {
        console.error('Error fetching customer data:', customerError);
      }

      const processedItems = items?.map(item => ({
        ...item,
        product: item.products // Map to match our OrderItem type
      })) || [];
      
      return {
        ...order,
        customer_id: order.user_id,
        customer: {
          id: customerData?.id || '',
          name: customerData?.full_name || 'Unknown',
          email: '',
          phone: customerData?.phone || '',
          address: customerData?.address || '',
          created_at: customerData?.created_at || order.created_at
        },
        items: processedItems
      } as Order;
    }));

    return {
      totalOrders: totalOrders || 0,
      totalCustomers: totalCustomers || 0,
      totalProducts: totalProducts || 0,
      totalRevenue,
      lowStockProducts: lowStockProducts || 0,
      recentOrders,
      totalNewsletterSubscribers: totalNewsletterSubscribers || 0,
      totalBlogPosts: totalBlogPosts || 0,
      totalContactSubscribers: totalContactSubscribers || 0
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    toast({
      title: "Error",
      description: "Failed to load dashboard statistics",
      variant: "destructive"
    });
    throw error;
  }
};

const Dashboard = () => {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: fetchDashboardStats,
  });

  if (error) {
    console.error('Error loading dashboard data:', error);
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Orders"
            value={isLoading ? '...' : stats?.totalOrders.toString() || '0'}
            icon={<ShoppingCart className="h-4 w-4 text-ocean-500" />}
          />
          <StatsCard
            title="Total Customers"
            value={isLoading ? '...' : stats?.totalCustomers.toString() || '0'}
            icon={<Users className="h-4 w-4 text-ocean-500" />}
          />
          <StatsCard
            title="Total Products"
            value={isLoading ? '...' : stats?.totalProducts.toString() || '0'}
            icon={<Package className="h-4 w-4 text-ocean-500" />}
          />
          <StatsCard
            title="Total Revenue"
            value={isLoading ? '...' : `$${stats?.totalRevenue.toFixed(2) || '0.00'}`}
            icon={<DollarSign className="h-4 w-4 text-ocean-500" />}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatsCard
            title="Newsletter Subscribers"
            value={isLoading ? '...' : stats?.totalNewsletterSubscribers.toString() || '0'}
            icon={<Mail className="h-4 w-4 text-ocean-500" />}
          />
          <StatsCard
            title="Blog Posts"
            value={isLoading ? '...' : stats?.totalBlogPosts.toString() || '0'}
            icon={<FileText className="h-4 w-4 text-ocean-500" />}
          />
          <StatsCard
            title="SMS Subscribers"
            value={isLoading ? '...' : stats?.totalContactSubscribers.toString() || '0'}
            icon={<MessageSquare className="h-4 w-4 text-ocean-500" />}
          />
        </div>
        
        {stats?.lowStockProducts > 0 && (
          <div className="rounded-md bg-yellow-50 p-4 border border-yellow-100">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Inventory Alert</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>You have {stats.lowStockProducts} products with low stock (less than 10 items). <a href="/admin/products" className="font-medium underline">Check inventory</a>.</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <RecentOrdersList orders={stats?.recentOrders || []} />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
