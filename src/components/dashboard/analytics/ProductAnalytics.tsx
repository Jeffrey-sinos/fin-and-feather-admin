
import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface ProductSalesData {
  productId: string;
  name: string;
  totalSold: number;
  category: string;
  price: number;
  stock: number;
}

interface ProductAnalyticsProps {
  title: string;
  products: ProductSalesData[];
  icon: React.ReactNode;
}

const ProductAnalytics: React.FC<ProductAnalyticsProps> = ({
  title,
  products,
  icon
}) => {
  if (!products || products.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            {icon}
          </div>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {icon}
        </div>
        <CardDescription>Based on order history</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-h-[200px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Sold</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.productId}>
                  <TableCell className="font-medium truncate max-w-[150px]" title={product.name}>
                    {product.name}
                  </TableCell>
                  <TableCell className="text-right">{product.totalSold}</TableCell>
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
                  <TableCell className={
                    `text-right ${product.stock < 20 ? 'text-amber-600 font-medium' : ''}`
                  }>
                    {product.stock}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductAnalytics;
