/**
 * Generate individual guard performance PDF report
 */
import { format } from 'date-fns';
import { GuardReportData } from '@/hooks/use-security-reports';
import { 
  generateBrandedPDFFromElement, 
  createPDFRenderContainer, 
  removePDFRenderContainer,
  preloadImageWithDimensions,
  PDFBrandingOptions
} from './pdf-utils';

export interface GuardPerformancePDFOptions {
  data: GuardReportData;
  startDate: string;
  endDate: string;
  tenantName?: string;
  logoUrl?: string | null;
  branding?: {
    headerBgColor?: string;
    headerTextColor?: string;
    footerBgColor?: string;
    footerTextColor?: string;
    footerText?: string;
    watermarkText?: string | null;
    watermarkEnabled?: boolean;
  };
  sections?: {
    attendance?: boolean;
    shifts?: boolean;
    training?: boolean;
    incidents?: boolean;
  };
  isRTL?: boolean;
  language?: 'en' | 'ar';
}

const LABELS_EN = {
  title: 'Guard Performance Report',
  period: 'Report Period',
  generatedOn: 'Generated on',
  guardProfile: 'Guard Profile',
  employeeId: 'Employee ID',
  role: 'Role',
  department: 'Department',
  supervisor: 'Supervisor',
  overallPerformance: 'Overall Performance Score',
  rating: 'Rating',
  teamRank: 'Team Rank',
  metricsBreakdown: 'Metrics Breakdown',
  patrolCompletion: 'Patrol Completion',
  checkpointAccuracy: 'Checkpoint Accuracy',
  punctuality: 'Punctuality',
  incidentResponse: 'Incident Response',
  geofenceCompliance: 'Geofence Compliance',
  attendanceHistory: 'Attendance History',
  date: 'Date',
  shift: 'Shift',
  checkIn: 'Check In',
  checkOut: 'Check Out',
  hours: 'Hours',
  status: 'Status',
  shiftAssignments: 'Shift Assignments',
  acknowledged: 'Acknowledged',
  trainingStatus: 'Training Status',
  training: 'Training',
  expiry: 'Expiry',
  incidentsSummary: 'Incidents Summary',
  totalIncidents: 'Total Incidents Reported',
  resolutionRate: 'Resolution Rate',
  excellent: 'Excellent',
  good: 'Good',
  average: 'Average',
  needsImprovement: 'Needs Improvement',
  yes: 'Yes',
  no: 'No',
  expired: 'Expired',
  valid: 'Valid',
  confidential: 'Confidential - For Management Use Only',
  of: 'of',
};

const LABELS_AR = {
  title: 'تقرير أداء الحارس',
  period: 'فترة التقرير',
  generatedOn: 'تم إنشاؤه في',
  guardProfile: 'ملف الحارس',
  employeeId: 'رقم الموظف',
  role: 'الوظيفة',
  department: 'القسم',
  supervisor: 'المشرف',
  overallPerformance: 'درجة الأداء الإجمالية',
  rating: 'التقييم',
  teamRank: 'الترتيب في الفريق',
  metricsBreakdown: 'تفصيل المقاييس',
  patrolCompletion: 'إتمام الدوريات',
  checkpointAccuracy: 'دقة نقاط التفتيش',
  punctuality: 'الالتزام بالمواعيد',
  incidentResponse: 'الاستجابة للحوادث',
  geofenceCompliance: 'الالتزام بالنطاق الجغرافي',
  attendanceHistory: 'سجل الحضور',
  date: 'التاريخ',
  shift: 'الوردية',
  checkIn: 'الدخول',
  checkOut: 'الخروج',
  hours: 'الساعات',
  status: 'الحالة',
  shiftAssignments: 'تعيينات الورديات',
  acknowledged: 'تم التأكيد',
  trainingStatus: 'حالة التدريب',
  training: 'التدريب',
  expiry: 'انتهاء الصلاحية',
  incidentsSummary: 'ملخص الحوادث',
  totalIncidents: 'إجمالي الحوادث المبلغ عنها',
  resolutionRate: 'معدل الحل',
  excellent: 'ممتاز',
  good: 'جيد',
  average: 'متوسط',
  needsImprovement: 'يحتاج تحسين',
  yes: 'نعم',
  no: 'لا',
  expired: 'منتهي',
  valid: 'صالح',
  confidential: 'سري - للاستخدام الإداري فقط',
  of: 'من',
};

