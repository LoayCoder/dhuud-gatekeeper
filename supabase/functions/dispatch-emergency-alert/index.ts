/**
 * Dispatch Emergency Alert Notifications
 * 
 * Auto-triggered by database trigger when emergency_alerts are created.
 * Routes urgent notifications via Push, WhatsApp, and Email to security personnel.
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
  getTranslations 
} from '../_shared/email-translations.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmergencyAlertPayload {
  alert_id: string;
  // From trigger: full record may be passed
  record?: {
    id: string;
    tenant_id: string;
    alert_type: string;
    priority: string;
    location: string | null;
    gps_lat: number | null;
    gps_lng: number | null;
    triggered_by: string | null;
    details: string | null;
    site_id: string | null;
    branch_id: string | null;
  };
}

interface EmergencyAlert {
  id: string;
  tenant_id: string;
  alert_type: string;
  priority: string;
  location: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  triggered_by: string | null;
  details: string | null;
  site_id: string | null;
  branch_id: string | null;
  created_at: string;
}

interface NotificationRecipient {
  user_id: string;
  full_name: string | null;
  phone_number: string | null;
  email: string | null;
  preferred_language: string | null;
  role_code: string | null;
}

// Alert type translations
const ALERT_TYPE_LABELS: Record<string, Record<SupportedLanguage, string>> = {
  'panic': { en: 'PANIC ALERT', ar: 'تنبيه ذعر', ur: 'گھبراہٹ الرٹ', hi: 'पैनिक अलर्ट', fil: 'PANIC ALERT' },
  'duress': { en: 'DURESS ALARM', ar: 'إنذار إكراه', ur: 'دباؤ کا الارم', hi: 'दबाव अलार्म', fil: 'DURESS ALARM' },
  'fire': { en: 'FIRE EMERGENCY', ar: 'طوارئ حريق', ur: 'آگ کی ایمرجنسی', hi: 'आग आपातकाल', fil: 'FIRE EMERGENCY' },
  'medical': { en: 'MEDICAL EMERGENCY', ar: 'طوارئ طبية', ur: 'طبی ایمرجنسی', hi: 'चिकित्सा आपातकाल', fil: 'MEDICAL EMERGENCY' },
  'security_breach': { en: 'SECURITY BREACH', ar: 'اختراق أمني', ur: 'سیکیورٹی خلاف ورزی', hi: 'सुरक्षा उल्लंघन', fil: 'SECURITY BREACH' },
  'assault': { en: 'ASSAULT ALERT', ar: 'تنبيه اعتداء', ur: 'حملہ الرٹ', hi: 'हमला अलर्ट', fil: 'ASSAULT ALERT' },
  'evacuation': { en: 'EVACUATION ORDER', ar: 'أمر إخلاء', ur: 'انخلاء کا حکم', hi: 'निकासी आदेश', fil: 'EVACUATION ORDER' },
  'intruder': { en: 'INTRUDER ALERT', ar: 'تنبيه متسلل', ur: 'گھس بیٹھنے والا الرٹ', hi: 'घुसपैठिया अलर्ट', fil: 'INTRUDER ALERT' },
};

const PRIORITY_EMOJI: Record<string, string> = {
  'critical': '🚨',
  'high': '🔴',
  'medium': '🟠',
  'low': '🟡',
};

const PRIORITY_LABELS: Record<string, Record<SupportedLanguage, string>> = {
  'critical': { en: 'CRITICAL', ar: 'حرج', ur: 'نازک', hi: 'गंभीर', fil: 'KRITIKAL' },
  'high': { en: 'HIGH', ar: 'عالي', ur: 'اعلی', hi: 'उच्च', fil: 'MATAAS' },
  'medium': { en: 'MEDIUM', ar: 'متوسط', ur: 'درمیانہ', hi: 'मध्यम', fil: 'KATAMTAMAN' },
  'low': { en: 'LOW', ar: 'منخفض', ur: 'کم', hi: 'निम्न', fil: 'MABABA' },
};

/**
 * Generate WhatsApp message for emergency alert
 */
