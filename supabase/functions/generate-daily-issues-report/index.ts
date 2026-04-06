import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const recipientEmail = "Loay.smartphoto@gmail.com";

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // --- Section A: Incidents Summary (last 24h) ---
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: newIncidents, error: incErr } = await supabase
      .from("incidents")
      .select("id, reference_id, title, severity, status, location, occurred_at, event_type, branch_id")
      .is("deleted_at", null)
      .gte("created_at", twentyFourHoursAgo)
      .order("created_at", { ascending: false });

    if (incErr) console.error("Error fetching new incidents:", incErr);

    const { data: openIncidents, error: openErr } = await supabase
      .from("incidents")
      .select("id, severity, status")
      .is("deleted_at", null)
      .not("status", "eq", "closed");

    if (openErr) console.error("Error fetching open incidents:", openErr);

    // Severity breakdown for new incidents
    const severityCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    (newIncidents || []).forEach((inc: any) => {
      const sev = inc.severity || "unknown";
      const st = inc.status || "unknown";
      severityCounts[sev] = (severityCounts[sev] || 0) + 1;
      statusCounts[st] = (statusCounts[st] || 0) + 1;
    });

    // Open incidents breakdown
    const openSeverityCounts: Record<string, number> = {};
    (openIncidents || []).forEach((inc: any) => {
      const sev = inc.severity || "unknown";
      openSeverityCounts[sev] = (openSeverityCounts[sev] || 0) + 1;
    });

    // --- Section B: Notification Delivery Health (last 24h) ---
    const { data: notifStats, error: notifErr } = await supabase
      .from("auto_notification_logs")
      .select("channel, status, attempt_count")
      .gte("created_at", twentyFourHoursAgo);

    if (notifErr) console.error("Error fetching notification stats:", notifErr);

    // Aggregate notification stats
    const channelStats: Record<string, { sent: number; failed: number; permanently_failed: number; retried: number; total: number }> = {};
    (notifStats || []).forEach((n: any) => {
      const ch = n.channel || "unknown";
      if (!channelStats[ch]) channelStats[ch] = { sent: 0, failed: 0, permanently_failed: 0, retried: 0, total: 0 };
      channelStats[ch].total++;
      if (n.status === "sent") channelStats[ch].sent++;
      else if (n.status === "permanently_failed") channelStats[ch].permanently_failed++;
      else if (n.status === "failed") channelStats[ch].failed++;
      if (n.attempt_count > 1) channelStats[ch].retried++;
    });

    // Failed notification details
    const { data: failedNotifs, error: failErr } = await supabase
      .from("auto_notification_logs")
      .select("channel, event_type, error_message, attempt_count, created_at, status")
      .in("status", ["failed", "permanently_failed"])
      .gte("created_at", twentyFourHoursAgo)
      .order("created_at", { ascending: false })
      .limit(20);

    if (failErr) console.error("Error fetching failed notifications:", failErr);

    // --- Build HTML Email ---
    const now = new Date();
    const reportDate = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    const newIncCount = (newIncidents || []).length;
    const openIncCount = (openIncidents || []).length;
    const totalNotifs = (notifStats || []).length;
    const totalFailed = Object.values(channelStats).reduce((a, c) => a + c.failed + c.permanently_failed, 0);

    // Build severity breakdown rows
    const severityRows = ["L1", "L2", "L3", "L4", "L5"]
      .map(s => `<tr><td style="padding:6px 12px;border:1px solid #e2e8f0;">${s}</td><td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:center;">${severityCounts[s] || 0}</td><td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:center;">${openSeverityCounts[s] || 0}</td></tr>`)
      .join("");

    // Build new incidents table rows
    const incidentRows = (newIncidents || []).slice(0, 30).map((inc: any) => {
      const sevColor = inc.severity === "L5" || inc.severity === "L4" ? "#e53e3e" : inc.severity === "L3" ? "#dd6b20" : "#38a169";
      const occurredAt = inc.occurred_at ? new Date(inc.occurred_at).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" }) : "N/A";
      return `<tr>
        <td style="padding:6px 12px;border:1px solid #e2e8f0;font-family:monospace;font-size:12px;">${inc.reference_id || "—"}</td>
        <td style="padding:6px 12px;border:1px solid #e2e8f0;">${inc.title || inc.event_type || "—"}</td>
        <td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:center;"><span style="background:${sevColor};color:white;padding:2px 8px;border-radius:4px;font-size:12px;">${inc.severity || "—"}</span></td>
        <td style="padding:6px 12px;border:1px solid #e2e8f0;">${inc.status || "—"}</td>
        <td style="padding:6px 12px;border:1px solid #e2e8f0;">${inc.location || "—"}</td>
        <td style="padding:6px 12px;border:1px solid #e2e8f0;">${occurredAt}</td>
      </tr>`;
    }).join("");

    // Build channel stats rows
    const channelRows = Object.entries(channelStats).map(([ch, stats]) => {
      const successRate = stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0;
      const rateColor = successRate >= 90 ? "#38a169" : successRate >= 70 ? "#dd6b20" : "#e53e3e";
      return `<tr>
        <td style="padding:6px 12px;border:1px solid #e2e8f0;text-transform:capitalize;">${ch}</td>
        <td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:center;">${stats.total}</td>
        <td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:center;color:#38a169;">${stats.sent}</td>
        <td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:center;color:#e53e3e;">${stats.failed}</td>
        <td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:center;color:#9b2c2c;">${stats.permanently_failed}</td>
        <td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:center;">${stats.retried}</td>
        <td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:center;"><span style="color:${rateColor};font-weight:bold;">${successRate}%</span></td>
      </tr>`;
    }).join("");

    // Build failed notifications rows
    const failedRows = (failedNotifs || []).map((n: any) => {
      const createdAt = new Date(n.created_at).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" });
      const statusBadge = n.status === "permanently_failed"
        ? '<span style="background:#9b2c2c;color:white;padding:2px 6px;border-radius:4px;font-size:11px;">PERMANENT</span>'
        : '<span style="background:#e53e3e;color:white;padding:2px 6px;border-radius:4px;font-size:11px;">FAILED</span>';
      return `<tr>
        <td style="padding:6px 12px;border:1px solid #e2e8f0;text-transform:capitalize;">${n.channel}</td>
        <td style="padding:6px 12px;border:1px solid #e2e8f0;">${n.event_type || "—"}</td>
        <td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:center;">${statusBadge}</td>
        <td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:center;">${n.attempt_count}</td>
        <td style="padding:6px 12px;border:1px solid #e2e8f0;font-size:12px;color:#e53e3e;">${n.error_message || "—"}</td>
        <td style="padding:6px 12px;border:1px solid #e2e8f0;">${createdAt}</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f7fafc;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7fafc;padding:20px;">
    <tr><td align="center">
      <table width="700" cellpadding="0" cellspacing="0" style="background:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <tr><td style="background:#1a365d;padding:24px 32px;">
          <h1 style="margin:0;color:white;font-size:22px;">DHUUD Daily System Report</h1>
          <p style="margin:4px 0 0;color:#a0aec0;font-size:14px;">${reportDate}</p>
        </td></tr>

        <!-- Summary Cards -->
        <tr><td style="padding:24px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="25%" style="padding:8px;">
                <div style="background:#ebf8ff;border-radius:8px;padding:16px;text-align:center;">
                  <div style="font-size:28px;font-weight:bold;color:#2b6cb0;">${newIncCount}</div>
                  <div style="font-size:12px;color:#4a5568;margin-top:4px;">New Incidents (24h)</div>
                </div>
              </td>
              <td width="25%" style="padding:8px;">
                <div style="background:#fff5f5;border-radius:8px;padding:16px;text-align:center;">
                  <div style="font-size:28px;font-weight:bold;color:#c53030;">${openIncCount}</div>
                  <div style="font-size:12px;color:#4a5568;margin-top:4px;">Open Incidents</div>
                </div>
              </td>
              <td width="25%" style="padding:8px;">
                <div style="background:#f0fff4;border-radius:8px;padding:16px;text-align:center;">
                  <div style="font-size:28px;font-weight:bold;color:#276749;">${totalNotifs}</div>
                  <div style="font-size:12px;color:#4a5568;margin-top:4px;">Notifications (24h)</div>
                </div>
              </td>
              <td width="25%" style="padding:8px;">
                <div style="background:${totalFailed > 0 ? '#fff5f5' : '#f0fff4'};border-radius:8px;padding:16px;text-align:center;">
                  <div style="font-size:28px;font-weight:bold;color:${totalFailed > 0 ? '#c53030' : '#276749'};">${totalFailed}</div>
                  <div style="font-size:12px;color:#4a5568;margin-top:4px;">Failed Notifications</div>
                </div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Section A: Incidents -->
        <tr><td style="padding:0 32px 24px;">
          <h2 style="color:#1a365d;font-size:18px;border-bottom:2px solid #e2e8f0;padding-bottom:8px;">📋 Incidents Summary</h2>
          
          <h3 style="color:#4a5568;font-size:14px;margin-bottom:8px;">Severity Breakdown</h3>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:16px;">
            <tr style="background:#edf2f7;">
              <th style="padding:8px 12px;border:1px solid #e2e8f0;text-align:start;">Severity</th>
              <th style="padding:8px 12px;border:1px solid #e2e8f0;text-align:center;">New (24h)</th>
              <th style="padding:8px 12px;border:1px solid #e2e8f0;text-align:center;">Open (Total)</th>
            </tr>
            ${severityRows}
          </table>

          ${newIncCount > 0 ? `
          <h3 style="color:#4a5568;font-size:14px;margin-bottom:8px;">New Incidents (Last 24 Hours)</h3>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
            <tr style="background:#edf2f7;">
              <th style="padding:8px 12px;border:1px solid #e2e8f0;text-align:start;">Ref</th>
              <th style="padding:8px 12px;border:1px solid #e2e8f0;text-align:start;">Title</th>
              <th style="padding:8px 12px;border:1px solid #e2e8f0;text-align:center;">Severity</th>
              <th style="padding:8px 12px;border:1px solid #e2e8f0;text-align:start;">Status</th>
              <th style="padding:8px 12px;border:1px solid #e2e8f0;text-align:start;">Location</th>
              <th style="padding:8px 12px;border:1px solid #e2e8f0;text-align:start;">Occurred</th>
            </tr>
            ${incidentRows}
          </table>
          ` : '<p style="color:#718096;font-style:italic;">No new incidents in the last 24 hours.</p>'}
        </td></tr>

        <!-- Section B: Notification Health -->
        <tr><td style="padding:0 32px 24px;">
          <h2 style="color:#1a365d;font-size:18px;border-bottom:2px solid #e2e8f0;padding-bottom:8px;">🔔 Notification Delivery Health</h2>
          
          ${Object.keys(channelStats).length > 0 ? `
          <h3 style="color:#4a5568;font-size:14px;margin-bottom:8px;">Channel Summary</h3>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;margin-bottom:16px;">
            <tr style="background:#edf2f7;">
              <th style="padding:8px 12px;border:1px solid #e2e8f0;text-align:start;">Channel</th>
              <th style="padding:8px 12px;border:1px solid #e2e8f0;text-align:center;">Total</th>
              <th style="padding:8px 12px;border:1px solid #e2e8f0;text-align:center;">Sent</th>
              <th style="padding:8px 12px;border:1px solid #e2e8f0;text-align:center;">Failed</th>
              <th style="padding:8px 12px;border:1px solid #e2e8f0;text-align:center;">Permanent</th>
              <th style="padding:8px 12px;border:1px solid #e2e8f0;text-align:center;">Retried</th>
              <th style="padding:8px 12px;border:1px solid #e2e8f0;text-align:center;">Success Rate</th>
            </tr>
            ${channelRows}
          </table>
          ` : '<p style="color:#718096;font-style:italic;">No notifications sent in the last 24 hours.</p>'}

          ${(failedNotifs || []).length > 0 ? `
          <h3 style="color:#e53e3e;font-size:14px;margin-bottom:8px;">⚠️ Failed Notifications (Recent)</h3>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:12px;">
            <tr style="background:#fff5f5;">
              <th style="padding:8px 12px;border:1px solid #e2e8f0;text-align:start;">Channel</th>
              <th style="padding:8px 12px;border:1px solid #e2e8f0;text-align:start;">Event</th>
              <th style="padding:8px 12px;border:1px solid #e2e8f0;text-align:center;">Status</th>
              <th style="padding:8px 12px;border:1px solid #e2e8f0;text-align:center;">Attempts</th>
              <th style="padding:8px 12px;border:1px solid #e2e8f0;text-align:start;">Error</th>
              <th style="padding:8px 12px;border:1px solid #e2e8f0;text-align:start;">Time</th>
            </tr>
            ${failedRows}
          </table>
          ` : ''}
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#edf2f7;padding:16px 32px;text-align:center;">
          <p style="margin:0;color:#718096;font-size:12px;">This is an automated report generated by DHUUD Gatekeeper System</p>
          <p style="margin:4px 0 0;color:#a0aec0;font-size:11px;">Report generated at ${now.toISOString()}</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    // Send email via Resend API directly
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured, cannot send email");
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "DHUUD System <onboarding@resend.dev>",
        to: [recipientEmail],
        subject: `DHUUD Daily Report — ${reportDate} | ${newIncCount} new incidents, ${totalFailed} failed notifications`,
        html,
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("Email sent result:", JSON.stringify(emailResult));

    return new Response(JSON.stringify({
      success: true,
      summary: {
        new_incidents: newIncCount,
        open_incidents: openIncCount,
        total_notifications: totalNotifs,
        failed_notifications: totalFailed,
      },
      email: emailResult,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Daily report error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
