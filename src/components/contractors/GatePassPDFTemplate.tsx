import { format } from 'date-fns';

type PDFLanguage = 'en' | 'ar';

interface GatePassData {
  id: string;
  reference_number: string;
  status: string;
  material_description?: string | null;
  quantity?: string | null;
  pass_type: string;
  pass_date: string;
  time_window_start?: string | null;
  time_window_end?: string | null;
  vehicle_plate?: string | null;
  driver_name?: string | null;
  driver_mobile?: string | null;
  entry_time?: string | null;
  exit_time?: string | null;
  is_internal_request?: boolean;
  qr_code_token?: string | null;
  project?: { project_name: string } | null;
  company?: { company_name: string } | null;
  requester?: { full_name: string } | null;
  pm_approver?: { full_name: string } | null;
  safety_approver?: { full_name: string } | null;
  pm_approved_at?: string | null;
  safety_approved_at?: string | null;
}

interface GatePassItem {
  id: string;
  item_name: string;
  description?: string | null;
  quantity?: string | number | null;
  unit?: string | null;
}

interface TemplateOptions {
  primaryLanguage: PDFLanguage;
  showQR: boolean;
  includeItems: boolean;
  items?: GatePassItem[];
}

interface PDFTranslation {
  title: string;
  referenceId: string;
  status: string;
  materialDetails: string;
  description: string;
  quantity: string;
  passType: string;
  projectInfo: string;
  project: string;
  company: string;
  internalRequest: string;
  vehicleInfo: string;
  vehiclePlate: string;
  driver: string;
  mobile: string;
  timeWindow: string;
  passDate: string;
  from: string;
  to: string;
  entryExit: string;
  entryTime: string;
  exitTime: string;
  notRecorded: string;
  approvals: string;
  requester: string;
  pmApproval: string;
  safetyApproval: string;
  items: string;
  itemName: string;
  unit: string;
  signatures: string;
  requesterSignature: string;
  pmSignature: string;
  safetySignature: string;
  guardSignature: string;
  scanQR: string;
  confidential: string;
  passTypes: Record<string, string>;
  statusLabels: Record<string, string>;
}

// Translations for PDF
const pdfTranslations: Record<PDFLanguage, PDFTranslation> = {
  en: {
    title: 'MATERIAL GATE PASS',
    referenceId: 'Reference Number',
    status: 'Status',
    materialDetails: 'Material Details',
    description: 'Description',
    quantity: 'Quantity',
    passType: 'Pass Type',
    projectInfo: 'Project Information',
    project: 'Project',
    company: 'Company',
    internalRequest: 'Internal Request',
    vehicleInfo: 'Vehicle & Driver Information',
    vehiclePlate: 'Vehicle Plate',
    driver: 'Driver Name',
    mobile: 'Mobile',
    timeWindow: 'Authorized Time Window',
    passDate: 'Pass Date',
    from: 'From',
    to: 'To',
    entryExit: 'Entry / Exit Record',
    entryTime: 'Entry Time',
    exitTime: 'Exit Time',
    notRecorded: 'Not Recorded',
    approvals: 'Approvals',
    requester: 'Requester',
    pmApproval: 'PM Approval',
    safetyApproval: 'Safety Approval',
    items: 'Items List',
    itemName: 'Item',
    unit: 'Unit',
    signatures: 'Signatures',
    requesterSignature: 'Requester',
    pmSignature: 'Project Manager',
    safetySignature: 'Safety Officer',
    guardSignature: 'Security Guard',
    scanQR: 'Scan for verification',
    confidential: 'CONFIDENTIAL - For authorized use only',
    passTypes: {
      incoming: 'Incoming',
      outgoing: 'Outgoing',
      return: 'Return',
    },
    statusLabels: {
      approved: 'Approved',
      pending_pm_approval: 'Pending PM',
      pending_safety_approval: 'Pending Safety',
      rejected: 'Rejected',
      completed: 'Completed',
    },
  },
  ar: {
    title: 'تصريح بوابة المواد',
    referenceId: 'رقم المرجع',
    status: 'الحالة',
    materialDetails: 'تفاصيل المواد',
    description: 'الوصف',
    quantity: 'الكمية',
    passType: 'نوع التصريح',
    projectInfo: 'معلومات المشروع',
    project: 'المشروع',
    company: 'الشركة',
    internalRequest: 'طلب داخلي',
    vehicleInfo: 'معلومات المركبة والسائق',
    vehiclePlate: 'رقم اللوحة',
    driver: 'اسم السائق',
    mobile: 'الجوال',
    timeWindow: 'نافذة الوقت المصرح بها',
    passDate: 'تاريخ التصريح',
    from: 'من',
    to: 'إلى',
    entryExit: 'سجل الدخول / الخروج',
    entryTime: 'وقت الدخول',
    exitTime: 'وقت الخروج',
    notRecorded: 'لم يتم التسجيل',
    approvals: 'الموافقات',
    requester: 'مقدم الطلب',
    pmApproval: 'موافقة مدير المشروع',
    safetyApproval: 'موافقة مسؤول السلامة',
    items: 'قائمة المواد',
    itemName: 'المادة',
    unit: 'الوحدة',
    signatures: 'التوقيعات',
    requesterSignature: 'مقدم الطلب',
    pmSignature: 'مدير المشروع',
    safetySignature: 'مسؤول السلامة',
    guardSignature: 'حارس الأمن',
    scanQR: 'امسح للتحقق',
    confidential: 'سري - للاستخدام المصرح به فقط',
    passTypes: {
      incoming: 'وارد',
      outgoing: 'صادر',
      return: 'إرجاع',
    },
    statusLabels: {
      approved: 'موافق عليه',
      pending_pm_approval: 'بانتظار مدير المشروع',
      pending_safety_approval: 'بانتظار السلامة',
      rejected: 'مرفوض',
      completed: 'مكتمل',
    },
  },
};

