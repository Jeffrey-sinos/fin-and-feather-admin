import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendCampaignRequest {
  campaignId: string;
}

// Brevo API endpoints and limits based on official documentation
const BREVO_EMAIL_API = 'https://api.brevo.com/v3/smtp/email';
const BREVO_SMS_API = 'https://api.brevo.com/v3/transactionalSMS/sms';
const EMAIL_BATCH_SIZE = 50; // Brevo allows up to 50 recipients per email
const SMS_BATCH_SIZE = 100; // Process SMS in chunks for better performance
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_BASE = 1000; // 1 second

// Sleep function for delays
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry function with exponential backoff
async function retryRequest(fn: () => Promise<any>, attempts: number = RETRY_ATTEMPTS): Promise<any> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      console.log(`Attempt ${i + 1} failed:`, error);
      if (i === attempts - 1) throw error;
      
      const delay = RETRY_DELAY_BASE * Math.pow(2, i);
      console.log(`Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
}

// Chunk array into smaller arrays
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!brevoApiKey) {
      throw new Error('BREVO_API_KEY is not set');
    }
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      supabaseServiceKey
    );

    const { campaignId }: SendCampaignRequest = await req.json();

    console.log('Starting campaign send:', campaignId);

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error(`Campaign not found: ${campaignError?.message}`);
    }

    if (campaign.status !== 'draft') {
      throw new Error(`Campaign is not in draft status: ${campaign.status}`);
    }

    // Update campaign status to sending
    await supabase
      .from('campaigns')
      .update({ 
        status: 'sending', 
        started_at: new Date().toISOString() 
      })
      .eq('id', campaignId);

    let totalSent = 0;
    let totalFailed = 0;
    const errors = [];

    // Send emails if campaign includes email
    if ((campaign.type === 'email' || campaign.type === 'both') && campaign.email_subject && campaign.email_html_body) {
      console.log('Sending emails...');
      
      const { data: emailSubscribers, error: emailError } = await supabase
        .from('newsletter_subscriptions')
        .select('email');

      if (emailError) {
        throw new Error(`Failed to fetch email subscribers: ${emailError.message}`);
      }

      if (emailSubscribers && emailSubscribers.length > 0) {
        const emailChunks = chunkArray(emailSubscribers, EMAIL_BATCH_SIZE);
        
        for (const chunk of emailChunks) {
          try {
            await retryRequest(async () => {
              const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL') || 'campaigns@lakevictoriaaquaculture.com';
              const senderName = Deno.env.get('BREVO_SENDER_NAME') || 'Lake Victoria Aquaculture';
              
              const emailPayload = {
                sender: {
                  name: senderName,
                  email: senderEmail
                },
                to: chunk.map(sub => ({ email: sub.email })),
                subject: campaign.email_subject,
                htmlContent: campaign.email_html_body
              };

              const response = await fetch(BREVO_EMAIL_API, {
                method: 'POST',
                headers: {
                  'accept': 'application/json',
                  'api-key': brevoApiKey,
                  'content-type': 'application/json',
                },
                body: JSON.stringify(emailPayload),
              });

              const result = await response.json();
              
              if (!response.ok) {
                throw new Error(`Brevo email API error: ${result.message || 'Unknown error'}`);
              }

              console.log(`Email batch sent successfully:`, result);

              // Log successful deliveries
              const deliveryLogs = chunk.map(sub => ({
                campaign_id: campaignId,
                recipient_type: 'email',
                recipient_address: sub.email,
                brevo_message_id: result.messageId,
                status: 'sent',
                sent_at: new Date().toISOString()
              }));

              await supabase
                .from('message_delivery_logs')
                .insert(deliveryLogs);

              totalSent += chunk.length;
            });

            // Rate limiting - wait between batches
            await sleep(100);
            
          } catch (error: any) {
            console.error(`Email batch failed:`, error);
            errors.push(`Email batch error: ${error.message}`);
            
            // Log failed deliveries
            const failedLogs = chunk.map(sub => ({
              campaign_id: campaignId,
              recipient_type: 'email',
              recipient_address: sub.email,
              status: 'failed',
              failed_at: new Date().toISOString(),
              error_message: error.message
            }));

            await supabase
              .from('message_delivery_logs')
              .insert(failedLogs);

            totalFailed += chunk.length;
          }
        }
      }
    }

    // Send SMS if campaign includes SMS
    if ((campaign.type === 'sms' || campaign.type === 'both') && campaign.sms_text) {
      console.log('Sending SMS messages...');
      
      const { data: smsSubscribers, error: smsError } = await supabase
        .from('contact_numbers')
        .select('phone_number');

      if (smsError) {
        throw new Error(`Failed to fetch SMS subscribers: ${smsError.message}`);
      }

      if (smsSubscribers && smsSubscribers.length > 0) {
        // SMS must be sent individually as per Brevo API
        for (const subscriber of smsSubscribers) {
          try {
            await retryRequest(async () => {
              const smsPayload = {
                type: "transactional",
                unicodeEnabled: true,
                recipient: subscriber.phone_number,
                content: campaign.sms_text,
                sender: "LakeVic"
              };

              const response = await fetch(BREVO_SMS_API, {
                method: 'POST',
                headers: {
                  'accept': 'application/json',
                  'api-key': brevoApiKey,
                  'content-type': 'application/json',
                },
                body: JSON.stringify(smsPayload),
              });

              const result = await response.json();
              
              if (!response.ok) {
                throw new Error(`Brevo SMS API error: ${result.message || 'Unknown error'}`);
              }

              console.log(`SMS sent successfully to ${subscriber.phone_number}:`, result);

              // Log successful delivery
              await supabase
                .from('message_delivery_logs')
                .insert({
                  campaign_id: campaignId,
                  recipient_type: 'sms',
                  recipient_address: subscriber.phone_number,
                  brevo_message_id: result.reference,
                  status: 'sent',
                  sent_at: new Date().toISOString()
                });

              totalSent++;
            });

            // Rate limiting - wait between SMS sends
            await sleep(50);
            
          } catch (error: any) {
            console.error(`SMS failed for ${subscriber.phone_number}:`, error);
            errors.push(`SMS error for ${subscriber.phone_number}: ${error.message}`);
            
            // Log failed delivery
            await supabase
              .from('message_delivery_logs')
              .insert({
                campaign_id: campaignId,
                recipient_type: 'sms',
                recipient_address: subscriber.phone_number,
                status: 'failed',
                failed_at: new Date().toISOString(),
                error_message: error.message
              });

            totalFailed++;
          }
        }
      }
    }

    // Update campaign with final results
    const finalStatus = totalFailed === 0 ? 'completed' : (totalSent > 0 ? 'completed' : 'failed');
    const errorMessage = errors.length > 0 ? errors.join('; ') : null;

    await supabase
      .from('campaigns')
      .update({
        status: finalStatus,
        sent_count: totalSent,
        failed_count: totalFailed,
        completed_at: new Date().toISOString(),
        error_message: errorMessage
      })
      .eq('id', campaignId);

    console.log(`Campaign ${campaignId} completed:`, {
      sent: totalSent,
      failed: totalFailed,
      status: finalStatus
    });

    return new Response(
      JSON.stringify({
        success: true,
        campaignId,
        sent: totalSent,
        failed: totalFailed,
        status: finalStatus,
        errors: errors.length > 0 ? errors : undefined
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in send-campaign function:', error);
    
    // Try to update campaign status to failed if we have the campaign ID
    try {
      const { campaignId } = await req.json();
      if (campaignId) {
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        if (supabaseServiceKey) {
          const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            supabaseServiceKey
          );
          
          await supabase
            .from('campaigns')
            .update({
              status: 'failed',
              error_message: error.message,
              completed_at: new Date().toISOString()
            })
            .eq('id', campaignId);
        }
      }
    } catch (updateError) {
      console.error('Failed to update campaign status:', updateError);
    }

    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to send campaign'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);