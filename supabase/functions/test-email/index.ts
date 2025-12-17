import { sendEmailViaSES } from "../_shared/email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, message, module } = await req.json();

    if (!to) {
      return new Response(
        JSON.stringify({ error: "Missing 'to' email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a56db;">${subject || "Test Email"}</h2>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          ${message || "<p>This is a test email from DHUUD Platform.</p>"}
        </div>
        <p style="color: #6b7280; font-size: 12px; margin-top: 32px;">
          This is an automated message from DHUUD HSSE Platform.
        </p>
      </div>
    `;

    console.log(`Sending test email to: ${to}`);
    
    const result = await sendEmailViaSES(
      to,
      subject || "Test Email from DHUUD",
      emailHtml,
      module || 'system_alert'
    );

    if (result.success) {
      console.log(`Email sent successfully! MessageId: ${result.messageId}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Email sent to ${to}`,
          messageId: result.messageId 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      console.error(`Email failed:`, result.error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.error 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Test email error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
