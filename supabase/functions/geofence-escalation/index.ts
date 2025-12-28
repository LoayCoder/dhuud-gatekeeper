import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EscalationRule {
  id: string;
  tenant_id: string;
  zone_id: string | null;
  rule_name: string;
  zone_type: string | null;
  breach_count_threshold: number;
  time_window_minutes: number;
  escalation_level: number;
  notify_roles: string[];
  notify_user_ids: string[] | null;
  auto_escalate: boolean;
  escalation_delay_minutes: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting geofence escalation check...');

    // Get active escalation rules
    const { data: rules, error: rulesError } = await supabase
      .from('geofence_escalation_rules')
      .select('*')
      .eq('is_active', true)
      .is('deleted_at', null);

    if (rulesError) {
      console.error('Error fetching escalation rules:', rulesError);
      throw rulesError;
    }

    console.log(`Found ${rules?.length || 0} active escalation rules`);

    let escalatedCount = 0;
    let notifiedCount = 0;

    for (const rule of rules as EscalationRule[] || []) {
      // Calculate time window
      const windowStart = new Date(Date.now() - rule.time_window_minutes * 60 * 1000);

      // Count breaches within the time window for this rule
      let breachQuery = supabase
        .from('geofence_alerts')
        .select('id, guard_id, zone_id, created_at, escalation_level')
        .eq('tenant_id', rule.tenant_id)
        .eq('alert_type', 'breach')
        .gte('created_at', windowStart.toISOString())
        .is('deleted_at', null);

      if (rule.zone_id) {
        breachQuery = breachQuery.eq('zone_id', rule.zone_id);
      }

      const { data: breaches, error: breachError } = await breachQuery;

      if (breachError) {
        console.error(`Error fetching breaches for rule ${rule.id}:`, breachError);
        continue;
      }

      // Group breaches by guard to check repeat offenders
      const guardBreaches = new Map<string, typeof breaches>();
      for (const breach of breaches || []) {
        const existing = guardBreaches.get(breach.guard_id) || [];
        existing.push(breach);
        guardBreaches.set(breach.guard_id, existing);
      }

      // Check for guards exceeding threshold
      for (const [guardId, guardBreachList] of guardBreaches.entries()) {
        if (guardBreachList.length >= rule.breach_count_threshold) {
          // Find breaches that haven't been escalated to this level yet
          const unescalated = guardBreachList.filter(
            b => (b.escalation_level || 0) < rule.escalation_level
          );

          if (unescalated.length === 0) continue;

          console.log(
            `Guard ${guardId} has ${guardBreachList.length} breaches, escalating ${unescalated.length} alerts to level ${rule.escalation_level}`
          );

          // Escalate the alerts
          const alertIds = unescalated.map(b => b.id);
          const { error: updateError } = await supabase
            .from('geofence_alerts')
            .update({
              escalation_level: rule.escalation_level,
              escalated_at: new Date().toISOString(),
              auto_escalated: true,
              escalation_notes: `Auto-escalated by rule: ${rule.rule_name}. ${guardBreachList.length} breaches in ${rule.time_window_minutes} minutes.`,
            })
            .in('id', alertIds);

          if (updateError) {
            console.error(`Error escalating alerts:`, updateError);
            continue;
          }

          escalatedCount += alertIds.length;

          // Send notifications
          const notifyUserIds: string[] = [];

          // Get users to notify by role
          if (rule.notify_roles && rule.notify_roles.length > 0) {
            const { data: roleUsers } = await supabase
              .from('user_role_assignments')
              .select('user_id, roles!inner(code)')
              .eq('tenant_id', rule.tenant_id)
              .in('roles.code', rule.notify_roles)
              .is('deleted_at', null);

            if (roleUsers) {
              notifyUserIds.push(...roleUsers.map(r => r.user_id));
            }
          }

          // Add specific user IDs
          if (rule.notify_user_ids) {
            notifyUserIds.push(...rule.notify_user_ids);
          }

          // Deduplicate
          const uniqueUserIds = [...new Set(notifyUserIds)];

          if (uniqueUserIds.length > 0) {
            // Get guard name
            const { data: guardProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', guardId)
              .single();

            const guardName = guardProfile?.full_name || 'Unknown Guard';

            // Send push notifications
            await supabase.functions.invoke('send-push-notification', {
              body: {
                user_ids: uniqueUserIds,
                payload: {
                  title: `🚨 Geofence Escalation - Level ${rule.escalation_level}`,
                  body: `${guardName} has ${guardBreachList.length} geofence breaches in the last ${rule.time_window_minutes} minutes. Immediate attention required.`,
                  tag: `geofence-escalation-${guardId}`,
                  requireInteraction: true,
                  data: {
                    type: 'geofence_escalation',
                    guard_id: guardId,
                    escalation_level: rule.escalation_level,
                    breach_count: guardBreachList.length,
                  },
                },
              },
            });

            notifiedCount += uniqueUserIds.length;
          }
        }
      }
    }

    console.log(`Geofence escalation complete: ${escalatedCount} alerts escalated, ${notifiedCount} notifications sent`);

    return new Response(
      JSON.stringify({
        success: true,
        escalated: escalatedCount,
        notified: notifiedCount,
        rules_checked: rules?.length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Geofence escalation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
