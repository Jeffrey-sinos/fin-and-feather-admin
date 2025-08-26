import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BrevoEmailWebhookEvent {
  event: 'delivered' | 'soft_bounce' | 'hard_bounce' | 'spam' | 'blocked' | 'invalid_email' | 'deferred' | 'click' | 'opened' | 'unique_opened';
  email: string;
  id: number;
  date: string;
  message_id: string;
  template_id?: number;
  subject?: string;
  reason?: string;
  link?: string;
}

interface BrevoSmsWebhookEvent {
  event: 'delivered' | 'sent' | 'failed' | 'soft_bounce' | 'hard_bounce';
  mobile: string;
  date: string;
  message_id: string;
  reason?: string;
  reply?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      supabaseServiceKey
    );

    const webhookData = await req.json();
    console.log('Received Brevo webhook:', JSON.stringify(webhookData, null, 2));

    // Handle different webhook event types
    if (webhookData.email) {
      // Email webhook event
      await handleEmailWebhook(supabase, webhookData as BrevoEmailWebhookEvent);
    } else if (webhookData.mobile) {
      // SMS webhook event
      await handleSmsWebhook(supabase, webhookData as BrevoSmsWebhookEvent);
    } else {
      console.log('Unknown webhook event type:', webhookData);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook processed successfully' 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in brevo-webhook function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to process webhook' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

async function handleEmailWebhook(supabase: any, event: BrevoEmailWebhookEvent) {
  console.log('Processing email webhook event:', event.event, 'for', event.email);

  // Map Brevo events to our status system
  const statusMap: Record<string, string> = {
    'delivered': 'delivered',
    'soft_bounce': 'failed',
    'hard_bounce': 'bounced',
    'spam': 'failed',
    'blocked': 'failed',
    'invalid_email': 'failed',
    'deferred': 'pending',
    'click': 'clicked',
    'opened': 'opened',
    'unique_opened': 'opened'
  };

  const newStatus = statusMap[event.event] || 'pending';

  // Update delivery log based on message_id or email + date
  const { data: existingLogs, error: selectError } = await supabase
    .from('message_delivery_logs')
    .select('*')
    .eq('recipient_type', 'email')
    .eq('recipient_address', event.email)
    .eq('brevo_message_id', event.message_id);

  if (selectError) {
    console.error('Error finding delivery log:', selectError);
    return;
  }

  if (existingLogs && existingLogs.length > 0) {
    // Update existing log
    const updateData: any = {
      status: newStatus,
      webhook_data: event
    };

    if (event.event === 'delivered') {
      updateData.delivered_at = new Date(event.date).toISOString();
    } else if (['soft_bounce', 'hard_bounce', 'spam', 'blocked', 'invalid_email'].includes(event.event)) {
      updateData.failed_at = new Date(event.date).toISOString();
      updateData.error_message = event.reason || `Email ${event.event}`;
    }

    const { error: updateError } = await supabase
      .from('message_delivery_logs')
      .update(updateData)
      .eq('id', existingLogs[0].id);

    if (updateError) {
      console.error('Error updating delivery log:', updateError);
    } else {
      console.log('Updated delivery log for email:', event.email, 'with status:', newStatus);
    }
  } else {
    console.log('No matching delivery log found for email:', event.email, 'message_id:', event.message_id);
  }
}

async function handleSmsWebhook(supabase: any, event: BrevoSmsWebhookEvent) {
  console.log('Processing SMS webhook event:', event.event, 'for', event.mobile);

  // Map Brevo SMS events to our status system
  const statusMap: Record<string, string> = {
    'sent': 'sent',
    'delivered': 'delivered',
    'failed': 'failed',
    'soft_bounce': 'failed',
    'hard_bounce': 'failed'
  };

  const newStatus = statusMap[event.event] || 'pending';

  // Update delivery log based on message_id or mobile + date
  const { data: existingLogs, error: selectError } = await supabase
    .from('message_delivery_logs')
    .select('*')
    .eq('recipient_type', 'sms')
    .eq('recipient_address', event.mobile)
    .eq('brevo_message_id', event.message_id);

  if (selectError) {
    console.error('Error finding SMS delivery log:', selectError);
    return;
  }

  if (existingLogs && existingLogs.length > 0) {
    // Update existing log
    const updateData: any = {
      status: newStatus,
      webhook_data: event
    };

    if (event.event === 'delivered') {
      updateData.delivered_at = new Date(event.date).toISOString();
    } else if (['failed', 'soft_bounce', 'hard_bounce'].includes(event.event)) {
      updateData.failed_at = new Date(event.date).toISOString();
      updateData.error_message = event.reason || `SMS ${event.event}`;
    }

    const { error: updateError } = await supabase
      .from('message_delivery_logs')
      .update(updateData)
      .eq('id', existingLogs[0].id);

    if (updateError) {
      console.error('Error updating SMS delivery log:', updateError);
    } else {
      console.log('Updated SMS delivery log for mobile:', event.mobile, 'with status:', newStatus);
    }
  } else {
    console.log('No matching SMS delivery log found for mobile:', event.mobile, 'message_id:', event.message_id);
  }
}

serve(handler);