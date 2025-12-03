import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubscriptionEmailRequest {
  type: 'request_submitted' | 'request_approved' | 'request_declined' | 'request_modified';
  request_id: string;
  tenant_name: string;
  tenant_email: string;
  plan_name: string;
  user_count: number;
  total_monthly: number;
  billing_period: string;
  admin_notes?: string;
}

const formatPrice = (cents: number): string => {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
};

const handler = async (req: Request): Promise<Response> => {
  console.log("Subscription email function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: SubscriptionEmailRequest = await req.json();
    console.log("Email payload:", payload);

    const { type, tenant_name, tenant_email, plan_name, user_count, total_monthly, billing_period, admin_notes } = payload;

    let subject = '';
    let htmlContent = '';

    const priceDisplay = `${formatPrice(total_monthly)}/${billing_period === 'yearly' ? 'year' : 'month'}`;

    switch (type) {
      case 'request_submitted':
        subject = `New Subscription Request from ${tenant_name}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">New Subscription Request</h1>
            <p>A new subscription request has been submitted and requires review.</p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Request Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Organization:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${tenant_name}</td></tr>
                <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Plan:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${plan_name}</td></tr>
                <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Users:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${user_count}</td></tr>
                <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Billing:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${billing_period === 'yearly' ? 'Annual' : 'Monthly'}</td></tr>
                <tr><td style="padding: 8px 0;"><strong>Price:</strong></td><td style="padding: 8px 0; color: #2563eb; font-weight: bold;">${priceDisplay}</td></tr>
              </table>
            </div>
            
            <p>Please review this request in the admin dashboard.</p>
            
            <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
              This is an automated notification from Dhuud HSSE Platform.
            </p>
          </div>
        `;
        break;

      case 'request_approved':
        subject = `Your Subscription Request Has Been Approved - ${tenant_name}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #16a34a;">Subscription Approved! ✓</h1>
            <p>Great news! Your subscription request has been approved and your plan is now active.</p>
            
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #86efac;">
              <h3 style="margin-top: 0; color: #16a34a;">Your Active Plan</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0;"><strong>Plan:</strong></td><td style="padding: 8px 0;">${plan_name}</td></tr>
                <tr><td style="padding: 8px 0;"><strong>Users:</strong></td><td style="padding: 8px 0;">${user_count}</td></tr>
                <tr><td style="padding: 8px 0;"><strong>Price:</strong></td><td style="padding: 8px 0; color: #16a34a; font-weight: bold;">${priceDisplay}</td></tr>
              </table>
            </div>
            
            ${admin_notes ? `
              <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Admin Note:</strong></p>
                <p style="margin: 8px 0 0 0;">${admin_notes}</p>
              </div>
            ` : ''}
            
            <p>You can now access all features included in your plan.</p>
            
            <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
              Dhuud HSSE Platform - Health, Safety, Security & Environment Management
            </p>
          </div>
        `;
        break;

      case 'request_declined':
        subject = `Subscription Request Update - ${tenant_name}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #dc2626;">Subscription Request Declined</h1>
            <p>We regret to inform you that your subscription request could not be approved at this time.</p>
            
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fecaca;">
              <h3 style="margin-top: 0;">Request Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0;"><strong>Plan:</strong></td><td style="padding: 8px 0;">${plan_name}</td></tr>
                <tr><td style="padding: 8px 0;"><strong>Users:</strong></td><td style="padding: 8px 0;">${user_count}</td></tr>
              </table>
            </div>
            
            ${admin_notes ? `
              <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Reason:</strong></p>
                <p style="margin: 8px 0 0 0;">${admin_notes}</p>
              </div>
            ` : ''}
            
            <p>Please contact our support team if you have any questions or would like to discuss alternatives.</p>
            
            <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
              Dhuud HSSE Platform - Health, Safety, Security & Environment Management
            </p>
          </div>
        `;
        break;

      case 'request_modified':
        subject = `Subscription Approved with Modifications - ${tenant_name}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #7c3aed;">Subscription Approved with Changes</h1>
            <p>Your subscription request has been approved with some modifications.</p>
            
            <div style="background: #f5f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #c4b5fd;">
              <h3 style="margin-top: 0; color: #7c3aed;">Your Approved Plan</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0;"><strong>Plan:</strong></td><td style="padding: 8px 0;">${plan_name}</td></tr>
                <tr><td style="padding: 8px 0;"><strong>Users:</strong></td><td style="padding: 8px 0;">${user_count}</td></tr>
                <tr><td style="padding: 8px 0;"><strong>Price:</strong></td><td style="padding: 8px 0; color: #7c3aed; font-weight: bold;">${priceDisplay}</td></tr>
              </table>
            </div>
            
            ${admin_notes ? `
              <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Changes Made:</strong></p>
                <p style="margin: 8px 0 0 0;">${admin_notes}</p>
              </div>
            ` : ''}
            
            <p>Your subscription is now active with the approved configuration.</p>
            
            <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
              Dhuud HSSE Platform - Health, Safety, Security & Environment Management
            </p>
          </div>
        `;
        break;
    }

    // Determine recipient based on type
    const adminEmail = Deno.env.get("ADMIN_EMAIL") || "admin@dhuud.com";
    const toEmail = type === 'request_submitted' ? adminEmail : tenant_email;

    console.log(`Sending ${type} email to ${toEmail}`);

    const emailResponse = await resend.emails.send({
      from: "Dhuud Platform <onboarding@resend.dev>",
      to: [toEmail],
      subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error sending subscription email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
