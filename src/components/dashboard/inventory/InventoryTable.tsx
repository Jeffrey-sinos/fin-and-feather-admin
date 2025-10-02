
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
import { Product } from '@/types';
import { Plus, Minus } from 'lucide-react';

interface InventoryTableProps {
  products: Product[];
  onAddStock: (product: Product) => void;
  onRemoveStock: (product: Product) => void;
}

const InventoryTable: React.FC<InventoryTableProps> = ({
  products,
  onAddStock,
  onRemoveStock,
}) => {
  const getStockStatus = (stock: number) => {
    if (stock <= 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (stock <= 5) {
      return <Badge variant="destructive">Low Stock</Badge>;
    } else if (stock <= 20) {
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
        Limited Stock
      </Badge>;
    } else {
      return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
        In Stock
      </Badge>;
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableCaption>A list of all products in inventory.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Current Stock</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.length > 0 ? (
            products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    {product.image_url && (
                      <img 
                        src={product.image_url} 
                        alt={product.name} 
                        className="h-10 w-10 rounded-md object-cover"
                      />
                    )}
                    <div className="font-medium">{product.name}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={
                    product.category === 'fish'
                      ? 'bg-ocean-100 text-ocean-800 border-ocean-200'
                      : 'bg-coral-100 text-coral-800 border-coral-200'
                  }>
                    {product.category}
                  </Badge>
                </TableCell>
                <TableCell>Ksh {product.price.toFixed(2)}</TableCell>
                <TableCell className="font-medium">
                  {product.stock}
                </TableCell>
                <TableCell>
                  {getStockStatus(product.stock)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onAddStock(product)}
                      title="Add Stock"
                    >
                      <Plus className="h-4 w-4 text-green-500" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onRemoveStock(product)}
                      title="Remove Stock"
                      disabled={product.stock <= 0}
                    >
                      <Minus className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center">No products found</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default InventoryTable;
