import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/dashboard/layout/DashboardLayout';
import ProductsTable from '@/components/dashboard/products/ProductsTable';
import ProductForm, { ProductFormData } from '@/components/dashboard/products/ProductForm';
import { Button } from '@/components/ui/button';
import { Product } from '@/types';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { exportToCSV } from '@/utils/csvExport';

// Fetch products from Supabase
const fetchProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .is('deleted_at', null)
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

// Create a new product
const createProductInSupabase = async (product: Omit<Product, 'id' | 'created_at'>): Promise<Product> => {
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .single();
  
  if (error) {
    toast({
      title: "Error",
      description: "Failed to create product",
      variant: "destructive"
    });
    throw error;
  }
  
  return data as Product;
};

// Update an existing product
const updateProductInSupabase = async ({ id, data }: { id: string; data: Partial<Product> }): Promise<Product> => {
  const { data: updatedData, error } = await supabase
    .from('products')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    toast({
      title: "Error",
      description: "Failed to update product",
      variant: "destructive"
    });
    throw error;
  }
  
  return updatedData as Product;
};

// Delete a product (soft delete)
const deleteProductFromSupabase = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('products')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  
  if (error) {
    toast({
      title: "Error",
      description: "Failed to delete product",
      variant: "destructive"
    });
    throw error;
  }
};

const Products = () => {
  const queryClient = useQueryClient();
  const [filterValue, setFilterValue] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

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

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: ProductFormData) => {
      // Ensure all required fields are present
      const productData = {
        name: data.name,
        description: data.description || '',
        price: data.price,
        category: data.category,
        stock: data.stock,
        image_url: data.image_url || null
      };
      return createProductInSupabase(productData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Product created successfully",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProductFormData }) => {
      // Ensure all required fields are present
      const productData = {
        name: data.name,
        description: data.description || '',
        price: data.price,
        category: data.category,
        stock: data.stock,
        image_url: data.image_url || null
      };
      return updateProductInSupabase({ id, data: productData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsEditDialogOpen(false);
      setEditingProduct(null);
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProductFromSupabase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setProductToDelete(null);
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
    },
  });

  // Handlers
  const handleCreateSubmit = (data: ProductFormData) => {
    createMutation.mutate(data);
  };

  const handleUpdateSubmit = (data: ProductFormData) => {
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data });
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (product: Product) => {
    setProductToDelete(product);
  };

  const confirmDelete = () => {
    if (productToDelete) {
      deleteMutation.mutate(productToDelete.id);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-3xl font-bold">Products</h1>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                exportToCSV(filteredProducts, 'products', [
                  { key: 'name', header: 'Name' },
                  { key: 'category', header: 'Category' },
                  { key: (p) => `Ksh ${p.price.toFixed(2)}`, header: 'Price' },
                  { key: 'stock', header: 'Stock' },
                  { key: 'description', header: 'Description' },
                ]);
                toast({ title: 'Export Complete', description: 'Products exported to CSV' });
              }}
              disabled={filteredProducts.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Create New Product</DialogTitle>
                  <DialogDescription>
                    Add a new product to your inventory.
                  </DialogDescription>
                </DialogHeader>
                <ProductForm 
                  onSubmit={handleCreateSubmit}
                  isSubmitting={createMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
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
              <p className="mt-2 text-sm text-muted-foreground">Loading products...</p>
            </div>
          </div>
        ) : (
          <ProductsTable
            products={filteredProducts}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update product information.
            </DialogDescription>
          </DialogHeader>
          {editingProduct && (
            <ProductForm
              product={editingProduct}
              onSubmit={handleUpdateSubmit}
              isSubmitting={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!productToDelete} onOpenChange={() => setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the product "{productToDelete?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Products;
