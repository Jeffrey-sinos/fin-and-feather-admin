-- Add updated_at column to campaigns table (if it doesn't exist)
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Add RLS policies for updating and deleting campaigns (if they don't exist)
DO $$ 
BEGIN
    -- Check if update policy exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'campaigns' 
        AND policyname = 'Service role can update campaigns'
    ) THEN
        EXECUTE 'CREATE POLICY "Service role can update campaigns" 
                ON public.campaigns 
                FOR UPDATE 
                USING (auth.role() = ''service_role''::text)';
    END IF;

    -- Check if delete policy exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'campaigns' 
        AND policyname = 'Service role can delete campaigns'
    ) THEN
        EXECUTE 'CREATE POLICY "Service role can delete campaigns" 
                ON public.campaigns 
                FOR DELETE 
                USING (auth.role() = ''service_role''::text)';
    END IF;
END $$;