import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured, skipping digest emails");
      return new Response(
        JSON.stringify({ success: true, message: "Skipped - no email API key" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting HSSE Manager digest generation...");

    // Get all tenants with active subscriptions
    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select("id, name")
      .eq("status", "active");

    if (tenantsError) throw tenantsError;

    let emailsSent = 0;

    for (const tenant of tenants || []) {
      // Get pending closures for this tenant
      const { data: pendingClosures } = await supabase
        .from("incidents")
        .select(`
          id,
          reference_id,
          title,
          closure_requested_at,
          profiles!incidents_closure_requested_by_fkey(full_name)
        `)
        .eq("tenant_id", tenant.id)
        .eq("status", "pending_closure")
        .is("deleted_at", null);

      // Get escalated actions for this tenant
      const { data: escalatedActions } = await supabase
        .from("corrective_actions")
        .select(`
          id,
          title,
          priority,
          due_date,
          escalation_level,
          profiles!corrective_actions_assigned_to_fkey(full_name)
        `)
        .eq("tenant_id", tenant.id)
        .gt("escalation_level", 0)
        .not("status", "in", "(completed,verified,closed)")
        .is("deleted_at", null);

      // Get at-risk actions (within warning period)
      const { data: slaConfigs } = await supabase
        .from("action_sla_configs")
        .select("*");

      const today = new Date();
      const { data: allActions } = await supabase
        .from("corrective_actions")
        .select(`
          id,
          title,
          priority,
          due_date,
          profiles!corrective_actions_assigned_to_fkey(full_name)
        `)
        .eq("tenant_id", tenant.id)
        .not("status", "in", "(completed,verified,closed)")
        .not("due_date", "is", null)
        .eq("escalation_level", 0)
        .is("deleted_at", null);

      const atRiskActions = (allActions || []).filter((action) => {
        if (!action.due_date) return false;
        const config = slaConfigs?.find((c) => c.priority === (action.priority || "medium"));
        if (!config) return false;
        const dueDate = new Date(action.due_date);
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilDue <= config.warning_days_before && daysUntilDue > 0;
      });

      // Skip if nothing to report
      if (
        (!pendingClosures || pendingClosures.length === 0) &&
        (!escalatedActions || escalatedActions.length === 0) &&
        atRiskActions.length === 0
      ) {
        continue;
      }

      // Get HSSE managers for this tenant (respecting digest preferences)
      const { data: hsseManagers } = await supabase
        .from("user_role_assignments")
        .select(`
          user_id,
          profiles!inner(id, full_name, tenant_id, digest_opt_in, digest_preferred_time, digest_timezone),
          roles!inner(code)
        `)
        .eq("profiles.tenant_id", tenant.id)
        .eq("profiles.digest_opt_in", true)
        .in("roles.code", ["hsse_manager", "admin"]);

      for (const manager of hsseManagers || []) {
        const { data: authUser } = await supabase.auth.admin.getUserById(manager.user_id);

        if (authUser?.user?.email) {
          const html = generateDigestHtml(
            tenant.name,
            pendingClosures || [],
            escalatedActions || [],
            atRiskActions
          );

          await sendEmail(resendApiKey, {
            to: authUser.user.email,
            subject: `📊 Daily HSSE Manager Digest - ${tenant.name}`,
            html,
          });

          emailsSent++;
        }
      }
    }

    console.log(`Digest complete: ${emailsSent} emails sent`);

    return new Response(
      JSON.stringify({ success: true, emails_sent: emailsSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Digest error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateDigestHtml(
  tenantName: string,
  pendingClosures: any[],
  escalatedActions: any[],
  atRiskActions: any[]
): string {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1a365d; border-bottom: 2px solid #3182ce; padding-bottom: 10px;">
        📊 HSSE Manager Daily Digest
      </h1>
      <p style="color: #666;">${today} | ${tenantName}</p>
      
      <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h2 style="margin: 0; font-size: 16px;">📊 SUMMARY</h2>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>Pending Closures: <strong>${pendingClosures.length}</strong></li>
          <li>Escalated Actions: <strong>${escalatedActions.length}</strong></li>
          <li>Actions at Risk: <strong>${atRiskActions.length}</strong></li>
        </ul>
      </div>
  `;

  if (pendingClosures.length > 0) {
    html += `
      <h2 style="color: #744210; margin-top: 30px;">🔒 Pending Closure Requests</h2>
      <table style="width: 100%; border-collapse: collapse;">
    `;
    for (const closure of pendingClosures) {
      const requestedAgo = closure.closure_requested_at
        ? Math.ceil((Date.now() - new Date(closure.closure_requested_at).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      html += `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px;">
            <strong>${closure.reference_id}</strong> - ${closure.title}<br/>
            <small style="color: #666;">Requested by: ${closure.profiles?.full_name || "Unknown"} | ${requestedAgo} days ago</small>
          </td>
        </tr>
      `;
    }
    html += `</table>`;
  }

  if (escalatedActions.length > 0) {
    html += `
      <h2 style="color: #c53030; margin-top: 30px;">🚨 Escalated Actions</h2>
      <table style="width: 100%; border-collapse: collapse;">
    `;
    for (const action of escalatedActions) {
      const daysOverdue = action.due_date
        ? Math.ceil((Date.now() - new Date(action.due_date).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      html += `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px;">
            <span style="background: ${action.escalation_level >= 2 ? "#c53030" : "#dd6b20"}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px;">
              Level ${action.escalation_level}
            </span>
            <strong> ${action.title}</strong><br/>
            <small style="color: #666;">Assigned to: ${action.profiles?.full_name || "Unassigned"} | ${daysOverdue} days overdue</small>
          </td>
        </tr>
      `;
    }
    html += `</table>`;
  }

  if (atRiskActions.length > 0) {
    html += `
      <h2 style="color: #b7791f; margin-top: 30px;">⚠️ Actions at Risk</h2>
      <table style="width: 100%; border-collapse: collapse;">
    `;
    for (const action of atRiskActions) {
      const daysUntilDue = action.due_date
        ? Math.ceil((new Date(action.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 0;
      html += `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px;">
            <strong>${action.title}</strong><br/>
            <small style="color: #666;">Assigned to: ${action.profiles?.full_name || "Unassigned"} | Due in ${daysUntilDue} days</small>
          </td>
        </tr>
      `;
    }
    html += `</table>`;
  }

  html += `
      <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #666; font-size: 12px;">
        This is an automated digest from DHUUD Platform. Log in to take action.
      </p>
    </div>
  `;

  return html;
}

async function sendEmail(
  apiKey: string,
  options: { to: string; subject: string; html: string }
) {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "DHUUD Platform <notifications@resend.dev>",
        to: [options.to],
        subject: options.subject,
        html: options.html,
      }),
    });

    if (!response.ok) {
      console.error("Email send failed:", await response.text());
    }
  } catch (error) {
    console.error("Email error:", error);
  }
}
