/**
 * Dispatch Incident Notification - GCC-Standard Matrix-Based Routing
 * 
 * Routes notifications based on 5-level severity matrix to specific stakeholders
 * using Push, Email, and WhatsApp channels with role-based routing.
 * 
 * LOCALIZATION: All notifications sent in recipient's preferred_language
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendWhatsAppText } from '../_shared/whatsapp-provider.ts';
import { sendEmail, wrapEmailHtml } from '../_shared/email-sender.ts';
import { logNotificationSent } from '../_shared/notification-logger.ts';
import { 
  SupportedLanguage, 
  isRTL, 
  getTranslations, 
  replaceVariables,
  INCIDENT_TRANSLATIONS 
} from '../_shared/email-translations.ts';

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
  preferred_language: string | null;
  was_condition_match: boolean;
  whatsapp_template_id?: string | null;
  email_template_id?: string | null;
  matrix_rule_id?: string | null;
}

interface NotificationResult {
  channel: string;
  recipient_id: string;
  stakeholder_role: string;
  status: 'sent' | 'failed' | 'skipped';
  error?: string;
}

interface NotificationTemplate {
  id: string;
  content_pattern: string;
  variable_keys: string[];
  language: string;
  email_subject?: string | null;
}

// Severity level to number mapping
const SEVERITY_LEVEL_MAP: Record<string, number> = {
  'level_1': 1,
  'level_2': 2,
  'level_3': 3,
  'level_4': 4,
  'level_5': 5,
};

// Severity level labels for messages (localized) - Updated for 5-level unified matrix
const SEVERITY_LABELS: Record<string, Record<SupportedLanguage, string>> = {
  'level_1': { en: 'Level 1 (Low)', ar: 'المستوى 1 (منخفض)', ur: 'لیول 1 (کم)', hi: 'स्तर 1 (निम्न)', fil: 'Antas 1 (Mababa)' },
  'level_2': { en: 'Level 2 (Moderate)', ar: 'المستوى 2 (متوسط)', ur: 'لیول 2 (درمیانہ)', hi: 'स्तर 2 (मध्यम)', fil: 'Antas 2 (Katamtaman)' },
  'level_3': { en: 'Level 3 (Serious)', ar: 'المستوى 3 (خطير)', ur: 'لیول 3 (سنگین)', hi: 'स्तर 3 (गंभीर)', fil: 'Antas 3 (Seryoso)' },
  'level_4': { en: 'Level 4 (Major)', ar: 'المستوى 4 (كبير)', ur: 'لیول 4 (بڑا)', hi: 'स्तर 4 (बड़ा)', fil: 'Antas 4 (Malaki)' },
  'level_5': { en: 'Level 5 (Catastrophic)', ar: 'المستوى 5 (كارثي)', ur: 'لیول 5 (تباہ کن)', hi: 'स्तर 5 (विनाशकारी)', fil: 'Antas 5 (Sakuna)' },
};

const SEVERITY_EMOJI: Record<string, string> = {
  'level_1': '🟢',
  'level_2': '🟡',
  'level_3': '🟠',
  'level_4': '🔴',
  'level_5': '⛔',
};

/**
 * Render template with variables
 */
function renderTemplate(contentPattern: string, variables: Record<string, string>): string {
  let result = contentPattern;
  
  // Replace named variables like {{incident_id}}, {{location}}, etc.
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
    result = result.replace(regex, value || '');
  });
  
  // Also replace positional placeholders {{1}}, {{2}}, etc.
  const orderedKeys = ['reference_id', 'title', 'location', 'risk_level', 'reported_by', 'incident_time', 'action_link', 'event_type', 'description'];
  orderedKeys.forEach((key, index) => {
    const placeholder = `{{${index + 1}}}`;
    result = result.split(placeholder).join(variables[key] || '');
  });
  
  return result;
}

/**
 * Generate localized WhatsApp message
 */
