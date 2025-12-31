import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendWhatsAppText, isProviderConfigured } from '../_shared/whatsapp-provider.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MaintenanceSLAConfig {
  id: string;
  tenant_id: string;
  priority: string;
  warning_days_before: number;
  escalation_days_after: number;
  second_escalation_days_after: number;
}

interface MaintenanceSchedule {
  id: string;
  tenant_id: string;
  asset_id: string;
  schedule_type: string;
  description: string | null;
  next_due: string | null;
  criticality: string;
  escalation_level: number;
  warning_sent_at: string | null;
  last_notification_at: string | null;
  is_active: boolean;
  asset: Array<{
    id: string;
    name: string;
    asset_code: string;
    location_details: string | null;
    site: Array<{ name: string }>;
    building: Array<{ name: string }>;
  }>;
}

interface NotificationTemplate {
  id: string;
  slug: string;
  content_pattern: string;
  email_subject: string | null;
}

async function sendWhatsAppNotification(phone: string, message: string): Promise<void> {
  const providerStatus = isProviderConfigured();
  if (!providerStatus.configured) {
    console.log(`[WhatsApp] Provider not configured, missing: ${providerStatus.missing.join(', ')}`);
    return;
  }
  if (!phone) return;

  try {
    const result = await sendWhatsAppText(phone, message);
    if (result.success) {
      console.log(`[WhatsApp] Message sent successfully via ${result.provider} to ${phone}`);
    } else {
      console.error(`[WhatsApp] Failed to send to ${phone}: ${result.error}`);
    }
  } catch (error) {
    console.error('[WhatsApp] Error sending message:', error);
  }
}

