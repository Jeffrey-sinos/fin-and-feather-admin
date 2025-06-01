
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/dashboard/layout/DashboardLayout';
import { TrendingUp, TrendingDown, BarChart3, Map } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import ProductAnalytics from '@/components/dashboard/analytics/ProductAnalytics';
import ProductSalesChart from '@/components/dashboard/analytics/ProductSalesChart';
import SalesTimelineChart from '@/components/dashboard/analytics/SalesTimelineChart';
import CategoryPieChart from '@/components/dashboard/analytics/CategoryPieChart';
import NairobiOrdersMap from '@/components/dashboard/analytics/NairobiOrdersMap';

interface OrderWithLocation {
  id: string;
  total_amount: number;
  created_at: string;
  profiles: {
    address: string;
    full_name: string;
  };
}

const fetchProductAnalytics = async () => {
  try {
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

    // Fetch sales timeline data
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('total_amount, created_at, status')
      .eq('status', 'completed')
      .order('created_at', { ascending: true });
    
    if (ordersError) throw ordersError;

    // Fetch orders with customer location data for map
    const { data: ordersWithLocations, error: locationsError } = await supabase
      .from('orders')
      .select(`
        id,
        total_amount,
        created_at,
        user_id
      `)
      .eq('status', 'completed');
    
    if (locationsError) throw locationsError;

    // Fetch profiles separately to avoid join issues
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, address, full_name')
      .not('address', 'is', null);
    
    if (profilesError) throw profilesError;

    // Combine orders with profiles
    const ordersWithProfileData: OrderWithLocation[] = [];
    ordersWithLocations?.forEach(order => {
      const profile = profilesData?.find(p => p.id === order.user_id);
      if (profile && profile.address) {
        ordersWithProfileData.push({
          ...order,
          profiles: {
            address: profile.address,
            full_name: profile.full_name || 'Unknown'
          }
        });
      }
    });
    
    // Calculate product sales
    const productSalesMap = new Map<string, number>();
    const categorySalesMap = new Map<string, number>();
    
    orderItemsData?.forEach(item => {
      const productId = item.product_id;
      const quantity = item.quantity;
      const category = item.products?.category || 'other';
      
      // Product sales
      const currentQuantity = productSalesMap.get(productId) || 0;
      productSalesMap.set(productId, currentQuantity + quantity);
      
      // Category sales
      const currentCategoryQuantity = categorySalesMap.get(category) || 0;
      categorySalesMap.set(category, currentCategoryQuantity + quantity);
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
    
    const mostSoldProducts = sortedProductSales.slice(0, 10);
    const leastSoldProducts = [...sortedProductSales].sort((a, b) => a.totalSold - b.totalSold).slice(0, 10);

    // Prepare category data for pie chart
    const categoryData = Array.from(categorySalesMap.entries()).map(([category, quantity]) => ({
      name: category,
      value: quantity,
      fill: category === 'fish' ? '#0EA5E9' : category === 'chicken' ? '#F97316' : '#8B5CF6'
    }));

    // Prepare timeline data
    const timelineData = ordersData?.map(order => ({
      date: new Date(order.created_at).toLocaleDateString(),
      sales: Number(order.total_amount)
    })) || [];

    // Group timeline data by date
    const groupedTimelineData = timelineData.reduce((acc, curr) => {
      const existing = acc.find(item => item.date === curr.date);
      if (existing) {
        existing.sales += curr.sales;
      } else {
        acc.push({ ...curr });
      }
      return acc;
    }, [] as typeof timelineData);

    return {
      mostSoldProducts,
      leastSoldProducts,
      categoryData,
      timelineData: groupedTimelineData,
      ordersWithLocations: ordersWithProfileData
    };
  } catch (error) {
    console.error('Error fetching product analytics:', error);
    toast({
      title: "Error",
      description: "Failed to load product analytics",
      variant: "destructive"
    });
    throw error;
  }
};

const ProductAnalyticsPage = () => {
  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ['productAnalytics'],
    queryFn: fetchProductAnalytics,
  });

  if (error) {
    console.error('Error loading product analytics:', error);
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Product Analytics</h1>
          <BarChart3 className="h-8 w-8 text-ocean-500" />
        </div>
        
        {/* Sales Overview Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Sales Overview</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Timeline Chart */}
            {!isLoading && analytics?.timelineData && (
              <SalesTimelineChart 
                title="Sales Timeline" 
                data={analytics.timelineData}
              />
            )}
            
            {/* Category Distribution Pie Chart */}
            {!isLoading && analytics?.categoryData && (
              <CategoryPieChart 
                title="Sales by Category" 
                data={analytics.categoryData}
              />
            )}
          </div>
        </div>

        {/* Top Selling Products Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Top Selling Products</h2>
          
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {!isLoading && analytics?.mostSoldProducts && (
              <>
                <ProductSalesChart 
                  title="Top Selling Products Chart" 
                  products={analytics.mostSoldProducts} 
                  type="most"
                  icon={<TrendingUp className="h-4 w-4 text-green-500" />}
                />
                <ProductAnalytics 
                  title="Top Selling Products Details" 
                  products={analytics.mostSoldProducts} 
                  icon={<TrendingUp className="h-4 w-4 text-green-500" />}
                />
              </>
            )}
          </div>
        </div>
        
        {/* Least Selling Products Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Least Selling Products</h2>
          
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {!isLoading && analytics?.leastSoldProducts && (
              <>
                <ProductSalesChart 
                  title="Least Selling Products Chart" 
                  products={analytics.leastSoldProducts} 
                  type="least"
                  icon={<TrendingDown className="h-4 w-4 text-amber-500" />}
                />
                <ProductAnalytics 
                  title="Least Selling Products Details" 
                  products={analytics.leastSoldProducts} 
                  icon={<TrendingDown className="h-4 w-4 text-amber-500" />}
                />
              </>
            )}
          </div>
        </div>

        {/* Geographic Distribution Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">Geographic Distribution</h2>
            <Map className="h-6 w-6 text-ocean-500" />
          </div>
          
          {!isLoading && analytics?.ordersWithLocations && (
            <NairobiOrdersMap orders={analytics.ordersWithLocations} />
          )}
        </div>
        
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" role="status">
              <span className="sr-only">Loading...</span>
            </div>
            <p className="mt-4 text-muted-foreground">Loading analytics data...</p>
          </div>
        )}
        
        {!isLoading && (!analytics?.mostSoldProducts?.length && !analytics?.leastSoldProducts?.length) && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No sales data available. Add some orders to see analytics.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ProductAnalyticsPage;
