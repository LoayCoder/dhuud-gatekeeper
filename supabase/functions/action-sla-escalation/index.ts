import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { sendEmailViaSES } from "../_shared/email-sender.ts";

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

// deno-lint-ignore no-explicit-any
async function sendEscalationEmailFn(supabaseClient: any, action: CorrectiveAction, level: number, daysOverdue: number) {
  const { data: hsseManagers } = await supabaseClient
    .from("user_role_assignments")
    .select(`user_id, profiles!inner(id, full_name, tenant_id), roles!inner(code)`)
    .eq("profiles.tenant_id", action.tenant_id)
    .in("roles.code", ["hsse_manager", "hsse_officer", "admin"]);

  for (const manager of hsseManagers || []) {
    const userId = (manager as { user_id: string }).user_id;
    const { data: authUser } = await supabaseClient.auth.admin.getUserById(userId);

    if (authUser?.user?.email) {
      const levelText = level === 2 ? "🚨 CRITICAL ESCALATION" : "⚠️ ACTION ESCALATED";
      await sendEmailViaSES(authUser.user.email, `${levelText}: ${action.title}`, `
        <h2>Action Escalation Level ${level}</h2>
        <p>The following action is ${daysOverdue} days overdue and has been escalated:</p>
        <ul>
          <li><strong>Title:</strong> ${action.title}</li>
          <li><strong>Priority:</strong> ${action.priority || "Medium"}</li>
          <li><strong>Days Overdue:</strong> ${daysOverdue}</li>
          <li><strong>Escalation Level:</strong> ${level}</li>
        </ul>
        <p>Please review and take necessary action.</p>
      `, 'action_escalation');
    }
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

    for (const action of actions || []) {
      const config = configMap.get(action.priority || "medium") || configMap.get("medium");
      if (!config || !action.due_date) continue;

      const dueDate = new Date(action.due_date);
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const daysOverdue = -daysUntilDue;

      // Check if warning needed
      if (daysUntilDue <= config.warning_days_before && daysUntilDue > 0 && !action.sla_warning_sent_at) {
        if (action.assigned_to) {
          const { data: assignee } = await supabase.from("profiles").select("full_name").eq("id", action.assigned_to).single();
          const { data: authUser } = await supabase.auth.admin.getUserById(action.assigned_to);

          if (authUser?.user?.email) {
            await sendEmailViaSES(authUser.user.email, `⚠️ Action Due Soon: ${action.title}`, `
              <h2>Action Reminder</h2>
              <p>Hello ${assignee?.full_name || "User"},</p>
              <p>Your assigned action "<strong>${action.title}</strong>" is due in <strong>${daysUntilDue} days</strong>.</p>
              <p>Please ensure it is completed on time to avoid escalation.</p>
              <p>Priority: ${action.priority || "Medium"}</p>
            `, 'action_warning');
          }
        }

        await supabase.from("corrective_actions").update({ sla_warning_sent_at: new Date().toISOString() }).eq("id", action.id);
        warnings.push(action.id);
      }

      // Check if escalation level 1 needed
      if (daysOverdue >= config.escalation_days_after && action.escalation_level < 1) {
        await supabase.from("corrective_actions").update({ escalation_level: 1, sla_escalation_sent_at: new Date().toISOString() }).eq("id", action.id);
        await sendEscalationEmailFn(supabase, action, 1, daysOverdue);
        escalations.push(action.id);
      }

      // Check if escalation level 2 needed
      if (config.second_escalation_days_after && daysOverdue >= config.second_escalation_days_after && action.escalation_level < 2) {
        await supabase.from("corrective_actions").update({ escalation_level: 2 }).eq("id", action.id);
        await sendEscalationEmailFn(supabase, action, 2, daysOverdue);
        escalations.push(action.id);
      }
    }

    console.log(`Processed: ${warnings.length} warnings, ${escalations.length} escalations`);

    return new Response(JSON.stringify({ success: true, warnings_sent: warnings.length, escalations_sent: escalations.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    console.error("SLA escalation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
