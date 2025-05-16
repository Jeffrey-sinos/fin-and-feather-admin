
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/dashboard/layout/DashboardLayout';
import StatsCard from '@/components/dashboard/overview/StatsCard';
import RecentOrdersList from '@/components/dashboard/overview/RecentOrdersList';
import { Package, ShoppingCart, Users, DollarSign, Mail, FileText, MessageSquare, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Order } from '@/types';
import ProductAnalytics from '@/components/dashboard/analytics/ProductAnalytics';
import LowStockAlert from '@/components/dashboard/analytics/LowStockAlert';

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
      
    // Get low stock products count (changed threshold to 20)
    const { count: lowStockProducts, error: lowStockError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .lt('stock', 20);
    
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

    // Get products with low stock (less than 20) for detailed alert
    const { data: lowStockProductsData, error: lowStockProductsError } = await supabase
      .from('products')
      .select('*')
      .lt('stock', 20)
      .order('stock', { ascending: true });
    
    if (lowStockProductsError) throw lowStockProductsError;
    
    // Fetch sales analytics - most and least sold products
    const { data: orderItemsData, error: orderItemsError } = await supabase
      .from('order_items')
      .select(`
        quantity,
        product_id,
        products (
          id,
          name,
          category,
          stock,
          price
        )
      `);
    
    if (orderItemsError) throw orderItemsError;
    
    // Calculate product sales
    const productSalesMap = new Map();
    orderItemsData?.forEach(item => {
      const productId = item.product_id;
      const quantity = item.quantity;
      const currentQuantity = productSalesMap.get(productId) || 0;
      productSalesMap.set(productId, currentQuantity + quantity);
    });
    
    // Convert to array and sort
    const productSalesArray = Array.from(productSalesMap.entries()).map(([productId, totalSold]) => {
      const productDetails = orderItemsData?.find(item => item.product_id === productId)?.products;
      return {
        productId,
        totalSold,
        name: productDetails?.name || 'Unknown Product',
        category: productDetails?.category || 'Unknown',
        price: productDetails?.price || 0,
        stock: productDetails?.stock || 0
      };
    });
    
    // Sort to find most and least sold
    const sortedProductSales = [...productSalesArray].sort((a, b) => b.totalSold - a.totalSold);
    
    const mostSoldProducts = sortedProductSales.slice(0, 5);
    const leastSoldProducts = [...sortedProductSales].sort((a, b) => a.totalSold - b.totalSold).slice(0, 5);
    
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
      totalContactSubscribers: totalContactSubscribers || 0,
      mostSoldProducts,
      leastSoldProducts,
      lowStockProductsData
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
        
        {/* Quick Stats Section */}
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

        {/* Low Stock Alert Section - Move it up for more visibility */}
        {!isLoading && stats?.lowStockProductsData && stats.lowStockProductsData.length > 0 && (
          <LowStockAlert products={stats.lowStockProductsData} />
        )}

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

        {/* Analytics Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Product Analytics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {!isLoading && stats?.mostSoldProducts && (
              <ProductAnalytics 
                title="Top Selling Products" 
                products={stats.mostSoldProducts} 
                icon={<TrendingUp className="h-4 w-4 text-green-500" />}
              />
            )}
            
            {!isLoading && stats?.leastSoldProducts && (
              <ProductAnalytics 
                title="Least Selling Products" 
                products={stats.leastSoldProducts} 
                icon={<TrendingDown className="h-4 w-4 text-amber-500" />}
              />
            )}
          </div>
        </div>
        
        <RecentOrdersList orders={stats?.recentOrders || []} />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
