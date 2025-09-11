
import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Product } from '@/types';
import { AlertTriangle } from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface LowStockAlertProps {
  products: Product[];
}

const LowStockAlert: React.FC<LowStockAlertProps> = ({ products }) => {
  const criticalStockThreshold = 10;

  const getStockStatus = (stock: number) => {
    if (stock <= criticalStockThreshold) {
      return <Badge variant="destructive">Critical</Badge>;
    } else {
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
        Low
      </Badge>;
    }
  };

  const getStockPercentage = (stock: number) => {
    return Math.min(Math.max((stock / 20) * 100, 0), 100);
  };

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
            Low Stock Alert
          </CardTitle>
          <Button asChild variant="outline" size="sm" className="bg-white">
            <Link to="/admin/inventory">
              View Inventory
            </Link>
          </Button>
        </div>
        <CardDescription className="text-yellow-800">
          {products.length} products with stock level below 20 units
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Current Stock</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id} className="border-yellow-200">
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>
                  {product.category && (
                    <Badge variant="outline" className={
                      product.category === 'fish'
                        ? 'bg-ocean-100 text-ocean-800 border-ocean-200'
                        : 'bg-coral-100 text-coral-800 border-coral-200'
                    }>
                      {product.category}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>Ksh {product.price.toFixed(2)}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className={product.stock <= criticalStockThreshold ? "text-red-600 font-medium" : "text-yellow-700"}>
                        {product.stock} units
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {getStockPercentage(product.stock).toFixed(0)}%
                      </span>
                    </div>
                    <Progress 
                      value={getStockPercentage(product.stock)} 
                      className={product.stock <= criticalStockThreshold 
                        ? "h-2 bg-red-100" 
                        : "h-2 bg-yellow-100"
                      } 
                      indicatorClassName={product.stock <= criticalStockThreshold 
                        ? "bg-red-500" 
                        : "bg-yellow-500"
                      }
                    />
                  </div>
                </TableCell>
                <TableCell>{getStockStatus(product.stock)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default LowStockAlert;
