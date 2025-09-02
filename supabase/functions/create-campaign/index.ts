import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateCampaignRequest {
  name: string;
  type: 'email' | 'sms' | 'both';
  emailSubject?: string;
  emailBody?: string;
  smsText?: string;
  campaignId?: string; // For updates
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

    const { name, type, emailSubject, emailBody, smsText, campaignId }: CreateCampaignRequest = await req.json();

    // Handle update campaign
    if (campaignId) {
      console.log('Updating campaign:', campaignId);

      // Count recipients based on campaign type for updates too
      let totalRecipients = 0;
      
      if (type === 'email' || type === 'both') {
        const { count: emailCount } = await supabase
          .from('newsletter_subscriptions')
          .select('*', { count: 'exact', head: true });
        totalRecipients += emailCount || 0;
      }
      
      if (type === 'sms' || type === 'both') {
        const { count: smsCount } = await supabase
          .from('contact_numbers')
          .select('*', { count: 'exact', head: true });
        totalRecipients += smsCount || 0;
      }

      const { data: campaign, error: updateError } = await supabase
        .from('campaigns')
        .update({
          name,
          type,
          email_subject: emailSubject,
          email_html_body: emailBody,
          sms_text: smsText,
          total_recipients: totalRecipients,
        })
        .eq('id', campaignId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating campaign:', updateError);
        throw new Error(`Failed to update campaign: ${updateError.message}`);
      }

      console.log('Campaign updated successfully:', campaign.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          campaign: campaign 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Handle create campaign
    console.log('Creating campaign:', { name, type });

    // Count recipients based on campaign type
    let totalRecipients = 0;
    
    if (type === 'email' || type === 'both') {
      const { count: emailCount } = await supabase
        .from('newsletter_subscriptions')
        .select('*', { count: 'exact', head: true });
      totalRecipients += emailCount || 0;
    }
    
    if (type === 'sms' || type === 'both') {
      const { count: smsCount } = await supabase
        .from('contact_numbers')
        .select('*', { count: 'exact', head: true });
      totalRecipients += smsCount || 0;
    }

    // Create campaign record
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert({
        name,
        type,
        email_subject: emailSubject,
        email_html_body: emailBody,
        sms_text: smsText,
        total_recipients: totalRecipients,
        status: 'draft'
      })
      .select()
      .single();

    if (campaignError) {
      console.error('Error creating campaign:', campaignError);
      throw new Error(`Failed to create campaign: ${campaignError.message}`);
    }

    console.log('Campaign created successfully:', campaign.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        campaign: campaign 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in create-campaign function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to create campaign' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);