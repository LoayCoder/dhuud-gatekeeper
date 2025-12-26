import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { sendEmailViaSES, getAppUrl, emailButton } from "../_shared/email-sender.ts";
import { sendWhatsAppText, isProviderConfigured } from "../_shared/whatsapp-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvestigationSLAConfig {
  severity_level: string;
  target_days: number;
  warning_days_before: number;
  escalation_days_after: number;
  second_escalation_days_after: number | null;
}

interface Investigation {
  id: string;
  incident_id: string;
  investigator_id: string | null;
  started_at: string | null;
  target_completion_date: string | null;
  escalation_level: number;
  sla_warning_sent_at: string | null;
  sla_escalation_sent_at: string | null;
  tenant_id: string;
}

interface Incident {
  id: string;
  title: string;
  severity_level: string | null;
  reference_id: string | null;
}

// Send WhatsApp notification helper
async function sendWhatsAppNotification(phone: string, message: string): Promise<void> {
  const providerStatus = isProviderConfigured();
  if (!providerStatus.configured) {
    console.log(`[Investigation SLA WhatsApp] Provider not configured, missing: ${providerStatus.missing.join(', ')}`);
    return;
  }
  
  try {
    const result = await sendWhatsAppText(phone, message);
    if (result.success) {
      console.log(`[Investigation SLA WhatsApp] Message sent successfully via ${result.provider}`);
    } else {
      console.error(`[Investigation SLA WhatsApp] Failed to send: ${result.error}`);
    }
  } catch (error) {
    console.error('[Investigation SLA WhatsApp] Error sending message:', error);
  }
}

// deno-lint-ignore no-explicit-any
async function sendEscalationNotifications(supabaseClient: any, investigation: Investigation, incident: Incident, level: number, daysOverdue: number) {
  const { data: hsseManagers } = await supabaseClient
    .from("user_role_assignments")
    .select(`user_id, profiles!inner(id, full_name, phone, mobile, tenant_id), roles!inner(code)`)
    .eq("profiles.tenant_id", investigation.tenant_id)
    .in("roles.code", ["hsse_manager", "hsse_officer", "admin"]);

  const appUrl = getAppUrl();
  const levelText = level === 2 ? "🚨 CRITICAL: Investigation Overdue" : "⚠️ Investigation Escalated";
  const incidentRef = incident.reference_id || incident.id.slice(0, 8);

  for (const manager of hsseManagers || []) {
    const userId = (manager as { user_id: string }).user_id;
    // deno-lint-ignore no-explicit-any
    const profile = (manager as any).profiles;
    const { data: authUser } = await supabaseClient.auth.admin.getUserById(userId);

    // Send Email
    if (authUser?.user?.email) {
      await sendEmailViaSES(authUser.user.email, `${levelText}: ${incident.title}`, `
        <h2>Investigation Escalation Level ${level}</h2>
        <p>The following investigation is ${daysOverdue} days overdue and has been escalated:</p>
        <ul>
          <li><strong>Incident:</strong> ${incidentRef} - ${incident.title}</li>
          <li><strong>Severity:</strong> ${incident.severity_level || "Unknown"}</li>
          <li><strong>Days Overdue:</strong> ${daysOverdue}</li>
          <li><strong>Escalation Level:</strong> ${level}</li>
        </ul>
        ${emailButton("Review Investigation", `${appUrl}/incidents/${incident.id}`, level === 2 ? "#dc2626" : "#ea580c")}
        <p>Please review and take necessary action.</p>
      `, 'investigation');
    }

    // Send WhatsApp
    const phone = profile?.mobile || profile?.phone;
    if (phone) {
      const whatsAppMessage = level === 2 
        ? `🚨 *تصعيد حرج - تحقيق متأخر | CRITICAL - Investigation Overdue*\n\nالحادث: ${incidentRef}\n${incident.title}\nمتأخر: ${daysOverdue} يوم\nالخطورة: ${incident.severity_level || 'غير محدد'}\n\nيرجى المراجعة فوراً:\n${appUrl}/incidents/${incident.id}`
        : `⚠️ *تصعيد تحقيق | Investigation Escalated*\n\nالحادث: ${incidentRef}\n${incident.title}\nمتأخر: ${daysOverdue} يوم\nالخطورة: ${incident.severity_level || 'غير محدد'}\n\nيرجى المراجعة:\n${appUrl}/incidents/${incident.id}`;
      
      await sendWhatsAppNotification(phone, whatsAppMessage);
    }
  }
}

