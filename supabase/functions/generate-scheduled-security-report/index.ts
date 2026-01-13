import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReportConfig {
  id: string;
  tenant_id: string;
  report_name: string;
  report_type: string;
  schedule_cron: string;
  recipients: string[];
  recipient_roles: string[];
  filters: Record<string, unknown>;
  include_charts: boolean;
  is_active: boolean;
}

interface SecurityMetrics {
  activeGuards: number;
  totalPatrols: number;
  completedPatrols: number;
  patrolCompletionRate: number;
  incidentsReported: number;
  avgResponseTime: number;
  geofenceAlerts: number;
  visitorsProcessed: number;
  topGuards: Array<{ name: string; score: number }>;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    // Check if triggered manually with specific configId
    let body: { configId?: string } = {};
    try {
      body = await req.json();
    } catch {
      // No body, process all due schedules
    }

    let configs: ReportConfig[] = [];

    if (body.configId) {
      // Manual trigger - fetch specific config
      const { data, error } = await supabase
        .from("security_report_configs")
        .select("*")
        .eq("id", body.configId)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: "Config not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      configs = [data];
    } else {
      // Scheduled trigger - fetch all active configs
      // In production, you'd check schedule_cron against current time
      const { data } = await supabase
        .from("security_report_configs")
        .select("*")
        .eq("is_active", true);
      
      configs = data || [];
    }

    console.log(`Processing ${configs.length} report config(s)`);

    const results: Array<{ configId: string; success: boolean; error?: string }> = [];

    for (const config of configs) {
      try {
        // Fetch security metrics for the tenant
        const metrics = await fetchSecurityMetrics(supabase, config.tenant_id, config.report_type);

        // Get recipient emails
        const recipientEmails = [...config.recipients];

        // Also fetch emails from roles if specified
        if (config.recipient_roles.length > 0) {
          const { data: roleUsers } = await supabase
            .from("profiles")
            .select("email")
            .eq("tenant_id", config.tenant_id)
            .in("role", config.recipient_roles)
            .not("email", "is", null);

          if (roleUsers) {
            recipientEmails.push(...roleUsers.map((u: { email: string }) => u.email));
          }
        }

        const uniqueEmails = [...new Set(recipientEmails)].filter(Boolean);

        if (uniqueEmails.length === 0) {
          console.log(`No recipients for config ${config.id}`);
          results.push({ configId: config.id, success: false, error: "No recipients" });
          continue;
        }

        // Generate email HTML
        const emailHtml = generateReportEmail(config, metrics);

        // Send email
        const emailResult = await resend.emails.send({
          from: "DHUUD Security <noreply@resend.dev>",
          to: uniqueEmails,
          subject: `${config.report_name} - ${new Date().toLocaleDateString()}`,
          html: emailHtml,
        });

        console.log(`Email sent for config ${config.id}:`, emailResult);

        // Update last_generated_at
        await supabase
          .from("security_report_configs")
          .update({ last_generated_at: new Date().toISOString() })
          .eq("id", config.id);

        // Log to security_reports table
        await supabase.from("security_reports").insert({
          tenant_id: config.tenant_id,
          report_type: config.report_type,
          report_name: config.report_name,
          generated_at: new Date().toISOString(),
          recipients: uniqueEmails,
          metrics_snapshot: metrics,
          delivery_status: "sent",
        });

        results.push({ configId: config.id, success: true });
      } catch (error) {
        console.error(`Error processing config ${config.id}:`, error);
        results.push({ configId: config.id, success: false, error: String(error) });
      }
    }

