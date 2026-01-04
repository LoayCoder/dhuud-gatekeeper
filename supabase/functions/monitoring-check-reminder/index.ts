/**
 * Monitoring Check Reminder - GAP 4 Implementation
 * 
 * Sends reminders for incidents in monitoring period and checks for due monitoring reviews.
 * Also detects if monitoring period has completed and prompts for final closure.
 * 
 * Schedule: Run via cron daily
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MonitoringCheck {
  id: string;
  incident_id: string;
  tenant_id: string;
  scheduled_date: string;
  status: string;
}

interface IncidentMonitoring {
  id: string;
  reference_id: string | null;
  title: string;
  tenant_id: string;
  status: string;
  monitoring_period_days: number | null;
  monitoring_started_at: string | null;
  monitoring_due_at: string | null;
}

async function sendMonitoringReminder(
  supabase: any,
  incident: IncidentMonitoring,
  checkDate: string,
  daysUntilDue: number
) {
  // Get investigators and HSSE managers
  const { data: investigation } = await supabase
    .from('investigations')
    .select('investigator_id')
    .eq('incident_id', incident.id)
    .single();

  const recipients: string[] = [];
  if (investigation?.investigator_id) {
    recipients.push(investigation.investigator_id);
  }

  // Get HSSE Managers
  const { data: managers } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('tenant_id', incident.tenant_id)
    .eq('role_id', (await supabase.from('roles').select('id').eq('name', 'hsse_manager').single()).data?.id);

  managers?.forEach((m: { user_id: string }) => {
    if (!recipients.includes(m.user_id)) {
      recipients.push(m.user_id);
    }
  });

  const appUrl = Deno.env.get('APP_URL') || 'https://app.dhuud.com';
  const incidentLink = `${appUrl}/incidents/${incident.id}`;

  for (const userId of recipients) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (!profile?.email) continue;

    try {
      await supabase.functions.invoke('send-email-template', {
        body: {
          to: profile.email,
          subject: `🔔 Monitoring Check Due: ${incident.reference_id || incident.id}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #3b82f6; color: white; padding: 16px; text-align: center;">
                <h2 style="margin: 0;">🔔 Monitoring Check Reminder</h2>
              </div>
              <div style="padding: 20px; background: #eff6ff;">
                <p>Hello ${profile.full_name || 'Team Member'},</p>
                <p>A monitoring check is ${daysUntilDue <= 0 ? 'due now' : `due in ${daysUntilDue} day(s)`} for the following incident:</p>
                <p><strong>Incident:</strong> ${incident.reference_id || incident.id}</p>
                <p><strong>Title:</strong> ${incident.title}</p>
                <p><strong>Check Date:</strong> ${checkDate}</p>
                <p><strong>Monitoring Period:</strong> ${incident.monitoring_period_days} days</p>
                <p style="margin-top: 16px;">Please verify that the corrective actions are still effective and no recurrence has occurred.</p>
                <div style="text-align: center; margin-top: 24px;">
                  <a href="${incidentLink}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                    Complete Monitoring Check →
                  </a>
                </div>
              </div>
            </div>
          `,
        },
      });
      console.log(`[Monitoring Reminder] Email sent to ${profile.email}`);
    } catch (e) {
      console.error(`[Monitoring Reminder] Failed to send email:`, e);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[Monitoring Reminder] Starting monitoring check reminder process...');

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const reminderWindow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get pending monitoring checks due within 7 days
    const { data: pendingChecks, error: checksError } = await supabase
      .from('monitoring_check_schedule')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_date', reminderWindow)
      .is('deleted_at', null)
      .order('scheduled_date', { ascending: true });

    if (checksError) {
      console.error('[Monitoring Reminder] Error fetching checks:', checksError);
      throw checksError;
    }

    console.log(`[Monitoring Reminder] Found ${pendingChecks?.length || 0} pending checks`);

    let remindersSent = 0;
    let checksMarkedOverdue = 0;

    for (const check of pendingChecks || []) {
      const checkDate = new Date(check.scheduled_date);
      const daysUntilDue = Math.floor((checkDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Get incident details
      const { data: incident } = await supabase
        .from('incidents')
        .select('id, reference_id, title, tenant_id, status, monitoring_period_days, monitoring_started_at, monitoring_due_at')
        .eq('id', check.incident_id)
        .single();

      if (!incident) continue;

      // Mark as overdue if past due date
      if (daysUntilDue < 0) {
        await supabase
          .from('monitoring_check_schedule')
          .update({ status: 'overdue' })
          .eq('id', check.id);
        checksMarkedOverdue++;
      }

      // Send reminder if due within 7 days or overdue
      if (daysUntilDue <= 7) {
        await sendMonitoringReminder(supabase, incident, check.scheduled_date, daysUntilDue);
        remindersSent++;
      }
    }

    // Check for incidents where monitoring period has completed
    const { data: completedMonitoring } = await supabase
      .from('incidents')
      .select('id, reference_id, title, tenant_id, status, monitoring_due_at')
      .in('status', ['monitoring_30_day', 'monitoring_60_day', 'monitoring_90_day'])
      .lte('monitoring_due_at', today)
      .is('deleted_at', null);

    let readyForClosure = 0;

    for (const incident of completedMonitoring || []) {
      // Check if all monitoring checks are completed
      const { data: pendingChecks } = await supabase
        .from('monitoring_check_schedule')
        .select('id')
        .eq('incident_id', incident.id)
        .in('status', ['pending', 'overdue'])
        .is('deleted_at', null);

      if (!pendingChecks?.length) {
        // All checks completed, move to ready for closure
        await supabase
          .from('incidents')
          .update({ status: 'pending_final_closure' })
          .eq('id', incident.id);
        readyForClosure++;
        console.log(`[Monitoring Reminder] Incident ${incident.reference_id} ready for final closure`);
      }
    }

    console.log(`[Monitoring Reminder] Completed: ${remindersSent} reminders, ${checksMarkedOverdue} overdue, ${readyForClosure} ready for closure`);

    return new Response(
      JSON.stringify({
        message: 'Monitoring check reminder completed',
        remindersSent,
        checksMarkedOverdue,
        readyForClosure,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Monitoring Reminder] Error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
