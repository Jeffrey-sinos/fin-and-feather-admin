-- Add deleted_at column to products table for soft deletes
ALTER TABLE public.products 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for better performance when filtering out deleted products
CREATE INDEX idx_products_deleted_at ON public.products(deleted_at) WHERE deleted_at IS NULL;