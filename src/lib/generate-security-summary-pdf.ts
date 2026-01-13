/**
 * Generate PDF summary report for security team performance
 */
import { format } from 'date-fns';
import { TeamSummaryData } from '@/hooks/use-security-reports';
import { 
  generateBrandedPDFFromElement, 
  createPDFRenderContainer, 
  removePDFRenderContainer,
  preloadImageWithDimensions,
  PDFBrandingOptions
} from './pdf-utils';

export interface SecuritySummaryPDFOptions {
  data: TeamSummaryData;
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
  isRTL?: boolean;
  language?: 'en' | 'ar';
}

const LABELS_EN = {
  title: 'Security Team Performance Report',
  period: 'Report Period',
  generatedOn: 'Generated on',
  executiveSummary: 'Executive Summary',
  activeGuards: 'Active Guards',
  avgScore: 'Avg. Performance Score',
  totalPatrols: 'Total Patrols',
  incidents: 'Incidents Reported',
  performanceDistribution: 'Performance Distribution',
  excellent: 'Excellent (90%+)',
  good: 'Good (80-89%)',
  average: 'Average (70-79%)',
  needsImprovement: 'Needs Improvement (<70%)',
  guards: 'guards',
  topPerformers: 'Top Performers',
  rank: '#',
  guardName: 'Guard Name',
  score: 'Score',
  patrols: 'Patrols',
  guardsNeedingAttention: 'Guards Needing Attention',
  attendanceOverview: 'Attendance Overview',
  totalRecords: 'Total Records',
  onTimeRate: 'On-Time Rate',
  lateArrivals: 'Late Arrivals',
  avgHours: 'Avg. Hours Worked',
  geofenceViolations: 'Geofence Violations',
  confidential: 'Confidential - For Management Use Only',
};

const LABELS_AR = {
  title: 'تقرير أداء فريق الأمن',
  period: 'فترة التقرير',
  generatedOn: 'تم إنشاؤه في',
  executiveSummary: 'الملخص التنفيذي',
  activeGuards: 'الحراس النشطون',
  avgScore: 'متوسط درجة الأداء',
  totalPatrols: 'إجمالي الدوريات',
  incidents: 'الحوادث المبلغ عنها',
  performanceDistribution: 'توزيع الأداء',
  excellent: 'ممتاز (90%+)',
  good: 'جيد (80-89%)',
  average: 'متوسط (70-79%)',
  needsImprovement: 'يحتاج تحسين (<70%)',
  guards: 'حارس',
  topPerformers: 'أفضل المؤدين',
  rank: '#',
  guardName: 'اسم الحارس',
  score: 'الدرجة',
  patrols: 'الدوريات',
  guardsNeedingAttention: 'الحراس الذين يحتاجون اهتمام',
  attendanceOverview: 'نظرة عامة على الحضور',
  totalRecords: 'إجمالي السجلات',
  onTimeRate: 'معدل الحضور في الوقت',
  lateArrivals: 'حالات التأخير',
  avgHours: 'متوسط ساعات العمل',
  geofenceViolations: 'انتهاكات النطاق الجغرافي',
  confidential: 'سري - للاستخدام الإداري فقط',
};

function getScoreColor(score: number): string {
  if (score >= 90) return '#22c55e';
  if (score >= 80) return '#3b82f6';
  if (score >= 70) return '#f59e0b';
  return '#ef4444';
}