// Send warning to investigator
// deno-lint-ignore no-explicit-any
async function sendWarningNotifications(supabaseClient: any, investigation: Investigation, incident: Incident, daysUntilDue: number) {
  if (!investigation.investigator_id) return;

  const { data: investigator } = await supabaseClient
    .from("profiles")
    .select("full_name, phone, mobile")
    .eq("id", investigation.investigator_id)
    .single();
  
  const { data: authUser } = await supabaseClient.auth.admin.getUserById(investigation.investigator_id);
  const appUrl = getAppUrl();
  const incidentRef = incident.reference_id || incident.id.slice(0, 8);

  // Send Email
  if (authUser?.user?.email) {
    await sendEmailViaSES(authUser.user.email, `⚠️ Investigation Due Soon: ${incident.title}`, `
      <h2>Investigation Reminder</h2>
      <p>Hello ${investigator?.full_name || "Investigator"},</p>
      <p>Your assigned investigation for incident "<strong>${incidentRef} - ${incident.title}</strong>" is due in <strong>${daysUntilDue} days</strong>.</p>
      <p>Please ensure the investigation is completed on time to avoid escalation.</p>
      <p>Severity: ${incident.severity_level || "Unknown"}</p>
      ${emailButton("View Investigation", `${appUrl}/incidents/${incident.id}`, "#ca8a04")}
    `, 'investigation');
  }

  // Send WhatsApp
  const phone = investigator?.mobile || investigator?.phone;
  if (phone) {
    const whatsAppMessage = `⏰ *تذكير بموعد التحقيق | Investigation Reminder*\n\nالحادث: ${incidentRef}\n${incident.title}\nالموعد النهائي: ${daysUntilDue} يوم\nالخطورة: ${incident.severity_level || 'غير محدد'}\n\nيرجى الإكمال في الوقت المحدد:\n${appUrl}/incidents/${incident.id}`;
    await sendWhatsAppNotification(phone, whatsAppMessage);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting Investigation SLA escalation check...");

    // Log WhatsApp provider status
    const providerStatus = isProviderConfigured();
    console.log(`[Investigation SLA] WhatsApp provider: ${providerStatus.provider}, configured: ${providerStatus.configured}`);

    // Get SLA configs
    const { data: slaConfigs, error: slaError } = await supabase
      .from("investigation_sla_configs")
      .select("*");
    if (slaError) throw slaError;

    const configMap = new Map<string, InvestigationSLAConfig>();
    for (const config of slaConfigs || []) {
      configMap.set(config.severity_level, config);
    }

    // Get active investigations with their incidents
    const { data: investigations, error: invError } = await supabase
      .from("investigations")
      .select(`
        id, 
        incident_id, 
        investigator_id, 
        started_at, 
        target_completion_date, 
        escalation_level, 
        sla_warning_sent_at, 
        sla_escalation_sent_at, 
        tenant_id
      `)
      .is("completed_at", null)
      .is("deleted_at", null);

    if (invError) throw invError;

    console.log(`Found ${investigations?.length || 0} active investigations to check`);

    const today = new Date();
    const warnings: string[] = [];
    const escalations: string[] = [];
    const whatsAppSent: string[] = [];

    for (const investigation of investigations || []) {
      // Get incident details
      const { data: incident } = await supabase
        .from("incidents")
        .select("id, title, severity_level, reference_id")
        .eq("id", investigation.incident_id)
        .single();

      if (!incident) continue;

      // Get SLA config based on severity
      const config = configMap.get(incident.severity_level || "Level 3") || configMap.get("Level 3");
      if (!config) continue;

      // Calculate target date if not set
      let targetDate: Date;
      if (investigation.target_completion_date) {
        targetDate = new Date(investigation.target_completion_date);
      } else if (investigation.started_at) {
        targetDate = new Date(investigation.started_at);
        targetDate.setDate(targetDate.getDate() + config.target_days);
        
        // Update the target date in database
        await supabase
          .from("investigations")
          .update({ target_completion_date: targetDate.toISOString() })
          .eq("id", investigation.id);
      } else {
        continue;
      }

      const daysUntilDue = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const daysOverdue = -daysUntilDue;

      // Check if warning needed
      if (daysUntilDue <= config.warning_days_before && daysUntilDue > 0 && !investigation.sla_warning_sent_at) {
        await sendWarningNotifications(supabase, investigation, incident as Incident, daysUntilDue);
        await supabase.from("investigations").update({ sla_warning_sent_at: new Date().toISOString() }).eq("id", investigation.id);
        warnings.push(investigation.id);
        whatsAppSent.push(investigation.id);
      }

      // Check if escalation level 1 needed
      const currentLevel = investigation.escalation_level || 0;
      if (daysOverdue >= config.escalation_days_after && currentLevel < 1) {
        await supabase.from("investigations").update({ 
          escalation_level: 1, 
          sla_escalation_sent_at: new Date().toISOString() 
        }).eq("id", investigation.id);
        await sendEscalationNotifications(supabase, investigation, incident as Incident, 1, daysOverdue);
        escalations.push(investigation.id);
        whatsAppSent.push(investigation.id);
      }

      // Check if escalation level 2 needed
      if (config.second_escalation_days_after && daysOverdue >= config.second_escalation_days_after && currentLevel < 2) {
        await supabase.from("investigations").update({ escalation_level: 2 }).eq("id", investigation.id);
        await sendEscalationNotifications(supabase, investigation, incident as Incident, 2, daysOverdue);
        escalations.push(investigation.id);
        whatsAppSent.push(investigation.id);
      }
    }

    console.log(`Processed: ${warnings.length} warnings, ${escalations.length} escalations, ${whatsAppSent.length} WhatsApp messages`);

    return new Response(JSON.stringify({ 
      success: true, 
      warnings_sent: warnings.length, 
      escalations_sent: escalations.length,
      whatsapp_sent: whatsAppSent.length 
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    console.error("Investigation SLA escalation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
