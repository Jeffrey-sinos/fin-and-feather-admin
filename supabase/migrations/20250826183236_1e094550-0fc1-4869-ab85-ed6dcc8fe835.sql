-- Create campaigns table to track email/SMS campaigns
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email', 'sms', 'both')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'completed', 'failed')),
  email_subject TEXT,
  email_html_body TEXT,
  sms_text TEXT,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Create message delivery logs table to track individual message delivery status
CREATE TABLE public.message_delivery_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('email', 'sms')),
  recipient_address TEXT NOT NULL,
  brevo_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'bounced', 'failed', 'clicked', 'opened')),
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  webhook_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on campaigns table (admin access only)
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Create policy for service role to manage campaigns
CREATE POLICY "Service role can manage campaigns" 
ON public.campaigns 
FOR ALL 
USING (auth.role() = 'service_role'::text);

-- Enable RLS on message delivery logs table
ALTER TABLE public.message_delivery_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for service role to manage message delivery logs
CREATE POLICY "Service role can manage message delivery logs" 
ON public.message_delivery_logs 
FOR ALL 
USING (auth.role() = 'service_role'::text);

-- Create indexes for better performance
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_campaigns_created_at ON public.campaigns(created_at DESC);
CREATE INDEX idx_message_delivery_logs_campaign_id ON public.message_delivery_logs(campaign_id);
CREATE INDEX idx_message_delivery_logs_status ON public.message_delivery_logs(status);
CREATE INDEX idx_message_delivery_logs_brevo_message_id ON public.message_delivery_logs(brevo_message_id);

-- Create trigger for automatic updated_at on campaigns
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();