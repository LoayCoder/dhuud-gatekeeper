/**
 * Enhanced PDF Generator for Area Inspection Sessions
 * Includes photos, document branding, and formal layout
 */

import { 
  generateBrandedPDFFromElement, 
  createPDFRenderContainer, 
  removePDFRenderContainer,
  preloadImageWithDimensions 
} from './pdf-utils';
import { format } from 'date-fns';
import type { DocumentBrandingSettings } from '@/types/document-branding';
import type { SessionPhotoData } from '@/hooks/use-session-print-data';

interface AreaSessionReportData {
  session: {
    id: string;
    reference_id: string | null;
    period: string;
    status: string;
    template?: { name: string; name_ar?: string | null };
    site?: { name: string };
    inspector?: { full_name: string };
    started_at: string | null;
    completed_at: string | null;
    compliance_percentage: number | null;
    weather_conditions?: string | null;
    scope_notes?: string | null;
    attendees?: Array<{ name: string; role?: string }>;
  };
  templateItems: Array<{
    id: string;
    question: string;
    question_ar?: string | null;
    is_critical: boolean;
    sort_order: number;
  }>;
  responses: Array<{
    id: string;
    template_item_id: string;
    result: string | null;
    notes: string | null;
    response_value?: string | null;
  }>;
  photosByResponse: Map<string, SessionPhotoData[]>;
  findings: Array<{
    id: string;
    reference_id: string;
    classification: string;
    risk_level: string | null;
    status: string | null;
    description: string | null;
    recommendation: string | null;
  }>;
  actions: Array<{
    id: string;
    title: string;
    status: string;
    priority: string | null;
    due_date: string | null;
    assigned_user?: { full_name: string } | null;
  }>;
  brandingSettings: DocumentBrandingSettings | null;
  tenantName: string;
  logoUrl?: string | null;
  language: 'en' | 'ar';
}

// Calculate statistics from responses
function calculateStats(responses: AreaSessionReportData['responses']) {
  const total = responses.length;
  const passed = responses.filter(r => r.result === 'pass').length;
  const failed = responses.filter(r => r.result === 'fail').length;
  const na = responses.filter(r => r.result === 'na').length;
  const percentage = total > 0 ? Math.round((passed / (total - na)) * 100) || 0 : 0;
  
  return { total, passed, failed, na, percentage };
}

// Get result badge HTML
function getResultBadge(result: string | null, isRTL: boolean): string {
  const labels = {
    pass: isRTL ? 'ناجح' : 'PASS',
    fail: isRTL ? 'فاشل' : 'FAIL',
    na: isRTL ? 'غ/م' : 'N/A',
  };
  
  const colors = {
    pass: { bg: '#dcfce7', text: '#166534' },
    fail: { bg: '#fee2e2', text: '#991b1b' },
    na: { bg: '#f3f4f6', text: '#6b7280' },
  };
  
  const label = labels[result as keyof typeof labels] || (isRTL ? 'غير محدد' : 'Not Set');
  const color = colors[result as keyof typeof colors] || colors.na;
  
  return `<span style="padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; background: ${color.bg}; color: ${color.text}; display: inline-block;">${label}</span>`;
}

// Get status badge HTML
function getStatusBadge(status: string, isRTL: boolean): string {
  const colors: Record<string, { bg: string; text: string }> = {
    open: { bg: '#fee2e2', text: '#991b1b' },
    in_progress: { bg: '#fef3c7', text: '#92400e' },
    pending_verification: { bg: '#dbeafe', text: '#1e40af' },
    completed: { bg: '#d1fae5', text: '#065f46' },
    verified: { bg: '#dcfce7', text: '#166534' },
    closed: { bg: '#e2e8f0', text: '#475569' },
  };
  
  const color = colors[status] || colors.open;
  
  return `<span style="padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 500; background: ${color.bg}; color: ${color.text}; text-transform: uppercase;">${status.replace(/_/g, ' ')}</span>`;
}

