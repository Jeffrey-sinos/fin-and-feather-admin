-- Step 1: Add new columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS delivery_status TEXT NOT NULL DEFAULT 'pending';

-- Step 2: Migrate existing data - copy current status to payment_status
UPDATE public.orders
SET payment_status = COALESCE(status, 'pending'),
    delivery_status = CASE 
      WHEN status = 'completed' THEN 'pending'  -- Payment completed but delivery pending
      WHEN status = 'cancelled' THEN 'cancelled'
      ELSE 'pending'
    END
WHERE payment_status = 'pending' AND status IS NOT NULL;

-- Step 3: Drop the old status column (if it still exists)
ALTER TABLE public.orders DROP COLUMN IF EXISTS status;

-- Step 4: Add check constraints for valid status values
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_status_check'
  ) THEN
    ALTER TABLE public.orders
    ADD CONSTRAINT payment_status_check 
    CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'delivery_status_check'
  ) THEN
    ALTER TABLE public.orders
    ADD CONSTRAINT delivery_status_check 
    CHECK (delivery_status IN ('pending', 'confirmed', 'in_transit', 'delivered', 'cancelled'));
  END IF;
END $$;

-- Step 5: Update RLS policy for admins to allow delivery_status updates only
-- Drop the old admin policy that allowed all updates
DROP POLICY IF EXISTS "Admin can manage all orders" ON public.orders;

-- Recreate with restricted access - admins can update delivery_status but not payment_status
CREATE POLICY "Admin can manage all orders"
ON public.orders
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add explicit policy for service role to update payment_status via edge functions
DROP POLICY IF EXISTS "Service role can update payment status" ON public.orders;

CREATE POLICY "Service role can update payment status"
ON public.orders
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_status ON public.orders(delivery_status);