function generateWhatsAppMessage(
  lang: SupportedLanguage,
  incident: IncidentDetails,
  severityLevel: string,
  locationText: string,
  reporterName: string,
  hasInjury: boolean,
  isErpOverride: boolean
): string {
  const t = getTranslations(INCIDENT_TRANSLATIONS, lang);
  const severityLabel = SEVERITY_LABELS[severityLevel]?.[lang] || SEVERITY_LABELS['level_2'][lang];
  const severityEmoji = SEVERITY_EMOJI[severityLevel] || '🟡';
  
  const eventTypeLabel = incident.event_type === 'observation' 
    ? t.whatsapp.observation 
    : t.whatsapp.incident;
  
  const erpPreamble = isErpOverride ? t.whatsapp.erpAlert + '\n\n' : '';
  const injuryLine = hasInjury ? t.whatsapp.injuriesReported + '\n' : '';
  const descriptionLine = incident.description 
    ? `\n📝 ${incident.description.substring(0, 200)}${incident.description.length > 200 ? '...' : ''}`
    : '';

  return `${erpPreamble}📢 ${t.whatsapp.newEvent.replace('{type}', eventTypeLabel)}: ${incident.title}

🆔 ${t.whatsapp.reference}: ${incident.reference_id || '-'}
📍 ${t.whatsapp.location}: ${locationText}
⚠️ ${t.whatsapp.severity}: ${severityEmoji} ${severityLabel}
👤 ${t.whatsapp.reportedBy}: ${reporterName}
${injuryLine}${descriptionLine}`;
}
/**
 * Generate localized email HTML content with deep-link button
 */
