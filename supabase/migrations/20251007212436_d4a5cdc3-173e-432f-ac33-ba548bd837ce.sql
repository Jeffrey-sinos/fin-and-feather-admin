-- Fix trigger function to use payment_status instead of non-existent orders.status
CREATE OR REPLACE FUNCTION public.handle_order_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only process when payment_status transitions to 'completed'
  IF NEW.payment_status = 'completed' AND (OLD.payment_status IS DISTINCT FROM 'completed') THEN
    -- Reduce stock for this order
    PERFORM public.reduce_product_stock(NEW.id);
    RAISE LOG 'Stock reduction triggered for order %', NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Ensure trigger remains enabled (no-op if already enabled)
ALTER TABLE public.orders ENABLE TRIGGER trigger_reduce_stock_on_completion;