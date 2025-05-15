
import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Order } from '@/types';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { Mail, Phone, MapPin } from 'lucide-react';

interface OrderDetailsProps {
  order: Order;
  onStatusChange: (status: Order['status']) => void;
}

const OrderDetails: React.FC<OrderDetailsProps> = ({ order, onStatusChange }) => {
  const [updatingStatus, setUpdatingStatus] = React.useState(false);
  
  const handleStatusChange = async (status: Order['status']) => {
    if (status === order.status) return;
    
    setUpdatingStatus(true);
    
    try {
      onStatusChange(status);
    } catch (error) {
      console.error(error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Order #{order.id.substring(0, 8)}</h2>
          <p className="text-muted-foreground">
            Placed on {format(new Date(order.created_at), 'PPP')}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="font-medium text-sm">Status:</div>
          <Select
            value={order.status}
            onValueChange={handleStatusChange}
            disabled={updatingStatus}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue>
                <Badge variant="outline" className={getStatusColor(order.status)}>
                  {order.status}
                </Badge>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="grid grid-cols-[100px_1fr] gap-1">
                <div className="text-muted-foreground">Name:</div>
                <div className="font-medium">{order.customer?.name || 'Unknown'}</div>
              </div>
              
              {order.customer?.email && (
                <div className="grid grid-cols-[100px_1fr] gap-1">
                  <div className="text-muted-foreground">Email:</div>
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                    {order.customer.email}
                  </div>
                </div>
              )}
              
              {order.customer?.phone && (
                <div className="grid grid-cols-[100px_1fr] gap-1">
                  <div className="text-muted-foreground">Phone:</div>
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                    {order.customer.phone}
                  </div>
                </div>
              )}
              
              {order.customer?.address && (
                <div className="grid grid-cols-[100px_1fr] gap-1">
                  <div className="text-muted-foreground">Address:</div>
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                    {order.customer.address}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-[100px_1fr] gap-1">
                <div className="text-muted-foreground">Items:</div>
                <div className="font-medium">{order.items.length}</div>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-1">
                <div className="text-muted-foreground">Total:</div>
                <div className="font-bold text-xl">${Number(order.total_amount).toFixed(2)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
          <CardDescription>
            Items included in this order
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      {item.products.image_url && (
                        <img
                          src={item.products.image_url}
                          alt={item.products.name}
                          className="h-10 w-10 rounded-md object-cover"
                        />
                      )}
                      <div>
                        <div className="font-medium">{item.products.name}</div>
                        <div className="text-sm text-muted-foreground">
                          <Badge variant="outline" className={
                            item.products.category === 'fish'
                              ? 'bg-ocean-100 text-ocean-800 border-ocean-200'
                              : 'bg-coral-100 text-coral-800 border-coral-200'
                          }>
                            {item.products.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>${Number(item.unit_price).toFixed(2)}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    ${(Number(item.unit_price) * item.quantity).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderDetails;
