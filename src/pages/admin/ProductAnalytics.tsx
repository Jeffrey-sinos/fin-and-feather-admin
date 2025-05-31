
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/dashboard/layout/DashboardLayout';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import ProductAnalytics from '@/components/dashboard/analytics/ProductAnalytics';
import ProductSalesChart from '@/components/dashboard/analytics/ProductSalesChart';

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
    
    const mostSoldProducts = sortedProductSales.slice(0, 10);
    const leastSoldProducts = [...sortedProductSales].sort((a, b) => a.totalSold - b.totalSold).slice(0, 10);
    
    return {
      mostSoldProducts,
      leastSoldProducts
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Product Analytics</h1>
          <BarChart3 className="h-8 w-8 text-ocean-500" />
        </div>
        
        {/* Most Sold Products Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Top Selling Products</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
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
        
        {/* Least Sold Products Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Least Selling Products</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
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
        
        {isLoading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading product analytics...</p>
          </div>
        )}
        
        {!isLoading && (!analytics?.mostSoldProducts?.length && !analytics?.leastSoldProducts?.length) && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No sales data available. Add some orders to see analytics.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ProductAnalyticsPage;
