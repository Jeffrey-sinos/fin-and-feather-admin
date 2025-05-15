
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/dashboard/layout/DashboardLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, Minus } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types';
import InventoryTable from '@/components/dashboard/inventory/InventoryTable';
import StockUpdateModal from '@/components/dashboard/inventory/StockUpdateModal';

// Fetch products from Supabase
const fetchProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name');
  
  if (error) {
    toast({
      title: "Error",
      description: "Failed to load products",
      variant: "destructive"
    });
    throw error;
  }
  
  return data as Product[];
};

// Update product stock in Supabase
const updateProductStock = async ({ id, stock }: { id: string; stock: number }): Promise<Product> => {
  const { data, error } = await supabase
    .from('products')
    .update({ stock })
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    toast({
      title: "Error",
      description: "Failed to update stock",
      variant: "destructive"
    });
    throw error;
  }
  
  return data as Product;
};

const Inventory = () => {
  const queryClient = useQueryClient();
  const [filterValue, setFilterValue] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateType, setUpdateType] = useState<'add' | 'remove'>('add');

  // Queries
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  });

  // Filter products based on search input
  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(filterValue.toLowerCase()) ||
    product.description?.toLowerCase().includes(filterValue.toLowerCase()) ||
    product.category?.toLowerCase().includes(filterValue.toLowerCase())
  );

  // Stock update mutation
  const stockMutation = useMutation({
    mutationFn: updateProductStock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsUpdateModalOpen(false);
      setSelectedProduct(null);
      toast({
        title: "Success",
        description: `Stock ${updateType === 'add' ? 'added to' : 'removed from'} product successfully`,
      });
    },
  });

  // Handlers
  const handleAddStock = (product: Product) => {
    setSelectedProduct(product);
    setUpdateType('add');
    setIsUpdateModalOpen(true);
  };

  const handleRemoveStock = (product: Product) => {
    setSelectedProduct(product);
    setUpdateType('remove');
    setIsUpdateModalOpen(true);
  };

  const handleStockUpdate = (quantity: number) => {
    if (!selectedProduct) return;
    
    const currentStock = selectedProduct.stock;
    let newStock: number;
    
    if (updateType === 'add') {
      newStock = currentStock + quantity;
    } else {
      newStock = Math.max(0, currentStock - quantity); // Prevent negative stock
    }
    
    stockMutation.mutate({ 
      id: selectedProduct.id, 
      stock: newStock 
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-3xl font-bold">Inventory Management</h1>
        </div>

        <div className="flex items-center border rounded-md px-3 py-2 max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground mr-2" />
          <Input 
            placeholder="Search products..." 
            className="border-0 p-0 focus-visible:ring-0 focus-visible:outline-none"
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" role="status">
                <span className="sr-only">Loading...</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Loading inventory...</p>
            </div>
          </div>
        ) : (
          <InventoryTable
            products={filteredProducts}
            onAddStock={handleAddStock}
            onRemoveStock={handleRemoveStock}
          />
        )}
      </div>

      {/* Stock Update Modal */}
      <StockUpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        onConfirm={handleStockUpdate}
        product={selectedProduct}
        updateType={updateType}
        isSubmitting={stockMutation.isPending}
      />
    </DashboardLayout>
  );
};

export default Inventory;