function generateEmailContent(
  lang: SupportedLanguage,
  incident: IncidentDetails,
  severityLevel: string,
  locationText: string,
  reporterName: string,
  hasInjury: boolean,
  isErpOverride: boolean,
  tenantName: string
): { subject: string; html: string } {
  const t = getTranslations(INCIDENT_TRANSLATIONS, lang);
  const severityLabel = SEVERITY_LABELS[severityLevel]?.[lang] || SEVERITY_LABELS['level_2'][lang];
  const severityEmoji = SEVERITY_EMOJI[severityLevel] || '🟡';
  const severityLevelNum = SEVERITY_LEVEL_MAP[severityLevel] || 2;
  const rtl = isRTL(lang);
  
  const eventTypeLabel = incident.event_type === 'observation' 
    ? t.email.observation 
    : t.email.incident;

  // Subject line
  const subject = isErpOverride 
    ? `🚨 ${t.email.emergency}: ${incident.reference_id} - ${incident.title}`
    : `${severityEmoji} ${eventTypeLabel}: ${incident.reference_id} - ${incident.title}`;

  // Severity color
  const severityColor = severityLevelNum >= 4 ? '#dc2626' : severityLevelNum >= 3 ? '#f97316' : '#eab308';

  // Build HTML content
  const erpBanner = isErpOverride 
    ? `<div style="background: #dc2626; color: white; padding: 12px; text-align: center; font-weight: bold; font-size: 18px;">🚨 ${t.email.erpActivated} 🚨</div>` 
    : '';

  const injuryRow = hasInjury 
    ? `<tr><td style="padding: 8px 0; color: #64748b;">${t.email.injuries}:</td><td style="padding: 8px 0; color: #dc2626; font-weight: bold;">${t.email.yes}</td></tr>` 
    : '';

  const descriptionBlock = incident.description 
    ? `<div style="margin-top: 16px; padding: 12px; background: white; border-radius: 8px;"><p style="margin: 0; color: #475569;">${incident.description}</p></div>` 
    : '';

  // Deep-link button text (localized)
  const viewButtonText: Record<SupportedLanguage, string> = {
    en: 'View Incident',
    ar: 'عرض الحادث',
    ur: 'واقعہ دیکھیں',
    hi: 'घटना देखें',
    fil: 'Tingnan ang Insidente',
  };
  
  // Get app URL for deep-link - direct to incident detail page
  const appUrl = Deno.env.get('APP_URL') || 'https://app.dhuud.com';
  const incidentDeepLink = `${appUrl}/incidents/${incident.id}`;
  const buttonText = viewButtonText[lang] || viewButtonText.en;
  const arrow = rtl ? '←' : '→';

  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: ${rtl ? 'rtl' : 'ltr'};">
      ${erpBanner}
      <div style="padding: 20px; background: #f8fafc;">
        <h2 style="color: #1e293b; margin-bottom: 16px;">${eventTypeLabel}: ${incident.title}</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #64748b;">${t.email.reference}:</td><td style="padding: 8px 0; font-weight: bold;">${incident.reference_id || '-'}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">${t.email.severity}:</td><td style="padding: 8px 0;"><span style="background: ${severityColor}; color: white; padding: 4px 8px; border-radius: 4px;">${severityLabel}</span></td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">${t.email.location}:</td><td style="padding: 8px 0;">${locationText}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">${t.email.reportedBy}:</td><td style="padding: 8px 0;">${reporterName}</td></tr>
          ${injuryRow}
        </table>
        ${descriptionBlock}
        
        <!-- Deep-link CTA Button -->
        <div style="text-align: center; margin: 24px 0;">
          <a href="${incidentDeepLink}" style="display: inline-block; background: #1e40af; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; direction: ${rtl ? 'rtl' : 'ltr'};">
            ${rtl ? `${arrow} ${buttonText}` : `${buttonText} ${arrow}`}
          </a>
        </div>
      </div>
    </div>
  `;

  const html = wrapEmailHtml(emailBody, lang, tenantName);

  return { subject, html };
}

/**
 * Generate localized push notification payload
 */
function generatePushPayload(
  lang: SupportedLanguage,
  incident: IncidentDetails,
  severityLevel: string,
  isErpOverride: boolean
): { title: string; body: string } {
  const t = getTranslations(INCIDENT_TRANSLATIONS, lang);
  const severityLabel = SEVERITY_LABELS[severityLevel]?.[lang] || SEVERITY_LABELS['level_2'][lang];
  const severityEmoji = SEVERITY_EMOJI[severityLevel] || '🟡';
  
  const eventTypeLabel = incident.event_type === 'observation' 
    ? t.push.observation 
    : t.push.incident;

  const title = isErpOverride 
    ? `🚨 ${t.push.erpAlert}`
    : `${severityEmoji} ${t.push.newEvent.replace('{type}', eventTypeLabel)}`;

  const body = `${incident.reference_id}: ${incident.title}\n${t.push.severity}: ${severityLabel}`;

  return { title, body };
}

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
      const currentLevel = SEVERITY_LEVEL_MAP[effectiveSeverity] || 2;
      if (currentLevel < 4) {
        effectiveSeverity = 'level_4';
        console.log(`[Dispatch] ERP Override: Elevated severity to level_4`);
      }
    }

    // 3. Check if has injury (for First Aider routing)
    const hasInjury = incident.has_injury === true || 
      ['first_aid', 'medical_treatment', 'lost_time', 'fatality'].includes(incident.injury_classification || '');

    // 4. Fetch tenant info
    let tenantName = '';
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', incident.tenant_id)
      .single();
    if (tenant?.name) tenantName = tenant.name;

    // 5. Fetch reporter info
    let reporterName = '-';
    if (incident.reporter_id) {
      const { data: reporter } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', incident.reporter_id)
        .single();
      if (reporter?.full_name) reporterName = reporter.full_name;
    }

    // 6. Fetch site name
    let siteName = '';
    if (incident.site_id) {
      const { data: site } = await supabase
        .from('sites')
        .select('name')
        .eq('id', incident.site_id)
        .single();
      if (site?.name) siteName = site.name;
    }
    const locationText = incident.location || siteName || '-';

    // 7. Get notification recipients using the database function (now includes preferred_language and event_type)
    // Determine event type for matrix filtering
    const incidentEventType = incident.event_type === 'observation' ? 'observation' : 'incident';
    
    const { data: recipients, error: recipientsError } = await supabase
      .rpc('get_incident_notification_recipients', {
        p_tenant_id: incident.tenant_id,
        p_severity_level: effectiveSeverity, // Pass as TEXT (e.g., 'level_2') to match DB column type
        p_has_injury: hasInjury,
        p_erp_activated: isErpOverride,
        p_event_type: incidentEventType,
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

    // 8. Apply channel gating based on severity level per GCC-Standard 5-Level Matrix:
    // - Level 5 (Catastrophic): WhatsApp + Email + Push to ALL including HSSE Manager
    // - Level 3-4 (Serious/Major): WhatsApp + Email + Push (all channels) + HSSE Expert
    // - Level 1-2 (Low/Moderate): Email only (WhatsApp gate applies)
    // - Exception: First Aiders always get WhatsApp if there's an injury
    const processedRecipients = recipientList.map(r => {
      const severityLevel = SEVERITY_LEVEL_MAP[effectiveSeverity] || 2;
      let filteredChannels = [...r.channels];
      
      if (severityLevel < 3) {
        // Low/Moderate severity: Only Email, no WhatsApp/Push
        const isFirstAiderWithInjury = r.stakeholder_role === 'first_aider' && hasInjury;
        
        if (!isFirstAiderWithInjury) {
          // Remove WhatsApp for non-critical incidents
          filteredChannels = filteredChannels.filter(c => c !== 'whatsapp');
        }
        
        // Keep email as primary channel for low severity
        // Push is still allowed for quick notification
      }
      
      // Level 5: Ensure HSSE Manager gets immediate notification on all channels
      if (severityLevel >= 5 && r.stakeholder_role === 'hsse_manager') {
        // Ensure all channels are present for HSSE Manager on Level 5
        if (!filteredChannels.includes('whatsapp')) filteredChannels.push('whatsapp');
        if (!filteredChannels.includes('email')) filteredChannels.push('email');
        if (!filteredChannels.includes('push')) filteredChannels.push('push');
      }
      
      return { ...r, channels: filteredChannels };
    }).filter(r => r.channels.length > 0);

    console.log(`[Dispatch] After severity-based channel gating: ${processedRecipients.length} recipients with active channels`);

    // 9. Send notifications (per-recipient language)
    const results: NotificationResult[] = [];

    for (const recipient of processedRecipients) {
      // Determine recipient's language (default to English if not set)
      const recipientLang = (recipient.preferred_language || 'en') as SupportedLanguage;
      const validLangs: SupportedLanguage[] = ['en', 'ar', 'ur', 'hi', 'fil'];
      const lang: SupportedLanguage = validLangs.includes(recipientLang) ? recipientLang : 'en';

      console.log(`[Dispatch] Sending to ${recipient.full_name} in language: ${lang}`);

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
              let message: string;
              
              // Check if this recipient has a linked WhatsApp template
              if (recipient.whatsapp_template_id) {
                // Fetch the template
                const { data: template } = await supabase
                  .from('notification_templates')
                  .select('content_pattern, variable_keys, language')
                  .eq('id', recipient.whatsapp_template_id)
                  .single();
                
                if (template) {
                  // Build variables map
                  const appUrl = Deno.env.get('APP_URL') || 'https://app.dhuud.com';
                  const variables: Record<string, string> = {
                    incident_id: incident.id,
                    reference_id: incident.reference_id || '-',
                    title: incident.title,
                    description: incident.description?.substring(0, 200) || '',
                    location: locationText,
                    risk_level: SEVERITY_LABELS[effectiveSeverity]?.[lang] || effectiveSeverity,
                    reported_by: reporterName,
                    incident_time: incident.occurred_at || new Date().toISOString(),
                    action_link: `${appUrl}/incidents/${incident.id}`,
                    event_type: incident.event_type === 'observation' ? 'Observation' : 'Incident',
                    site_name: siteName || '-',
                  };
                  
                  message = renderTemplate(template.content_pattern, variables);
                  console.log(`[Dispatch] Using custom template ${recipient.whatsapp_template_id} for ${recipient.full_name}`);
                } else {
                  // Template not found, fall back to default
                  message = generateWhatsAppMessage(
                    lang, incident, effectiveSeverity, locationText, 
                    reporterName, hasInjury, isErpOverride
                  );
                }
              } else {
                // No template linked, use default message generator
                message = generateWhatsAppMessage(
                  lang, incident, effectiveSeverity, locationText, 
                  reporterName, hasInjury, isErpOverride
                );
              }
              
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
              let subject: string;
              let html: string;
              
              // Check if this recipient has a linked Email template
              if (recipient.email_template_id) {
                // Fetch the email template
                const { data: emailTemplate } = await supabase
                  .from('notification_templates')
                  .select('content_pattern, variable_keys, language, email_subject')
                  .eq('id', recipient.email_template_id)
                  .single();
                
                if (emailTemplate) {
                  // Build variables map
                  const appUrl = Deno.env.get('APP_URL') || 'https://app.dhuud.com';
                  const variables: Record<string, string> = {
                    incident_id: incident.id,
                    reference_id: incident.reference_id || '-',
                    title: incident.title,
                    description: incident.description?.substring(0, 500) || '',
                    location: locationText,
                    risk_level: SEVERITY_LABELS[effectiveSeverity]?.[lang] || effectiveSeverity,
                    reported_by: reporterName,
                    incident_time: incident.occurred_at || new Date().toISOString(),
                    action_link: `${appUrl}/incidents/${incident.id}`,
                    event_type: incident.event_type === 'observation' ? 'Observation' : 'Incident',
                    site_name: siteName || '-',
                  };
                  
                  // Render subject from template or use default
                  subject = emailTemplate.email_subject 
                    ? renderTemplate(emailTemplate.email_subject, variables)
                    : `${incident.event_type === 'observation' ? 'Observation' : 'Incident'}: ${incident.reference_id} - ${incident.title}`;
                  
                  // Render body from template
                  const emailBody = renderTemplate(emailTemplate.content_pattern, variables);
                  html = wrapEmailHtml(emailBody, lang, tenantName);
                  
                  console.log(`[Dispatch] Using custom email template ${recipient.email_template_id} for ${recipient.full_name}`);
                } else {
                  // Template not found, fall back to default
                  const defaultEmail = generateEmailContent(
                    lang, incident, effectiveSeverity, locationText,
                    reporterName, hasInjury, isErpOverride, tenantName
                  );
                  subject = defaultEmail.subject;
                  html = defaultEmail.html;
                }
              } else {
                // No template linked, use default message generator
                const defaultEmail = generateEmailContent(
                  lang, incident, effectiveSeverity, locationText,
                  reporterName, hasInjury, isErpOverride, tenantName
                );
                subject = defaultEmail.subject;
                html = defaultEmail.html;
              }
              
              const result = await sendEmail({
                to: [recipient.email],
                subject,
                html,
                module: 'incident_workflow',
                tenantName,
              });
              status = result.success ? 'sent' : 'failed';
              errorMsg = result.error;
              providerMessageId = result.messageId;
            }
          } else if (channel === 'push') {
            // Send localized push notification
            const pushPayload = generatePushPayload(lang, incident, effectiveSeverity, isErpOverride);
            
            try {
              const pushResponse = await supabase.functions.invoke('send-push-notification', {
                body: {
                  user_ids: [recipient.user_id],
                  payload: {
                    title: pushPayload.title,
                    body: pushPayload.body,
                    data: {
                      type: 'incident',
                      incident_id: incident.id,
                      reference_id: incident.reference_id,
                    },
                    tag: `incident-${incident.id}`,
                  },
                  notification_type: 'incidents_new',
                },
              });
              
              if (pushResponse.error) {
                status = 'failed';
                errorMsg = pushResponse.error.message;
              } else {
                status = 'sent';
              }
            } catch (pushError) {
              console.error(`[Dispatch] Push error:`, pushError);
              status = 'failed';
              errorMsg = pushError instanceof Error ? pushError.message : 'Push failed';
            }
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

          console.log(`[Dispatch] ${channel} → ${recipient.full_name} (${recipient.stakeholder_role}, ${lang}): ${status}`);

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
