import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FindingSLAConfig {
  id: string;
  tenant_id: string;
  classification: string;
  target_days: number;
  warning_days_before: number;
  escalation_days_after: number;
  second_escalation_days_after: number | null;
}

interface Finding {
  id: string;
  reference_id: string;
  classification: string;
  description: string;
  status: string;
  due_date: string | null;
  escalation_level: number;
  warning_sent_at: string | null;
  last_escalated_at: string | null;
  tenant_id: string;
  session_id: string;
  created_by: string | null;
}

interface HSSEManager {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  preferred_language: string | null;
}

// Import shared utilities
async function sendWhatsAppNotification(phone: string, message: string): Promise<void> {
  try {
    const response = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-gate-whatsapp`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({ phone, message }),
      }
    );
    if (!response.ok) {
      console.warn('WhatsApp notification failed:', await response.text());
    }
  } catch (error) {
    console.warn('WhatsApp notification error:', error);
  }
}

async function sendEmailNotification(
  to: string,
  subject: string,
  body: string,
  module: string = 'inspections'
): Promise<void> {
  try {
    const response = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email-template`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          to,
          subject,
          html: body,
          module,
        }),
      }
    );
    if (!response.ok) {
      console.warn('Email notification failed:', await response.text());
    }
  } catch (error) {
    console.warn('Email notification error:', error);
  }
}

function getClassificationLabel(classification: string, lang: string): string {
  const labels: Record<string, { en: string; ar: string }> = {
    critical_nc: { en: 'Critical Non-Conformance', ar: 'عدم مطابقة حرجة' },
    major_nc: { en: 'Major Non-Conformance', ar: 'عدم مطابقة رئيسية' },
    minor_nc: { en: 'Minor Non-Conformance', ar: 'عدم مطابقة بسيطة' },
    observation: { en: 'Observation', ar: 'ملاحظة' },
  };
  return labels[classification]?.[lang === 'ar' ? 'ar' : 'en'] || classification;
}

async function sendWarningNotifications(
  supabaseClient: any,
  finding: Finding,
  daysUntilDue: number,
  inspector: { email: string; full_name: string; phone: string | null; preferred_language: string | null } | null
): Promise<void> {
  if (!inspector) return;

  const lang = inspector.preferred_language || 'en';
  const classLabel = getClassificationLabel(finding.classification, lang);

  const subject = lang === 'ar'
    ? `⚠️ تذكير: نتيجة الفحص تستحق قريباً - ${finding.reference_id}`
    : `⚠️ Reminder: Inspection Finding Due Soon - ${finding.reference_id}`;

  const body = lang === 'ar'
    ? `
      <div dir="rtl" style="font-family: 'IBM Plex Sans Arabic', Arial, sans-serif;">
        <h2>تذكير بموعد استحقاق النتيجة</h2>
        <p>النتيجة <strong>${finding.reference_id}</strong> (${classLabel}) تستحق خلال <strong>${daysUntilDue} يوم</strong>.</p>
        <p><strong>الوصف:</strong> ${finding.description || 'غير متوفر'}</p>
        <p>يرجى اتخاذ الإجراء المطلوب قبل تاريخ الاستحقاق.</p>
      </div>
    `
    : `
      <div style="font-family: Arial, sans-serif;">
        <h2>Finding Due Date Reminder</h2>
        <p>Finding <strong>${finding.reference_id}</strong> (${classLabel}) is due in <strong>${daysUntilDue} days</strong>.</p>
        <p><strong>Description:</strong> ${finding.description || 'N/A'}</p>
        <p>Please take the required action before the due date.</p>
      </div>
    `;

  await sendEmailNotification(inspector.email, subject, body);

  if (inspector.phone) {
    const whatsappMsg = lang === 'ar'
      ? `⚠️ تذكير: النتيجة ${finding.reference_id} تستحق خلال ${daysUntilDue} يوم. يرجى اتخاذ الإجراء.`
      : `⚠️ Reminder: Finding ${finding.reference_id} is due in ${daysUntilDue} days. Please take action.`;
    await sendWhatsAppNotification(inspector.phone, whatsappMsg);
  }
}

