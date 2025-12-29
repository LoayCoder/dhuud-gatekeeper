import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmergencyAlert {
  id: string;
  tenant_id: string;
  alert_type: string;
  priority: string;
  triggered_at: string;
  acknowledged_at: string | null;
  sla_breach_notified_at: string | null;
  escalation_level: number;
  triggered_by: string;
}

interface SLAConfig {
  alert_type: string;
  priority: string;
  max_response_seconds: number;
  escalation_after_seconds: number;
  second_escalation_seconds: number;
  escalation_recipients: any[];
  notification_channels: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[SLA Check] Starting emergency SLA breach check...');

    // Get all active (unacknowledged) emergency alerts
    const { data: activeAlerts, error: alertsError } = await supabase
      .from('emergency_alerts')
      .select('id, tenant_id, alert_type, priority, triggered_at, acknowledged_at, sla_breach_notified_at, escalation_level, triggered_by')
      .is('acknowledged_at', null)
      .is('resolved_at', null)
      .order('triggered_at', { ascending: true });

    if (alertsError) {
      console.error('[SLA Check] Error fetching alerts:', alertsError);
      throw alertsError;
    }

    if (!activeAlerts || activeAlerts.length === 0) {
      console.log('[SLA Check] No active alerts to process');
      return new Response(
        JSON.stringify({ message: 'No active alerts', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[SLA Check] Found ${activeAlerts.length} active alerts`);

    // Get SLA configs for all tenants with active alerts
    const tenantIds = [...new Set(activeAlerts.map(a => a.tenant_id))];
    const { data: slaConfigs, error: configError } = await supabase
      .from('emergency_response_sla_configs')
      .select('*')
      .in('tenant_id', tenantIds)
      .eq('is_active', true)
      .is('deleted_at', null);

    if (configError) {
      console.error('[SLA Check] Error fetching SLA configs:', configError);
    }

    // Default SLA config if none exists
    const defaultSLA: SLAConfig = {
      alert_type: '*',
      priority: '*',
      max_response_seconds: 120, // 2 minutes
      escalation_after_seconds: 300, // 5 minutes
      second_escalation_seconds: 600, // 10 minutes
      escalation_recipients: [],
      notification_channels: ['push', 'email'],
    };

    const now = new Date();
    let breached = 0;
    let escalated = 0;

    for (const alert of activeAlerts) {
      const triggeredAt = new Date(alert.triggered_at);
      const elapsedSeconds = Math.floor((now.getTime() - triggeredAt.getTime()) / 1000);

      // Find matching SLA config
      const slaConfig = slaConfigs?.find(
        c => c.tenant_id === alert.tenant_id && 
             (c.alert_type === alert.alert_type || c.alert_type === '*') &&
             (c.priority === alert.priority || c.priority === '*')
      ) || defaultSLA;

      // Check if SLA is breached
      if (elapsedSeconds > slaConfig.max_response_seconds && !alert.sla_breach_notified_at) {
        console.log(`[SLA Check] Alert ${alert.id} breached SLA (${elapsedSeconds}s > ${slaConfig.max_response_seconds}s)`);
        
        // Mark as breached
        await supabase
          .from('emergency_alerts')
          .update({ 
            sla_breach_notified_at: now.toISOString(),
            escalation_level: 1,
          })
          .eq('id', alert.id);

        // Send breach notification (via dispatch-emergency-alert or direct notification)
        try {
          await supabase.functions.invoke('dispatch-emergency-alert', {
            body: {
              alertId: alert.id,
              type: 'sla_breach',
              escalationLevel: 1,
            },
          });
        } catch (notifyError) {
          console.error(`[SLA Check] Failed to send breach notification for ${alert.id}:`, notifyError);
        }

        breached++;
      }

      // Check for escalation (second level)
      if (
        alert.sla_breach_notified_at && 
        alert.escalation_level === 1 &&
        elapsedSeconds > slaConfig.escalation_after_seconds
      ) {
        console.log(`[SLA Check] Alert ${alert.id} escalating to level 2`);
        
        await supabase
          .from('emergency_alerts')
          .update({ escalation_level: 2 })
          .eq('id', alert.id);

        try {
          await supabase.functions.invoke('dispatch-emergency-alert', {
            body: {
              alertId: alert.id,
              type: 'sla_escalation',
              escalationLevel: 2,
            },
          });
        } catch (notifyError) {
          console.error(`[SLA Check] Failed to send escalation notification for ${alert.id}:`, notifyError);
        }

        escalated++;
      }

      // Check for second escalation (third level)
      if (
        alert.escalation_level === 2 &&
        elapsedSeconds > slaConfig.second_escalation_seconds
      ) {
        console.log(`[SLA Check] Alert ${alert.id} escalating to level 3 (critical)`);
        
        await supabase
          .from('emergency_alerts')
          .update({ escalation_level: 3 })
          .eq('id', alert.id);

        try {
          await supabase.functions.invoke('dispatch-emergency-alert', {
            body: {
              alertId: alert.id,
              type: 'sla_critical',
              escalationLevel: 3,
            },
          });
        } catch (notifyError) {
          console.error(`[SLA Check] Failed to send critical escalation for ${alert.id}:`, notifyError);
        }

        escalated++;
      }
    }

    console.log(`[SLA Check] Completed: ${breached} breached, ${escalated} escalated`);

    return new Response(
      JSON.stringify({ 
        message: 'SLA check completed',
        processed: activeAlerts.length,
        breached,
        escalated,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SLA Check] Error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
