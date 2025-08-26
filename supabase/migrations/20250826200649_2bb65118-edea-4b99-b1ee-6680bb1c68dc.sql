-- Add updated_at column to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Create trigger for automatic timestamp updates on campaigns
CREATE TRIGGER update_campaigns_updated_at
BEFORE UPDATE ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add RLS policies for updating and deleting campaigns
CREATE POLICY "Service role can update campaigns" 
ON public.campaigns 
FOR UPDATE 
USING (auth.role() = 'service_role'::text);

CREATE POLICY "Service role can delete campaigns" 
ON public.campaigns 
FOR DELETE 
USING (auth.role() = 'service_role'::text);