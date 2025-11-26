import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL') || 'noreply@yourdomain.com';
    const senderName = Deno.env.get('BREVO_SENDER_NAME') || 'Admin Notifications';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { notificationId } = await req.json();

    if (!notificationId) {
      throw new Error('Notification ID is required');
    }

    // Fetch notification details
    const { data: notification, error: notifError } = await supabase
      .from('admin_notifications')
      .select(`
        *,
        orders (
          id,
          total_amount,
          created_at,
          profiles (
            full_name,
            email,
            phone
          ),
          items:order_items (
            quantity,
            unit_price,
            products (
              name
            )
          )
        )
      `)
      .eq('id', notificationId)
      .single();

    if (notifError || !notification) {
      throw new Error(`Failed to fetch notification: ${notifError?.message}`);
    }

    // Fetch all admin users
    const { data: adminRoles, error: adminError } = await supabase
      .from('user_roles')
      .select('user_id, profiles(email, full_name)')
      .eq('role', 'admin');

    if (adminError || !adminRoles || adminRoles.length === 0) {
      console.log('No admin users found to notify');
      return new Response(
        JSON.stringify({ message: 'No admin users to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const adminEmails = adminRoles
      .map((role: any) => role.profiles?.email)
      .filter(Boolean);

    if (adminEmails.length === 0) {
      console.log('No admin emails found');
      return new Response(
        JSON.stringify({ message: 'No admin emails configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const order = notification.orders;
    const customer = order?.profiles;
    const items = order?.items || [];

    // Build order items HTML
    const itemsHtml = items
      .map((item: any) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.products?.name || 'Unknown Product'}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">KES ${item.unit_price.toFixed(2)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">KES ${(item.quantity * item.unit_price).toFixed(2)}</td>
        </tr>
      `)
      .join('');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h1 style="color: #2563eb; margin: 0 0 10px 0;">🎉 New Order Completed!</h1>
          <p style="margin: 0; color: #666;">Order #${order?.id?.slice(0, 8)}</p>
        </div>

        <div style="background-color: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="margin-top: 0; color: #1f2937;">Customer Information</h2>
          <p><strong>Name:</strong> ${customer?.full_name || 'N/A'}</p>
          <p><strong>Email:</strong> ${customer?.email || 'N/A'}</p>
          <p><strong>Phone:</strong> ${customer?.phone || 'N/A'}</p>
          <p><strong>Order Date:</strong> ${new Date(order?.created_at).toLocaleString()}</p>
        </div>

        <div style="background-color: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="margin-top: 0; color: #1f2937;">Order Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f9fafb;">
                <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Product</th>
                <th style="padding: 12px 8px; text-align: center; border-bottom: 2px solid #e5e7eb;">Qty</th>
                <th style="padding: 12px 8px; text-align: right; border-bottom: 2px solid #e5e7eb;">Price</th>
                <th style="padding: 12px 8px; text-align: right; border-bottom: 2px solid #e5e7eb;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="padding: 12px 8px; text-align: right; font-weight: bold; border-top: 2px solid #e5e7eb;">Total Amount:</td>
                <td style="padding: 12px 8px; text-align: right; font-weight: bold; color: #2563eb; border-top: 2px solid #e5e7eb;">KES ${order?.total_amount?.toFixed(2) || '0.00'}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <a href="${supabaseUrl.replace('.supabase.co', '.lovable.app')}/admin" 
             style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            View in Admin Dashboard
          </a>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>This is an automated notification from your order management system.</p>
        </div>
      </body>
      </html>
    `;

    // Send email via Brevo if API key is configured
    if (brevoApiKey) {
      const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: adminEmails.map((email: string) => ({ email })),
          subject: `New Order Completed - ${customer?.full_name || 'Customer'}`,
          htmlContent: emailHtml,
        }),
      });

      if (!brevoResponse.ok) {
        const errorText = await brevoResponse.text();
        console.error('Brevo API error:', errorText);
        throw new Error(`Failed to send email: ${errorText}`);
      }

      console.log('Email sent successfully to:', adminEmails);
    } else {
      console.warn('BREVO_API_KEY not configured, skipping email notification');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification processed',
        emailsSent: brevoApiKey ? adminEmails.length : 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('Error in send-admin-notification-email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