const statusColors: Record<string, { bg: string; text: string }> = {
  approved: { bg: '#22c55e', text: '#ffffff' },
  pending_pm_approval: { bg: '#f59e0b', text: '#ffffff' },
  pending_safety_approval: { bg: '#f59e0b', text: '#ffffff' },
  rejected: { bg: '#ef4444', text: '#ffffff' },
  completed: { bg: '#4b5563', text: '#ffffff' },
};

const passTypeColors: Record<string, { bg: string; text: string }> = {
  incoming: { bg: '#3b82f6', text: '#ffffff' },
  outgoing: { bg: '#8b5cf6', text: '#ffffff' },
  return: { bg: '#f97316', text: '#ffffff' },
};

/**
 * Renders the gate pass PDF template as HTML string
 */
export function renderGatePassPDFTemplate(
  pass: GatePassData,
  options: TemplateOptions
): string {
  const { primaryLanguage, showQR, includeItems, items = [] } = options;
  const t = pdfTranslations[primaryLanguage];
  const t2 = pdfTranslations[primaryLanguage === 'en' ? 'ar' : 'en'];
  const isRTL = primaryLanguage === 'ar';
  const statusColor = statusColors[pass.status] || statusColors.approved;
  const passTypeColor = passTypeColors[pass.pass_type] || passTypeColors.incoming;

  const formatDateTime = (date: string | null | undefined) => {
    if (!date) return t.notRecorded;
    return format(new Date(date), 'dd/MM/yyyy HH:mm');
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    return format(new Date(date), 'dd/MM/yyyy');
  };

  // QR code with high resolution (200x200 for clarity)
  const qrData = `GP:${pass.id}:${pass.reference_number}:${pass.qr_code_token || ''}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}&margin=0`;

  const getStatusLabel = (status: string) => {
    return t.statusLabels[status] || status;
  };

  const getPassTypeLabel = (passType: string) => {
    return t.passTypes[passType] || passType;
  };

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
        border-bottom: 3px solid #1f2937;
        padding-bottom: 15px;
        margin-bottom: 20px;
      ">
        <div style="flex: 1;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 700;">
            ${t.title}
          </h1>
          <p style="margin: 4px 0 0; font-size: 13px; color: #6b7280;">
            ${t2.title}
          </p>
          <p style="margin: 10px 0 0; font-size: 18px; font-weight: 600; font-family: monospace;">
            ${pass.reference_number}
          </p>
          <div style="margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap;">
            <span style="
              display: inline-block;
              padding: 4px 12px;
              background: ${statusColor.bg};
              color: ${statusColor.text};
              border-radius: 4px;
              font-size: 11px;
              font-weight: 600;
            ">
              ${getStatusLabel(pass.status)}
            </span>
            <span style="
              display: inline-block;
              padding: 4px 12px;
              background: ${passTypeColor.bg};
              color: ${passTypeColor.text};
              border-radius: 4px;
              font-size: 11px;
              font-weight: 600;
            ">
              ${getPassTypeLabel(pass.pass_type)}
            </span>
          </div>
        </div>
        ${showQR && pass.status === 'approved' ? `
          <div style="text-align: center; background: #ffffff; padding: 10px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <img 
              src="${qrCodeUrl}" 
              alt="QR Code"
              style="width: 130px; height: 130px; display: block;"
            />
            <p style="margin: 6px 0 0; font-size: 9px; color: #6b7280;">
              ${t.scanQR}
            </p>
          </div>
        ` : ''}
      </div>

      <!-- Material Description -->
      <div style="margin-bottom: 16px;">
        <h2 style="
          font-size: 13px;
          font-weight: 600;
          margin: 0 0 8px;
          padding: 6px 10px;
          background: #f3f4f6;
          border-radius: 4px;
          border-${isRTL ? 'right' : 'left'}: 3px solid #3b82f6;
        ">
          ${t.materialDetails} / ${t2.materialDetails}
        </h2>
        <div style="
          padding: 12px;
          background: #fafafa;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
        ">
          <p style="margin: 0 0 8px; font-size: 12px;">
            <strong>${t.description}:</strong> ${pass.material_description || '-'}
          </p>
          ${pass.quantity ? `
            <p style="margin: 0; font-size: 12px;">
              <strong>${t.quantity}:</strong> ${pass.quantity}
            </p>
          ` : ''}
        </div>
      </div>

      <!-- Project & Date Grid -->
      <div style="display: flex; gap: 12px; margin-bottom: 16px;">
        <!-- Project Info -->
        <div style="flex: 1; min-width: 0;">
          <h2 style="
            font-size: 13px;
            font-weight: 600;
            margin: 0 0 8px;
            padding: 6px 10px;
            background: #f3f4f6;
            border-radius: 4px;
            border-${isRTL ? 'right' : 'left'}: 3px solid #10b981;
          ">
            ${t.projectInfo}
          </h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <tr>
              <td style="padding: 4px 8px; color: #6b7280; width: 40%;">${t.project}</td>
              <td style="padding: 4px 8px; font-weight: 500;">
                ${pass.project?.project_name || (pass.is_internal_request ? t.internalRequest : '-')}
              </td>
            </tr>
            ${pass.company?.company_name ? `
              <tr>
                <td style="padding: 4px 8px; color: #6b7280;">${t.company}</td>
                <td style="padding: 4px 8px; font-weight: 500;">${pass.company.company_name}</td>
              </tr>
            ` : ''}
          </table>
        </div>

        <!-- Time Window -->
        <div style="flex: 1; min-width: 0;">
          <h2 style="
            font-size: 13px;
            font-weight: 600;
            margin: 0 0 8px;
            padding: 6px 10px;
            background: #f3f4f6;
            border-radius: 4px;
            border-${isRTL ? 'right' : 'left'}: 3px solid #f59e0b;
          ">
            ${t.timeWindow}
          </h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <tr>
              <td style="padding: 4px 8px; color: #6b7280; width: 40%;">${t.passDate}</td>
              <td style="padding: 4px 8px; font-weight: 500;">${formatDate(pass.pass_date)}</td>
            </tr>
            ${pass.time_window_start && pass.time_window_end ? `
              <tr>
                <td style="padding: 4px 8px; color: #6b7280;">${t.from} - ${t.to}</td>
                <td style="padding: 4px 8px; font-weight: 500;">${pass.time_window_start} - ${pass.time_window_end}</td>
              </tr>
            ` : ''}
          </table>
        </div>
      </div>

      <!-- Vehicle & Driver -->
      ${pass.vehicle_plate || pass.driver_name ? `
        <div style="margin-bottom: 16px;">
          <h2 style="
            font-size: 13px;
            font-weight: 600;
            margin: 0 0 8px;
            padding: 6px 10px;
            background: #f3f4f6;
            border-radius: 4px;
            border-${isRTL ? 'right' : 'left'}: 3px solid #8b5cf6;
          ">
            ${t.vehicleInfo} / ${t2.vehicleInfo}
          </h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <tr>
              <td style="padding: 4px 8px; color: #6b7280; width: 20%;">${t.vehiclePlate}</td>
              <td style="padding: 4px 8px; font-weight: 500; width: 30%;">${pass.vehicle_plate || '-'}</td>
              <td style="padding: 4px 8px; color: #6b7280; width: 20%;">${t.driver}</td>
              <td style="padding: 4px 8px; font-weight: 500; width: 30%;">${pass.driver_name || '-'}</td>
            </tr>
            ${pass.driver_mobile ? `
              <tr>
                <td style="padding: 4px 8px; color: #6b7280;">${t.mobile}</td>
                <td style="padding: 4px 8px; font-weight: 500;" colspan="3">${pass.driver_mobile}</td>
              </tr>
            ` : ''}
          </table>
        </div>
      ` : ''}

      <!-- Entry/Exit Record -->
      <div style="margin-bottom: 16px;">
        <h2 style="
          font-size: 13px;
          font-weight: 600;
          margin: 0 0 8px;
          padding: 6px 10px;
          background: #f3f4f6;
          border-radius: 4px;
          border-${isRTL ? 'right' : 'left'}: 3px solid #6366f1;
        ">
          ${t.entryExit} / ${t2.entryExit}
        </h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <tr>
            <td style="padding: 6px 8px; color: #6b7280; width: 25%; border: 1px solid #e5e7eb;">${t.entryTime}</td>
            <td style="padding: 6px 8px; font-weight: 500; width: 25%; border: 1px solid #e5e7eb; ${pass.entry_time ? 'color: #16a34a;' : ''}">
              ${formatDateTime(pass.entry_time)}
            </td>
            <td style="padding: 6px 8px; color: #6b7280; width: 25%; border: 1px solid #e5e7eb;">${t.exitTime}</td>
            <td style="padding: 6px 8px; font-weight: 500; width: 25%; border: 1px solid #e5e7eb; ${pass.exit_time ? 'color: #16a34a;' : ''}">
              ${formatDateTime(pass.exit_time)}
            </td>
          </tr>
        </table>
      </div>

      <!-- Approvals -->
      <div style="margin-bottom: 16px;">
        <h2 style="
          font-size: 13px;
          font-weight: 600;
          margin: 0 0 8px;
          padding: 6px 10px;
          background: #f3f4f6;
          border-radius: 4px;
          border-${isRTL ? 'right' : 'left'}: 3px solid #22c55e;
        ">
          ${t.approvals} / ${t2.approvals}
        </h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <tr>
            <td style="padding: 4px 8px; color: #6b7280; width: 25%;">${t.requester}</td>
            <td style="padding: 4px 8px; font-weight: 500; width: 75%;">${pass.requester?.full_name || '-'}</td>
          </tr>
          <tr>
            <td style="padding: 4px 8px; color: #6b7280;">${t.pmApproval}</td>
            <td style="padding: 4px 8px; font-weight: 500;">
              ${pass.pm_approver?.full_name || '-'}
              ${pass.pm_approved_at ? ` • ${formatDateTime(pass.pm_approved_at)}` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding: 4px 8px; color: #6b7280;">${t.safetyApproval}</td>
            <td style="padding: 4px 8px; font-weight: 500;">
              ${pass.safety_approver?.full_name || '-'}
              ${pass.safety_approved_at ? ` • ${formatDateTime(pass.safety_approved_at)}` : ''}
            </td>
          </tr>
        </table>
      </div>

      <!-- Items List (if included) -->
      ${includeItems && items.length > 0 ? `
        <div style="margin-bottom: 16px;">
          <h2 style="
            font-size: 13px;
            font-weight: 600;
            margin: 0 0 8px;
            padding: 6px 10px;
            background: #f3f4f6;
            border-radius: 4px;
            border-${isRTL ? 'right' : 'left'}: 3px solid #ec4899;
          ">
            ${t.items} / ${t2.items}
          </h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #e5e7eb;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 6px 8px; text-align: ${isRTL ? 'right' : 'left'}; border: 1px solid #e5e7eb; width: 5%;">#</th>
                <th style="padding: 6px 8px; text-align: ${isRTL ? 'right' : 'left'}; border: 1px solid #e5e7eb; width: 45%;">${t.itemName}</th>
                <th style="padding: 6px 8px; text-align: center; border: 1px solid #e5e7eb; width: 25%;">${t.quantity}</th>
                <th style="padding: 6px 8px; text-align: center; border: 1px solid #e5e7eb; width: 25%;">${t.unit}</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, index) => `
                <tr>
                  <td style="padding: 4px 8px; border: 1px solid #e5e7eb; text-align: center;">${index + 1}</td>
                  <td style="padding: 4px 8px; border: 1px solid #e5e7eb;">
                    ${item.item_name}
                    ${item.description ? `<br/><span style="font-size: 10px; color: #6b7280;">${item.description}</span>` : ''}
                  </td>
                  <td style="padding: 4px 8px; border: 1px solid #e5e7eb; text-align: center;">${item.quantity || '-'}</td>
                  <td style="padding: 4px 8px; border: 1px solid #e5e7eb; text-align: center;">${item.unit || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      <!-- Signatures -->
      <div style="margin-bottom: 16px;">
        <h2 style="
          font-size: 13px;
          font-weight: 600;
          margin: 0 0 8px;
          padding: 6px 10px;
          background: #f3f4f6;
          border-radius: 4px;
          border-${isRTL ? 'right' : 'left'}: 3px solid #64748b;
        ">
          ${t.signatures} / ${t2.signatures}
        </h2>
        <div style="display: flex; gap: 12px;">
          <div style="flex: 1; text-align: center; padding: 15px; border: 1px solid #e5e7eb; border-radius: 4px;">
            <div style="height: 40px; border-bottom: 1px solid #1f2937; margin-bottom: 6px;"></div>
            <p style="margin: 0; font-size: 10px; color: #6b7280;">
              ${t.requesterSignature}<br/>${t2.requesterSignature}
            </p>
          </div>
          <div style="flex: 1; text-align: center; padding: 15px; border: 1px solid #e5e7eb; border-radius: 4px;">
            <div style="height: 40px; border-bottom: 1px solid #1f2937; margin-bottom: 6px;"></div>
            <p style="margin: 0; font-size: 10px; color: #6b7280;">
              ${t.pmSignature}<br/>${t2.pmSignature}
            </p>
          </div>
          <div style="flex: 1; text-align: center; padding: 15px; border: 1px solid #e5e7eb; border-radius: 4px;">
            <div style="height: 40px; border-bottom: 1px solid #1f2937; margin-bottom: 6px;"></div>
            <p style="margin: 0; font-size: 10px; color: #6b7280;">
              ${t.safetySignature}<br/>${t2.safetySignature}
            </p>
          </div>
          <div style="flex: 1; text-align: center; padding: 15px; border: 1px solid #e5e7eb; border-radius: 4px;">
            <div style="height: 40px; border-bottom: 1px solid #1f2937; margin-bottom: 6px;"></div>
            <p style="margin: 0; font-size: 10px; color: #6b7280;">
              ${t.guardSignature}<br/>${t2.guardSignature}
            </p>
          </div>
        </div>
      </div>
    </div>
  `;
}
