import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { sendEmailViaSES, getAppUrl, emailButton } from "../_shared/email-sender.ts";
import { sendWhatsAppText, isProviderConfigured } from "../_shared/whatsapp-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ActionSLAConfig {
  priority: string;
  warning_days_before: number;
  escalation_days_after: number;
  second_escalation_days_after: number | null;
}

interface CorrectiveAction {
  id: string;
  title: string;
  priority: string | null;
  due_date: string | null;
  status: string | null;
  escalation_level: number;
  sla_warning_sent_at: string | null;
  sla_escalation_sent_at: string | null;
  assigned_to: string | null;
  tenant_id: string;
  incident_id: string | null;
  session_id: string | null;
}

// Send WhatsApp notification helper
async function sendWhatsAppNotification(phone: string, message: string): Promise<void> {
  const providerStatus = isProviderConfigured();
  if (!providerStatus.configured) {
    console.log(`[SLA WhatsApp] Provider not configured, missing: ${providerStatus.missing.join(', ')}`);
    return;
  }
  
  try {
    const result = await sendWhatsAppText(phone, message);
    if (result.success) {
      console.log(`[SLA WhatsApp] Message sent successfully via ${result.provider}`);
    } else {
      console.error(`[SLA WhatsApp] Failed to send: ${result.error}`);
    }
  } catch (error) {
    console.error('[SLA WhatsApp] Error sending message:', error);
  }
}

// deno-lint-ignore no-explicit-any
async function sendEscalationNotifications(supabaseClient: any, action: CorrectiveAction, level: number, daysOverdue: number) {
  const { data: hsseManagers } = await supabaseClient
    .from("user_role_assignments")
    .select(`user_id, profiles!inner(id, full_name, phone, mobile, tenant_id), roles!inner(code)`)
    .eq("profiles.tenant_id", action.tenant_id)
    .in("roles.code", ["hsse_manager", "hsse_officer", "admin"]);

  const appUrl = getAppUrl();
  const levelText = level === 2 ? "🚨 CRITICAL ESCALATION" : "⚠️ ACTION ESCALATED";

  for (const manager of hsseManagers || []) {
    const userId = (manager as { user_id: string }).user_id;
    // deno-lint-ignore no-explicit-any
    const profile = (manager as any).profiles;
    const { data: authUser } = await supabaseClient.auth.admin.getUserById(userId);

    // Send Email
    if (authUser?.user?.email) {
      await sendEmailViaSES(authUser.user.email, `${levelText}: ${action.title}`, `
        <h2>Action Escalation Level ${level}</h2>
        <p>The following action is ${daysOverdue} days overdue and has been escalated:</p>
        <ul>
          <li><strong>Title:</strong> ${action.title}</li>
          <li><strong>Priority:</strong> ${action.priority || "Medium"}</li>
          <li><strong>Days Overdue:</strong> ${daysOverdue}</li>
          <li><strong>Escalation Level:</strong> ${level}</li>
        </ul>
        ${emailButton("Review Escalated Actions", `${appUrl}/my-actions`, level === 2 ? "#dc2626" : "#ea580c")}
        <p>Please review and take necessary action.</p>
      `, 'action_escalation');
    }

    // Send WhatsApp
    const phone = profile?.mobile || profile?.phone;
    if (phone) {
      const whatsAppMessage = level === 2 
        ? `🚨 *تصعيد حرج | CRITICAL ESCALATION*\n\nالإجراء: ${action.title}\nمتأخر: ${daysOverdue} يوم\nالأولوية: ${action.priority || 'متوسط'}\n\nيرجى المراجعة فوراً:\n${appUrl}/my-actions`
        : `⚠️ *تصعيد إجراء | ACTION ESCALATED*\n\nالإجراء: ${action.title}\nمتأخر: ${daysOverdue} يوم\nالأولوية: ${action.priority || 'متوسط'}\n\nيرجى المراجعة:\n${appUrl}/my-actions`;
      
      await sendWhatsAppNotification(phone, whatsAppMessage);
    }
  }
}