async function sendEscalationNotifications(
  supabaseClient: any,
  finding: Finding,
  level: number,
  daysOverdue: number,
  managers: HSSEManager[]
): Promise<void> {
  const levelEmoji = level >= 2 ? '🚨' : '⚠️';
  const levelText = level >= 2 ? 'CRITICAL' : 'ESCALATED';

  for (const manager of managers) {
    const lang = manager.preferred_language || 'en';
    const classLabel = getClassificationLabel(finding.classification, lang);

    const subject = lang === 'ar'
      ? `${levelEmoji} تصعيد المستوى ${level}: نتيجة فحص متأخرة - ${finding.reference_id}`
      : `${levelEmoji} Level ${level} Escalation: Overdue Finding - ${finding.reference_id}`;

    const body = lang === 'ar'
      ? `
        <div dir="rtl" style="font-family: 'IBM Plex Sans Arabic', Arial, sans-serif;">
          <h2 style="color: ${level >= 2 ? '#dc2626' : '#f59e0b'};">تصعيد المستوى ${level}</h2>
          <p>النتيجة <strong>${finding.reference_id}</strong> (${classLabel}) متأخرة بـ <strong>${daysOverdue} يوم</strong>.</p>
          <p><strong>الوصف:</strong> ${finding.description || 'غير متوفر'}</p>
          <p>يتطلب هذا الأمر اهتمامك الفوري.</p>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif;">
          <h2 style="color: ${level >= 2 ? '#dc2626' : '#f59e0b'};">Level ${level} Escalation</h2>
          <p>Finding <strong>${finding.reference_id}</strong> (${classLabel}) is <strong>${daysOverdue} days overdue</strong>.</p>
          <p><strong>Description:</strong> ${finding.description || 'N/A'}</p>
          <p>This requires your immediate attention.</p>
        </div>
      `;

    await sendEmailNotification(manager.email, subject, body);

    if (manager.phone) {
      const whatsappMsg = lang === 'ar'
        ? `${levelEmoji} تصعيد L${level}: النتيجة ${finding.reference_id} متأخرة ${daysOverdue} يوم. يتطلب إجراء فوري.`
        : `${levelEmoji} L${level} Escalation: Finding ${finding.reference_id} is ${daysOverdue} days overdue. Immediate action required.`;
      await sendWhatsAppNotification(manager.phone, whatsappMsg);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting finding SLA escalation check...');

    // Get all SLA configs grouped by tenant
    const { data: slaConfigs, error: configError } = await supabaseClient
      .from('finding_sla_configs')
      .select('*')
      .is('deleted_at', null);

    if (configError) {
      console.error('Error fetching SLA configs:', configError);
    }

    // Create lookup map for configs
    const configMap = new Map<string, Map<string, FindingSLAConfig>>();
    for (const config of slaConfigs || []) {
      if (!configMap.has(config.tenant_id)) {
        configMap.set(config.tenant_id, new Map());
      }
      configMap.get(config.tenant_id)!.set(config.classification, config);
    }

    // Default SLA values if no config exists
    const defaultSLA: Record<string, { warning: number; escalation: number; secondEscalation: number }> = {
      critical_nc: { warning: 1, escalation: 1, secondEscalation: 2 },
      major_nc: { warning: 2, escalation: 2, secondEscalation: 4 },
      minor_nc: { warning: 3, escalation: 3, secondEscalation: 7 },
      observation: { warning: 5, escalation: 5, secondEscalation: 10 },
    };

    // Fetch open findings with due dates
    const { data: findings, error: findingsError } = await supabaseClient
      .from('area_inspection_findings')
      .select(`
        id,
        reference_id,
        classification,
        description,
        status,
        due_date,
        escalation_level,
        warning_sent_at,
        last_escalated_at,
        tenant_id,
        session_id,
        created_by
      `)
      .is('deleted_at', null)
      .not('status', 'in', '("closed","resolved")')
      .not('due_date', 'is', null);

    if (findingsError) {
      console.error('Error fetching findings:', findingsError);
      throw findingsError;
    }

    console.log(`Found ${findings?.length || 0} open findings to check`);

    let warningsSent = 0;
    let escalationsSent = 0;

    const now = new Date();

    for (const finding of findings || []) {
      const dueDate = new Date(finding.due_date);
      const diffMs = dueDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      // Get SLA config for this finding
      const tenantConfigs = configMap.get(finding.tenant_id);
      const config = tenantConfigs?.get(finding.classification);
      const defaultConfig = defaultSLA[finding.classification] || defaultSLA.observation;

      const warningDays = config?.warning_days_before ?? defaultConfig.warning;
      const escalationDays = config?.escalation_days_after ?? defaultConfig.escalation;
      const secondEscalationDays = config?.second_escalation_days_after ?? defaultConfig.secondEscalation;

      // Check if warning needed (approaching due date)
      if (diffDays > 0 && diffDays <= warningDays && !finding.warning_sent_at) {
        // Get inspector info
        const { data: inspector } = await supabaseClient
          .from('profiles')
          .select('email, full_name, phone, preferred_language')
          .eq('id', finding.created_by)
          .single();

        if (inspector) {
          await sendWarningNotifications(supabaseClient, finding, diffDays, inspector);

          // Update warning_sent_at
          await supabaseClient
            .from('area_inspection_findings')
            .update({ warning_sent_at: new Date().toISOString() })
            .eq('id', finding.id);

          warningsSent++;
          console.log(`Warning sent for finding ${finding.reference_id}`);
        }
      }

      // Check if escalation needed (overdue)
      if (diffDays < 0) {
        const daysOverdue = Math.abs(diffDays);
        let newEscalationLevel = finding.escalation_level || 0;

        // Determine escalation level
        if (daysOverdue >= secondEscalationDays && newEscalationLevel < 2) {
          newEscalationLevel = 2;
        } else if (daysOverdue >= escalationDays && newEscalationLevel < 1) {
          newEscalationLevel = 1;
        }

        // If escalation level increased
        if (newEscalationLevel > (finding.escalation_level || 0)) {
          // Get HSSE managers for this tenant
          const { data: managers } = await supabaseClient
            .from('profiles')
            .select('id, email, full_name, phone, preferred_language')
            .eq('tenant_id', finding.tenant_id)
            .in('role', ['hsse_manager', 'admin']);

          if (managers && managers.length > 0) {
            await sendEscalationNotifications(
              supabaseClient,
              finding,
              newEscalationLevel,
              daysOverdue,
              managers
            );

            // Update escalation level
            await supabaseClient
              .from('area_inspection_findings')
              .update({
                escalation_level: newEscalationLevel,
                last_escalated_at: new Date().toISOString(),
                escalation_notes: `Auto-escalated to Level ${newEscalationLevel} - ${daysOverdue} days overdue`,
              })
              .eq('id', finding.id);

            escalationsSent++;
            console.log(`Escalation L${newEscalationLevel} sent for finding ${finding.reference_id}`);
          }
        }
      }
    }

    console.log(`Finding SLA check complete. Warnings: ${warningsSent}, Escalations: ${escalationsSent}`);

    return new Response(
      JSON.stringify({
        success: true,
        warningsSent,
        escalationsSent,
        findingsChecked: findings?.length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in finding SLA escalation:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
