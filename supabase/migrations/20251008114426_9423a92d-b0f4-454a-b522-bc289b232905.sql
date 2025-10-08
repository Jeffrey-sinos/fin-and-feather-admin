-- Fix audit_logs RLS to only allow service role to insert (not clients)
-- This prevents the 403 errors when clients try to log audit entries

-- Drop any existing INSERT policies on audit_logs
DROP POLICY IF EXISTS "Users can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow authenticated users to insert audit logs" ON public.audit_logs;

-- Create policy to allow only service role to insert audit logs
CREATE POLICY "Service role can insert audit logs" 
ON public.audit_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;