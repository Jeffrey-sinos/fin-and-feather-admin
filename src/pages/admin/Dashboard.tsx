
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDashboardStats } from '@/lib/supabase';
import DashboardLayout from '@/components/dashboard/layout/DashboardLayout';
import StatsCard from '@/components/dashboard/overview/StatsCard';
import RecentOrdersList from '@/components/dashboard/overview/RecentOrdersList';
import { Package, ShoppingCart, Users, DollarSign } from 'lucide-react';

const Dashboard = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: getDashboardStats,
  });

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
