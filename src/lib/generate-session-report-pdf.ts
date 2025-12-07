import { generatePDFFromElement, createPDFRenderContainer, removePDFRenderContainer } from './pdf-utils';
import { fetchDocumentSettings } from '@/hooks/use-document-branding';
import { format } from 'date-fns';

interface SessionReportData {
  session: {
    reference_id: string | null;
    period: string;
    status: string;
    template?: { name: string; name_ar?: string | null };
    site?: { name: string };
    inspector?: { full_name: string };
    started_at: string | null;
    completed_at: string | null;
    compliance_percentage: number | null;
    total_assets?: number;
    passed_count?: number;
    failed_count?: number;
    not_accessible_count?: number;
  };
  responses?: Array<{
    template_item_id: string;
    result: string | null;
    notes?: string | null;
    template_item?: { question: string; question_ar?: string | null };
  }>;
  findings?: Array<{
    reference_id: string;
    classification: string;
    risk_level?: string | null;
    status?: string | null;
    description?: string | null;
  }>;
  actions?: Array<{
    title: string;
    status: string;
    priority?: string | null;
    due_date?: string | null;
    assigned_user?: { full_name: string } | null;
  }>;
  tenantId: string;
  tenantName?: string;
  language?: 'en' | 'ar';
}

export async function generateSessionReportPDF(data: SessionReportData): Promise<void> {
  const { session, responses = [], findings = [], actions = [], tenantId, tenantName = 'Organization', language = 'en' } = data;
  const isRTL = language === 'ar';
  
  // Fetch document branding settings
  const settings = await fetchDocumentSettings(tenantId);
  
  const container = createPDFRenderContainer();
  container.style.direction = isRTL ? 'rtl' : 'ltr';
  
  // Build HTML content
  const headerHtml = settings?.showLogo ? `
    <div style="display: flex; justify-content: ${settings.headerLogoPosition === 'center' ? 'center' : settings.headerLogoPosition === 'right' ? 'flex-end' : 'flex-start'}; margin-bottom: 16px;">
    </div>
  ` : '';
  
  const primaryText = settings?.headerTextPrimary || tenantName;
  const secondaryText = settings?.headerTextSecondary || 'Inspection Report';
  
  const statsHtml = `
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <tr>
        <td style="padding: 12px; background: #f5f5f5; border: 1px solid #ddd; text-align: center; width: 25%;">
          <div style="font-size: 24px; font-weight: bold; color: #2563eb;">${session.total_assets || 0}</div>
          <div style="font-size: 12px; color: #666;">${isRTL ? 'الإجمالي' : 'Total Items'}</div>
        </td>
        <td style="padding: 12px; background: #f5f5f5; border: 1px solid #ddd; text-align: center; width: 25%;">
          <div style="font-size: 24px; font-weight: bold; color: #16a34a;">${session.passed_count || 0}</div>
          <div style="font-size: 12px; color: #666;">${isRTL ? 'ناجح' : 'Passed'}</div>
        </td>
        <td style="padding: 12px; background: #f5f5f5; border: 1px solid #ddd; text-align: center; width: 25%;">
          <div style="font-size: 24px; font-weight: bold; color: #dc2626;">${session.failed_count || 0}</div>
          <div style="font-size: 12px; color: #666;">${isRTL ? 'فاشل' : 'Failed'}</div>
        </td>
        <td style="padding: 12px; background: #f5f5f5; border: 1px solid #ddd; text-align: center; width: 25%;">
          <div style="font-size: 24px; font-weight: bold; color: #2563eb;">${session.compliance_percentage?.toFixed(1) || 0}%</div>
          <div style="font-size: 12px; color: #666;">${isRTL ? 'الامتثال' : 'Compliance'}</div>
        </td>
      </tr>
    </table>
  `;
  
  const responsesHtml = responses.length > 0 ? `
    <h3 style="margin-top: 24px; margin-bottom: 12px; font-size: 16px;">${isRTL ? 'الاستجابات' : 'Checklist Responses'}</h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
      <thead>
        <tr style="background: #f5f5f5;">
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${isRTL ? 'right' : 'left'};">#</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${isRTL ? 'right' : 'left'};">${isRTL ? 'السؤال' : 'Question'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">${isRTL ? 'النتيجة' : 'Result'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${isRTL ? 'right' : 'left'};">${isRTL ? 'ملاحظات' : 'Notes'}</th>
        </tr>
      </thead>
      <tbody>
        ${responses.map((r, i) => `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${i + 1}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${isRTL && r.template_item?.question_ar ? r.template_item.question_ar : r.template_item?.question || '-'}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
              <span style="padding: 2px 8px; border-radius: 4px; font-size: 11px; background: ${r.result === 'pass' ? '#dcfce7' : r.result === 'fail' ? '#fee2e2' : '#f5f5f5'}; color: ${r.result === 'pass' ? '#166534' : r.result === 'fail' ? '#991b1b' : '#666'};">
                ${r.result || 'N/A'}
              </span>
            </td>
            <td style="padding: 8px; border: 1px solid #ddd;">${r.notes || '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '';
  
  const findingsHtml = findings.length > 0 ? `
    <h3 style="margin-top: 24px; margin-bottom: 12px; font-size: 16px;">${isRTL ? 'النتائج' : 'Findings'}</h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
      <thead>
        <tr style="background: #f5f5f5;">
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${isRTL ? 'right' : 'left'};">${isRTL ? 'الرقم المرجعي' : 'Reference'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${isRTL ? 'right' : 'left'};">${isRTL ? 'التصنيف' : 'Classification'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${isRTL ? 'right' : 'left'};">${isRTL ? 'المخاطر' : 'Risk'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${isRTL ? 'right' : 'left'};">${isRTL ? 'الحالة' : 'Status'}</th>
        </tr>
      </thead>
      <tbody>
        ${findings.map((f) => `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${f.reference_id}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${f.classification}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${f.risk_level || '-'}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${f.status || 'open'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '';

  const actionsHtml = actions.length > 0 ? `
    <h3 style="margin-top: 24px; margin-bottom: 12px; font-size: 16px;">${isRTL ? 'الإجراءات التصحيحية' : 'Corrective Actions'}</h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
      <thead>
        <tr style="background: #f5f5f5;">
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${isRTL ? 'right' : 'left'};">${isRTL ? 'العنوان' : 'Title'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${isRTL ? 'right' : 'left'};">${isRTL ? 'الحالة' : 'Status'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${isRTL ? 'right' : 'left'};">${isRTL ? 'الأولوية' : 'Priority'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${isRTL ? 'right' : 'left'};">${isRTL ? 'المسؤول' : 'Assigned To'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${isRTL ? 'right' : 'left'};">${isRTL ? 'تاريخ الاستحقاق' : 'Due Date'}</th>
        </tr>
      </thead>
      <tbody>
        ${actions.map((a) => `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${a.title}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              <span style="padding: 2px 8px; border-radius: 4px; font-size: 11px; background: ${a.status === 'verified' || a.status === 'closed' ? '#dcfce7' : a.status === 'completed' ? '#fef3c7' : '#e2e8f0'}; color: ${a.status === 'verified' || a.status === 'closed' ? '#166534' : a.status === 'completed' ? '#92400e' : '#475569'};">
                ${a.status}
              </span>
            </td>
            <td style="padding: 8px; border: 1px solid #ddd;">${a.priority || '-'}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${a.assigned_user?.full_name || '-'}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${a.due_date ? format(new Date(a.due_date), 'PP') : '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '';
  
  const footerHtml = settings?.showPageNumbers || settings?.showDatePrinted ? `
    <div style="margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 10px; color: #666; display: flex; justify-content: space-between;">
      <span>${settings?.footerText || ''}</span>
      <span>${settings?.showDatePrinted ? format(new Date(), 'PPP') : ''}</span>
    </div>
  ` : '';
  
  container.innerHTML = `
    <div style="font-family: 'Rubik', Arial, sans-serif; color: #333;">
      ${headerHtml}
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="margin: 0; font-size: 20px; font-weight: bold;">${primaryText}</h1>
        <p style="margin: 4px 0 0; font-size: 14px; color: #666;">${secondaryText}</p>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9fafb; font-weight: 500; width: 30%;">${isRTL ? 'الرقم المرجعي' : 'Reference ID'}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${session.reference_id || '-'}</td>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9fafb; font-weight: 500; width: 30%;">${isRTL ? 'الفترة' : 'Period'}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${session.period}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9fafb; font-weight: 500;">${isRTL ? 'القالب' : 'Template'}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${isRTL && session.template?.name_ar ? session.template.name_ar : session.template?.name || '-'}</td>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9fafb; font-weight: 500;">${isRTL ? 'الموقع' : 'Site'}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${session.site?.name || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9fafb; font-weight: 500;">${isRTL ? 'المفتش' : 'Inspector'}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${session.inspector?.full_name || '-'}</td>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9fafb; font-weight: 500;">${isRTL ? 'الحالة' : 'Status'}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${session.status}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9fafb; font-weight: 500;">${isRTL ? 'تاريخ البدء' : 'Started'}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${session.started_at ? format(new Date(session.started_at), 'PPp') : '-'}</td>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9fafb; font-weight: 500;">${isRTL ? 'تاريخ الإكمال' : 'Completed'}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${session.completed_at ? format(new Date(session.completed_at), 'PPp') : '-'}</td>
        </tr>
      </table>
      
      ${statsHtml}
      ${responsesHtml}
      ${findingsHtml}
      ${actionsHtml}
      ${footerHtml}
    </div>
  `;
  
  try {
    await generatePDFFromElement(container, {
      filename: `inspection-report-${session.reference_id || 'draft'}.pdf`,
      margin: 15,
      quality: 2,
    });
  } finally {
    removePDFRenderContainer(container);
  }
}
