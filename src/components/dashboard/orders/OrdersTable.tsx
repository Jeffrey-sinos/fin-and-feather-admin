
import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Order } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { RefreshCw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface OrdersTableProps {
  orders: Order[];
  onViewDetails: (order: Order) => void;
  onCheckPaymentStatus?: (orderId: string) => void;
  isCheckingPayment?: boolean;
}

const OrdersTable: React.FC<OrdersTableProps> = ({
  orders,
  onViewDetails,
  onCheckPaymentStatus,
  isCheckingPayment,
}) => {
  const getPaymentStatusColor = (status: Order['payment_status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'refunded':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDeliveryStatusColor = (status: Order['delivery_status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_transit':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableCaption>A list of all orders.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Order ID</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead>Delivery</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Items</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length > 0 ? (
            orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.id.substring(0, 8)}...</TableCell>
                <TableCell>{order.customer?.name || 'Unknown'}</TableCell>
                <TableCell>{order.customer?.email || 'N/A'}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={getPaymentStatusColor(order.payment_status)}>
                    {order.payment_status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getDeliveryStatusColor(order.delivery_status)}>
                    {order.delivery_status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>{formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}</TableCell>
                <TableCell>Ksh {order.total_amount.toFixed(2)}</TableCell>
                <TableCell>{order.items.length} items</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {order.payment_status === 'pending' && onCheckPaymentStatus && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onCheckPaymentStatus(order.id)}
                              disabled={isCheckingPayment}
                            >
                              <RefreshCw className={`h-4 w-4 ${isCheckingPayment ? 'animate-spin' : ''}`} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Check Payment Status</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDetails(order)}
                    >
                      View Details
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={9} className="text-center">No orders found</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default OrdersTable;
