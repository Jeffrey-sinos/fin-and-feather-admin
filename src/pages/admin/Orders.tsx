import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/dashboard/layout/DashboardLayout';
import OrdersTable from '@/components/dashboard/orders/OrdersTable';
import OrderDetails from '@/components/dashboard/orders/OrderDetails';
import { Order, processOrder } from '@/types';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

type PaymentStatusFilter = "all" | "pending" | "completed" | "failed" | "refunded";
type DeliveryStatusFilter = "all" | "pending" | "confirmed" | "in_transit" | "delivered" | "cancelled";

// Fetch orders with pagination from Supabase
const fetchOrders = async (
  page: number = 1, 
  pageSize: number = 10, 
  paymentFilter: PaymentStatusFilter = "all",
  deliveryFilter: DeliveryStatusFilter = "all",
  searchQuery: string = ""
): Promise<{ orders: Order[], totalCount: number }> => {
  try {
    const offset = (page - 1) * pageSize;
    
    // Build the query
    let query = supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);
    
    // Apply payment status filter
    if (paymentFilter !== "all") {
      query = query.eq('payment_status', paymentFilter);
    }
    
    // Apply delivery status filter
    if (deliveryFilter !== "all") {
      query = query.eq('delivery_status', deliveryFilter);
    }
    
    // Get orders with count
    const { data: ordersData, error: ordersError, count } = await query;
    
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

      // Create the processed order with all necessary data
      const processedOrder = {
        ...order,
        items: items || [],
        profiles: profileData || undefined
      };
      
      return processOrder(processedOrder);
    }));
    
    // Filter orders by search query on the client side for more complex search
    const filteredOrders = orders.filter(order => {
      if (!searchQuery) return true;
      
      const matchesSearch = 
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.customer?.name && order.customer.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (order.customer?.email && order.customer.email.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return matchesSearch;
    });
    
    return { orders: filteredOrders, totalCount: count || 0 };
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

    // Process the order with our utility function
    return processOrder({
      ...order,
      items: items || [],
      profiles: profileData || undefined
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

// Update order delivery status in Supabase (payment_status is read-only)
const updateOrderDeliveryStatusInSupabase = async (id: string, deliveryStatus: Order['delivery_status']): Promise<boolean> => {
  try {
    // Only update delivery_status, payment_status is managed by edge functions
    const { error } = await supabase
      .from('orders')
      .update({ delivery_status: deliveryStatus })
      .eq('id', id);
    
    if (error) throw error;
    
    toast({
      title: "Success",
      description: `Delivery status updated to ${deliveryStatus.replace('_', ' ')}`,
    });
    return true;
  } catch (error) {
    console.error(`Error updating order ${id} delivery status:`, error);
    toast({
      title: "Error",
      description: error instanceof Error ? error.message : "Failed to update delivery status",
      variant: "destructive"
    });
    throw error;
  }
};

const Orders = () => {
  const queryClient = useQueryClient();
  const [filterValue, setFilterValue] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatusFilter>("all");
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryStatusFilter>("all");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Queries
  const { data: ordersData, isLoading, error } = useQuery({
    queryKey: ['orders', currentPage, pageSize, paymentFilter, deliveryFilter, filterValue],
    queryFn: () => fetchOrders(currentPage, pageSize, paymentFilter, deliveryFilter, filterValue),
  });

  const orders = ordersData?.orders || [];
  const totalCount = ordersData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  if (error) {
    console.error('Error loading orders data:', error);
  }

  const { data: selectedOrder } = useQuery({
    queryKey: ['order', selectedOrderId],
    queryFn: () => selectedOrderId ? fetchOrder(selectedOrderId) : null,
    enabled: !!selectedOrderId,
  });

  // Update delivery status mutation
  const updateDeliveryStatusMutation = useMutation({
    mutationFn: ({ id, deliveryStatus }: { id: string; deliveryStatus: Order['delivery_status'] }) => 
      updateOrderDeliveryStatusInSupabase(id, deliveryStatus),
    onSuccess: () => {
      // After updating delivery status, invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', selectedOrderId] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });

  // Check payment status mutation
  const checkPaymentStatusMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase.functions.invoke('check-pesapal-status', {
        body: { orderId }
      });
      
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to check payment status');
      
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Payment Status Updated",
        description: `Status: ${data.status}`,
      });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', selectedOrderId] });
    },
    onError: (error) => {
      console.error("Error checking payment status:", error);
      toast({
        title: "Error",
        description: "Failed to check payment status",
        variant: "destructive"
      });
    },
  });

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [paymentFilter, deliveryFilter, filterValue]);

  // Handlers
  const handleViewDetails = (order: Order) => {
    setSelectedOrderId(order.id);
    setViewDetailsOpen(true);
  };

  const handleOrderDeliveryStatusChange = (id: string, deliveryStatus: Order['delivery_status']) => {
    updateDeliveryStatusMutation.mutate({ id, deliveryStatus });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(parseInt(newPageSize));
    setCurrentPage(1);
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
          
          <Select value={paymentFilter} onValueChange={(value) => setPaymentFilter(value as PaymentStatusFilter)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Payment status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={deliveryFilter} onValueChange={(value) => setDeliveryFilter(value as DeliveryStatusFilter)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Delivery status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Deliveries</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="in_transit">In Transit</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 per page</SelectItem>
              <SelectItem value="10">10 per page</SelectItem>
              <SelectItem value="20">20 per page</SelectItem>
              <SelectItem value="50">50 per page</SelectItem>
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
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {orders.length} of {totalCount} orders
              </p>
            </div>
            
            <OrdersTable
              orders={orders}
              onViewDetails={handleViewDetails}
              onCheckPaymentStatus={(orderId) => checkPaymentStatusMutation.mutate(orderId)}
              isCheckingPayment={checkPaymentStatusMutation.isPending}
            />

            {totalPages > 1 && (
              <div className="flex items-center justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    
                    {[...Array(totalPages)].map((_, index) => {
                      const page = index + 1;
                      const isCurrentPage = page === currentPage;
                      
                      // Show first page, last page, current page, and pages around current
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => handlePageChange(page)}
                              isActive={isCurrentPage}
                              className={`cursor-pointer ${isCurrentPage ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}`}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      }
                      
                      // Show ellipsis
                      if (page === currentPage - 2 || page === currentPage + 2) {
                        return (
                          <PaginationItem key={page}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }
                      
                      return null;
                    })}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
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
              onDeliveryStatusChange={(deliveryStatus) => handleOrderDeliveryStatusChange(selectedOrder.id, deliveryStatus)}
            />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Orders;