function generateWhatsAppMessage(
  lang: SupportedLanguage,
  alert: EmergencyAlert,
  triggeredByName: string,
  siteName: string
): string {
  const alertLabel = ALERT_TYPE_LABELS[alert.alert_type]?.[lang] || ALERT_TYPE_LABELS['panic'][lang];
  const priorityEmoji = PRIORITY_EMOJI[alert.priority] || '🚨';
  const priorityLabel = PRIORITY_LABELS[alert.priority]?.[lang] || PRIORITY_LABELS['critical'][lang];
  
  const locationText = alert.location || siteName || '-';
  const gpsLink = alert.gps_lat && alert.gps_lng 
    ? `https://maps.google.com/?q=${alert.gps_lat},${alert.gps_lng}` 
    : '';
  
  const immediateAction: Record<SupportedLanguage, string> = {
    en: 'IMMEDIATE RESPONSE REQUIRED',
    ar: 'مطلوب استجابة فورية',
    ur: 'فوری ردعمل درکار',
    hi: 'तत्काल प्रतिक्रिया आवश्यक',
    fil: 'KAILANGAN NG AGARANG TUGON',
  };

  let message = `${priorityEmoji} ${alertLabel} ${priorityEmoji}

⚠️ ${immediateAction[lang]}

📍 ${lang === 'ar' ? 'الموقع' : 'Location'}: ${locationText}
👤 ${lang === 'ar' ? 'أطلقه' : 'Triggered by'}: ${triggeredByName}
🏷️ ${lang === 'ar' ? 'الأولوية' : 'Priority'}: ${priorityLabel}`;

  if (alert.details) {
    message += `\n📝 ${lang === 'ar' ? 'التفاصيل' : 'Details'}: ${alert.details.substring(0, 150)}`;
  }

  if (gpsLink) {
    message += `\n\n🗺️ ${lang === 'ar' ? 'الموقع على الخريطة' : 'Map Location'}:\n${gpsLink}`;
  }

  return message;
}

/**
 * Generate email HTML for emergency alert
 */
