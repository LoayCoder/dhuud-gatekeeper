import { format } from 'date-fns';

type PDFLanguage = 'en' | 'ar';

interface PurchaseRequestData {
  id: string;
  request_number: string;
  title: string;
  description?: string | null;
  quantity: number;
  estimated_cost: number;
  currency: string;
  budget_code?: string | null;
  justification?: string | null;
  vendor_name?: string | null;
  status: string;
  current_approval_level: number;
  requested_at: string;
  category?: { name: string; name_ar?: string | null } | null;
  type?: { name: string; name_ar?: string | null } | null;
  requester?: { full_name: string; employee_id?: string | null } | null;
}

interface ApprovalRecord {
  id: string;
  approval_level: number;
  decision: string;
  notes?: string | null;
  decided_at: string;
  approver?: { full_name: string; employee_id?: string | null } | null;
}

interface TemplateOptions {
  primaryLanguage: PDFLanguage;
  showQR: boolean;
  includeApprovalHistory: boolean;
  approvals?: ApprovalRecord[];
}

interface PDFTranslation {
  title: string;
  requestNumber: string;
  status: string;
  requestDetails: string;
  itemTitle: string;
  description: string;
  justification: string;
  itemDetails: string;
  category: string;
  type: string;
  quantity: string;
  unitCost: string;
  totalCost: string;
  financialInfo: string;
  budgetCode: string;
  vendorInfo: string;
  vendorName: string;
  requesterInfo: string;
  requestedBy: string;
  employeeId: string;
  requestDate: string;
  approvalHistory: string;
  level: string;
  approver: string;
  decision: string;
  notes: string;
  date: string;
  signatures: string;
  requesterSignature: string;
  managerSignature: string;
  financeSignature: string;
  scanQR: string;
  confidential: string;
  pending: string;
  statusLabels: Record<string, string>;
  decisionLabels: Record<string, string>;
}

const pdfTranslations: Record<PDFLanguage, PDFTranslation> = {
  en: {
    title: 'PURCHASE REQUEST',
    requestNumber: 'Request Number',
    status: 'Status',
    requestDetails: 'Request Details',
    itemTitle: 'Title',
    description: 'Description',
    justification: 'Justification',
    itemDetails: 'Item Details',
    category: 'Category',
    type: 'Type',
    quantity: 'Quantity',
    unitCost: 'Unit Cost',
    totalCost: 'Total Cost',
    financialInfo: 'Financial Information',
    budgetCode: 'Budget Code',
    vendorInfo: 'Vendor Information',
    vendorName: 'Vendor Name',
    requesterInfo: 'Requester Information',
    requestedBy: 'Requested By',
    employeeId: 'Employee ID',
    requestDate: 'Request Date',
    approvalHistory: 'Approval History',
    level: 'Level',
    approver: 'Approver',
    decision: 'Decision',
    notes: 'Notes',
    date: 'Date',
    signatures: 'Signatures',
    requesterSignature: 'Requester',
    managerSignature: 'Department Manager',
    financeSignature: 'Finance',
    scanQR: 'Scan for verification',
    confidential: 'CONFIDENTIAL - For authorized use only',
    pending: 'Pending',
    statusLabels: {
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected',
      cancelled: 'Cancelled',
      ordered: 'Ordered',
      received: 'Received',
    },
    decisionLabels: {
      approved: 'Approved',
      rejected: 'Rejected',
      returned: 'Returned for Review',
    },
  },
  ar: {
    title: 'طلب شراء',
    requestNumber: 'رقم الطلب',
    status: 'الحالة',
    requestDetails: 'تفاصيل الطلب',
    itemTitle: 'العنوان',
    description: 'الوصف',
    justification: 'المبرر',
    itemDetails: 'تفاصيل المادة',
    category: 'الفئة',
    type: 'النوع',
    quantity: 'الكمية',
    unitCost: 'سعر الوحدة',
    totalCost: 'التكلفة الإجمالية',
    financialInfo: 'المعلومات المالية',
    budgetCode: 'رمز الميزانية',
    vendorInfo: 'معلومات المورد',
    vendorName: 'اسم المورد',
    requesterInfo: 'معلومات مقدم الطلب',
    requestedBy: 'مقدم الطلب',
    employeeId: 'الرقم الوظيفي',
    requestDate: 'تاريخ الطلب',
    approvalHistory: 'سجل الموافقات',
    level: 'المستوى',
    approver: 'المعتمد',
    decision: 'القرار',
    notes: 'ملاحظات',
    date: 'التاريخ',
    signatures: 'التوقيعات',
    requesterSignature: 'مقدم الطلب',
    managerSignature: 'مدير القسم',
    financeSignature: 'المالية',
    scanQR: 'امسح للتحقق',
    confidential: 'سري - للاستخدام المصرح به فقط',
    pending: 'قيد الانتظار',
    statusLabels: {
      pending: 'قيد الانتظار',
      approved: 'موافق عليه',
      rejected: 'مرفوض',
      cancelled: 'ملغى',
      ordered: 'تم الطلب',
      received: 'تم الاستلام',
    },
    decisionLabels: {
      approved: 'موافق',
      rejected: 'مرفوض',
      returned: 'أعيد للمراجعة',
    },
  },
};

