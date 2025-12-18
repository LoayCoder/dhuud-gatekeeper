import { TFunction } from 'i18next';
import { format } from 'date-fns';

type PDFLanguage = 'en' | 'ar' | 'ur' | 'fil';

interface PermitData {
  id: string;
  reference_id: string;
  status: string;
  job_description?: string | null;
  location_details?: string | null;
  planned_start_time: string;
  planned_end_time: string;
  actual_start_time?: string | null;
  actual_end_time?: string | null;
  gps_lat?: number | null;
  gps_lng?: number | null;
  emergency_contact_name?: string | null;
  emergency_contact_number?: string | null;
  simops_status?: string | null;
  permit_type?: { code: string; name: string } | null;
  project?: { name: string; code?: string } | null;
  site?: { name: string } | null;
  applicant?: { full_name: string } | null;
  issuer?: { full_name: string } | null;
}

interface TemplateOptions {
  primaryLanguage: PDFLanguage;
  secondaryLanguage: PDFLanguage;
  showQR: boolean;
  t: TFunction;
}

// Translations for PDF
const pdfTranslations: Record<PDFLanguage, Record<string, string>> = {
  en: {
    title: 'WORK PERMIT',
    referenceId: 'Reference ID',
    status: 'Status',
    permitDetails: 'Permit Details',
    permitType: 'Permit Type',
    project: 'Project',
    workDescription: 'Work Description',
    location: 'Location',
    site: 'Site',
    coordinates: 'GPS Coordinates',
    timeline: 'Timeline',
    plannedStart: 'Planned Start',
    plannedEnd: 'Planned End',
    actualStart: 'Actual Start',
    actualEnd: 'Actual End',
    personnel: 'Personnel',
    applicant: 'Applicant',
    issuer: 'Issuer/Authorizer',
    emergency: 'Emergency Contact',
    signatures: 'Signatures',
    applicantSignature: 'Applicant',
    endorserSignature: 'Endorser',
    issuerSignature: 'Issuer',
    simopsStatus: 'SIMOPS Status',
    qrVerification: 'Scan for verification',
    scanQR: 'Scan QR for verification',
    clear: 'Clear',
    warning: 'Warning',
    conflict: 'Conflict',
    confidential: 'CONFIDENTIAL',
    printedOn: 'Printed on',
  },
  ar: {
    title: 'تصريح عمل',
    referenceId: 'رقم المرجع',
    status: 'الحالة',
    permitDetails: 'تفاصيل التصريح',
    permitType: 'نوع التصريح',
    project: 'المشروع',
    workDescription: 'وصف العمل',
    location: 'الموقع',
    site: 'الموقع',
    coordinates: 'إحداثيات GPS',
    timeline: 'الجدول الزمني',
    plannedStart: 'البدء المخطط',
    plannedEnd: 'الانتهاء المخطط',
    actualStart: 'البدء الفعلي',
    actualEnd: 'الانتهاء الفعلي',
    personnel: 'العاملين',
    applicant: 'مقدم الطلب',
    issuer: 'المصدر/المفوض',
    emergency: 'جهة الاتصال للطوارئ',
    signatures: 'التوقيعات',
    applicantSignature: 'مقدم الطلب',
    endorserSignature: 'المعتمد',
    issuerSignature: 'المصدر',
    simopsStatus: 'حالة SIMOPS',
    qrVerification: 'امسح للتحقق',
    scanQR: 'امسح رمز QR للتحقق',
    clear: 'واضح',
    warning: 'تحذير',
    conflict: 'تعارض',
    confidential: 'سري',
    printedOn: 'طُبع في',
  },
  ur: {
    title: 'ورک پرمٹ',
    referenceId: 'حوالہ نمبر',
    status: 'حیثیت',
    permitDetails: 'پرمٹ کی تفصیلات',
    permitType: 'پرمٹ کی قسم',
    project: 'پروجیکٹ',
    workDescription: 'کام کی تفصیل',
    location: 'مقام',
    site: 'سائٹ',
    coordinates: 'جی پی ایس کوآرڈینیٹس',
    timeline: 'ٹائم لائن',
    plannedStart: 'منصوبہ بند آغاز',
    plannedEnd: 'منصوبہ بند اختتام',
    actualStart: 'اصل آغاز',
    actualEnd: 'اصل اختتام',
    personnel: 'اہلکار',
    applicant: 'درخواست گزار',
    issuer: 'جاری کنندہ',
    emergency: 'ہنگامی رابطہ',
    signatures: 'دستخط',
    applicantSignature: 'درخواست گزار',
    endorserSignature: 'توثیق کنندہ',
    issuerSignature: 'جاری کنندہ',
    simopsStatus: 'SIMOPS کی حیثیت',
    qrVerification: 'تصدیق کے لیے اسکین کریں',
    scanQR: 'تصدیق کے لیے QR اسکین کریں',
    clear: 'صاف',
    warning: 'انتباہ',
    conflict: 'تنازعہ',
    confidential: 'خفیہ',
    printedOn: 'پرنٹ کیا گیا',
  },
  fil: {
    title: 'PERMIT SA TRABAHO',
    referenceId: 'Reference ID',
    status: 'Katayuan',
    permitDetails: 'Mga Detalye ng Permit',
    permitType: 'Uri ng Permit',
    project: 'Proyekto',
    workDescription: 'Paglalarawan ng Trabaho',
    location: 'Lokasyon',
    site: 'Site',
    coordinates: 'GPS Coordinates',
    timeline: 'Timeline',
    plannedStart: 'Nakaplanong Simula',
    plannedEnd: 'Nakaplanong Wakas',
    actualStart: 'Aktwal na Simula',
    actualEnd: 'Aktwal na Wakas',
    personnel: 'Mga Tauhan',
    applicant: 'Aplikante',
    issuer: 'Tagapag-isyu',
    emergency: 'Emergency Contact',
    signatures: 'Mga Lagda',
    applicantSignature: 'Aplikante',
    endorserSignature: 'Endorser',
    issuerSignature: 'Issuer',
    simopsStatus: 'SIMOPS Status',
    qrVerification: 'I-scan para sa verification',
    scanQR: 'I-scan ang QR para sa verification',
    clear: 'Malinaw',
    warning: 'Babala',
    conflict: 'Conflict',
    confidential: 'KOMPIDENSYAL',
    printedOn: 'Nai-print noong',
  },
};

const statusColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: '#6b7280', text: '#ffffff' },
  requested: { bg: '#f59e0b', text: '#ffffff' },
  endorsed: { bg: '#3b82f6', text: '#ffffff' },
  issued: { bg: '#22c55e', text: '#ffffff' },
  active: { bg: '#16a34a', text: '#ffffff' },
  suspended: { bg: '#ef4444', text: '#ffffff' },
  closed: { bg: '#4b5563', text: '#ffffff' },
  cancelled: { bg: '#dc2626', text: '#ffffff' },
};

/**
 * Renders the permit PDF template as HTML string
 */
export function renderPermitPDFTemplate(permit: PermitData, options: TemplateOptions): string {
  const { primaryLanguage, secondaryLanguage, showQR } = options;
  const t1 = pdfTranslations[primaryLanguage];
  const t2 = pdfTranslations[secondaryLanguage];
  const isRTL = primaryLanguage === 'ar' || primaryLanguage === 'ur';
  const statusColor = statusColors[permit.status] || statusColors.draft;

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    return format(new Date(date), 'dd/MM/yyyy HH:mm');
  };

  const qrData = `PTW:${permit.id}:${permit.reference_id}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrData)}`;

  return `
    <div style="
      font-family: 'IBM Plex Sans Arabic', 'Segoe UI', Arial, sans-serif;
      color: #1f2937;
      line-height: 1.5;
      direction: ${isRTL ? 'rtl' : 'ltr'};
      padding: 20px;
    ">
      <!-- Header -->
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-bottom: 2px solid #1f2937;
        padding-bottom: 15px;
        margin-bottom: 20px;
      ">
        <div style="flex: 1;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700;">
            ${t1.title}
          </h1>
          <p style="margin: 4px 0 0; font-size: 14px; color: #6b7280;">
            ${t2.title}
          </p>
          <div style="margin-top: 8px;">
            <span style="
              display: inline-block;
              padding: 4px 12px;
              background: ${statusColor.bg};
              color: ${statusColor.text};
              border-radius: 4px;
              font-size: 12px;
              font-weight: 600;
            ">
              ${permit.status.toUpperCase()}
            </span>
          </div>
        </div>
        <div style="text-align: ${isRTL ? 'left' : 'right'};">
          <p style="margin: 0; font-size: 18px; font-weight: 600;">
            ${permit.reference_id}
          </p>
          ${showQR ? `
            <img 
              src="${qrCodeUrl}" 
              alt="QR Code"
              style="width: 100px; height: 100px; margin-top: 8px;"
            />
            <p style="margin: 4px 0 0; font-size: 10px; color: #6b7280;">
              ${t1.scanQR}
            </p>
          ` : ''}
        </div>
      </div>

      <!-- Permit Details -->
      <div style="margin-bottom: 20px;">
        <h2 style="
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 10px;
          padding: 6px 10px;
          background: #f3f4f6;
          border-radius: 4px;
        ">
          ${t1.permitDetails} / ${t2.permitDetails}
        </h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <tr>
            <td style="padding: 6px 10px; width: 25%; color: #6b7280;">
              ${t1.permitType}<br/><span style="font-size: 10px;">${t2.permitType}</span>
            </td>
            <td style="padding: 6px 10px; width: 25%; font-weight: 500;">
              ${permit.permit_type?.name || '-'}
            </td>
            <td style="padding: 6px 10px; width: 25%; color: #6b7280;">
              ${t1.project}<br/><span style="font-size: 10px;">${t2.project}</span>
            </td>
            <td style="padding: 6px 10px; width: 25%; font-weight: 500;">
              ${permit.project?.name || '-'}
            </td>
          </tr>
        </table>
      </div>

      <!-- Work Description -->
      <div style="margin-bottom: 20px;">
        <h2 style="
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 10px;
          padding: 6px 10px;
          background: #f3f4f6;
          border-radius: 4px;
        ">
          ${t1.workDescription} / ${t2.workDescription}
        </h2>
        <p style="
          margin: 0;
          padding: 10px;
          background: #fafafa;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          font-size: 12px;
          min-height: 40px;
        ">
          ${permit.job_description || '-'}
        </p>
      </div>

      <!-- Location -->
      <div style="margin-bottom: 20px;">
        <h2 style="
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 10px;
          padding: 6px 10px;
          background: #f3f4f6;
          border-radius: 4px;
        ">
          ${t1.location} / ${t2.location}
        </h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <tr>
            <td style="padding: 6px 10px; width: 25%; color: #6b7280;">
              ${t1.site}<br/><span style="font-size: 10px;">${t2.site}</span>
            </td>
            <td style="padding: 6px 10px; font-weight: 500;">
              ${permit.site?.name || '-'}
            </td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; color: #6b7280;">
              ${t1.location}<br/><span style="font-size: 10px;">${t2.location}</span>
            </td>
            <td style="padding: 6px 10px; font-weight: 500;">
              ${permit.location_details || '-'}
            </td>
          </tr>
          ${permit.gps_lat && permit.gps_lng ? `
          <tr>
            <td style="padding: 6px 10px; color: #6b7280;">
              ${t1.coordinates}<br/><span style="font-size: 10px;">${t2.coordinates}</span>
            </td>
            <td style="padding: 6px 10px; font-weight: 500;">
              ${permit.gps_lat.toFixed(6)}, ${permit.gps_lng.toFixed(6)}
            </td>
          </tr>
          ` : ''}
        </table>
      </div>

      <!-- Timeline -->
      <div style="margin-bottom: 20px;">
        <h2 style="
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 10px;
          padding: 6px 10px;
          background: #f3f4f6;
          border-radius: 4px;
        ">
          ${t1.timeline} / ${t2.timeline}
        </h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <tr>
            <td style="padding: 6px 10px; width: 25%; color: #6b7280;">
              ${t1.plannedStart}<br/><span style="font-size: 10px;">${t2.plannedStart}</span>
            </td>
            <td style="padding: 6px 10px; width: 25%; font-weight: 500;">
              ${formatDate(permit.planned_start_time)}
            </td>
            <td style="padding: 6px 10px; width: 25%; color: #6b7280;">
              ${t1.plannedEnd}<br/><span style="font-size: 10px;">${t2.plannedEnd}</span>
            </td>
            <td style="padding: 6px 10px; width: 25%; font-weight: 500;">
              ${formatDate(permit.planned_end_time)}
            </td>
          </tr>
          ${permit.actual_start_time || permit.actual_end_time ? `
          <tr>
            <td style="padding: 6px 10px; color: #6b7280;">
              ${t1.actualStart}<br/><span style="font-size: 10px;">${t2.actualStart}</span>
            </td>
            <td style="padding: 6px 10px; font-weight: 500;">
              ${formatDate(permit.actual_start_time)}
            </td>
            <td style="padding: 6px 10px; color: #6b7280;">
              ${t1.actualEnd}<br/><span style="font-size: 10px;">${t2.actualEnd}</span>
            </td>
            <td style="padding: 6px 10px; font-weight: 500;">
              ${formatDate(permit.actual_end_time)}
            </td>
          </tr>
          ` : ''}
        </table>
      </div>

      <!-- Personnel -->
      <div style="margin-bottom: 20px;">
        <h2 style="
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 10px;
          padding: 6px 10px;
          background: #f3f4f6;
          border-radius: 4px;
        ">
          ${t1.personnel} / ${t2.personnel}
        </h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <tr>
            <td style="padding: 6px 10px; width: 25%; color: #6b7280;">
              ${t1.applicant}<br/><span style="font-size: 10px;">${t2.applicant}</span>
            </td>
            <td style="padding: 6px 10px; width: 25%; font-weight: 500;">
              ${permit.applicant?.full_name || '-'}
            </td>
            <td style="padding: 6px 10px; width: 25%; color: #6b7280;">
              ${t1.issuer}<br/><span style="font-size: 10px;">${t2.issuer}</span>
            </td>
            <td style="padding: 6px 10px; width: 25%; font-weight: 500;">
              ${permit.issuer?.full_name || '-'}
            </td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; color: #6b7280;">
              ${t1.emergency}<br/><span style="font-size: 10px;">${t2.emergency}</span>
            </td>
            <td style="padding: 6px 10px; font-weight: 500;" colspan="3">
              ${permit.emergency_contact_name || '-'}
              ${permit.emergency_contact_number ? ` • ${permit.emergency_contact_number}` : ''}
            </td>
          </tr>
        </table>
      </div>

      <!-- Signatures -->
      <div style="margin-bottom: 20px;">
        <h2 style="
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 10px;
          padding: 6px 10px;
          background: #f3f4f6;
          border-radius: 4px;
        ">
          ${t1.signatures} / ${t2.signatures}
        </h2>
        <div style="display: flex; gap: 20px;">
          <div style="flex: 1; text-align: center; padding: 20px; border: 1px solid #e5e7eb; border-radius: 4px;">
            <div style="height: 50px; border-bottom: 1px solid #1f2937; margin-bottom: 8px;"></div>
            <p style="margin: 0; font-size: 11px; color: #6b7280;">
              ${t1.applicantSignature}<br/>${t2.applicantSignature}
            </p>
          </div>
          <div style="flex: 1; text-align: center; padding: 20px; border: 1px solid #e5e7eb; border-radius: 4px;">
            <div style="height: 50px; border-bottom: 1px solid #1f2937; margin-bottom: 8px;"></div>
            <p style="margin: 0; font-size: 11px; color: #6b7280;">
              ${t1.endorserSignature}<br/>${t2.endorserSignature}
            </p>
          </div>
          <div style="flex: 1; text-align: center; padding: 20px; border: 1px solid #e5e7eb; border-radius: 4px;">
            <div style="height: 50px; border-bottom: 1px solid #1f2937; margin-bottom: 8px;"></div>
            <p style="margin: 0; font-size: 11px; color: #6b7280;">
              ${t1.issuerSignature}<br/>${t2.issuerSignature}
            </p>
          </div>
        </div>
      </div>

      <!-- SIMOPS Status -->
      ${permit.simops_status ? `
      <div style="
        padding: 10px;
        background: ${permit.simops_status === 'clear' ? '#dcfce7' : permit.simops_status === 'warning' ? '#fef3c7' : '#fee2e2'};
        border-radius: 4px;
        font-size: 12px;
        text-align: center;
      ">
        <strong>${t1.simopsStatus}:</strong> 
        ${permit.simops_status === 'clear' ? t1.clear : permit.simops_status === 'warning' ? t1.warning : t1.conflict}
      </div>
      ` : ''}
    </div>
  `;
}
