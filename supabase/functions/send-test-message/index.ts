import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestMessageRequest {
  emailSubject?: string;
  emailBody?: string;
  smsText?: string;
  testEmail?: string;
  testPhone?: string;
  sendEmail: boolean;
  sendSms: boolean;
}

// Brevo API endpoints based on official documentation
const BREVO_EMAIL_API = 'https://api.brevo.com/v3/smtp/email';
const BREVO_SMS_API = 'https://api.brevo.com/v3/transactionalSMS/sms';

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL') || 'campaigns@lakevictoriaaquaculture.com';
    const senderName = Deno.env.get('BREVO_SENDER_NAME') || 'Lake Victoria Aquaculture';
    
    if (!brevoApiKey) {
      throw new Error('BREVO_API_KEY is not set');
    }

    const { 
      emailSubject, 
      emailBody, 
      smsText, 
      testEmail, 
      testPhone, 
      sendEmail, 
      sendSms 
    }: TestMessageRequest = await req.json();

    console.log('Sending test message:', { sendEmail, sendSms, testEmail, testPhone });

    // Validation: Check if content is provided for selected channels
    if (sendEmail && (!emailSubject || !emailBody)) {
      return new Response(
        JSON.stringify({ 
          error: 'Email subject and body are required when sending test emails' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (sendSms && !smsText) {
      return new Response(
        JSON.stringify({ 
          error: 'SMS text is required when sending test SMS' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const results = [];

    // Send test email if requested
    if (sendEmail && testEmail && emailSubject && emailBody) {
      console.log('Sending test email to:', testEmail);
      
      const emailPayload = {
        sender: {
          name: senderName,
          email: senderEmail
        },
        to: [{ email: testEmail }],
        subject: `[TEST] ${emailSubject}`,
        htmlContent: emailBody
      };

      const emailResponse = await fetch(BREVO_EMAIL_API, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify(emailPayload),
      });

      const emailResult = await emailResponse.json();
      
      if (!emailResponse.ok) {
        console.error('Brevo email API error:', emailResult);
        
        if (emailResult.code === 'invalid_api_key') {
          throw new Error(`Email send failed: Invalid Brevo API key. Please check your API key configuration.`);
        } else if (emailResult.code === 'unauthorized_domain') {
          throw new Error(`Email send failed: The sender domain '${senderEmail}' is not verified in Brevo. Please verify your domain at https://app.brevo.com/senders/domain/list`);
        } else if (emailResult.code === 'unauthorized_sender') {
          throw new Error(`Email send failed: The sender email '${senderEmail}' is not verified in Brevo. Please verify your email at https://app.brevo.com/senders/list`);
        }
        
        throw new Error(`Email send failed: ${emailResult.message || 'Unknown error'}`);
      }

      console.log('Test email sent successfully:', emailResult);
      results.push({ type: 'email', success: true, messageId: emailResult.messageId });
    }

    // Send test SMS if requested
    if (sendSms && testPhone && smsText) {
      console.log('Sending test SMS to:', testPhone);
      
      const smsPayload = {
        type: "transactional",
        unicodeEnabled: true,
        recipient: testPhone,
        content: `[TEST] ${smsText}`,
        sender: "LakeVic"
      };

      const smsResponse = await fetch(BREVO_SMS_API, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify(smsPayload),
      });

      const smsResult = await smsResponse.json();
      
      if (!smsResponse.ok) {
        console.error('Brevo SMS API error:', smsResult);
        
        if (smsResult.code === 'not_enough_credits') {
          throw new Error(`SMS send failed: Insufficient SMS credits. Please buy SMS credits at https://app.brevo.com/billing/addon/customize/sms`);
        } else if (smsResult.code === 'invalid_api_key') {
          throw new Error(`SMS send failed: Invalid Brevo API key. Please check your API key configuration.`);
        }
        
        throw new Error(`SMS send failed: ${smsResult.message || 'Unknown error'}`);
      }

      console.log('Test SMS sent successfully:', smsResult);
      results.push({ type: 'sms', success: true, reference: smsResult.reference });
    }

    // If no messages were sent, return an error
    if (results.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No test messages were sent. Please check your content and recipient information.' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        message: `Test message(s) sent successfully (${results.length} sent)` 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in send-test-message function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to send test message' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);