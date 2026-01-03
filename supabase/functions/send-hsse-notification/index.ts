import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  sendEmail, 
  emailButton, 
  wrapEmailHtml, 
  getCommonTranslations,
} from "../_shared/email-sender.ts";
import { isRTL, type SupportedLanguage } from "../_shared/email-translations.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// HSSE Notification translations
const HSSE_NOTIFICATION_TRANSLATIONS = {
  en: {
    subject: {
      mandatory: "🚨 [ACTION REQUIRED] {title}",
      informational: "📢 HSSE Alert: {title}",
    },
    heading: {
      mandatory: "Mandatory HSSE Notification",
      informational: "HSSE Information Alert",
    },
    priority: {
      critical: "🔴 CRITICAL",
      high: "🟠 HIGH",
      medium: "🟡 MEDIUM",
      low: "🟢 LOW",
    },
    category: {
      weather_risk: "Weather Risk",
      regulation: "Regulation Update",
      safety_alert: "Safety Alert",
      policy_update: "Policy Update",
      training: "Training",
      general: "General Announcement",
    },
    acknowledgeRequired: "This notification requires your acknowledgment. Please acknowledge as soon as possible.",
    acknowledgeButton: "Acknowledge Notification",
    viewButton: "View Details",
    footer: "This notification was sent by your organization's HSSE team.",
  },
  ar: {
    subject: {
      mandatory: "🚨 [إجراء مطلوب] {title}",
      informational: "📢 تنبيه الصحة والسلامة: {title}",
    },
    heading: {
      mandatory: "إشعار إلزامي للصحة والسلامة",
      informational: "تنبيه معلومات الصحة والسلامة",
    },
    priority: {
      critical: "🔴 حرج",
      high: "🟠 عالي",
      medium: "🟡 متوسط",
      low: "🟢 منخفض",
    },
    category: {
      weather_risk: "مخاطر الطقس",
      regulation: "تحديث اللوائح",
      safety_alert: "تنبيه السلامة",
      policy_update: "تحديث السياسة",
      training: "تدريب",
      general: "إعلان عام",
    },
    acknowledgeRequired: "يتطلب هذا الإشعار إقرارك. يرجى الإقرار في أقرب وقت ممكن.",
    acknowledgeButton: "إقرار الإشعار",
    viewButton: "عرض التفاصيل",
    footer: "تم إرسال هذا الإشعار من قبل فريق الصحة والسلامة في مؤسستك.",
  },
  ur: {
    subject: {
      mandatory: "🚨 [کارروائی درکار] {title}",
      informational: "📢 HSSE الرٹ: {title}",
    },
    heading: {
      mandatory: "لازمی HSSE نوٹیفکیشن",
      informational: "HSSE معلوماتی الرٹ",
    },
    priority: {
      critical: "🔴 نازک",
      high: "🟠 زیادہ",
      medium: "🟡 درمیانہ",
      low: "🟢 کم",
    },
    category: {
      weather_risk: "موسمی خطرہ",
      regulation: "ضوابط کی تازہ کاری",
      safety_alert: "حفاظتی الرٹ",
      policy_update: "پالیسی کی تازہ کاری",
      training: "تربیت",
      general: "عمومی اعلان",
    },
    acknowledgeRequired: "اس نوٹیفکیشن کے لیے آپ کی تصدیق درکار ہے۔ براہ کرم جلد از جلد تصدیق کریں۔",
    acknowledgeButton: "نوٹیفکیشن کی تصدیق",
    viewButton: "تفصیلات دیکھیں",
    footer: "یہ نوٹیفکیشن آپ کی تنظیم کی HSSE ٹیم نے بھیجا ہے۔",
  },
  hi: {
    subject: {
      mandatory: "🚨 [कार्रवाई आवश्यक] {title}",
      informational: "📢 HSSE अलर्ट: {title}",
    },
    heading: {
      mandatory: "अनिवार्य HSSE सूचना",
      informational: "HSSE सूचना अलर्ट",
    },
    priority: {
      critical: "🔴 गंभीर",
      high: "🟠 उच्च",
      medium: "🟡 मध्यम",
      low: "🟢 निम्न",
    },
    category: {
      weather_risk: "मौसम जोखिम",
      regulation: "विनियमन अपडेट",
      safety_alert: "सुरक्षा अलर्ट",
      policy_update: "नीति अपडेट",
      training: "प्रशिक्षण",
      general: "सामान्य घोषणा",
    },
    acknowledgeRequired: "इस सूचना के लिए आपकी पावती आवश्यक है। कृपया जल्द से जल्द पावती दें।",
    acknowledgeButton: "सूचना की पावती दें",
    viewButton: "विवरण देखें",
    footer: "यह सूचना आपके संगठन की HSSE टीम द्वारा भेजी गई है।",
  },
  fil: {
    subject: {
      mandatory: "🚨 [AKSYON KINAKAILANGAN] {title}",
      informational: "📢 HSSE Alert: {title}",
    },
    heading: {
      mandatory: "Mandatory na HSSE Notification",
      informational: "HSSE Information Alert",
    },
    priority: {
      critical: "🔴 KRITIKAL",
      high: "🟠 MATAAS",
      medium: "🟡 KATAMTAMAN",
      low: "🟢 MABABA",
    },
    category: {
      weather_risk: "Panganib sa Panahon",
      regulation: "Update sa Regulasyon",
      safety_alert: "Safety Alert",
      policy_update: "Update sa Patakaran",
      training: "Pagsasanay",
      general: "Pangkalahatang Anunsyo",
    },
    acknowledgeRequired: "Kinakailangan ang iyong pagkilala sa notification na ito. Mangyaring kilalanin sa lalong madaling panahon.",
    acknowledgeButton: "Kilalanin ang Notification",
    viewButton: "Tingnan ang Mga Detalye",
    footer: "Ang notification na ito ay ipinadala ng HSSE team ng iyong organisasyon.",
  },
};