async function sendEmailNotification(
  to: string,
  subject: string,
  body: string
): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-email-template`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        subject,
        htmlContent: `<div style="font-family: Arial, sans-serif; padding: 20px;">${body.replace(/\n/g, '<br>')}</div>`,
      }),
    });
    console.log(`Email sent to ${to}:`, await response.text());
  } catch (error) {
    console.error('Email error:', error);
  }
}

function interpolateTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
  }
  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Starting asset maintenance escalation check...');

  try {
    // Get all SLA configs
    const { data: slaConfigs, error: slaError } = await supabase
      .from('asset_maintenance_sla_configs')
      .select('*');

    if (slaError) {
      console.error('Error fetching SLA configs:', slaError);
      throw slaError;
    }

    console.log(`Found ${slaConfigs?.length || 0} SLA configs`);

    // Get notification templates
    const { data: templates, error: templateError } = await supabase
      .from('notification_templates')
      .select('id, slug, content_pattern, email_subject, tenant_id')
      .in('slug', [
        'asset_maintenance_due_warning',
        'asset_maintenance_overdue_l1',
        'asset_maintenance_overdue_l2',
      ]);

    if (templateError) {
      console.error('Error fetching templates:', templateError);
    }

    // Get active maintenance schedules with upcoming/overdue dates
    const { data: schedules, error: scheduleError } = await supabase
      .from('asset_maintenance_schedules')
      .select(`
        id,
        tenant_id,
        asset_id,
        schedule_type,
        description,
        next_due,
        criticality,
        escalation_level,
        warning_sent_at,
        last_notification_at,
        is_active,
        asset:hsse_assets(
          id,
          name,
          asset_code,
          location_details,
          site:sites(name),
          building:buildings(name)
        )
      `)
      .eq('is_active', true)
      .is('deleted_at', null)
      .not('next_due', 'is', null);

    if (scheduleError) {
      console.error('Error fetching schedules:', scheduleError);
      throw scheduleError;
    }

    console.log(`Found ${schedules?.length || 0} active maintenance schedules`);

    const now = new Date();
    let warningsSent = 0;
    let escalationsSent = 0;

    for (const schedule of (schedules || []) as MaintenanceSchedule[]) {
      const asset = schedule.asset?.[0];
      if (!schedule.next_due || !asset) continue;

      const nextDue = new Date(schedule.next_due);
      const daysUntilDue = Math.floor((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const daysOverdue = -daysUntilDue;

      // Get SLA config for this tenant and criticality
      const slaConfig = (slaConfigs as MaintenanceSLAConfig[])?.find(
        (c) => c.tenant_id === schedule.tenant_id && c.priority === schedule.criticality
      );

      if (!slaConfig) {
        console.log(`No SLA config for tenant ${schedule.tenant_id}, criticality ${schedule.criticality}`);
        continue;
      }

      // Get HSSE managers for this tenant
      const { data: hsseManagers } = await supabase
        .from('profiles')
        .select('id, email, phone_number')
        .eq('tenant_id', schedule.tenant_id)
        .eq('is_active', true)
        .or('user_type.eq.hsse_manager,user_type.eq.hsse_officer');

      const getTemplate = (slug: string) =>
        templates?.find((t) => t.slug === slug && t.tenant_id === schedule.tenant_id);

      const location = [
        asset.site?.[0]?.name,
        asset.building?.[0]?.name,
        asset.location_details,
      ]
        .filter(Boolean)
        .join(', ');

      const variables = {
        asset_name: asset.name,
        asset_code: asset.asset_code,
        maintenance_type: schedule.schedule_type,
        days_until_due: String(Math.max(0, daysUntilDue)),
        days_overdue: String(Math.max(0, daysOverdue)),
        location,
      };

      // Check for warning (upcoming maintenance)
      if (
        daysUntilDue > 0 &&
        daysUntilDue <= slaConfig.warning_days_before &&
        !schedule.warning_sent_at
      ) {
        console.log(`Sending warning for schedule ${schedule.id}, ${daysUntilDue} days until due`);

        const template = getTemplate('asset_maintenance_due_warning');
        const message = template
          ? interpolateTemplate(template.content_pattern, variables)
          : `Maintenance due in ${daysUntilDue} days for ${asset.name}`;
        const subject = template
          ? interpolateTemplate(template.email_subject || 'Maintenance Due', variables)
          : 'Maintenance Due Soon';

        for (const manager of hsseManagers || []) {
          if (manager.email) {
            await sendEmailNotification(manager.email, subject, message);
          }
          if (manager.phone_number) {
            await sendWhatsAppNotification(manager.phone_number, message);
          }
        }

        await supabase
          .from('asset_maintenance_schedules')
          .update({
            warning_sent_at: new Date().toISOString(),
            last_notification_at: new Date().toISOString(),
          })
          .eq('id', schedule.id);

        warningsSent++;
      }

      // Check for L1 escalation (overdue)
      if (
        daysOverdue >= slaConfig.escalation_days_after &&
        schedule.escalation_level < 1
      ) {
        console.log(`Sending L1 escalation for schedule ${schedule.id}, ${daysOverdue} days overdue`);

        const template = getTemplate('asset_maintenance_overdue_l1');
        const message = template
          ? interpolateTemplate(template.content_pattern, variables)
          : `OVERDUE: ${asset.name} maintenance is ${daysOverdue} days overdue`;
        const subject = template
          ? interpolateTemplate(template.email_subject || 'Overdue Maintenance', variables)
          : 'Overdue Maintenance Alert';

        for (const manager of hsseManagers || []) {
          if (manager.email) {
            await sendEmailNotification(manager.email, subject, message);
          }
          if (manager.phone_number) {
            await sendWhatsAppNotification(manager.phone_number, message);
          }
        }

        await supabase
          .from('asset_maintenance_schedules')
          .update({
            escalation_level: 1,
            last_notification_at: new Date().toISOString(),
          })
          .eq('id', schedule.id);

        escalationsSent++;
      }

      // Check for L2 escalation (severely overdue)
      if (
        daysOverdue >= slaConfig.second_escalation_days_after &&
        schedule.escalation_level < 2
      ) {
        console.log(`Sending L2 escalation for schedule ${schedule.id}, ${daysOverdue} days overdue`);

        const template = getTemplate('asset_maintenance_overdue_l2');
        const message = template
          ? interpolateTemplate(template.content_pattern, variables)
          : `ESCALATION: ${asset.name} maintenance is ${daysOverdue} days overdue`;
        const subject = template
          ? interpolateTemplate(template.email_subject || 'ESCALATED Maintenance', variables)
          : 'ESCALATED: Overdue Maintenance';

        for (const manager of hsseManagers || []) {
          if (manager.email) {
            await sendEmailNotification(manager.email, subject, message);
          }
          if (manager.phone_number) {
            await sendWhatsAppNotification(manager.phone_number, message);
          }
        }

        await supabase
          .from('asset_maintenance_schedules')
          .update({
            escalation_level: 2,
            last_notification_at: new Date().toISOString(),
          })
          .eq('id', schedule.id);

        escalationsSent++;
      }
    }

    console.log(`Completed: ${warningsSent} warnings, ${escalationsSent} escalations sent`);

    return new Response(
      JSON.stringify({
        success: true,
        warnings_sent: warningsSent,
        escalations_sent: escalationsSent,
        schedules_processed: schedules?.length || 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in asset-maintenance-escalation:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