export async function generateSecuritySummaryPDF(options: SecuritySummaryPDFOptions): Promise<void> {
  const { 
    data, 
    startDate, 
    endDate, 
    tenantName = 'Organization',
    logoUrl,
    branding,
    isRTL = false,
    language = 'en'
  } = options;
  
  const labels = language === 'ar' ? LABELS_AR : LABELS_EN;
  const dir = isRTL ? 'rtl' : 'ltr';
  const textAlign = isRTL ? 'right' : 'left';
  
  const container = createPDFRenderContainer();
  container.style.direction = dir;
  
  // Build HTML content
  container.innerHTML = `
    <div style="font-family: 'IBM Plex Sans Arabic', Arial, sans-serif; direction: ${dir}; text-align: ${textAlign};">
      <!-- Title Section -->
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="font-size: 24px; font-weight: bold; color: #1f2937; margin: 0 0 8px 0;">
          ${labels.title}
        </h1>
        <p style="font-size: 14px; color: #6b7280; margin: 0;">
          ${labels.period}: ${format(new Date(startDate), 'PP')} - ${format(new Date(endDate), 'PP')}
        </p>
        <p style="font-size: 12px; color: #9ca3af; margin: 4px 0 0 0;">
          ${labels.generatedOn}: ${format(new Date(), 'PPP')}
        </p>
      </div>
      
      <!-- Executive Summary -->
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 16px; font-weight: 600; color: #374151; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">
          ${labels.executiveSummary}
        </h2>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
          <div style="background: #f0f9ff; border-radius: 8px; padding: 16px; text-align: center;">
            <div style="font-size: 28px; font-weight: bold; color: #0284c7;">${data.activeGuards}</div>
            <div style="font-size: 12px; color: #6b7280;">${labels.activeGuards}</div>
          </div>
          <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; text-align: center;">
            <div style="font-size: 28px; font-weight: bold; color: ${getScoreColor(data.avgPerformanceScore)};">${data.avgPerformanceScore}%</div>
            <div style="font-size: 12px; color: #6b7280;">${labels.avgScore}</div>
          </div>
          <div style="background: #fefce8; border-radius: 8px; padding: 16px; text-align: center;">
            <div style="font-size: 28px; font-weight: bold; color: #ca8a04;">${data.totalPatrols}</div>
            <div style="font-size: 12px; color: #6b7280;">${labels.totalPatrols}</div>
          </div>
          <div style="background: #fef2f2; border-radius: 8px; padding: 16px; text-align: center;">
            <div style="font-size: 28px; font-weight: bold; color: #dc2626;">${data.totalIncidents}</div>
            <div style="font-size: 12px; color: #6b7280;">${labels.incidents}</div>
          </div>
        </div>
      </div>
      
      <!-- Performance Distribution -->
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 16px; font-weight: 600; color: #374151; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">
          ${labels.performanceDistribution}
        </h2>
        <div style="background: #f9fafb; border-radius: 8px; padding: 16px;">
          ${renderDistributionBar(labels.excellent, data.performanceDistribution.excellent, data.activeGuards, '#22c55e', labels.guards)}
          ${renderDistributionBar(labels.good, data.performanceDistribution.good, data.activeGuards, '#3b82f6', labels.guards)}
          ${renderDistributionBar(labels.average, data.performanceDistribution.average, data.activeGuards, '#f59e0b', labels.guards)}
          ${renderDistributionBar(labels.needsImprovement, data.performanceDistribution.needsImprovement, data.activeGuards, '#ef4444', labels.guards)}
        </div>
      </div>
      
      <!-- Top Performers -->
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 16px; font-weight: 600; color: #374151; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">
          ${labels.topPerformers}
        </h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 10px; text-align: ${textAlign}; border-bottom: 1px solid #e5e7eb;">${labels.rank}</th>
              <th style="padding: 10px; text-align: ${textAlign}; border-bottom: 1px solid #e5e7eb;">${labels.guardName}</th>
              <th style="padding: 10px; text-align: center; border-bottom: 1px solid #e5e7eb;">${labels.score}</th>
              <th style="padding: 10px; text-align: center; border-bottom: 1px solid #e5e7eb;">${labels.patrols}</th>
            </tr>
          </thead>
          <tbody>
            ${data.topPerformers.map((p, i) => `
              <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${i + 1}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">${p.guard_name}</td>
                <td style="padding: 10px; text-align: center; border-bottom: 1px solid #e5e7eb;">
                  <span style="color: ${getScoreColor(p.score)}; font-weight: 600;">${p.score}%</span>
                </td>
                <td style="padding: 10px; text-align: center; border-bottom: 1px solid #e5e7eb;">${p.patrols}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      ${data.needsAttention.length > 0 ? `
      <!-- Guards Needing Attention -->
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 16px; font-weight: 600; color: #dc2626; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #fecaca;">
          ${labels.guardsNeedingAttention}
        </h2>
        <div style="background: #fef2f2; border-radius: 8px; padding: 12px;">
          ${data.needsAttention.map(g => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #fecaca;">
              <span style="font-weight: 500;">${g.guard_name}</span>
              <span style="color: #dc2626; font-weight: 600;">${g.score}%</span>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
      
      <!-- Attendance Overview -->
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 16px; font-weight: 600; color: #374151; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">
          ${labels.attendanceOverview}
        </h2>
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px;">
          <div style="background: #f9fafb; border-radius: 8px; padding: 12px; text-align: center;">
            <div style="font-size: 20px; font-weight: bold; color: #374151;">${data.totalAttendanceRecords}</div>
            <div style="font-size: 11px; color: #6b7280;">${labels.totalRecords}</div>
          </div>
          <div style="background: #f9fafb; border-radius: 8px; padding: 12px; text-align: center;">
            <div style="font-size: 20px; font-weight: bold; color: #22c55e;">${Math.round(data.avgAttendanceRate)}%</div>
            <div style="font-size: 11px; color: #6b7280;">${labels.onTimeRate}</div>
          </div>
          <div style="background: #f9fafb; border-radius: 8px; padding: 12px; text-align: center;">
            <div style="font-size: 20px; font-weight: bold; color: #f59e0b;">${data.lateArrivals}</div>
            <div style="font-size: 11px; color: #6b7280;">${labels.lateArrivals}</div>
          </div>
          <div style="background: #f9fafb; border-radius: 8px; padding: 12px; text-align: center;">
            <div style="font-size: 20px; font-weight: bold; color: #0284c7;">${data.avgHoursWorked}h</div>
            <div style="font-size: 11px; color: #6b7280;">${labels.avgHours}</div>
          </div>
          <div style="background: #f9fafb; border-radius: 8px; padding: 12px; text-align: center;">
            <div style="font-size: 20px; font-weight: bold; color: #dc2626;">${data.geofenceViolations}</div>
            <div style="font-size: 11px; color: #6b7280;">${labels.geofenceViolations}</div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Preload logo if provided
  let logoData = null;
  if (logoUrl) {
    logoData = await preloadImageWithDimensions(logoUrl);
  }
  
  // Generate PDF with branding
  const pdfOptions: PDFBrandingOptions = {
    filename: `security-summary-${format(new Date(), 'yyyy-MM-dd')}.pdf`,
    header: {
      logoBase64: logoData?.base64,
      logoWidth: logoData?.width,
      logoHeight: logoData?.height,
      logoPosition: 'left',
      primaryText: tenantName,
      secondaryText: labels.title,
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

function renderDistributionBar(label: string, count: number, total: number, color: string, guardsLabel: string): string {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  const barWidth = Math.max(percentage, 2);
  
  return `
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
      <div style="width: 140px; font-size: 12px; color: #374151;">${label}</div>
      <div style="flex: 1; height: 20px; background: #e5e7eb; border-radius: 4px; overflow: hidden;">
        <div style="width: ${barWidth}%; height: 100%; background: ${color}; border-radius: 4px;"></div>
      </div>
      <div style="width: 80px; font-size: 12px; color: #6b7280; text-align: end;">${count} ${guardsLabel}</div>
    </div>
  `;
}
