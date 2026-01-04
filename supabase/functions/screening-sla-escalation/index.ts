/**
 * Screening SLA Escalation - GAP 1 Implementation
 * 
 * Checks for incidents sitting in submitted/pending_dept_rep_incident_review status
 * and triggers warning/escalation notifications to HSSE Managers when SLA breached.
 * 
 * Schedule: Run via cron every 30 minutes
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScreeningSLAConfig {
  tenant_id: string;
  severity_level: string;
  max_screening_hours: number;
  warning_hours_before: number;
  escalation_hours: number;
}

interface IncidentForScreening {
  id: string;
  reference_id: string | null;
  title: string;
  tenant_id: string;
  status: string;
  severity_v2: string | null;
  created_at: string;
  screening_escalation_level: number;
  screening_sla_warning_sent_at: string | null;
  screening_escalated_at: string | null;
}

// Default SLA configs if tenant hasn't configured
const DEFAULT_SLA_CONFIGS: Record<string, { maxHours: number; warningHours: number; escalationHours: number }> = {
  'Level 1': { maxHours: 24, warningHours: 4, escalationHours: 8 },
  'Level 2': { maxHours: 12, warningHours: 2, escalationHours: 4 },
  'Level 3': { maxHours: 8, warningHours: 2, escalationHours: 4 },
  'Level 4': { maxHours: 4, warningHours: 1, escalationHours: 2 },
  'Level 5': { maxHours: 2, warningHours: 1, escalationHours: 1 },
};

async function sendEscalationEmail(
  supabase: any,
  tenantId: string,
  incident: IncidentForScreening,
  escalationLevel: number,
  hoursWaiting: number
) {
  // Get HSSE Managers for this tenant
  const { data: managers } = await supabase
    .from('user_roles')
    .select(`
      user_id,
      profiles!inner(id, full_name, email)
    `)
    .eq('tenant_id', tenantId)
    .eq('role_id', (await supabase.from('roles').select('id').eq('name', 'hsse_manager').single()).data?.id);

  if (!managers?.length) {
    console.log(`[Screening SLA] No HSSE Managers found for tenant ${tenantId}`);
    return;
  }

  const appUrl = Deno.env.get('APP_URL') || 'https://app.dhuud.com';
  const incidentLink = `${appUrl}/incidents/${incident.id}`;

  for (const manager of managers) {
    const profile = manager.profiles;
    if (!profile?.email) continue;

    try {
      await supabase.functions.invoke('send-email-template', {
        body: {
          to: profile.email,
          subject: `⚠️ Screening SLA Alert: ${incident.reference_id || incident.id}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #f97316; color: white; padding: 16px; text-align: center;">
                <h2 style="margin: 0;">⚠️ Screening SLA ${escalationLevel === 1 ? 'Warning' : 'Escalation'}</h2>
              </div>
              <div style="padding: 20px; background: #fff7ed;">
                <p><strong>Incident:</strong> ${incident.reference_id || incident.id}</p>
                <p><strong>Title:</strong> ${incident.title}</p>
                <p><strong>Severity:</strong> ${incident.severity_v2 || 'Not assessed'}</p>
                <p><strong>Waiting Time:</strong> ${hoursWaiting.toFixed(1)} hours</p>
                <p><strong>Escalation Level:</strong> ${escalationLevel}</p>
                <p style="margin-top: 16px;">This incident has been waiting for HSSE Expert screening beyond the SLA threshold.</p>
                <div style="text-align: center; margin-top: 24px;">
                  <a href="${incidentLink}" style="background: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                    Review Incident →
                  </a>
                </div>
              </div>
            </div>
          `,
        },
      });
      console.log(`[Screening SLA] Escalation email sent to ${profile.email}`);
    } catch (e) {
      console.error(`[Screening SLA] Failed to send email to ${profile.email}:`, e);
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

    console.log('[Screening SLA] Starting screening SLA escalation check...');

    // Get all incidents pending screening (submitted or pending_dept_rep_incident_review)
    const { data: incidents, error: incError } = await supabase
      .from('incidents')
      .select(`
        id, reference_id, title, tenant_id, status, severity_v2, created_at,
        screening_escalation_level, screening_sla_warning_sent_at, screening_escalated_at
      `)
      .in('status', ['submitted', 'pending_dept_rep_incident_review'])
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (incError) {
      console.error('[Screening SLA] Error fetching incidents:', incError);
      throw incError;
    }

    if (!incidents?.length) {
      console.log('[Screening SLA] No incidents pending screening');
      return new Response(
        JSON.stringify({ message: 'No incidents pending screening', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Screening SLA] Found ${incidents.length} incidents pending screening`);

    // Get SLA configs per tenant
    const tenantIds = [...new Set(incidents.map(i => i.tenant_id))];
    const { data: slaConfigs } = await supabase
      .from('screening_sla_configs')
      .select('*')
      .in('tenant_id', tenantIds)
      .eq('is_active', true)
      .is('deleted_at', null);

    // Build config lookup
    const configLookup = new Map<string, ScreeningSLAConfig>();
    slaConfigs?.forEach((c: ScreeningSLAConfig) => {
      configLookup.set(`${c.tenant_id}:${c.severity_level}`, c);
    });

    let warningsSent = 0;
    let escalationsSent = 0;

    const now = new Date();

    for (const incident of incidents) {
      const createdAt = new Date(incident.created_at);
      const hoursWaiting = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      
      const severity = incident.severity_v2 || 'Level 2';
      const configKey = `${incident.tenant_id}:${severity}`;
      const config = configLookup.get(configKey);
      
      // Use tenant config or defaults
      const maxHours = config?.max_screening_hours || DEFAULT_SLA_CONFIGS[severity]?.maxHours || 8;
      const warningHours = config?.warning_hours_before || DEFAULT_SLA_CONFIGS[severity]?.warningHours || 2;
      const escalationHours = config?.escalation_hours || DEFAULT_SLA_CONFIGS[severity]?.escalationHours || 4;

      const warningThreshold = maxHours - warningHours;
      const escalationThreshold = maxHours + escalationHours;
      const secondEscalationThreshold = maxHours + (escalationHours * 2);

      const currentLevel = incident.screening_escalation_level || 0;

      // Check for second escalation
      if (hoursWaiting >= secondEscalationThreshold && currentLevel < 2) {
        console.log(`[Screening SLA] Second escalation for ${incident.reference_id}: ${hoursWaiting.toFixed(1)}h waiting`);
        
        await supabase
          .from('incidents')
          .update({
            screening_escalation_level: 2,
            screening_escalated_at: now.toISOString(),
          })
          .eq('id', incident.id);

        await sendEscalationEmail(supabase, incident.tenant_id, incident, 2, hoursWaiting);
        escalationsSent++;
      }
      // Check for first escalation
      else if (hoursWaiting >= escalationThreshold && currentLevel < 1) {
        console.log(`[Screening SLA] First escalation for ${incident.reference_id}: ${hoursWaiting.toFixed(1)}h waiting`);
        
        await supabase
          .from('incidents')
          .update({
            screening_escalation_level: 1,
            screening_escalated_at: now.toISOString(),
          })
          .eq('id', incident.id);

        await sendEscalationEmail(supabase, incident.tenant_id, incident, 1, hoursWaiting);
        escalationsSent++;
      }
      // Check for warning
      else if (hoursWaiting >= warningThreshold && !incident.screening_sla_warning_sent_at) {
        console.log(`[Screening SLA] Warning for ${incident.reference_id}: ${hoursWaiting.toFixed(1)}h waiting`);
        
        await supabase
          .from('incidents')
          .update({
            screening_sla_warning_sent_at: now.toISOString(),
          })
          .eq('id', incident.id);

        await sendEscalationEmail(supabase, incident.tenant_id, incident, 0, hoursWaiting);
        warningsSent++;
      }
    }

    console.log(`[Screening SLA] Completed: ${warningsSent} warnings, ${escalationsSent} escalations`);

    return new Response(
      JSON.stringify({
        message: 'Screening SLA check completed',
        processed: incidents.length,
        warningsSent,
        escalationsSent,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Screening SLA] Error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