function getTranslation(lang: string): typeof HSSE_NOTIFICATION_TRANSLATIONS.en {
  return HSSE_NOTIFICATION_TRANSLATIONS[lang as keyof typeof HSSE_NOTIFICATION_TRANSLATIONS] 
    || HSSE_NOTIFICATION_TRANSLATIONS.en;
}

interface NotificationPayload {
  notification_id: string;
  tenant_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { notification_id, tenant_id } = await req.json() as NotificationPayload;

    if (!notification_id) {
      throw new Error('notification_id is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const appUrl = Deno.env.get('APP_URL') || 'https://app.dhuud.com';

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

    console.log(`Processing HSSE notification: ${notification.id}, type: ${notification.notification_type}`);
    console.log(`Notification flags - push: ${notification.send_push_notification}, email: ${notification.send_email_notification}, workers: ${notification.include_workers_on_site}, visitors: ${notification.include_visitors_on_site}`);

    // Get tenant info
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', notification.tenant_id)
      .single();

    const tenantName = tenant?.name || 'DHUUD';

    // Build target user query based on audience
    let usersQuery = supabase
      .from('profiles')
      .select('id, full_name, email:phone_number, preferred_language, assigned_branch_id, assigned_site_id')
      .eq('tenant_id', notification.tenant_id)
      .eq('is_active', true)
      .eq('has_login', true);

    // Filter by target audience
    if (notification.target_audience === 'specific_branches' && notification.target_branch_ids?.length > 0) {
      usersQuery = usersQuery.in('assigned_branch_id', notification.target_branch_ids);
    } else if (notification.target_audience === 'specific_sites' && notification.target_site_ids?.length > 0) {
      usersQuery = usersQuery.in('assigned_site_id', notification.target_site_ids);
    }

    const { data: targetUsers, error: usersError } = await usersQuery;

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    console.log(`Found ${targetUsers?.length || 0} target users`);

    // Get user emails from auth
    const userIds = targetUsers?.map(u => u.id) || [];
    
    if (userIds.length === 0) {
      console.log('No target users found, skipping email send');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No target users',
        emails_sent: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch emails from auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Failed to fetch auth users:', authError);
    }

    const userEmailMap = new Map<string, string>();
    authUsers?.users?.forEach(u => {
      if (u.email) {
        userEmailMap.set(u.id, u.email);
      }
    });

    let emailsSent = 0;
    let emailsFailed = 0;
    const errors: string[] = [];
    const deliveryLogs: Array<{
      tenant_id: string;
      notification_id: string;
      channel: string;
      recipient_type: string;
      recipient_id: string;
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

    // Send emails to each user in their preferred language
    for (const user of targetUsers || []) {
      const email = userEmailMap.get(user.id);
      if (!email) {
        console.log(`No email for user ${user.id}, skipping`);
        continue;
      }

      const lang = (user.preferred_language || 'en') as SupportedLanguage;
      const rtl = isRTL(lang);
      const t = getTranslation(lang);

      // Get localized content
      const title = lang === 'ar' && notification.title_ar ? notification.title_ar : notification.title_en;
      const body = lang === 'ar' && notification.body_ar ? notification.body_ar : notification.body_en;

      const subject = notification.notification_type === 'mandatory' 
        ? t.subject.mandatory.replace('{title}', title)
        : t.subject.informational.replace('{title}', title);

      const heading = notification.notification_type === 'mandatory' 
        ? t.heading.mandatory 
        : t.heading.informational;

      const priorityLabel = t.priority[notification.priority as keyof typeof t.priority] || notification.priority;
      const categoryLabel = t.category[notification.category as keyof typeof t.category] || notification.category;

      // Build email HTML
      const emailContent = `
        <div style="background: ${notification.priority === 'critical' ? '#fef2f2' : '#f0f9ff'}; border-radius: 8px; padding: 20px; margin-bottom: 20px; border-${rtl ? 'right' : 'left'}: 4px solid ${notification.priority === 'critical' ? '#ef4444' : '#3b82f6'};">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <span style="font-size: 14px; font-weight: 600; color: ${notification.priority === 'critical' ? '#991b1b' : '#1e40af'};">
              ${priorityLabel}
            </span>
            <span style="font-size: 12px; color: #6b7280;">•</span>
            <span style="font-size: 12px; color: #6b7280;">${categoryLabel}</span>
          </div>
          <h2 style="margin: 0 0 12px 0; font-size: 20px; color: #111827;">${heading}</h2>
          <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #374151;">${title}</h3>
          <div style="color: #4b5563; line-height: 1.6;">
            ${body.replace(/\n/g, '<br>')}
          </div>
        </div>

        ${notification.notification_type === 'mandatory' ? `
          <div style="background: #fff7ed; border-radius: 8px; padding: 16px; margin-bottom: 20px; border: 1px solid #fdba74;">
            <p style="margin: 0; color: #9a3412; font-weight: 500;">
              ⚠️ ${t.acknowledgeRequired}
            </p>
          </div>
          ${emailButton(t.acknowledgeButton, `${appUrl}/dashboard?acknowledge=${notification_id}`, '#dc2626', rtl)}
        ` : `
          ${emailButton(t.viewButton, `${appUrl}/dashboard`, '#1e40af', rtl)}
        `}

        <p style="color: #6b7280; font-size: 12px; margin-top: 24px; text-align: center;">
          ${t.footer}
        </p>
      `;

      const html = wrapEmailHtml(emailContent, lang, tenantName);

      try {
        const result = await sendEmail({
          to: email,
          subject,
          html,
          module: 'system_alert',
          tenantName,
        });

        if (result.success) {
          emailsSent++;
          console.log(`Email sent to ${email}`);
          deliveryLogs.push({
            tenant_id: notification.tenant_id,
            notification_id: notification.id,
            channel: 'email',
            recipient_type: 'employee',
            recipient_id: user.id,
            recipient_address: email,
            recipient_name: user.full_name,
            recipient_language: lang,
            status: 'sent',
            provider: 'resend',
            provider_message_id: null,
            error_message: null,
            sent_at: new Date().toISOString(),
            failed_at: null,
            metadata: { priority: notification.priority, category: notification.category },
          });
        } else {
          emailsFailed++;
          errors.push(`${email}: ${result.error}`);
          console.error(`Failed to send email to ${email}:`, result.error);
          deliveryLogs.push({
            tenant_id: notification.tenant_id,
            notification_id: notification.id,
            channel: 'email',
            recipient_type: 'employee',
            recipient_id: user.id,
            recipient_address: email,
            recipient_name: user.full_name,
            recipient_language: lang,
            status: 'failed',
            provider: 'resend',
            provider_message_id: null,
            error_message: result.error || 'Unknown error',
            sent_at: null,
            failed_at: new Date().toISOString(),
            metadata: { priority: notification.priority, category: notification.category },
          });
        }
      } catch (emailError) {
        emailsFailed++;
        const errorMsg = emailError instanceof Error ? emailError.message : String(emailError);
        errors.push(`${email}: ${errorMsg}`);
        console.error(`Error sending email to ${email}:`, emailError);
        deliveryLogs.push({
          tenant_id: notification.tenant_id,
          notification_id: notification.id,
          channel: 'email',
          recipient_type: 'employee',
          recipient_id: user.id,
          recipient_address: email,
          recipient_name: user.full_name,
          recipient_language: lang,
          status: 'failed',
          provider: 'resend',
          provider_message_id: null,
          error_message: errorMsg,
          sent_at: null,
          failed_at: new Date().toISOString(),
          metadata: { priority: notification.priority, category: notification.category },
        });
      }
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

    // Update notification with email sent timestamp
    if (emailsSent > 0) {
      await supabase
        .from('hsse_notifications')
        .update({ 
          email_sent_at: new Date().toISOString(),
          email_delivery_status: emailsFailed === 0 ? 'sent' : 'partial'
        })
        .eq('id', notification_id);
    }

    // Send push notifications if enabled
    if (notification.send_push_notification) {
      try {
        const pushResult = await supabase.functions.invoke('send-push-notification', {
          body: {
            user_ids: userIds,
            title: notification.title_en,
            body: notification.body_en.substring(0, 100),
            data: {
              type: 'hsse_notification',
              notification_id: notification.id,
              priority: notification.priority,
              mandatory: notification.notification_type === 'mandatory',
            },
          },
        });
        console.log('Push notifications sent:', pushResult);
      } catch (pushError) {
        console.error('Failed to send push notifications:', pushError);
      }
    }

    // Send to workers/visitors on-site if enabled (WhatsApp)
    console.log('Checking external notification flags:', {
      include_workers_on_site: notification.include_workers_on_site,
      include_visitors_on_site: notification.include_visitors_on_site,
      shouldTrigger: notification.include_workers_on_site || notification.include_visitors_on_site,
    });
    
    if (notification.include_workers_on_site || notification.include_visitors_on_site) {
      console.log('Triggering external notifications (workers/visitors)...');
      try {
        const extResult = await supabase.functions.invoke('send-hsse-notification-external', {
          body: {
            notification_id: notification.id,
            include_workers: notification.include_workers_on_site === true,
            include_visitors: notification.include_visitors_on_site === true,
          },
        });
        console.log('External notifications triggered:', JSON.stringify(extResult));
      } catch (extError) {
        console.error('Failed to trigger external notifications:', extError);
      }
    } else {
      console.log('Skipping external notifications - neither workers nor visitors enabled');
    }

    console.log(`HSSE notification ${notification_id} processed: ${emailsSent} emails sent, ${emailsFailed} failed`);

    return new Response(JSON.stringify({
      success: true,
      notification_id,
      emails_sent: emailsSent,
      emails_failed: emailsFailed,
      errors: errors.length > 0 ? errors : undefined,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-hsse-notification:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