    return new Response(
      JSON.stringify({ processed: results.length, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-scheduled-security-report:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function fetchSecurityMetrics(
  supabase: any,
  tenantId: string,
  reportType: string
): Promise<SecurityMetrics> {
  const now = new Date();
  const periodStart = reportType === "weekly" 
    ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Active guards (recent tracking)
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const { data: activeGuardsData } = await supabase
    .from("guard_tracking_history")
    .select("guard_id")
    .eq("tenant_id", tenantId)
    .gte("recorded_at", oneHourAgo);
  
  const activeGuards = new Set((activeGuardsData || []).map((g: any) => g.guard_id)).size;

  // Patrol stats
  const { data: patrols } = await supabase
    .from("security_patrols")
    .select("status")
    .eq("tenant_id", tenantId)
    .gte("actual_start", periodStart.toISOString());

  const totalPatrols = patrols?.length || 0;
  const completedPatrols = (patrols || []).filter((p: any) => p.status === "completed").length;
  const patrolCompletionRate = totalPatrols > 0 ? Math.round((completedPatrols / totalPatrols) * 100) : 0;

  // Geofence alerts
  const { count: geofenceAlerts } = await supabase
    .from("geofence_alerts")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .gte("created_at", periodStart.toISOString());

  // Visitors
  const { count: visitorsProcessed } = await supabase
    .from("gate_entry_logs")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .gte("entry_time", periodStart.toISOString());

  // Top guards (simplified - by patrol count)
  const { data: topGuardsData } = await supabase
    .from("security_patrols")
    .select("guard_id, profiles!security_patrols_guard_id_fkey(full_name)")
    .eq("tenant_id", tenantId)
    .eq("status", "completed")
    .gte("actual_start", periodStart.toISOString())
    .limit(100);

  const guardCounts: Record<string, { name: string; count: number }> = {};
  (topGuardsData || []).forEach((p: any) => {
    const id = p.guard_id;
    const name = p.profiles?.full_name || "Unknown";
    if (!guardCounts[id]) guardCounts[id] = { name, count: 0 };
    guardCounts[id].count++;
  });

  const topGuards = Object.values(guardCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(g => ({ name: g.name, score: g.count }));

  return {
    activeGuards,
    totalPatrols,
    completedPatrols,
    patrolCompletionRate,
    incidentsReported: 0,
    avgResponseTime: 0,
    geofenceAlerts: geofenceAlerts || 0,
    visitorsProcessed: visitorsProcessed || 0,
    topGuards,
  };
}

function generateReportEmail(config: ReportConfig, metrics: SecurityMetrics): string {
  const periodLabel = config.report_type === "weekly" ? "Weekly" : "Monthly";
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background-color: #1e3a5f; color: white; padding: 30px 20px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px;">${config.report_name}</h1>
      <p style="margin: 10px 0 0; opacity: 0.9; font-size: 14px;">${periodLabel} Security Performance Report</p>
      <p style="margin: 5px 0 0; opacity: 0.7; font-size: 12px;">Generated: ${new Date().toLocaleDateString()}</p>
    </div>

    <!-- Executive Summary -->
    <div style="padding: 20px;">
      <h2 style="color: #1e3a5f; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
        Executive Summary
      </h2>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 15px; background-color: #f8fafc; border-radius: 8px; text-align: center; width: 25%;">
            <div style="font-size: 28px; font-weight: bold; color: #1e3a5f;">${metrics.activeGuards}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 5px;">Active Guards</div>
          </td>
          <td style="padding: 15px; background-color: #f8fafc; border-radius: 8px; text-align: center; width: 25%;">
            <div style="font-size: 28px; font-weight: bold; color: #22c55e;">${metrics.patrolCompletionRate}%</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 5px;">Patrol Rate</div>
          </td>
          <td style="padding: 15px; background-color: #f8fafc; border-radius: 8px; text-align: center; width: 25%;">
            <div style="font-size: 28px; font-weight: bold; color: #1e3a5f;">${metrics.completedPatrols}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 5px;">Patrols Done</div>
          </td>
          <td style="padding: 15px; background-color: #f8fafc; border-radius: 8px; text-align: center; width: 25%;">
            <div style="font-size: 28px; font-weight: bold; color: ${metrics.geofenceAlerts > 5 ? '#ef4444' : '#1e3a5f'};">${metrics.geofenceAlerts}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 5px;">Alerts</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Top Performers -->
    ${metrics.topGuards.length > 0 ? `
    <div style="padding: 0 20px 20px;">
      <h2 style="color: #1e3a5f; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
        Top Performers
      </h2>
      <table style="width: 100%; border-collapse: collapse;">
        ${metrics.topGuards.map((guard, idx) => `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 0;">
              <span style="display: inline-block; width: 24px; height: 24px; background-color: ${idx === 0 ? '#fbbf24' : idx === 1 ? '#9ca3af' : idx === 2 ? '#d97706' : '#e2e8f0'}; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: bold; color: white; margin-right: 10px;">${idx + 1}</span>
              ${guard.name}
            </td>
            <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #1e3a5f;">
              ${guard.score} patrols
            </td>
          </tr>
        `).join('')}
      </table>
    </div>
    ` : ''}

    <!-- Visitor Stats -->
    <div style="padding: 0 20px 20px;">
      <div style="background-color: #f0f9ff; border-radius: 8px; padding: 15px;">
        <div style="font-size: 14px; color: #0369a1; font-weight: bold;">Visitors Processed</div>
        <div style="font-size: 24px; font-weight: bold; color: #1e3a5f; margin-top: 5px;">${metrics.visitorsProcessed}</div>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0; font-size: 12px; color: #64748b;">
        This is an automated report from DHUUD Security Module.
      </p>
      <p style="margin: 10px 0 0; font-size: 12px; color: #64748b;">
        To manage your report preferences, visit the Report Schedules page.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