function getScoreColor(score: number): string {
  if (score >= 90) return '#22c55e';
  if (score >= 80) return '#3b82f6';
  if (score >= 70) return '#f59e0b';
  return '#ef4444';
}

function getRatingLabel(score: number, labels: typeof LABELS_EN): string {
  if (score >= 90) return labels.excellent;
  if (score >= 80) return labels.good;
  if (score >= 70) return labels.average;
  return labels.needsImprovement;
}

export async function generateGuardPerformancePDF(options: GuardPerformancePDFOptions): Promise<void> {
  const { 
    data, 
    startDate, 
    endDate, 
    tenantName = 'Organization',
    logoUrl,
    branding,
    sections = { attendance: true, shifts: true, training: true, incidents: true },
    isRTL = false,
    language = 'en'
  } = options;
  
  const labels = language === 'ar' ? LABELS_AR : LABELS_EN;
  const dir = isRTL ? 'rtl' : 'ltr';
  const textAlign = isRTL ? 'right' : 'left';
  
  const container = createPDFRenderContainer();
  container.style.direction = dir;
  
  const scoreColor = getScoreColor(data.performance.overall_score);
  const rating = getRatingLabel(data.performance.overall_score, labels);
  
  // Build HTML content
  container.innerHTML = `
    <div style="font-family: 'IBM Plex Sans Arabic', Arial, sans-serif; direction: ${dir}; text-align: ${textAlign};">
      <!-- Title Section -->
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="font-size: 22px; font-weight: bold; color: #1f2937; margin: 0 0 8px 0;">
          ${labels.title}
        </h1>
        <p style="font-size: 14px; color: #6b7280; margin: 0;">
          ${labels.period}: ${format(new Date(startDate), 'PP')} - ${format(new Date(endDate), 'PP')}
        </p>
      </div>
      
      <!-- Guard Profile -->
      <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <div style="width: 64px; height: 64px; border-radius: 50%; background: #e5e7eb; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: #6b7280;">
            ${data.guard_name.charAt(0)}
          </div>
          <div style="flex: 1;">
            <h2 style="font-size: 20px; font-weight: bold; color: #1f2937; margin: 0 0 4px 0;">${data.guard_name}</h2>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 13px;">
              <div><span style="color: #6b7280;">${labels.employeeId}:</span> <span style="font-weight: 500;">${data.employee_id || '-'}</span></div>
              <div><span style="color: #6b7280;">${labels.role}:</span> <span style="font-weight: 500;">${data.job_title || 'Security Officer'}</span></div>
              <div><span style="color: #6b7280;">${labels.department}:</span> <span style="font-weight: 500;">${data.department_name || '-'}</span></div>
              <div><span style="color: #6b7280;">${labels.supervisor}:</span> <span style="font-weight: 500;">${data.supervisor_name || '-'}</span></div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Overall Performance Score -->
      <div style="background: linear-gradient(135deg, ${scoreColor}15, ${scoreColor}05); border: 2px solid ${scoreColor}30; border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
        <h3 style="font-size: 14px; color: #6b7280; margin: 0 0 8px 0;">${labels.overallPerformance}</h3>
        <div style="font-size: 56px; font-weight: bold; color: ${scoreColor}; margin: 0 0 8px 0;">${data.performance.overall_score}%</div>
        <div style="display: flex; justify-content: center; gap: 24px; font-size: 13px;">
          <div><span style="color: #6b7280;">${labels.rating}:</span> <span style="font-weight: 600; color: ${scoreColor};">${rating}</span></div>
          <div><span style="color: #6b7280;">${labels.teamRank}:</span> <span style="font-weight: 600;">${data.performance.rank} ${labels.of} ${data.performance.totalGuards}</span></div>
        </div>
      </div>
      
      <!-- Metrics Breakdown -->
      <div style="margin-bottom: 24px;">
        <h3 style="font-size: 16px; font-weight: 600; color: #374151; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">
          ${labels.metricsBreakdown}
        </h3>
        <div style="background: #f9fafb; border-radius: 8px; padding: 16px;">
          ${renderMetricBar(labels.patrolCompletion, data.performance.patrol_completion_rate)}
          ${renderMetricBar(labels.checkpointAccuracy, data.performance.checkpoint_accuracy)}
          ${renderMetricBar(labels.punctuality, data.performance.punctuality_score)}
          ${renderMetricBar(labels.incidentResponse, data.performance.incident_response_rate)}
          ${renderMetricBar(labels.geofenceCompliance, data.performance.geofence_compliance)}
        </div>
      </div>
      
      ${sections.attendance && data.attendance.length > 0 ? `
      <!-- Attendance History -->
      <div style="margin-bottom: 24px;">
        <h3 style="font-size: 16px; font-weight: 600; color: #374151; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">
          ${labels.attendanceHistory}
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 8px; text-align: ${textAlign}; border-bottom: 1px solid #e5e7eb;">${labels.date}</th>
              <th style="padding: 8px; text-align: center; border-bottom: 1px solid #e5e7eb;">${labels.checkIn}</th>
              <th style="padding: 8px; text-align: center; border-bottom: 1px solid #e5e7eb;">${labels.checkOut}</th>
              <th style="padding: 8px; text-align: center; border-bottom: 1px solid #e5e7eb;">${labels.hours}</th>
              <th style="padding: 8px; text-align: center; border-bottom: 1px solid #e5e7eb;">${labels.status}</th>
            </tr>
          </thead>
          <tbody>
            ${data.attendance.slice(0, 10).map((a, i) => `
              <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${a.date ? format(new Date(a.date), 'PP') : '-'}</td>
                <td style="padding: 8px; text-align: center; border-bottom: 1px solid #e5e7eb;">${a.check_in || '-'}</td>
                <td style="padding: 8px; text-align: center; border-bottom: 1px solid #e5e7eb;">${a.check_out || '-'}</td>
                <td style="padding: 8px; text-align: center; border-bottom: 1px solid #e5e7eb;">${a.hours_worked ? `${a.hours_worked}h` : '-'}</td>
                <td style="padding: 8px; text-align: center; border-bottom: 1px solid #e5e7eb;">
                  <span style="display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; ${a.status === 'approved' || a.status === 'checked_out' ? 'background: #dcfce7; color: #166534;' : 'background: #fef3c7; color: #92400e;'}">
                    ${a.status}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
      
      ${sections.shifts && data.shifts.length > 0 ? `
      <!-- Shift Assignments -->
      <div style="margin-bottom: 24px;">
        <h3 style="font-size: 16px; font-weight: 600; color: #374151; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">
          ${labels.shiftAssignments}
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 8px; text-align: ${textAlign}; border-bottom: 1px solid #e5e7eb;">${labels.date}</th>
              <th style="padding: 8px; text-align: ${textAlign}; border-bottom: 1px solid #e5e7eb;">${labels.shift}</th>
              <th style="padding: 8px; text-align: center; border-bottom: 1px solid #e5e7eb;">${labels.acknowledged}</th>
            </tr>
          </thead>
          <tbody>
            ${data.shifts.map((s, i) => `
              <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${s.date ? format(new Date(s.date), 'PP') : '-'}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${s.shift_name} (${s.start_time} - ${s.end_time})</td>
                <td style="padding: 8px; text-align: center; border-bottom: 1px solid #e5e7eb;">
                  <span style="color: ${s.acknowledged ? '#22c55e' : '#f59e0b'};">${s.acknowledged ? labels.yes : labels.no}</span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
      
      ${sections.training && data.training.length > 0 ? `
      <!-- Training Status -->
      <div style="margin-bottom: 24px;">
        <h3 style="font-size: 16px; font-weight: 600; color: #374151; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">
          ${labels.trainingStatus}
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 8px; text-align: ${textAlign}; border-bottom: 1px solid #e5e7eb;">${labels.training}</th>
              <th style="padding: 8px; text-align: center; border-bottom: 1px solid #e5e7eb;">${labels.status}</th>
              <th style="padding: 8px; text-align: center; border-bottom: 1px solid #e5e7eb;">${labels.expiry}</th>
            </tr>
          </thead>
          <tbody>
            ${data.training.map((t, i) => `
              <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${t.name}</td>
                <td style="padding: 8px; text-align: center; border-bottom: 1px solid #e5e7eb;">
                  <span style="display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; ${t.status === 'completed' ? 'background: #dcfce7; color: #166534;' : 'background: #fef3c7; color: #92400e;'}">
                    ${t.status}
                  </span>
                </td>
                <td style="padding: 8px; text-align: center; border-bottom: 1px solid #e5e7eb;">
                  ${t.expiry_date ? `
                    <span style="color: ${t.is_expired ? '#dc2626' : '#22c55e'};">
                      ${format(new Date(t.expiry_date), 'PP')} (${t.is_expired ? labels.expired : labels.valid})
                    </span>
                  ` : '-'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
      
      ${sections.incidents ? `
      <!-- Incidents Summary -->
      <div style="margin-bottom: 24px;">
        <h3 style="font-size: 16px; font-weight: 600; color: #374151; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">
          ${labels.incidentsSummary}
        </h3>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
          <div style="background: #f9fafb; border-radius: 8px; padding: 16px; text-align: center;">
            <div style="font-size: 32px; font-weight: bold; color: #374151;">${data.incidentCount}</div>
            <div style="font-size: 12px; color: #6b7280;">${labels.totalIncidents}</div>
          </div>
          <div style="background: #f9fafb; border-radius: 8px; padding: 16px; text-align: center;">
            <div style="font-size: 32px; font-weight: bold; color: ${getScoreColor(data.incidentResolutionRate)};">${data.incidentResolutionRate}%</div>
            <div style="font-size: 12px; color: #6b7280;">${labels.resolutionRate}</div>
          </div>
        </div>
      </div>
      ` : ''}
    </div>
  `;
  
  // Preload logo if provided
  let logoData = null;
  if (logoUrl) {
    logoData = await preloadImageWithDimensions(logoUrl);
  }
  
  // Generate PDF with branding
  const pdfOptions: PDFBrandingOptions = {
    filename: `guard-report-${data.guard_name.replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`,
    header: {
      logoBase64: logoData?.base64,
      logoWidth: logoData?.width,
      logoHeight: logoData?.height,
      logoPosition: 'left',
      primaryText: tenantName,
      secondaryText: `${labels.title} - ${data.guard_name}`,
      bgColor: branding?.headerBgColor || '#ffffff',
      textColor: branding?.headerTextColor || '#1f2937',
    },
    footer: {
      text: branding?.footerText || labels.confidential,
      showPageNumbers: true,
      showDatePrinted: true,
      bgColor: branding?.footerBgColor || '#f3f4f6',
      textColor: branding?.footerTextColor || '#6b7280',
    },
    watermark: branding?.watermarkEnabled ? {
      text: branding?.watermarkText,
      enabled: true,
      opacity: 15,
    } : undefined,
    isRTL,
  };
  
  await generateBrandedPDFFromElement(container, pdfOptions);
  
  removePDFRenderContainer(container);
}

function renderMetricBar(label: string, value: number): string {
  const color = getScoreColor(value);
  
  return `
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
      <div style="width: 140px; font-size: 13px; color: #374151;">${label}</div>
      <div style="flex: 1; height: 24px; background: #e5e7eb; border-radius: 4px; overflow: hidden; position: relative;">
        <div style="width: ${value}%; height: 100%; background: ${color}; border-radius: 4px;"></div>
      </div>
      <div style="width: 50px; font-size: 14px; font-weight: 600; color: ${color}; text-align: end;">${value}%</div>
    </div>
  `;
}