// Generate photo thumbnails HTML
function getPhotoThumbnails(photos: SessionPhotoData[] | undefined): string {
  if (!photos || photos.length === 0) {
    return '<span style="color: #9ca3af; font-size: 11px;">—</span>';
  }
  
  return photos.map(photo => {
    if (photo.base64) {
      return `<img src="${photo.base64}" alt="${photo.caption || photo.file_name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #e5e7eb; margin: 2px;" />`;
    }
    return `<span style="width: 50px; height: 50px; display: inline-flex; align-items: center; justify-content: center; background: #f3f4f6; border-radius: 4px; font-size: 10px; color: #6b7280; margin: 2px;">📷</span>`;
  }).join('');
}

export async function generateAreaSessionPDF(data: AreaSessionReportData): Promise<void> {
  const {
    session,
    templateItems,
    responses,
    photosByResponse,
    findings,
    actions,
    brandingSettings,
    tenantName,
    logoUrl,
    language
  } = data;
  
  const isRTL = language === 'ar';
  const textAlign = isRTL ? 'right' : 'left';
  const stats = calculateStats(responses);
  
  // Preload logo
  let logoData = null;
  if (logoUrl && brandingSettings?.showLogo) {
    logoData = await preloadImageWithDimensions(logoUrl);
  }
  
  // Create response map
  const responseMap = new Map(responses.map(r => [r.template_item_id, r]));
  
  // Sort template items
  const sortedItems = [...templateItems].sort((a, b) => a.sort_order - b.sort_order);
  
  // Create render container
  const container = createPDFRenderContainer();
  container.style.direction = isRTL ? 'rtl' : 'ltr';
  
  // Build HTML content
  const primaryText = brandingSettings?.headerTextPrimary || tenantName;
  const secondaryText = brandingSettings?.headerTextSecondary || (isRTL ? 'تقرير التفتيش الميداني' : 'Area Inspection Report');
  
  // Session metadata table
  const metadataHtml = `
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600; width: 20%;">${isRTL ? 'الرقم المرجعي' : 'Reference ID'}</td>
        <td style="padding: 8px; border: 1px solid #ddd; width: 30%;">${session.reference_id || '—'}</td>
        <td style="padding: 8px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600; width: 20%;">${isRTL ? 'الفترة' : 'Period'}</td>
        <td style="padding: 8px; border: 1px solid #ddd; width: 30%;">${session.period}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600;">${isRTL ? 'القالب' : 'Template'}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${isRTL && session.template?.name_ar ? session.template.name_ar : session.template?.name || '—'}</td>
        <td style="padding: 8px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600;">${isRTL ? 'الموقع' : 'Site'}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${session.site?.name || '—'}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600;">${isRTL ? 'المفتش' : 'Inspector'}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${session.inspector?.full_name || '—'}</td>
        <td style="padding: 8px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600;">${isRTL ? 'الحالة' : 'Status'}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${getStatusBadge(session.status, isRTL)}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600;">${isRTL ? 'تاريخ البدء' : 'Started'}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${session.started_at ? format(new Date(session.started_at), 'PPp') : '—'}</td>
        <td style="padding: 8px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600;">${isRTL ? 'تاريخ الإكمال' : 'Completed'}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${session.completed_at ? format(new Date(session.completed_at), 'PPp') : '—'}</td>
      </tr>
      ${session.weather_conditions ? `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600;">${isRTL ? 'الطقس' : 'Weather'}</td>
          <td style="padding: 8px; border: 1px solid #ddd;" colspan="3">${session.weather_conditions}</td>
        </tr>
      ` : ''}
      ${session.scope_notes ? `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9fafb; font-weight: 600;">${isRTL ? 'نطاق التفتيش' : 'Scope Notes'}</td>
          <td style="padding: 8px; border: 1px solid #ddd;" colspan="3">${session.scope_notes}</td>
        </tr>
      ` : ''}
    </table>
  `;
  
  // Statistics cards
  const statsHtml = `
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <tr>
        <td style="padding: 16px; background: #eff6ff; border: 1px solid #bfdbfe; text-align: center; width: 20%; border-radius: 8px 0 0 8px;">
          <div style="font-size: 28px; font-weight: bold; color: #1d4ed8;">${stats.total}</div>
          <div style="font-size: 11px; color: #3b82f6; text-transform: uppercase; font-weight: 500;">${isRTL ? 'الإجمالي' : 'Total Items'}</div>
        </td>
        <td style="padding: 16px; background: #f0fdf4; border: 1px solid #bbf7d0; text-align: center; width: 20%;">
          <div style="font-size: 28px; font-weight: bold; color: #16a34a;">${stats.passed}</div>
          <div style="font-size: 11px; color: #22c55e; text-transform: uppercase; font-weight: 500;">${isRTL ? 'ناجح' : 'Passed'}</div>
        </td>
        <td style="padding: 16px; background: #fef2f2; border: 1px solid #fecaca; text-align: center; width: 20%;">
          <div style="font-size: 28px; font-weight: bold; color: #dc2626;">${stats.failed}</div>
          <div style="font-size: 11px; color: #ef4444; text-transform: uppercase; font-weight: 500;">${isRTL ? 'فاشل' : 'Failed'}</div>
        </td>
        <td style="padding: 16px; background: #f9fafb; border: 1px solid #e5e7eb; text-align: center; width: 20%;">
          <div style="font-size: 28px; font-weight: bold; color: #6b7280;">${stats.na}</div>
          <div style="font-size: 11px; color: #9ca3af; text-transform: uppercase; font-weight: 500;">${isRTL ? 'غ/م' : 'N/A'}</div>
        </td>
        <td style="padding: 16px; background: ${stats.percentage >= 80 ? '#f0fdf4' : stats.percentage >= 60 ? '#fefce8' : '#fef2f2'}; border: 1px solid ${stats.percentage >= 80 ? '#bbf7d0' : stats.percentage >= 60 ? '#fef08a' : '#fecaca'}; text-align: center; width: 20%; border-radius: 0 8px 8px 0;">
          <div style="font-size: 28px; font-weight: bold; color: ${stats.percentage >= 80 ? '#16a34a' : stats.percentage >= 60 ? '#ca8a04' : '#dc2626'};">${stats.percentage}%</div>
          <div style="font-size: 11px; color: ${stats.percentage >= 80 ? '#22c55e' : stats.percentage >= 60 ? '#eab308' : '#ef4444'}; text-transform: uppercase; font-weight: 500;">${isRTL ? 'الامتثال' : 'Compliance'}</div>
        </td>
      </tr>
    </table>
  `;
  
  // Checklist items table with photos
  const checklistHtml = `
    <h3 style="margin: 24px 0 12px; font-size: 15px; font-weight: 600; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
      ${isRTL ? 'بنود التفتيش' : 'Inspection Checklist'}
    </h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
      <thead>
        <tr style="background: #f3f4f6;">
          <th style="padding: 10px 8px; border: 1px solid #ddd; text-align: center; width: 5%;">#</th>
          <th style="padding: 10px 8px; border: 1px solid #ddd; text-align: ${textAlign}; width: 35%;">${isRTL ? 'البند / السؤال' : 'Question / Item'}</th>
          <th style="padding: 10px 8px; border: 1px solid #ddd; text-align: center; width: 10%;">${isRTL ? 'النتيجة' : 'Result'}</th>
          <th style="padding: 10px 8px; border: 1px solid #ddd; text-align: ${textAlign}; width: 25%;">${isRTL ? 'ملاحظات' : 'Notes'}</th>
          <th style="padding: 10px 8px; border: 1px solid #ddd; text-align: center; width: 25%;">${isRTL ? 'الدليل المصور' : 'Photo Evidence'}</th>
        </tr>
      </thead>
      <tbody>
        ${sortedItems.map((item, index) => {
          const response = responseMap.get(item.id);
          const photos = response ? photosByResponse.get(response.id) : undefined;
          const questionText = isRTL && item.question_ar ? item.question_ar : item.question;
          
          return `
            <tr style="background: ${index % 2 === 0 ? '#ffffff' : '#fafafa'};">
              <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: 500;">${index + 1}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">
                ${item.is_critical ? `<span style="background: #fee2e2; color: #991b1b; padding: 1px 6px; border-radius: 3px; font-size: 9px; font-weight: 600; margin-${isRTL ? 'left' : 'right'}: 4px;">⚠</span>` : ''}
                ${questionText}
              </td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
                ${getResultBadge(response?.result || null, isRTL)}
              </td>
              <td style="padding: 8px; border: 1px solid #ddd; font-size: 10px; color: #4b5563;">
                ${response?.notes || '<span style="color: #9ca3af;">—</span>'}
              </td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
                ${getPhotoThumbnails(photos)}
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
  
  // Findings section
  const findingsHtml = findings.length > 0 ? `
    <h3 style="margin: 28px 0 12px; font-size: 15px; font-weight: 600; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
      ${isRTL ? 'النتائج والملاحظات' : 'Findings'}
    </h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
      <thead>
        <tr style="background: #f3f4f6;">
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${textAlign};">${isRTL ? 'الرقم المرجعي' : 'Reference'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${textAlign};">${isRTL ? 'التصنيف' : 'Classification'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${textAlign};">${isRTL ? 'المخاطر' : 'Risk Level'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${textAlign};">${isRTL ? 'الحالة' : 'Status'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${textAlign};">${isRTL ? 'الوصف' : 'Description'}</th>
        </tr>
      </thead>
      <tbody>
        ${findings.map((f, i) => `
          <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#fafafa'};">
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: 500;">${f.reference_id}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${f.classification}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              <span style="padding: 2px 6px; border-radius: 3px; font-size: 10px; background: ${f.risk_level === 'high' ? '#fee2e2' : f.risk_level === 'medium' ? '#fef3c7' : '#dcfce7'}; color: ${f.risk_level === 'high' ? '#991b1b' : f.risk_level === 'medium' ? '#92400e' : '#166534'};">
                ${f.risk_level || '—'}
              </span>
            </td>
            <td style="padding: 8px; border: 1px solid #ddd;">${getStatusBadge(f.status || 'open', isRTL)}</td>
            <td style="padding: 8px; border: 1px solid #ddd; font-size: 10px;">${f.description || '—'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '';
  
  // Corrective actions section
  const actionsHtml = actions.length > 0 ? `
    <h3 style="margin: 28px 0 12px; font-size: 15px; font-weight: 600; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
      ${isRTL ? 'الإجراءات التصحيحية' : 'Corrective Actions'}
    </h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
      <thead>
        <tr style="background: #f3f4f6;">
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${textAlign};">${isRTL ? 'الإجراء' : 'Action'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${textAlign};">${isRTL ? 'الحالة' : 'Status'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${textAlign};">${isRTL ? 'الأولوية' : 'Priority'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${textAlign};">${isRTL ? 'المسؤول' : 'Assigned To'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${textAlign};">${isRTL ? 'تاريخ الاستحقاق' : 'Due Date'}</th>
        </tr>
      </thead>
      <tbody>
        ${actions.map((a, i) => `
          <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#fafafa'};">
            <td style="padding: 8px; border: 1px solid #ddd;">${a.title}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${getStatusBadge(a.status, isRTL)}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              <span style="padding: 2px 6px; border-radius: 3px; font-size: 10px; background: ${a.priority === 'critical' || a.priority === 'high' ? '#fee2e2' : a.priority === 'medium' ? '#fef3c7' : '#f3f4f6'}; color: ${a.priority === 'critical' || a.priority === 'high' ? '#991b1b' : a.priority === 'medium' ? '#92400e' : '#6b7280'};">
                ${a.priority || '—'}
              </span>
            </td>
            <td style="padding: 8px; border: 1px solid #ddd;">${a.assigned_user?.full_name || '—'}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${a.due_date ? format(new Date(a.due_date), 'PP') : '—'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '';
  
  // Attendees section
  const attendeesHtml = session.attendees && session.attendees.length > 0 ? `
    <h3 style="margin: 28px 0 12px; font-size: 15px; font-weight: 600; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
      ${isRTL ? 'الحضور' : 'Attendees'}
    </h3>
    <table style="width: 50%; border-collapse: collapse; font-size: 11px;">
      <thead>
        <tr style="background: #f3f4f6;">
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${textAlign};">${isRTL ? 'الاسم' : 'Name'}</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: ${textAlign};">${isRTL ? 'الدور' : 'Role'}</th>
        </tr>
      </thead>
      <tbody>
        ${session.attendees.map((att, i) => `
          <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#fafafa'};">
            <td style="padding: 8px; border: 1px solid #ddd;">${att.name}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${att.role || '—'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '';
  
  // Build full HTML
  container.innerHTML = `
    <div style="font-family: 'Rubik', 'Cairo', Arial, sans-serif; color: #1f2937; line-height: 1.5;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="margin: 0 0 4px; font-size: 22px; font-weight: 700; color: #111827;">${primaryText}</h1>
        <p style="margin: 0; font-size: 14px; color: #6b7280;">${secondaryText}</p>
      </div>
      
      ${metadataHtml}
      ${statsHtml}
      ${checklistHtml}
      ${findingsHtml}
      ${actionsHtml}
      ${attendeesHtml}
      
      <!-- Signature Area -->
      <div style="margin-top: 40px; display: flex; justify-content: space-between; gap: 40px;">
        <div style="flex: 1; border-top: 1px solid #d1d5db; padding-top: 8px; text-align: center;">
          <p style="margin: 0; font-size: 11px; color: #6b7280;">${isRTL ? 'توقيع المفتش' : 'Inspector Signature'}</p>
          <p style="margin: 4px 0 0; font-size: 12px; font-weight: 500;">${session.inspector?.full_name || ''}</p>
        </div>
        <div style="flex: 1; border-top: 1px solid #d1d5db; padding-top: 8px; text-align: center;">
          <p style="margin: 0; font-size: 11px; color: #6b7280;">${isRTL ? 'توقيع المسؤول' : 'Supervisor Signature'}</p>
        </div>
      </div>
    </div>
  `;
  
  try {
    await generateBrandedPDFFromElement(container, {
      filename: `area-inspection-${session.reference_id || 'draft'}.pdf`,
      margin: 12,
      quality: 2,
      header: {
        logoBase64: logoData?.base64 || undefined,
        logoWidth: logoData?.width,
        logoHeight: logoData?.height,
        logoPosition: brandingSettings?.headerLogoPosition || 'left',
        primaryText: primaryText,
        secondaryText: secondaryText,
        bgColor: brandingSettings?.headerBgColor || '#ffffff',
        textColor: brandingSettings?.headerTextColor || '#1f2937',
      },
      footer: {
        text: brandingSettings?.footerText || '',
        showPageNumbers: brandingSettings?.showPageNumbers ?? true,
        showDatePrinted: brandingSettings?.showDatePrinted ?? true,
        bgColor: brandingSettings?.footerBgColor || '#f9fafb',
        textColor: brandingSettings?.footerTextColor || '#6b7280',
      },
      watermark: {
        text: brandingSettings?.watermarkText || null,
        enabled: brandingSettings?.watermarkEnabled ?? false,
        opacity: brandingSettings?.watermarkOpacity ?? 15,
      },
      isRTL,
    });
  } finally {
    removePDFRenderContainer(container);
  }
}
