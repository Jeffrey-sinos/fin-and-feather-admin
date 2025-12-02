import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateAdminRequest {
  email: string;
  fullName: string;
}

// Production URL for the admin portal
const ADMIN_PORTAL_URL = "https://fin-and-feather-admin.lovable.app/auth";

// Generate a secure temporary password
function generateTempPassword(length: number = 12): string {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const special = "!@#$%&*";
  const allChars = uppercase + lowercase + numbers + special;
  
  let password = "";
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split("").sort(() => Math.random() - 0.5).join("");
}

// Email template for new admin users
function getNewAdminEmailHtml(fullName: string, email: string, tempPassword: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0099cc 0%, #006699 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">Welcome to Lake Victoria Aquaculture</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Admin Portal Access</p>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none;">
          <p style="margin-top: 0;">Hello <strong>${fullName}</strong>,</p>
          <p>You have been granted administrator access to the Lake Victoria Aquaculture management portal.</p>
          
          <div style="background: #fff; border: 2px dashed #0099cc; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3 style="margin-top: 0; color: #0099cc;">Your Login Credentials</h3>
            <p style="margin-bottom: 5px;"><strong>Email:</strong> ${email}</p>
            <p style="margin-bottom: 5px;"><strong>Temporary Password:</strong></p>
            <div style="font-family: monospace; font-size: 18px; background: #e8f4f8; padding: 10px; border-radius: 4px; letter-spacing: 1px; text-align: center;">${tempPassword}</div>
          </div>
          
          <p>Click the button below to access the admin portal:</p>
          
          <table cellspacing="0" cellpadding="0" style="margin: 20px 0;">
            <tr>
              <td style="background: #0099cc; border-radius: 5px;">
                <a href="${ADMIN_PORTAL_URL}" style="color: white; text-decoration: none; font-weight: bold; display: inline-block; padding: 12px 30px;">
                  Access Admin Portal
                </a>
              </td>
            </tr>
          </table>
          
          <p style="font-size: 12px; color: #666;">Or copy this link: <a href="${ADMIN_PORTAL_URL}" style="color: #0099cc;">${ADMIN_PORTAL_URL}</a></p>
          
          <div style="background: #fff3cd; border: 1px solid #ffc107; color: #856404; padding: 15px; border-radius: 5px; margin-top: 20px;">
            <strong>⚠️ Security Notice:</strong><br>
            Please change your password immediately after your first login for security purposes.
          </div>
        </div>
        <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
          <p style="margin: 0;">Lake Victoria Aquaculture © ${new Date().getFullYear()}</p>
          <p style="margin: 5px 0 0 0;">This is an automated message. Please do not reply directly to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Email template for existing users promoted to admin
function getPromotedAdminEmailHtml(fullName: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0099cc 0%, #006699 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">Admin Access Granted</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Lake Victoria Aquaculture</p>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none;">
          <p style="margin-top: 0;">Hello <strong>${fullName}</strong>,</p>
          <p>Great news! You have been granted <strong>administrator access</strong> to the Lake Victoria Aquaculture management portal.</p>
          
          <div style="background: #d4edda; border: 1px solid #28a745; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <strong>✓ What's New:</strong><br>
            You can now access the admin dashboard to manage products, orders, inventory, and more.
          </div>
          
          <p>Use your existing account credentials to log in:</p>
          
          <table cellspacing="0" cellpadding="0" style="margin: 20px 0;">
            <tr>
              <td style="background: #0099cc; border-radius: 5px;">
                <a href="${ADMIN_PORTAL_URL}" style="color: white; text-decoration: none; font-weight: bold; display: inline-block; padding: 12px 30px;">
                  Access Admin Portal
                </a>
              </td>
            </tr>
          </table>
          
          <p style="font-size: 12px; color: #666;">Or copy this link: <a href="${ADMIN_PORTAL_URL}" style="color: #0099cc;">${ADMIN_PORTAL_URL}</a></p>
        </div>
        <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
          <p style="margin: 0;">Lake Victoria Aquaculture © ${new Date().getFullYear()}</p>
          <p style="margin: 5px 0 0 0;">This is an automated message. Please do not reply directly to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    const brevoSenderEmail = Deno.env.get("BREVO_SENDER_EMAIL");
    const brevoSenderName = Deno.env.get("BREVO_SENDER_NAME");

    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the requesting user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if requesting user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .eq("role", "admin")
      .single();

    if (roleError || !roleData) {
      return new Response(JSON.stringify({ error: "Unauthorized: Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, fullName }: CreateAdminRequest = await req.json();

    if (!email || !fullName) {
      return new Response(JSON.stringify({ error: "Email and full name are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    if (existingUser) {
      // Check if already an admin
      const { data: existingRole } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", existingUser.id)
        .eq("role", "admin")
        .single();

      if (existingRole) {
        return new Response(JSON.stringify({ error: "User is already an admin" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Add admin role to existing user
      const { error: roleInsertError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: existingUser.id, role: "admin" });

      if (roleInsertError) {
        console.error("Error adding admin role:", roleInsertError);
        return new Response(JSON.stringify({ error: "Failed to add admin role" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Admin role added to existing user: ${email}`);

      // Send notification email to existing user
      let emailSent = false;
      if (brevoApiKey && brevoSenderEmail) {
        try {
          const emailHtml = getPromotedAdminEmailHtml(fullName);
          
          const emailResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
              "Accept": "application/json",
              "Content-Type": "application/json",
              "api-key": brevoApiKey,
            },
            body: JSON.stringify({
              sender: { name: brevoSenderName || "Lake Victoria Aquaculture", email: brevoSenderEmail },
              to: [{ email, name: fullName }],
              subject: "You've Been Granted Admin Access - Lake Victoria Aquaculture",
              htmlContent: emailHtml,
            }),
          });

          if (!emailResponse.ok) {
            const errorText = await emailResponse.text();
            console.error("Failed to send promotion email:", errorText);
          } else {
            console.log("Promotion notification email sent successfully");
            emailSent = true;
          }
        } catch (emailError) {
          console.error("Error sending promotion email:", emailError);
        }
      }

      // Log the action
      await supabaseAdmin.from("audit_logs").insert({
        user_id: requestingUser.id,
        action: `PROMOTED_TO_ADMIN: ${email}`,
        table_name: "user_roles",
        record_id: existingUser.id,
      });

      return new Response(JSON.stringify({ 
        success: true, 
        message: "Admin role added to existing user",
        userId: existingUser.id,
        isExistingUser: true,
        emailSent
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate temporary password for new user
    const tempPassword = generateTempPassword();

    console.log(`Creating new admin user: ${email}`);

    // Create the user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`User created with ID: ${newUser.user.id}`);

    // Add admin role
    const { error: roleInsertError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUser.user.id, role: "admin" });

    if (roleInsertError) {
      console.error("Error adding admin role:", roleInsertError);
      // Rollback: delete the user
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(JSON.stringify({ error: "Failed to add admin role" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Admin role added successfully");

    // Send welcome email via Brevo
    let emailSent = false;
    if (brevoApiKey && brevoSenderEmail) {
      try {
        const emailHtml = getNewAdminEmailHtml(fullName, email, tempPassword);

        const emailResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "api-key": brevoApiKey,
          },
          body: JSON.stringify({
            sender: { name: brevoSenderName || "Lake Victoria Aquaculture", email: brevoSenderEmail },
            to: [{ email, name: fullName }],
            subject: "Welcome to Lake Victoria Aquaculture - Admin Access",
            htmlContent: emailHtml,
          }),
        });

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          console.error("Failed to send email:", errorText);
        } else {
          console.log("Welcome email sent successfully");
          emailSent = true;
        }
      } catch (emailError) {
        console.error("Error sending email:", emailError);
        // Don't fail the request if email fails
      }
    } else {
      console.log("Brevo not configured, skipping email");
    }

    // Log the action
    await supabaseAdmin.from("audit_logs").insert({
      user_id: requestingUser.id,
      action: `CREATED_ADMIN_USER: ${email}`,
      table_name: "user_roles",
      record_id: newUser.user.id,
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Admin user created successfully",
      userId: newUser.user.id,
      isExistingUser: false,
      emailSent
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in create-admin-user:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
