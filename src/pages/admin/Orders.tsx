import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/dashboard/layout/DashboardLayout';
import OrdersTable from '@/components/dashboard/orders/OrdersTable';
import OrderDetails from '@/components/dashboard/orders/OrderDetails';
import { Order, processOrder } from '@/types';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

type StatusFilter = "all" | "pending" | "processing" | "completed" | "cancelled";

// Fetch all orders from Supabase
const fetchOrders = async (): Promise<Order[]> => {
  try {
    // Get orders
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (ordersError) throw ordersError;
    
    // Get order items and customer data for each order
    const orders = await Promise.all((ordersData || []).map(async (order) => {
      // Get order items
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          products(*)
        `)
        .eq('order_id', order.id);
      
      if (itemsError) throw itemsError;
      
      // Get customer profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', order.user_id)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is fine
        console.error('Error fetching profile data:', profileError);
      }
      
      // For email, we can use RPC or REST function to access auth.users
      // Since we can't directly query auth.users from the client
      // For now, we'll simulate having the user email
      const userData = { email: `user-${order.user_id.substring(0, 8)}@example.com` };

      // Create the processed order with all necessary data
      const processedOrder = {
        ...order,
        items: items || [],
        profiles: profileData || undefined,
        user: userData || undefined
      };
      
      return processOrder(processedOrder);
    }));
    
    return orders;
  } catch (error) {
    console.error('Error fetching orders:', error);
    toast({
      title: "Error",
      description: "Failed to load orders",
      variant: "destructive"
    });
    throw error;
  }
};

// Fetch a single order from Supabase
const fetchOrder = async (id: string): Promise<Order | null> => {
  try {
    // Get order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();
    
    if (orderError) throw orderError;
    
    // Get order items
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select(`
        *,
        products(*)
      `)
      .eq('order_id', id);
    
    if (itemsError) throw itemsError;
    
    // Get customer profile data
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', order.user_id)
      .single();
    
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching profile data:', profileError);
    }
    
    // For email, we can use RPC or REST function to access auth.users
    // Since we can't directly query auth.users from the client
    // For now, we'll simulate having the user email
    const userData = { email: `user-${order.user_id.substring(0, 8)}@example.com` };

    // Process the order with our utility function
    return processOrder({
      ...order,
      items: items || [],
      profiles: profileData || undefined,
      user: userData || undefined
    });
  } catch (error) {
    console.error(`Error fetching order ${id}:`, error);
    toast({
      title: "Error",
      description: "Failed to load order details",
      variant: "destructive"
    });
    throw error;
  }
};

// Update order status in Supabase
const updateOrderStatusInSupabase = async (id: string, status: Order['status']): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id);
    
    if (error) throw error;
    
    toast({
      title: "Success",
      description: `Order status updated to ${status}`,
    });
    return true;
  } catch (error) {
    console.error(`Error updating order ${id} status:`, error);
    toast({
      title: "Error",
      description: "Failed to update order status",
      variant: "destructive"
    });
    throw error;
  }
};

const Orders = () => {
  const queryClient = useQueryClient();
  const [filterValue, setFilterValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);

  // Queries
  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ['orders'],
    queryFn: fetchOrders,
  });

  if (error) {
    console.error('Error loading orders data:', error);
  }

  const { data: selectedOrder } = useQuery({
    queryKey: ['order', selectedOrderId],
    queryFn: () => selectedOrderId ? fetchOrder(selectedOrderId) : null,
    enabled: !!selectedOrderId,
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Order['status'] }) => 
      updateOrderStatusInSupabase(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', selectedOrderId] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });

  // Filter orders based on search input and status
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(filterValue.toLowerCase()) ||
      (order.customer?.name && order.customer.name.toLowerCase().includes(filterValue.toLowerCase())) ||
      (order.customer?.email && order.customer.email.toLowerCase().includes(filterValue.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Handlers
  const handleViewDetails = (order: Order) => {
    setSelectedOrderId(order.id);
    setViewDetailsOpen(true);
  };

  const handleOrderStatusChange = (id: string, status: Order['status']) => {
    updateStatusMutation.mutate({ id, status });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-3xl font-bold">Orders</h1>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center border rounded-md px-3 py-2 flex-1 max-w-sm">
            <Search className="h-4 w-4 text-muted-foreground mr-2" />
            <Input 
              placeholder="Search orders..." 
              className="border-0 p-0 focus-visible:ring-0 focus-visible:outline-none"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
            />
          </div>
          
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" role="status">
                <span className="sr-only">Loading...</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Loading orders...</p>
            </div>
          </div>
        ) : (
          <OrdersTable
            orders={filteredOrders}
            onViewDetails={handleViewDetails}
          />
        )}
      </div>

      {/* Order Details Dialog */}
      <Dialog 
        open={viewDetailsOpen} 
        onOpenChange={(open) => {
          setViewDetailsOpen(open);
          if (!open) {
            setSelectedOrderId(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Detailed information about the order.
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <OrderDetails 
              order={selectedOrder} 
              onStatusChange={(status) => handleOrderStatusChange(selectedOrder.id, status)}
            />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Orders;
