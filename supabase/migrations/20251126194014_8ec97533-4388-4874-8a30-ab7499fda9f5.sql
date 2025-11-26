-- Create admin_notifications table
CREATE TABLE public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'order',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS - only admins can access
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notifications" 
ON public.admin_notifications
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for live updates in UI
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;

-- Create function to notify admins when order is completed
CREATE OR REPLACE FUNCTION public.notify_admin_on_order_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  customer_name TEXT;
BEGIN
  -- Only trigger when status changes TO 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    -- Get customer name
    SELECT COALESCE(full_name, 'Unknown Customer') INTO customer_name
    FROM public.profiles WHERE id = NEW.user_id;
    
    -- Insert notification
    INSERT INTO public.admin_notifications (type, title, message, order_id)
    VALUES (
      'order',
      'New Order Completed',
      'Order from ' || customer_name || ' for KES ' || NEW.total_amount || ' has been completed.',
      NEW.id
    );
    
    RAISE LOG 'Admin notification created for order %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger on orders table
CREATE TRIGGER on_order_completed
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_on_order_completion();