const statusColors: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#f59e0b', text: '#ffffff' },
  approved: { bg: '#22c55e', text: '#ffffff' },
  rejected: { bg: '#ef4444', text: '#ffffff' },
  cancelled: { bg: '#6b7280', text: '#ffffff' },
  ordered: { bg: '#3b82f6', text: '#ffffff' },
  received: { bg: '#8b5cf6', text: '#ffffff' },
};

const decisionColors: Record<string, { bg: string; text: string }> = {
  approved: { bg: '#dcfce7', text: '#166534' },
  rejected: { bg: '#fee2e2', text: '#991b1b' },
  returned: { bg: '#fef3c7', text: '#92400e' },
};

export function renderPurchaseRequestPDFTemplate(
  request: PurchaseRequestData,
  options: TemplateOptions
): string {
  const { primaryLanguage, showQR, includeApprovalHistory, approvals = [] } = options;
  const t = pdfTranslations[primaryLanguage];
  const t2 = pdfTranslations[primaryLanguage === 'en' ? 'ar' : 'en'];
  const isRTL = primaryLanguage === 'ar';
  const statusColor = statusColors[request.status] || statusColors.pending;

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    return format(new Date(date), 'dd/MM/yyyy');
  };

  const formatDateTime = (date: string | null | undefined) => {
    if (!date) return '-';
    return format(new Date(date), 'dd/MM/yyyy HH:mm');
  };

  const formatCurrency = (amount: number, currency: string) => {
    return `${amount.toLocaleString()} ${currency}`;
  };

  const getCategoryName = () => {
    if (!request.category) return '-';
    return isRTL && request.category.name_ar ? request.category.name_ar : request.category.name;
  };

  const getTypeName = () => {
    if (!request.type) return '-';
    return isRTL && request.type.name_ar ? request.type.name_ar : request.type.name;
  };

  const qrData = `PR:${request.id}:${request.request_number}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}&margin=0`;

  const totalCost = request.estimated_cost * request.quantity;

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
            ${request.request_number}
          </p>
          <div style="margin-top: 10px;">
            <span style="
              display: inline-block;
              padding: 4px 12px;
              background: ${statusColor.bg};
              color: ${statusColor.text};
              border-radius: 4px;
              font-size: 11px;
              font-weight: 600;
            ">
              ${t.statusLabels[request.status] || request.status}
            </span>
          </div>
        </div>
        ${showQR ? `
          <div style="text-align: center; background: #ffffff; padding: 10px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <img 
              src="${qrCodeUrl}" 
              alt="QR Code"
              style="width: 100px; height: 100px; display: block;"
            />
            <p style="margin: 6px 0 0; font-size: 9px; color: #6b7280;">
              ${t.scanQR}
            </p>
          </div>
        ` : ''}
      </div>

      <!-- Request Details -->
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
          ${t.requestDetails} / ${t2.requestDetails}
        </h2>
        <div style="
          padding: 12px;
          background: #fafafa;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
        ">
          <p style="margin: 0 0 8px; font-size: 12px;">
            <strong>${t.itemTitle}:</strong> ${request.title}
          </p>
          ${request.description ? `
            <p style="margin: 0 0 8px; font-size: 12px;">
              <strong>${t.description}:</strong> ${request.description}
            </p>
          ` : ''}
          ${request.justification ? `
            <p style="margin: 0; font-size: 12px;">
              <strong>${t.justification}:</strong> ${request.justification}
            </p>
          ` : ''}
        </div>
      </div>

      <!-- Item Details & Financial Grid -->
      <div style="display: flex; gap: 12px; margin-bottom: 16px;">
        <!-- Item Details -->
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
            ${t.itemDetails}
          </h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <tr>
              <td style="padding: 4px 8px; color: #6b7280; width: 40%;">${t.category}</td>
              <td style="padding: 4px 8px; font-weight: 500;">${getCategoryName()}</td>
            </tr>
            <tr>
              <td style="padding: 4px 8px; color: #6b7280;">${t.type}</td>
              <td style="padding: 4px 8px; font-weight: 500;">${getTypeName()}</td>
            </tr>
            <tr>
              <td style="padding: 4px 8px; color: #6b7280;">${t.quantity}</td>
              <td style="padding: 4px 8px; font-weight: 500;">${request.quantity}</td>
            </tr>
          </table>
        </div>

        <!-- Financial Info -->
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
            ${t.financialInfo}
          </h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <tr>
              <td style="padding: 4px 8px; color: #6b7280; width: 40%;">${t.unitCost}</td>
              <td style="padding: 4px 8px; font-weight: 500;">${formatCurrency(request.estimated_cost, request.currency)}</td>
            </tr>
            <tr>
              <td style="padding: 4px 8px; color: #6b7280;">${t.totalCost}</td>
              <td style="padding: 4px 8px; font-weight: 600; color: #059669;">${formatCurrency(totalCost, request.currency)}</td>
            </tr>
            ${request.budget_code ? `
              <tr>
                <td style="padding: 4px 8px; color: #6b7280;">${t.budgetCode}</td>
                <td style="padding: 4px 8px; font-weight: 500; font-family: monospace;">${request.budget_code}</td>
              </tr>
            ` : ''}
          </table>
        </div>
      </div>

      <!-- Vendor & Requester Grid -->
      <div style="display: flex; gap: 12px; margin-bottom: 16px;">
        <!-- Vendor Info -->
        ${request.vendor_name ? `
          <div style="flex: 1; min-width: 0;">
            <h2 style="
              font-size: 13px;
              font-weight: 600;
              margin: 0 0 8px;
              padding: 6px 10px;
              background: #f3f4f6;
              border-radius: 4px;
              border-${isRTL ? 'right' : 'left'}: 3px solid #8b5cf6;
            ">
              ${t.vendorInfo}
            </h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
              <tr>
                <td style="padding: 4px 8px; color: #6b7280; width: 40%;">${t.vendorName}</td>
                <td style="padding: 4px 8px; font-weight: 500;">${request.vendor_name}</td>
              </tr>
            </table>
          </div>
        ` : ''}

        <!-- Requester Info -->
        <div style="flex: 1; min-width: 0;">
          <h2 style="
            font-size: 13px;
            font-weight: 600;
            margin: 0 0 8px;
            padding: 6px 10px;
            background: #f3f4f6;
            border-radius: 4px;
            border-${isRTL ? 'right' : 'left'}: 3px solid #6366f1;
          ">
            ${t.requesterInfo}
          </h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <tr>
              <td style="padding: 4px 8px; color: #6b7280; width: 40%;">${t.requestedBy}</td>
              <td style="padding: 4px 8px; font-weight: 500;">${request.requester?.full_name || '-'}</td>
            </tr>
            ${request.requester?.employee_id ? `
              <tr>
                <td style="padding: 4px 8px; color: #6b7280;">${t.employeeId}</td>
                <td style="padding: 4px 8px; font-weight: 500; font-family: monospace;">${request.requester.employee_id}</td>
              </tr>
            ` : ''}
            <tr>
              <td style="padding: 4px 8px; color: #6b7280;">${t.requestDate}</td>
              <td style="padding: 4px 8px; font-weight: 500;">${formatDate(request.requested_at)}</td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Approval History -->
      ${includeApprovalHistory && approvals.length > 0 ? `
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
            ${t.approvalHistory} / ${t2.approvalHistory}
          </h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #e5e7eb;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 6px 8px; text-align: ${isRTL ? 'right' : 'left'}; border: 1px solid #e5e7eb; font-weight: 600;">${t.level}</th>
                <th style="padding: 6px 8px; text-align: ${isRTL ? 'right' : 'left'}; border: 1px solid #e5e7eb; font-weight: 600;">${t.approver}</th>
                <th style="padding: 6px 8px; text-align: ${isRTL ? 'right' : 'left'}; border: 1px solid #e5e7eb; font-weight: 600;">${t.decision}</th>
                <th style="padding: 6px 8px; text-align: ${isRTL ? 'right' : 'left'}; border: 1px solid #e5e7eb; font-weight: 600;">${t.notes}</th>
                <th style="padding: 6px 8px; text-align: ${isRTL ? 'right' : 'left'}; border: 1px solid #e5e7eb; font-weight: 600;">${t.date}</th>
              </tr>
            </thead>
            <tbody>
              ${approvals.map(approval => {
                const decisionColor = decisionColors[approval.decision] || { bg: '#f3f4f6', text: '#374151' };
                return `
                  <tr>
                    <td style="padding: 6px 8px; border: 1px solid #e5e7eb; text-align: center;">${approval.approval_level}</td>
                    <td style="padding: 6px 8px; border: 1px solid #e5e7eb;">${approval.approver?.full_name || '-'}</td>
                    <td style="padding: 6px 8px; border: 1px solid #e5e7eb;">
                      <span style="
                        display: inline-block;
                        padding: 2px 8px;
                        background: ${decisionColor.bg};
                        color: ${decisionColor.text};
                        border-radius: 3px;
                        font-size: 10px;
                        font-weight: 500;
                      ">
                        ${t.decisionLabels[approval.decision] || approval.decision}
                      </span>
                    </td>
                    <td style="padding: 6px 8px; border: 1px solid #e5e7eb; max-width: 150px; overflow: hidden; text-overflow: ellipsis;">${approval.notes || '-'}</td>
                    <td style="padding: 6px 8px; border: 1px solid #e5e7eb; white-space: nowrap;">${formatDateTime(approval.decided_at)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      <!-- Signatures -->
      <div style="margin-top: 20px;">
        <h2 style="
          font-size: 13px;
          font-weight: 600;
          margin: 0 0 12px;
          padding: 6px 10px;
          background: #f3f4f6;
          border-radius: 4px;
        ">
          ${t.signatures} / ${t2.signatures}
        </h2>
        <div style="display: flex; gap: 16px;">
          <div style="flex: 1; text-align: center;">
            <div style="
              height: 60px;
              border: 1px solid #d1d5db;
              border-radius: 4px;
              margin-bottom: 6px;
              background: #fafafa;
            "></div>
            <p style="margin: 0; font-size: 10px; color: #6b7280;">
              ${t.requesterSignature}<br/>${t2.requesterSignature}
            </p>
          </div>
          <div style="flex: 1; text-align: center;">
            <div style="
              height: 60px;
              border: 1px solid #d1d5db;
              border-radius: 4px;
              margin-bottom: 6px;
              background: #fafafa;
            "></div>
            <p style="margin: 0; font-size: 10px; color: #6b7280;">
              ${t.managerSignature}<br/>${t2.managerSignature}
            </p>
          </div>
          <div style="flex: 1; text-align: center;">
            <div style="
              height: 60px;
              border: 1px solid #d1d5db;
              border-radius: 4px;
              margin-bottom: 6px;
              background: #fafafa;
            "></div>
            <p style="margin: 0; font-size: 10px; color: #6b7280;">
              ${t.financeSignature}<br/>${t2.financeSignature}
            </p>
          </div>
        </div>
      </div>
    </div>
  `;
}
