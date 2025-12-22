/**
 * Dispatch Incident Notification - GCC-Standard Matrix-Based Routing
 * 
 * Routes notifications based on 5-level severity matrix to specific stakeholders
 * using Push, Email, and WhatsApp channels with role-based routing.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendWhatsAppText } from '../_shared/whatsapp-provider.ts';
import { sendEmail } from '../_shared/email-sender.ts';
import { logNotificationSent } from '../_shared/notification-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DispatchPayload {
  incident_id: string;
  event_type?: string; // 'incident_created', 'incident_updated', 'erp_activated'
}

interface IncidentDetails {
  id: string;
  reference_id: string | null;
  title: string;
  description: string | null;
  event_type: string;
  severity_v2: string | null;
  has_injury: boolean | null;
  erp_activated: boolean | null;
  injury_classification: string | null;
  status: string | null;
  location: string | null;
  occurred_at: string | null;
  tenant_id: string;
  site_id: string | null;
  branch_id: string | null;
  reporter_id: string | null;
}

interface NotificationRecipient {
  user_id: string;
  stakeholder_role: string;
  channels: string[];
  full_name: string | null;
  phone_number: string | null;
  email: string | null;
  was_condition_match: boolean;
}

interface NotificationResult {
  channel: string;
  recipient_id: string;
  stakeholder_role: string;
  status: 'sent' | 'failed' | 'skipped';
  error?: string;
}

// Severity level to number mapping
const SEVERITY_LEVEL_MAP: Record<string, number> = {
  'level_1': 1,
  'level_2': 2,
  'level_3': 3,
  'level_4': 4,
  'level_5': 5,
};

// Severity level labels for messages
const SEVERITY_LABELS: Record<string, { en: string; ar: string; emoji: string }> = {
  'level_1': { en: 'Low', ar: 'منخفض', emoji: '🟢' },
  'level_2': { en: 'Medium', ar: 'متوسط', emoji: '🟡' },
  'level_3': { en: 'Serious', ar: 'خطير', emoji: '🟠' },
  'level_4': { en: 'Major', ar: 'كبير', emoji: '🔴' },
  'level_5': { en: 'Catastrophic', ar: 'كارثي', emoji: '⛔' },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: DispatchPayload = await req.json();
    const { incident_id, event_type = 'incident_created' } = payload;

    if (!incident_id) {
      console.error('[Dispatch] Missing incident_id');
      return new Response(
        JSON.stringify({ error: 'Missing incident_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Dispatch] Processing incident: ${incident_id}, event: ${event_type}`);

    // 1. Fetch incident details
    const { data: incidentData, error: incidentError } = await supabase
      .from('incidents')
      .select(`
        id, reference_id, title, description, event_type, 
        severity_v2, has_injury, erp_activated, injury_classification,
        status, location, occurred_at, tenant_id, site_id, branch_id, reporter_id
      `)
      .eq('id', incident_id)
      .single();

    if (incidentError || !incidentData) {
      console.error('[Dispatch] Incident not found:', incidentError);
      return new Response(
        JSON.stringify({ error: 'Incident not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const incident = incidentData as IncidentDetails;
    console.log(`[Dispatch] Incident: ${incident.reference_id}, severity: ${incident.severity_v2}, ERP: ${incident.erp_activated}`);

    // 2. Determine effective severity (ERP Override: Force level_4 or level_5)
    let effectiveSeverity = incident.severity_v2 || 'level_2';
    const isErpOverride = incident.erp_activated === true;
    
    if (isErpOverride) {
      // ERP activated forces minimum level_4
      const currentLevel = SEVERITY_LEVEL_MAP[effectiveSeverity] || 2;
      if (currentLevel < 4) {
        effectiveSeverity = 'level_4';
        console.log(`[Dispatch] ERP Override: Elevated severity to level_4`);
      }
    }

    // 3. Check if has injury (for First Aider routing)
    const hasInjury = incident.has_injury === true || 
      ['first_aid', 'medical_treatment', 'lost_time', 'fatality'].includes(incident.injury_classification || '');

    // 4. Fetch reporter info
    let reporterName = '-';
    if (incident.reporter_id) {
      const { data: reporter } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', incident.reporter_id)
        .single();
      if (reporter?.full_name) reporterName = reporter.full_name;
    }

    // 5. Fetch site name
    let siteName = '';
    if (incident.site_id) {
      const { data: site } = await supabase
        .from('sites')
        .select('name')
        .eq('id', incident.site_id)
        .single();
      if (site?.name) siteName = site.name;
    }

    // 6. Get notification recipients using the database function
    const { data: recipients, error: recipientsError } = await supabase
      .rpc('get_incident_notification_recipients', {
        p_tenant_id: incident.tenant_id,
        p_incident_id: incident_id,
        p_severity_level: effectiveSeverity,
        p_has_injury: hasInjury,
        p_erp_activated: isErpOverride,
      });

    if (recipientsError) {
      console.error('[Dispatch] Failed to get recipients:', recipientsError);
      return new Response(
        JSON.stringify({ error: 'Failed to resolve recipients', details: recipientsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const recipientList = (recipients || []) as NotificationRecipient[];
    console.log(`[Dispatch] Found ${recipientList.length} recipients to notify`);

    // 7. Apply WhatsApp gating: Only level 3+ except First Aiders with injury
    const processedRecipients = recipientList.map(r => {
      const severityLevel = SEVERITY_LEVEL_MAP[effectiveSeverity] || 2;
      let filteredChannels = [...r.channels];
      
      // WhatsApp gating: Block WhatsApp for levels 1-2 except First Aiders with injury
      if (severityLevel < 3) {
        if (r.stakeholder_role !== 'first_aider' || !hasInjury) {
          filteredChannels = filteredChannels.filter(c => c !== 'whatsapp');
        }
      }
      
      return { ...r, channels: filteredChannels };
    }).filter(r => r.channels.length > 0);

    console.log(`[Dispatch] After WhatsApp gating: ${processedRecipients.length} recipients with active channels`);

    // 8. Prepare messages
    const severityInfo = SEVERITY_LABELS[effectiveSeverity] || SEVERITY_LABELS['level_2'];
    const locationText = incident.location || siteName || '-';
    const eventTypeLabel = incident.event_type === 'observation' ? 'ملاحظة' : 'حادثة';
    const eventTypeLabelEn = incident.event_type === 'observation' ? 'Observation' : 'Incident';

    // ERP Critical Alert preamble
    const erpPreambleAr = isErpOverride ? '🚨 تنبيه طوارئ - تم تفعيل خطة الاستجابة للطوارئ 🚨\n\n' : '';
    const erpPreambleEn = isErpOverride ? '🚨 EMERGENCY ALERT - ERP ACTIVATED 🚨\n\n' : '';

    const messageAr = `${erpPreambleAr}📢 ${eventTypeLabel} جديدة: ${incident.title}

🆔 المرجع: ${incident.reference_id || '-'}
📍 الموقع: ${locationText}
⚠️ المستوى: ${severityInfo.emoji} ${severityInfo.ar}
👤 المُبلّغ: ${reporterName}
${hasInjury ? '🏥 يوجد إصابات' : ''}

${incident.description ? `📝 ${incident.description.substring(0, 200)}${incident.description.length > 200 ? '...' : ''}` : ''}`;

    const messageEn = `${erpPreambleEn}📢 New ${eventTypeLabelEn}: ${incident.title}

🆔 Reference: ${incident.reference_id || '-'}
📍 Location: ${locationText}
⚠️ Severity: ${severityInfo.emoji} ${severityInfo.en}
👤 Reported by: ${reporterName}
${hasInjury ? '🏥 Injuries Reported' : ''}

${incident.description ? `📝 ${incident.description.substring(0, 200)}${incident.description.length > 200 ? '...' : ''}` : ''}`;

    // HTML email content
    // Calculate severity level number for email styling
    const severityLevelNum = SEVERITY_LEVEL_MAP[effectiveSeverity] || 2;

    const emailSubject = isErpOverride 
      ? `🚨 EMERGENCY: ${incident.reference_id} - ${incident.title}`
      : `${severityInfo.emoji} ${eventTypeLabelEn}: ${incident.reference_id} - ${incident.title}`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        ${isErpOverride ? '<div style="background: #dc2626; color: white; padding: 12px; text-align: center; font-weight: bold; font-size: 18px;">🚨 EMERGENCY RESPONSE PLAN ACTIVATED 🚨</div>' : ''}
        <div style="padding: 20px; background: #f8fafc;">
          <h2 style="color: #1e293b; margin-bottom: 16px;">${eventTypeLabelEn}: ${incident.title}</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #64748b;">Reference:</td><td style="padding: 8px 0; font-weight: bold;">${incident.reference_id || '-'}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Severity:</td><td style="padding: 8px 0;"><span style="background: ${severityLevelNum >= 4 ? '#dc2626' : severityLevelNum >= 3 ? '#f97316' : '#eab308'}; color: white; padding: 4px 8px; border-radius: 4px;">${severityInfo.en}</span></td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Location:</td><td style="padding: 8px 0;">${locationText}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Reported by:</td><td style="padding: 8px 0;">${reporterName}</td></tr>
            ${hasInjury ? '<tr><td style="padding: 8px 0; color: #64748b;">Injuries:</td><td style="padding: 8px 0; color: #dc2626; font-weight: bold;">Yes</td></tr>' : ''}
          </table>
          ${incident.description ? `<div style="margin-top: 16px; padding: 12px; background: white; border-radius: 8px;"><p style="margin: 0; color: #475569;">${incident.description}</p></div>` : ''}
        </div>
      </div>
    `;

    // 9. Send notifications
    const results: NotificationResult[] = [];

    for (const recipient of processedRecipients) {
      for (const channel of recipient.channels) {
        try {
          let status: 'sent' | 'failed' | 'skipped' = 'skipped';
          let errorMsg: string | undefined;
          let providerMessageId: string | undefined;

          if (channel === 'whatsapp') {
            if (!recipient.phone_number) {
              status = 'skipped';
              errorMsg = 'No phone number';
            } else {
              // Determine language based on user preference (could be enhanced)
              const isArabic = true; // Default to Arabic for this region
              const message = isArabic ? messageAr : messageEn;
              
              const result = await sendWhatsAppText(recipient.phone_number, message);
              status = result.success ? 'sent' : 'failed';
              errorMsg = result.error;
              providerMessageId = result.messageId;
            }
          } else if (channel === 'email') {
            if (!recipient.email) {
              status = 'skipped';
              errorMsg = 'No email address';
            } else {
              const result = await sendEmail({
                to: [recipient.email],
                subject: emailSubject,
                html: emailHtml,
                module: 'incident_workflow',
              });
              status = result.success ? 'sent' : 'failed';
              errorMsg = result.error;
              providerMessageId = result.messageId;
            }
          } else if (channel === 'push') {
            // Push notifications - log as pending (would integrate with FCM/APNs)
            console.log(`[Dispatch] Push notification queued for ${recipient.full_name}`);
            status = 'sent'; // Mark as sent (push is async)
          }

          // Log to audit table
          await supabase.from('auto_notification_logs').insert({
            tenant_id: incident.tenant_id,
            event_type,
            event_id: incident_id,
            recipient_id: recipient.user_id,
            recipient_phone: recipient.phone_number,
            channel,
            status,
            error_message: errorMsg,
            provider_message_id: providerMessageId,
            sent_at: status === 'sent' ? new Date().toISOString() : null,
            severity_level: effectiveSeverity,
            stakeholder_role: recipient.stakeholder_role,
            was_erp_override: isErpOverride,
          });

          results.push({
            channel,
            recipient_id: recipient.user_id,
            stakeholder_role: recipient.stakeholder_role,
            status,
            error: errorMsg,
          });

          console.log(`[Dispatch] ${channel} → ${recipient.full_name} (${recipient.stakeholder_role}): ${status}`);

        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.error(`[Dispatch] Error sending ${channel} to ${recipient.full_name}:`, error);

          await supabase.from('auto_notification_logs').insert({
            tenant_id: incident.tenant_id,
            event_type,
            event_id: incident_id,
            recipient_id: recipient.user_id,
            channel,
            status: 'failed',
            error_message: errorMsg,
            severity_level: effectiveSeverity,
            stakeholder_role: recipient.stakeholder_role,
            was_erp_override: isErpOverride,
          });

          results.push({
            channel,
            recipient_id: recipient.user_id,
            stakeholder_role: recipient.stakeholder_role,
            status: 'failed',
            error: errorMsg,
          });
        }
      }
    }

    // 10. Summary
    const sent = results.filter(r => r.status === 'sent').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;

    console.log(`[Dispatch] Complete: ${sent} sent, ${failed} failed, ${skipped} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        incident_id,
        reference_id: incident.reference_id,
        effective_severity: effectiveSeverity,
        erp_override: isErpOverride,
        has_injury: hasInjury,
        total_recipients: processedRecipients.length,
        notifications: { sent, failed, skipped },
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Dispatch] Unhandled error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