// Send warning to assignee
// deno-lint-ignore no-explicit-any
async function sendWarningNotifications(supabaseClient: any, action: CorrectiveAction, daysUntilDue: number) {
  if (!action.assigned_to) return;

  const { data: assignee } = await supabaseClient
    .from("profiles")
    .select("full_name, phone, mobile")
    .eq("id", action.assigned_to)
    .single();
  
  const { data: authUser } = await supabaseClient.auth.admin.getUserById(action.assigned_to);
  const appUrl = getAppUrl();

  // Send Email
  if (authUser?.user?.email) {
    await sendEmailViaSES(authUser.user.email, `⚠️ Action Due Soon: ${action.title}`, `
      <h2>Action Reminder</h2>
      <p>Hello ${assignee?.full_name || "User"},</p>
      <p>Your assigned action "<strong>${action.title}</strong>" is due in <strong>${daysUntilDue} days</strong>.</p>
      <p>Please ensure it is completed on time to avoid escalation.</p>
      <p>Priority: ${action.priority || "Medium"}</p>
      ${emailButton("View My Actions", `${appUrl}/my-actions`, "#ca8a04")}
    `, 'action_warning');
  }

  // Send WhatsApp
  const phone = assignee?.mobile || assignee?.phone;
  if (phone) {
    const whatsAppMessage = `⏰ *تذكير بموعد الإجراء | ACTION REMINDER*\n\nالإجراء: ${action.title}\nالموعد النهائي: ${daysUntilDue} يوم\nالأولوية: ${action.priority || 'متوسط'}\n\nيرجى الإكمال في الوقت المحدد لتجنب التصعيد:\n${appUrl}/my-actions`;
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

    console.log("Starting SLA escalation check...");

    // Log WhatsApp provider status
    const providerStatus = isProviderConfigured();
    console.log(`[SLA] WhatsApp provider: ${providerStatus.provider}, configured: ${providerStatus.configured}`);

    const { data: slaConfigs, error: slaError } = await supabase.from("action_sla_configs").select("*");
    if (slaError) throw slaError;

    const configMap = new Map<string, ActionSLAConfig>();
    for (const config of slaConfigs || []) {
      configMap.set(config.priority, config);
    }

    const { data: actions, error: actionsError } = await supabase
      .from("corrective_actions")
      .select(`id, title, priority, due_date, status, escalation_level, sla_warning_sent_at, sla_escalation_sent_at, assigned_to, tenant_id, incident_id, session_id`)
      .not("status", "in", "(completed,verified,closed)")
      .not("due_date", "is", null)
      .is("deleted_at", null);

    if (actionsError) throw actionsError;

    console.log(`Found ${actions?.length || 0} actions to check`);

    const today = new Date();
    const warnings: string[] = [];
    const escalations: string[] = [];
    const whatsAppSent: string[] = [];

    for (const action of actions || []) {
      const config = configMap.get(action.priority || "medium") || configMap.get("medium");
      if (!config || !action.due_date) continue;

      const dueDate = new Date(action.due_date);
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const daysOverdue = -daysUntilDue;

      // Check if warning needed
      if (daysUntilDue <= config.warning_days_before && daysUntilDue > 0 && !action.sla_warning_sent_at) {
        await sendWarningNotifications(supabase, action, daysUntilDue);
        await supabase.from("corrective_actions").update({ sla_warning_sent_at: new Date().toISOString() }).eq("id", action.id);
        warnings.push(action.id);
        whatsAppSent.push(action.id);
      }

      // Check if escalation level 1 needed
      if (daysOverdue >= config.escalation_days_after && action.escalation_level < 1) {
        await supabase.from("corrective_actions").update({ escalation_level: 1, sla_escalation_sent_at: new Date().toISOString() }).eq("id", action.id);
        await sendEscalationNotifications(supabase, action, 1, daysOverdue);
        escalations.push(action.id);
        whatsAppSent.push(action.id);
      }

      // Check if escalation level 2 needed
      if (config.second_escalation_days_after && daysOverdue >= config.second_escalation_days_after && action.escalation_level < 2) {
        await supabase.from("corrective_actions").update({ escalation_level: 2 }).eq("id", action.id);
        await sendEscalationNotifications(supabase, action, 2, daysOverdue);
        escalations.push(action.id);
        whatsAppSent.push(action.id);
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
    console.error("SLA escalation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
