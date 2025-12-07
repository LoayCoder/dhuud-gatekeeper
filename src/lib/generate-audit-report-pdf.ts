import { generatePDFFromElement, createPDFRenderContainer, removePDFRenderContainer } from './pdf-utils';
import { fetchDocumentSettings } from '@/hooks/use-document-branding';
import { format } from 'date-fns';

interface AuditReportData {
  session: {
    reference_id: string | null;
    period: string;
    status: string;
    started_at: string | null;
    completed_at: string | null;
    scope_notes: string | null;
    attendees: { name: string; role?: string }[] | null;
    site?: { name: string };
    inspector?: { full_name: string };
  };
  template: {
    name: string;
    name_ar?: string | null;
    standard_reference: string | null;
    passing_score_percentage: number | null;
  } | null;
  progress: {
    percentage: number;
    weightedScore: number;
    maxScore: number;
    conforming: number;
    nonConforming: number;
    na: number;
    total: number;
    isPassing: boolean;
    hasBlockingNC: boolean;
  };
  ncCounts: {
    critical: number;
    major: number;
    minor: number;
    total: number;
  };
  items: Array<{
    id: string;
    clause_reference: string | null;
    question: string;
    question_ar?: string | null;
    scoring_weight: number;
  }>;
  responses: Array<{
    template_item_id: string;
    result: string | null;
    objective_evidence?: string | null;
    notes?: string | null;
  }>;
  findings?: Array<{
    reference_id: string;
    classification: string;
    risk_level?: string | null;
    status?: string | null;
    description?: string | null;
  }>;
  tenantId: string;
  tenantName?: string;
  language?: 'en' | 'ar';
}