function generateEmailContent(
  lang: SupportedLanguage,
  alert: EmergencyAlert,
  triggeredByName: string,
  siteName: string,
  tenantName: string
): { subject: string; html: string } {
  const alertLabel = ALERT_TYPE_LABELS[alert.alert_type]?.[lang] || ALERT_TYPE_LABELS['panic'][lang];
  const priorityEmoji = PRIORITY_EMOJI[alert.priority] || '🚨';
  const priorityLabel = PRIORITY_LABELS[alert.priority]?.[lang] || PRIORITY_LABELS['critical'][lang];
  const rtl = isRTL(lang);
  
  const locationText = alert.location || siteName || '-';
  const gpsLink = alert.gps_lat && alert.gps_lng 
    ? `https://maps.google.com/?q=${alert.gps_lat},${alert.gps_lng}` 
    : '';

  const subject = `${priorityEmoji} ${alertLabel} - ${locationText}`;
  
  const priorityColor = alert.priority === 'critical' ? '#dc2626' : 
                        alert.priority === 'high' ? '#ea580c' : '#f59e0b';

  const immediateAction: Record<SupportedLanguage, string> = {
    en: 'IMMEDIATE RESPONSE REQUIRED',
    ar: 'مطلوب استجابة فورية',
    ur: 'فوری ردعمل درکار',
    hi: 'तत्काल प्रतिक्रिया आवश्यक',
    fil: 'KAILANGAN NG AGARANG TUGON',
  };

  const viewMap: Record<SupportedLanguage, string> = {
    en: 'View on Map',
    ar: 'عرض على الخريطة',
    ur: 'نقشے پر دیکھیں',
    hi: 'मानचित्र पर देखें',
    fil: 'Tingnan sa Mapa',
  };

  const gpsButton = gpsLink 
    ? `<a href="${gpsLink}" style="display: inline-block; background: #1e40af; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">📍 ${viewMap[lang]}</a>` 
    : '';

  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: ${rtl ? 'rtl' : 'ltr'};">
      <div style="background: ${priorityColor}; color: white; padding: 16px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">${priorityEmoji} ${alertLabel} ${priorityEmoji}</h1>
        <p style="margin: 8px 0 0 0; font-size: 16px; font-weight: bold;">${immediateAction[lang]}</p>
      </div>
      
      <div style="padding: 20px; background: #fef2f2;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 12px 0; color: #64748b; font-weight: bold;">${rtl ? 'الموقع' : 'Location'}:</td>
            <td style="padding: 12px 0; font-size: 16px;">${locationText}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: #64748b; font-weight: bold;">${rtl ? 'أطلقه' : 'Triggered by'}:</td>
            <td style="padding: 12px 0;">${triggeredByName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: #64748b; font-weight: bold;">${rtl ? 'الأولوية' : 'Priority'}:</td>
            <td style="padding: 12px 0;">
              <span style="background: ${priorityColor}; color: white; padding: 4px 12px; border-radius: 4px; font-weight: bold;">
                ${priorityLabel}
              </span>
            </td>
          </tr>
          ${alert.details ? `
          <tr>
            <td style="padding: 12px 0; color: #64748b; font-weight: bold; vertical-align: top;">${rtl ? 'التفاصيل' : 'Details'}:</td>
            <td style="padding: 12px 0;">${alert.details}</td>
          </tr>
          ` : ''}
          ${alert.gps_lat && alert.gps_lng ? `
          <tr>
            <td style="padding: 12px 0; color: #64748b; font-weight: bold;">GPS:</td>
            <td style="padding: 12px 0;">${alert.gps_lat.toFixed(6)}, ${alert.gps_lng.toFixed(6)}</td>
          </tr>
          ` : ''}
        </table>
        
        <div style="text-align: center; margin-top: 16px;">
          ${gpsButton}
        </div>
      </div>
    </div>
  `;

  const html = wrapEmailHtml(emailBody, lang, tenantName);
  return { subject, html };
}

/**
 * Generate enhanced push notification payload for background notifications
 * Includes all data needed for service worker to handle actions
 */
function generatePushPayload(
  lang: SupportedLanguage,
  alert: EmergencyAlert,
  locationText: string
): { 
  title: string; 
  body: string; 
  data: Record<string, unknown>;
  actions: Array<{ action: string; title: string }>;
  requireInteraction: boolean;
  vibrate: number[];
  tag: string;
} {
  const alertLabel = ALERT_TYPE_LABELS[alert.alert_type]?.[lang] || ALERT_TYPE_LABELS['panic'][lang];
  const priorityEmoji = PRIORITY_EMOJI[alert.priority] || '🚨';
  
  const title = `${priorityEmoji} ${alertLabel}`;
  const body = `📍 ${locationText}${alert.details ? ` - ${alert.details.substring(0, 50)}` : ''}`;

  // Localized action labels
  const acknowledgeLabel = lang === 'ar' ? 'إقرار' : 'Acknowledge';
  const viewLabel = lang === 'ar' ? 'عرض' : 'View';
  const mapLabel = lang === 'ar' ? '🗺️ خريطة' : '🗺️ Map';

  // Build actions array
  const actions: Array<{ action: string; title: string }> = [
    { action: 'acknowledge', title: acknowledgeLabel },
    { action: 'view', title: viewLabel },
  ];

  // Add map action if GPS coordinates available
  if (alert.gps_lat && alert.gps_lng) {
    actions.push({ action: 'map', title: mapLabel });
  }

  return { 
    title, 
    body,
    data: {
      type: 'emergency_alert',
      alert_id: alert.id,
      alert_type: alert.alert_type,
      priority: alert.priority,
      tenant_id: alert.tenant_id,
      action_url: `/security/emergency-alerts?id=${alert.id}`,
      gps_lat: alert.gps_lat,
      gps_lng: alert.gps_lng,
      location: locationText,
      lang,
    },
    actions,
    // Emergency alerts require user interaction - won't auto-dismiss
    requireInteraction: true,
    // Urgent vibration pattern: 5 long pulses
    vibrate: [500, 200, 500, 200, 500, 200, 500, 200, 500],
    // Unique tag per alert
    tag: `emergency-${alert.id}`,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: EmergencyAlertPayload = await req.json();
    const alertId = payload.alert_id || payload.record?.id;

    if (!alertId) {
      console.error('[EmergencyDispatch] Missing alert_id');
      return new Response(
        JSON.stringify({ error: 'Missing alert_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[EmergencyDispatch] Processing alert: ${alertId}`);

    // 1. Fetch alert details
    const { data: alertData, error: alertError } = await supabase
      .from('emergency_alerts')
      .select('*')
      .eq('id', alertId)
      .single();

    if (alertError || !alertData) {
      console.error('[EmergencyDispatch] Alert not found:', alertError);
      return new Response(
        JSON.stringify({ error: 'Alert not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const alert = alertData as EmergencyAlert;
    console.log(`[EmergencyDispatch] Alert type: ${alert.alert_type}, priority: ${alert.priority}`);

    // 2. Fetch tenant info
    let tenantName = '';
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', alert.tenant_id)
      .single();
    if (tenant?.name) tenantName = tenant.name;

    // 3. Fetch triggering user info
    let triggeredByName = '-';
    if (alert.triggered_by) {
      const { data: triggerUser } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', alert.triggered_by)
        .single();
      if (triggerUser?.full_name) triggeredByName = triggerUser.full_name;
    }

    // 4. Fetch site name
    let siteName = '';
    if (alert.site_id) {
      const { data: site } = await supabase
        .from('sites')
        .select('name')
        .eq('id', alert.site_id)
        .single();
      if (site?.name) siteName = site.name;
    }
    const locationText = alert.location || siteName || '-';

    // 5. Get notification recipients (security managers, on-duty guards, etc.)
    const { data: recipients, error: recipientsError } = await supabase
      .rpc('get_emergency_notification_recipients', {
        p_tenant_id: alert.tenant_id,
        p_alert_type: alert.alert_type,
        p_site_id: alert.site_id
      });

    if (recipientsError) {
      console.error('[EmergencyDispatch] Failed to get recipients:', recipientsError);
      // Continue with fallback - get all security managers
    }

    let recipientList: NotificationRecipient[] = recipients || [];

    // Fallback: If no recipients from function, get all security-related roles
    if (recipientList.length === 0) {
      console.log('[EmergencyDispatch] No recipients from function, using fallback query');
      
      const { data: fallbackRecipients } = await supabase
        .from('profiles')
        .select('id, full_name, phone_number, email, preferred_language')
        .eq('tenant_id', alert.tenant_id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .in('role', ['admin', 'hsse_manager', 'supervisor']);

      if (fallbackRecipients) {
        recipientList = fallbackRecipients.map(r => ({
          user_id: r.id,
          full_name: r.full_name,
          phone_number: r.phone_number,
          email: r.email,
          preferred_language: r.preferred_language,
          role_code: null
        }));
      }
    }

    console.log(`[EmergencyDispatch] Found ${recipientList.length} recipients`);

    // 6. Send notifications to all recipients
    const results: Array<{ channel: string; recipient: string; status: string; error?: string }> = [];

    for (const recipient of recipientList) {
      const lang = (recipient.preferred_language || 'en') as SupportedLanguage;
      const validLangs: SupportedLanguage[] = ['en', 'ar', 'ur', 'hi', 'fil'];
      const safeLang: SupportedLanguage = validLangs.includes(lang) ? lang : 'en';

      // Send Push Notification (highest priority for emergencies)
      // Enhanced with full payload for background notification handling
      try {
        const pushPayload = generatePushPayload(safeLang, alert, locationText);
        
        const { data: pushSub } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('user_id', recipient.user_id)
          .eq('is_active', true)
          .limit(1)
          .single();

        if (pushSub) {
          // Send enhanced push notification with all required data for background handling
          const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({
              user_id: recipient.user_id,
              title: pushPayload.title,
              body: pushPayload.body,
              // Pass full data for service worker to use in background
              data: pushPayload.data,
              // Pass actions for notification buttons
              actions: pushPayload.actions,
              // Emergency alerts should not auto-dismiss
              requireInteraction: pushPayload.requireInteraction,
              // Urgent vibration pattern
              vibrate: pushPayload.vibrate,
              // Unique tag for this alert
              tag: pushPayload.tag,
            })
          });

          results.push({
            channel: 'push',
            recipient: recipient.full_name || recipient.user_id,
            status: pushResponse.ok ? 'sent' : 'failed',
            error: pushResponse.ok ? undefined : await pushResponse.text()
          });

          console.log(`[EmergencyDispatch] Push sent to ${recipient.full_name} with enhanced payload`);
        }
      } catch (pushError) {
        console.error('[EmergencyDispatch] Push error:', pushError);
        results.push({
          channel: 'push',
          recipient: recipient.full_name || recipient.user_id,
          status: 'failed',
          error: String(pushError)
        });
      }

      // Send WhatsApp (for critical/high priority)
      if (recipient.phone_number && ['critical', 'high'].includes(alert.priority)) {
        try {
          const whatsappMessage = generateWhatsAppMessage(safeLang, alert, triggeredByName, siteName);
          const waResult = await sendWhatsAppText(recipient.phone_number, whatsappMessage);

          results.push({
            channel: 'whatsapp',
            recipient: recipient.full_name || recipient.user_id,
            status: waResult.success ? 'sent' : 'failed',
            error: waResult.error
          });

          // Log notification
          if (waResult.success && waResult.messageId) {
            await logNotificationSent({
              tenant_id: alert.tenant_id,
              user_id: recipient.user_id,
              channel: 'whatsapp',
              provider: 'wasender',
              provider_message_id: waResult.messageId,
              to_address: recipient.phone_number!,
              status: 'sent',
              related_entity_type: 'emergency_alert',
              related_entity_id: alert.id
            });
          }
        } catch (waError) {
          console.error('[EmergencyDispatch] WhatsApp error:', waError);
          results.push({
            channel: 'whatsapp',
            recipient: recipient.full_name || recipient.user_id,
            status: 'failed',
            error: String(waError)
          });
        }
      }

      // Send Email
      if (recipient.email) {
        try {
          const emailContent = generateEmailContent(safeLang, alert, triggeredByName, siteName, tenantName);
          const emailResult = await sendEmail({
            to: recipient.email,
            subject: emailContent.subject,
            html: emailContent.html,
            module: 'incident_workflow',
            tenantName
          });

          results.push({
            channel: 'email',
            recipient: recipient.full_name || recipient.user_id,
            status: emailResult.success ? 'sent' : 'failed',
            error: emailResult.error
          });

          // Log notification
          if (emailResult.success) {
            await logNotificationSent({
              tenant_id: alert.tenant_id,
              user_id: recipient.user_id,
              channel: 'email',
              provider: 'resend',
              provider_message_id: `emergency-${alert.id}-${recipient.user_id}`,
              to_address: recipient.email,
              subject: emailContent.subject,
              status: 'sent',
              related_entity_type: 'emergency_alert',
              related_entity_id: alert.id
            });
          }
        } catch (emailError) {
          console.error('[EmergencyDispatch] Email error:', emailError);
          results.push({
            channel: 'email',
            recipient: recipient.full_name || recipient.user_id,
            status: 'failed',
            error: String(emailError)
          });
        }
      }
    }

    const sentCount = results.filter(r => r.status === 'sent').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    console.log(`[EmergencyDispatch] Complete. Sent: ${sentCount}, Failed: ${failedCount}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        alert_id: alert.id,
        recipients_count: recipientList.length,
        sent: sentCount,
        failed: failedCount,
        results 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[EmergencyDispatch] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
