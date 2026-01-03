import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWaSenderTextMessage } from "../_shared/wasender-whatsapp.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Language resolution based on nationality (same as language-resolver.ts)
const ARAB_COUNTRIES = ['SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'EG', 'JO', 'LB', 'SY', 'IQ', 'YE', 'PS', 'LY', 'TN', 'DZ', 'MA', 'SD', 'MR'];
const LANGUAGE_MAP: Record<string, string> = {
  'IN': 'hi',  // India -> Hindi
  'PK': 'ur',  // Pakistan -> Urdu
  'PH': 'fil', // Philippines -> Filipino
  'CN': 'zh',  // China -> Chinese
  'BD': 'hi',  // Bangladesh -> Hindi (close enough)
  'NP': 'hi',  // Nepal -> Hindi
  'LK': 'en',  // Sri Lanka -> English
  'ID': 'en',  // Indonesia -> English
};

function resolveLanguage(nationalityCode: string | null): string {
  if (!nationalityCode) return 'en';
  const code = nationalityCode.toUpperCase();
  if (ARAB_COUNTRIES.includes(code)) return 'ar';
  return LANGUAGE_MAP[code] || 'en';
}

// Priority icons
const PRIORITY_ICONS: Record<string, string> = {
  critical: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '🟢',
};

// Category icons
const CATEGORY_ICONS: Record<string, string> = {
  weather_risk: '🌧️',
  regulation: '⚖️',
  safety_alert: '⚠️',
  policy_update: '📋',
  training: '🎓',
  general: '📢',
};

// Translations for the message header
const TRANSLATIONS: Record<string, { 
  header: string; 
  priority: Record<string, string>;
  category: Record<string, string>;
}> = {
  en: {
    header: 'HSSE Alert',
    priority: { critical: 'CRITICAL', high: 'HIGH', medium: 'MEDIUM', low: 'LOW' },
    category: { weather_risk: 'Weather Risk', regulation: 'Regulation', safety_alert: 'Safety Alert', policy_update: 'Policy Update', training: 'Training', general: 'Announcement' },
  },
  ar: {
    header: 'تنبيه الصحة والسلامة',
    priority: { critical: 'حرج', high: 'عالي', medium: 'متوسط', low: 'منخفض' },
    category: { weather_risk: 'مخاطر الطقس', regulation: 'اللوائح', safety_alert: 'تنبيه السلامة', policy_update: 'تحديث السياسة', training: 'تدريب', general: 'إعلان' },
  },
  ur: {
    header: 'HSSE الرٹ',
    priority: { critical: 'نازک', high: 'زیادہ', medium: 'درمیانہ', low: 'کم' },
    category: { weather_risk: 'موسم کا خطرہ', regulation: 'ضوابط', safety_alert: 'حفاظتی الرٹ', policy_update: 'پالیسی اپڈیٹ', training: 'تربیت', general: 'اعلان' },
  },
  hi: {
    header: 'HSSE अलर्ट',
    priority: { critical: 'गंभीर', high: 'उच्च', medium: 'मध्यम', low: 'निम्न' },
    category: { weather_risk: 'मौसम जोखिम', regulation: 'विनियमन', safety_alert: 'सुरक्षा अलर्ट', policy_update: 'नीति अपडेट', training: 'प्रशिक्षण', general: 'घोषणा' },
  },
  fil: {
    header: 'HSSE Alert',
    priority: { critical: 'KRITIKAL', high: 'MATAAS', medium: 'KATAMTAMAN', low: 'MABABA' },
    category: { weather_risk: 'Panganib sa Panahon', regulation: 'Regulasyon', safety_alert: 'Safety Alert', policy_update: 'Policy Update', training: 'Pagsasanay', general: 'Anunsyo' },
  },
  zh: {
    header: 'HSSE警报',
    priority: { critical: '危急', high: '高', medium: '中', low: '低' },
    category: { weather_risk: '天气风险', regulation: '法规', safety_alert: '安全警报', policy_update: '政策更新', training: '培训', general: '公告' },
  },
};

interface ExternalNotificationPayload {
  notification_id: string;
  include_workers: boolean;
  include_visitors: boolean;
}

interface Recipient {
  phone: string;
  nationality: string | null;
  name: string;
  type: 'worker' | 'visitor';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { notification_id, include_workers, include_visitors } = await req.json() as ExternalNotificationPayload;

    if (!notification_id) {
      throw new Error('notification_id is required');
    }

    console.log(`Processing external HSSE notification: ${notification_id}, workers: ${include_workers}, visitors: ${include_visitors}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the notification
    const { data: notification, error: notifError } = await supabase
      .from('hsse_notifications')
      .select('*')
      .eq('id', notification_id)
      .single();

    if (notifError || !notification) {
      throw new Error(`Notification not found: ${notifError?.message}`);
    }

    const recipients: Recipient[] = [];
    const today = new Date().toISOString().split('T')[0];

    // Fetch workers on-site if enabled
    if (include_workers) {
      console.log('Fetching workers on-site...');
      const { data: workerLogs, error: workerError } = await supabase
        .from('contractor_access_logs')
        .select(`
          id,
          worker_id,
          contractor_workers(
            id,
            full_name,
            mobile_number,
            nationality
          )
        `)
        .eq('tenant_id', notification.tenant_id)
        .is('exit_time', null)
        .gte('entry_time', today);

      if (workerError) {
        console.error('Failed to fetch workers:', workerError);
      } else if (workerLogs) {
        console.log(`Found ${workerLogs.length} workers on-site`);
        for (const log of workerLogs) {
          // Handle Supabase join result - could be object or array
          const workerData = log.contractor_workers;
          const worker = Array.isArray(workerData) ? workerData[0] : workerData;
          if (worker && worker.mobile_number) {
            recipients.push({
              phone: worker.mobile_number,
              nationality: worker.nationality,
              name: worker.full_name || 'Worker',
              type: 'worker',
            });
          }
        }
      }
    }

    // Fetch visitors on-site if enabled
    if (include_visitors) {
      console.log('Fetching visitors on-site...');
      const { data: visitRequests, error: visitorError } = await supabase
        .from('visit_requests')
        .select(`
          id,
          visitor_id,
          visitors(
            id,
            full_name,
            phone,
            nationality
          )
        `)
        .eq('tenant_id', notification.tenant_id)
        .eq('status', 'checked_in');

      if (visitorError) {
        console.error('Failed to fetch visitors:', visitorError);
      } else if (visitRequests) {
        console.log(`Found ${visitRequests.length} visitors on-site`);
        for (const visit of visitRequests) {
          // Handle Supabase join result - could be object or array
          const visitorData = visit.visitors;
          const visitor = Array.isArray(visitorData) ? visitorData[0] : visitorData;
          if (visitor && visitor.phone) {
            recipients.push({
              phone: visitor.phone,
              nationality: visitor.nationality,
              name: visitor.full_name || 'Visitor',
              type: 'visitor',
            });
          }
        }
      }
    }

    console.log(`Total recipients: ${recipients.length}`);

    if (recipients.length === 0) {
      console.log('No recipients found, skipping WhatsApp send');
      return new Response(JSON.stringify({
        success: true,
        message: 'No external recipients found',
        workers_sent: 0,
        visitors_sent: 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Group recipients by language for efficient translation
    const recipientsByLang: Record<string, Recipient[]> = {};
    for (const recipient of recipients) {
      const lang = resolveLanguage(recipient.nationality);
      if (!recipientsByLang[lang]) {
        recipientsByLang[lang] = [];
      }
      recipientsByLang[lang].push(recipient);
    }

    console.log('Recipients by language:', Object.keys(recipientsByLang).map(l => `${l}: ${recipientsByLang[l].length}`).join(', '));

    // Translation cache
    const translationCache: Record<string, { title: string; body: string }> = {};

    // Pre-populate with existing translations
    translationCache['en'] = { title: notification.title_en, body: notification.body_en };
    if (notification.title_ar && notification.body_ar) {
      translationCache['ar'] = { title: notification.title_ar, body: notification.body_ar };
    }

    // Translate content for each language that needs it
    for (const lang of Object.keys(recipientsByLang)) {
      if (!translationCache[lang]) {
        console.log(`Translating content to ${lang}...`);
        try {
          const { data: translationResult, error: translationError } = await supabase.functions.invoke('translate-page-content', {
            body: {
              content: {
                title: notification.title_en,
                body: notification.body_en,
              },
              targetLanguages: [lang],
              sourceLanguage: 'en',
            },
          });

          if (translationError) {
            console.error(`Translation failed for ${lang}:`, translationError);
            // Fallback to English
            translationCache[lang] = { title: notification.title_en, body: notification.body_en };
          } else if (translationResult?.translations?.[lang]) {
            translationCache[lang] = {
              title: translationResult.translations[lang].title || notification.title_en,
              body: translationResult.translations[lang].body || notification.body_en,
            };
            console.log(`Translation to ${lang} successful`);
          } else {
            translationCache[lang] = { title: notification.title_en, body: notification.body_en };
          }
        } catch (err) {
          console.error(`Translation error for ${lang}:`, err);
          translationCache[lang] = { title: notification.title_en, body: notification.body_en };
        }
      }
    }

    // Send messages
    let workersSent = 0;
    let visitorsSent = 0;
    let messagesFailed = 0;
    const errors: string[] = [];
    const deliveryLogs: Array<{
      tenant_id: string;
      notification_id: string;
      channel: string;
      recipient_type: string;
      recipient_address: string;
      recipient_name: string | null;
      recipient_language: string;
      status: string;
      provider: string;
      provider_message_id: string | null;
      error_message: string | null;
      sent_at: string | null;
      failed_at: string | null;
      metadata: Record<string, unknown>;
    }> = [];

    for (const recipient of recipients) {
      const lang = resolveLanguage(recipient.nationality);
      const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
      const content = translationCache[lang] || translationCache.en;
      
      // Build WhatsApp message
      const priorityIcon = PRIORITY_ICONS[notification.priority] || '📢';
      const categoryIcon = CATEGORY_ICONS[notification.category] || '📢';
      const priorityLabel = t.priority[notification.priority] || notification.priority.toUpperCase();
      const categoryLabel = t.category[notification.category] || notification.category;

      const message = `${categoryIcon} *${t.header}*\n${priorityIcon} ${priorityLabel} | ${categoryLabel}\n\n*${content.title}*\n\n${content.body}`;

      try {
        console.log(`Sending WhatsApp to ${recipient.phone} (${recipient.type}, ${lang})`);
        const result = await sendWaSenderTextMessage(recipient.phone, message);
        
        if (result.success) {
          if (recipient.type === 'worker') {
            workersSent++;
          } else {
            visitorsSent++;
          }
          console.log(`WhatsApp sent to ${recipient.phone}`);
          deliveryLogs.push({
            tenant_id: notification.tenant_id,
            notification_id: notification.id,
            channel: 'whatsapp',
            recipient_type: recipient.type,
            recipient_address: recipient.phone,
            recipient_name: recipient.name,
            recipient_language: lang,
            status: 'sent',
            provider: 'wasender',
            provider_message_id: result.messageId || null,
            error_message: null,
            sent_at: new Date().toISOString(),
            failed_at: null,
            metadata: { 
              nationality: recipient.nationality, 
              priority: notification.priority, 
              category: notification.category 
            },
          });
        } else {
          messagesFailed++;
          errors.push(`${recipient.phone}: ${result.error}`);
          console.error(`Failed to send WhatsApp to ${recipient.phone}:`, result.error);
          deliveryLogs.push({
            tenant_id: notification.tenant_id,
            notification_id: notification.id,
            channel: 'whatsapp',
            recipient_type: recipient.type,
            recipient_address: recipient.phone,
            recipient_name: recipient.name,
            recipient_language: lang,
            status: 'failed',
            provider: 'wasender',
            provider_message_id: null,
            error_message: result.error || 'Unknown error',
            sent_at: null,
            failed_at: new Date().toISOString(),
            metadata: { 
              nationality: recipient.nationality, 
              priority: notification.priority, 
              category: notification.category 
            },
          });
        }
      } catch (err) {
        messagesFailed++;
        const errorMsg = err instanceof Error ? err.message : String(err);
        errors.push(`${recipient.phone}: ${errorMsg}`);
        console.error(`Error sending WhatsApp to ${recipient.phone}:`, err);
        deliveryLogs.push({
          tenant_id: notification.tenant_id,
          notification_id: notification.id,
          channel: 'whatsapp',
          recipient_type: recipient.type,
          recipient_address: recipient.phone,
          recipient_name: recipient.name,
          recipient_language: lang,
          status: 'failed',
          provider: 'wasender',
          provider_message_id: null,
          error_message: errorMsg,
          sent_at: null,
          failed_at: new Date().toISOString(),
          metadata: { 
            nationality: recipient.nationality, 
            priority: notification.priority, 
            category: notification.category 
          },
        });
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Insert delivery logs
    if (deliveryLogs.length > 0) {
      const { error: logError } = await supabase
        .from('hsse_notification_delivery_logs')
        .insert(deliveryLogs);
      
      if (logError) {
        console.error('Failed to insert delivery logs:', logError);
      } else {
        console.log(`Inserted ${deliveryLogs.length} delivery logs`);
      }
    }

    // Update notification record with send stats
    const updateData: Record<string, unknown> = {};
    if (include_workers && workersSent > 0) {
      updateData.worker_whatsapp_sent_at = new Date().toISOString();
      updateData.worker_messages_sent = workersSent;
    }
    if (include_visitors && visitorsSent > 0) {
      updateData.visitor_whatsapp_sent_at = new Date().toISOString();
      updateData.visitor_messages_sent = visitorsSent;
    }

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('hsse_notifications')
        .update(updateData)
        .eq('id', notification_id);

      if (updateError) {
        console.error('Failed to update notification stats:', updateError);
      }
    }

    console.log(`External HSSE notification ${notification_id} processed: ${workersSent} workers, ${visitorsSent} visitors, ${messagesFailed} failed`);

    return new Response(JSON.stringify({
      success: true,
      notification_id,
      workers_sent: workersSent,
      visitors_sent: visitorsSent,
      messages_failed: messagesFailed,
      errors: errors.length > 0 ? errors : undefined,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-hsse-notification-external:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