export async function generateAuditReportPDF(data: AuditReportData): Promise<void> {
  const { 
    session, 
    template, 
    progress, 
    ncCounts, 
    items, 
    responses, 
    findings = [], 
    tenantId, 
    tenantName = 'Organization', 
    language = 'en' 
  } = data;
  
  const isRTL = language === 'ar';
  const settings = await fetchDocumentSettings(tenantId);
  
  const container = createPDFRenderContainer();
  container.style.direction = isRTL ? 'rtl' : 'ltr';
  
  // Create response map
  const responseMap = new Map(responses.map(r => [r.template_item_id, r]));
  
  // Build status badge style
  const getStatusStyle = () => {
    if (progress.hasBlockingNC) return 'background: #fee2e2; color: #991b1b;';
    if (progress.isPassing) return 'background: #dcfce7; color: #166534;';
    return 'background: #fef3c7; color: #92400e;';
  };
  
  const getStatusText = () => {
    if (progress.hasBlockingNC) return isRTL ? 'محظور - NC حرجة' : 'BLOCKED - Critical NC';
    if (progress.isPassing) return isRTL ? 'ناجح' : 'PASSED';
    return isRTL ? 'لم يجتز' : 'FAILED';
  };
  
  // Executive Summary
  const executiveSummaryHtml = `
    <div style="margin-bottom: 24px; padding: 16px; background: #f9fafb; border-radius: 8px;">
      <h2 style="margin: 0 0 12px; font-size: 16px; font-weight: bold;">${isRTL ? 'الملخص التنفيذي' : 'Executive Summary'}</h2>
      <div style="display: flex; gap: 16px; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 120px; text-align: center; padding: 12px; background: white; border-radius: 6px;">
          <div style="font-size: 28px; font-weight: bold; ${progress.isPassing ? 'color: #16a34a;' : 'color: #dc2626;'}">${progress.percentage.toFixed(1)}%</div>
          <div style="font-size: 12px; color: #666;">${isRTL ? 'درجة الامتثال' : 'Compliance Score'}</div>
        </div>
        <div style="flex: 1; min-width: 120px; text-align: center; padding: 12px; background: white; border-radius: 6px;">
          <div style="padding: 4px 12px; border-radius: 4px; display: inline-block; ${getStatusStyle()}">${getStatusText()}</div>
          <div style="font-size: 12px; color: #666; margin-top: 4px;">${isRTL ? 'الحالة' : 'Status'}</div>
        </div>
        <div style="flex: 1; min-width: 120px; text-align: center; padding: 12px; background: white; border-radius: 6px;">
          <div style="font-size: 28px; font-weight: bold; color: #dc2626;">${ncCounts.total}</div>
          <div style="font-size: 12px; color: #666;">${isRTL ? 'عدم المطابقة' : 'Non-Conformances'}</div>
        </div>
      </div>
    </div>
  `;
  
  // NC Summary
  const ncSummaryHtml = ncCounts.total > 0 ? `
    <div style="margin-bottom: 24px;">
      <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: bold;">${isRTL ? 'ملخص عدم المطابقة' : 'Non-Conformance Summary'}</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
        <tr>
          <td style="padding: 8px; background: #fee2e2; border: 1px solid #fecaca; text-align: center;">
            <strong style="color: #991b1b;">${ncCounts.critical}</strong>
            <div style="font-size: 10px; color: #991b1b;">${isRTL ? 'حرجة' : 'Critical'}</div>
          </td>
          <td style="padding: 8px; background: #ffedd5; border: 1px solid #fed7aa; text-align: center;">
            <strong style="color: #9a3412;">${ncCounts.major}</strong>
            <div style="font-size: 10px; color: #9a3412;">${isRTL ? 'رئيسية' : 'Major'}</div>
          </td>
          <td style="padding: 8px; background: #fef9c3; border: 1px solid #fde047; text-align: center;">
            <strong style="color: #854d0e;">${ncCounts.minor}</strong>
            <div style="font-size: 10px; color: #854d0e;">${isRTL ? 'ثانوية' : 'Minor'}</div>
          </td>
        </tr>
      </table>
    </div>
  ` : '';
  
  // Detailed Findings Table
  const detailedFindingsHtml = `
    <h3 style="margin: 24px 0 12px; font-size: 14px; font-weight: bold;">${isRTL ? 'نتائج التدقيق التفصيلية' : 'Detailed Audit Findings'}</h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
      <thead>
        <tr style="background: #f5f5f5;">
          <th style="padding: 6px; border: 1px solid #ddd; text-align: ${isRTL ? 'right' : 'left'}; width: 60px;">${isRTL ? 'البند' : 'Clause'}</th>
          <th style="padding: 6px; border: 1px solid #ddd; text-align: ${isRTL ? 'right' : 'left'};">${isRTL ? 'المتطلب' : 'Requirement'}</th>
          <th style="padding: 6px; border: 1px solid #ddd; text-align: center; width: 80px;">${isRTL ? 'النتيجة' : 'Finding'}</th>
          <th style="padding: 6px; border: 1px solid #ddd; text-align: ${isRTL ? 'right' : 'left'};">${isRTL ? 'الدليل' : 'Evidence'}</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item) => {
          const response = responseMap.get(item.id);
          const resultText = response?.result === 'conforming' ? (isRTL ? 'مطابق' : 'C') : 
                            response?.result === 'non_conforming' ? (isRTL ? 'غير مطابق' : 'NC') : 
                            response?.result === 'na' ? 'N/A' : '-';
          const resultBg = response?.result === 'conforming' ? '#dcfce7' : 
                          response?.result === 'non_conforming' ? '#fee2e2' : '#f5f5f5';
          
          return `
            <tr>
              <td style="padding: 6px; border: 1px solid #ddd; font-family: monospace; font-size: 10px;">${item.clause_reference || '-'}</td>
              <td style="padding: 6px; border: 1px solid #ddd;">${isRTL && item.question_ar ? item.question_ar : item.question}</td>
              <td style="padding: 6px; border: 1px solid #ddd; text-align: center; background: ${resultBg};">${resultText}</td>
              <td style="padding: 6px; border: 1px solid #ddd; font-size: 10px;">${response?.objective_evidence || response?.notes || '-'}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
  
  // Attendees list
  const attendees = session.attendees || [];
  const attendeesHtml = attendees.length > 0 ? `
    <p style="font-size: 12px; margin: 4px 0;">
      <strong>${isRTL ? 'فريق التدقيق:' : 'Audit Team:'}</strong> 
      ${attendees.map((a: { name: string; role?: string }) => `${a.name}${a.role ? ` (${a.role})` : ''}`).join(', ')}
    </p>
  ` : '';
  
  // Signature Section
  const signatureHtml = `
    <div style="margin-top: 40px; page-break-inside: avoid;">
      <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: bold;">${isRTL ? 'التوقيعات' : 'Signatures'}</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 24px; border: 1px solid #ddd; width: 50%; vertical-align: top;">
            <div style="font-weight: bold; margin-bottom: 8px;">${isRTL ? 'المدقق الرئيسي' : 'Lead Auditor'}</div>
            <div style="height: 40px; border-bottom: 1px solid #999; margin-bottom: 8px;"></div>
            <div style="font-size: 11px; color: #666;">${session.inspector?.full_name || ''}</div>
            <div style="font-size: 11px; color: #666;">${isRTL ? 'التاريخ:' : 'Date:'} _______________</div>
          </td>
          <td style="padding: 24px; border: 1px solid #ddd; width: 50%; vertical-align: top;">
            <div style="font-weight: bold; margin-bottom: 8px;">${isRTL ? 'إقرار الجهة المدققة' : 'Auditee Acknowledgment'}</div>
            <div style="height: 40px; border-bottom: 1px solid #999; margin-bottom: 8px;"></div>
            <div style="font-size: 11px; color: #666;">${isRTL ? 'الاسم:' : 'Name:'} _______________</div>
            <div style="font-size: 11px; color: #666;">${isRTL ? 'التاريخ:' : 'Date:'} _______________</div>
          </td>
        </tr>
      </table>
    </div>
  `;
  
  // Footer
  const footerHtml = settings?.showPageNumbers || settings?.showDatePrinted ? `
    <div style="margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 10px; color: #666; display: flex; justify-content: space-between;">
      <span>${settings?.footerText || ''}</span>
      <span>${settings?.showDatePrinted ? format(new Date(), 'PPP') : ''}</span>
    </div>
  ` : '';
  
  container.innerHTML = `
    <div style="font-family: 'Rubik', Arial, sans-serif; color: #333;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="margin: 0; font-size: 20px; font-weight: bold;">${tenantName}</h1>
        <p style="margin: 4px 0 0; font-size: 14px; color: #666;">${isRTL ? 'تقرير التدقيق' : 'Audit Report'}</p>
        ${template?.standard_reference ? `<p style="margin: 4px 0 0; font-size: 12px;"><strong>${template.standard_reference}</strong></p>` : ''}
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
        <tr>
          <td style="padding: 6px; border: 1px solid #ddd; background: #f9fafb; font-weight: 500; width: 25%;">${isRTL ? 'الرقم المرجعي' : 'Reference ID'}</td>
          <td style="padding: 6px; border: 1px solid #ddd;">${session.reference_id || '-'}</td>
          <td style="padding: 6px; border: 1px solid #ddd; background: #f9fafb; font-weight: 500; width: 25%;">${isRTL ? 'الفترة' : 'Period'}</td>
          <td style="padding: 6px; border: 1px solid #ddd;">${session.period}</td>
        </tr>
        <tr>
          <td style="padding: 6px; border: 1px solid #ddd; background: #f9fafb; font-weight: 500;">${isRTL ? 'المعيار' : 'Standard'}</td>
          <td style="padding: 6px; border: 1px solid #ddd;">${template?.standard_reference || '-'}</td>
          <td style="padding: 6px; border: 1px solid #ddd; background: #f9fafb; font-weight: 500;">${isRTL ? 'الموقع' : 'Site'}</td>
          <td style="padding: 6px; border: 1px solid #ddd;">${session.site?.name || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 6px; border: 1px solid #ddd; background: #f9fafb; font-weight: 500;">${isRTL ? 'المدقق الرئيسي' : 'Lead Auditor'}</td>
          <td style="padding: 6px; border: 1px solid #ddd;">${session.inspector?.full_name || '-'}</td>
          <td style="padding: 6px; border: 1px solid #ddd; background: #f9fafb; font-weight: 500;">${isRTL ? 'تاريخ البدء' : 'Start Date'}</td>
          <td style="padding: 6px; border: 1px solid #ddd;">${session.started_at ? format(new Date(session.started_at), 'PPP') : '-'}</td>
        </tr>
      </table>
      
      ${attendeesHtml}
      ${session.scope_notes ? `<p style="font-size: 12px; margin: 8px 0;"><strong>${isRTL ? 'النطاق:' : 'Scope:'}</strong> ${session.scope_notes}</p>` : ''}
      
      ${executiveSummaryHtml}
      ${ncSummaryHtml}
      ${detailedFindingsHtml}
      ${signatureHtml}
      ${footerHtml}
    </div>
  `;
  
  try {
    await generatePDFFromElement(container, {
      filename: `audit-report-${session.reference_id || 'draft'}.pdf`,
      margin: 15,
      quality: 2,
    });
  } finally {
    removePDFRenderContainer(container);
  }
}
