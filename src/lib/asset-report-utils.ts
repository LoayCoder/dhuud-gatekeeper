import jsPDF from 'jspdf';
import { format } from 'date-fns';

type ReportType = "register" | "valuation" | "warranty" | "location" | "health" | "maintenance";

export async function generateAssetReportPDF(
  data: any[],
  reportType: ReportType,
  title: string,
  isRTL: boolean
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  // Colors
  const primaryColor = [37, 99, 235]; // Blue
  const headerBg = [243, 244, 246]; // Light gray
  const borderColor = [209, 213, 219];
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  
  let yPos = margin;

  // Header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin, 16);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const dateText = `${isRTL ? 'تاريخ التقرير:' : 'Report Date:'} ${format(new Date(), 'yyyy-MM-dd HH:mm')}`;
  doc.text(dateText, pageWidth - margin - 60, 16);
  
  yPos = 35;

  // Summary section
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(isRTL ? 'ملخص التقرير' : 'Report Summary', margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${isRTL ? 'إجمالي الأصول:' : 'Total Assets:'} ${data.length}`, margin, yPos);
  yPos += 15;

  // Table
  const columns = getColumnsForPDF(reportType, isRTL);
  const colWidth = contentWidth / columns.length;
  const rowHeight = 8;

  // Table header
  doc.setFillColor(headerBg[0], headerBg[1], headerBg[2]);
  doc.rect(margin, yPos, contentWidth, rowHeight, 'F');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  
  columns.forEach((col, index) => {
    const x = margin + (index * colWidth) + 2;
    doc.text(col.label, x, yPos + 5.5, { maxWidth: colWidth - 4 });
  });
  
  yPos += rowHeight;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  
  for (let i = 0; i < data.length; i++) {
    // Check for page break
    if (yPos > pageHeight - 20) {
      doc.addPage();
      yPos = margin;
      
      // Repeat header on new page
      doc.setFillColor(headerBg[0], headerBg[1], headerBg[2]);
      doc.rect(margin, yPos, contentWidth, rowHeight, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      columns.forEach((col, index) => {
        const x = margin + (index * colWidth) + 2;
        doc.text(col.label, x, yPos + 5.5, { maxWidth: colWidth - 4 });
      });
      yPos += rowHeight;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
    }

    // Alternating row colors
    if (i % 2 === 1) {
      doc.setFillColor(249, 250, 251);
      doc.rect(margin, yPos, contentWidth, rowHeight, 'F');
    }

    // Row border
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.line(margin, yPos + rowHeight, margin + contentWidth, yPos + rowHeight);

    const asset = data[i];
    const rowData = getRowDataForPDF(asset, reportType, isRTL);
    
    columns.forEach((col, index) => {
      const x = margin + (index * colWidth) + 2;
      const value = String(rowData[col.key] || '-');
      doc.text(value, x, yPos + 5.5, { maxWidth: colWidth - 4 });
    });
    
    yPos += rowHeight;
  }

  // Footer
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `${isRTL ? 'صفحة' : 'Page'} ${i} ${isRTL ? 'من' : 'of'} ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Save
  const filename = `asset_${reportType}_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(filename);
}

function getColumnsForPDF(type: ReportType, rtl: boolean): { key: string; label: string }[] {
  const baseColumns = [
    { key: 'asset_code', label: rtl ? 'كود الأصل' : 'Asset Code' },
    { key: 'name', label: rtl ? 'الاسم' : 'Name' },
    { key: 'category', label: rtl ? 'الفئة' : 'Category' },
    { key: 'status', label: rtl ? 'الحالة' : 'Status' }
  ];

  switch (type) {
    case 'valuation':
      return [
        ...baseColumns,
        { key: 'purchase_price', label: rtl ? 'سعر الشراء' : 'Purchase Price' },
        { key: 'current_book_value', label: rtl ? 'القيمة الدفترية' : 'Book Value' }
      ];
    case 'warranty':
      return [
        ...baseColumns,
        { key: 'warranty_expiry', label: rtl ? 'انتهاء الضمان' : 'Warranty Expiry' },
        { key: 'warranty_status', label: rtl ? 'حالة الضمان' : 'Warranty Status' }
      ];
    case 'location':
      return [
        ...baseColumns,
        { key: 'site', label: rtl ? 'الموقع' : 'Site' },
        { key: 'branch', label: rtl ? 'الفرع' : 'Branch' }
      ];
    case 'health':
      return [
        ...baseColumns,
        { key: 'health_score', label: rtl ? 'درجة الصحة' : 'Health Score' },
        { key: 'risk_level', label: rtl ? 'مستوى الخطر' : 'Risk Level' }
      ];
    case 'maintenance':
      return [
        ...baseColumns,
        { key: 'maintenance_count', label: rtl ? 'عدد الصيانات' : 'Maintenance Count' },
        { key: 'total_cost', label: rtl ? 'إجمالي التكلفة' : 'Total Cost' }
      ];
    default:
      return [
        ...baseColumns,
        { key: 'serial_number', label: rtl ? 'الرقم التسلسلي' : 'Serial Number' },
        { key: 'purchase_date', label: rtl ? 'تاريخ الشراء' : 'Purchase Date' }
      ];
  }
}

function getRowDataForPDF(asset: any, type: ReportType, rtl: boolean): Record<string, string> {
  const base: Record<string, string> = {
    asset_code: asset.asset_code || '-',
    name: rtl ? asset.name_ar || asset.name : asset.name || '-',
    category: rtl ? asset.category?.name_ar || asset.category?.name : asset.category?.name || '-',
    status: asset.status || '-'
  };

  switch (type) {
    case 'valuation':
      return {
        ...base,
        purchase_price: asset.purchase_price ? `${asset.purchase_price.toLocaleString()}` : '-',
        current_book_value: asset.current_book_value ? `${asset.current_book_value.toLocaleString()}` : '-'
      };
    case 'warranty':
      const warrantyExpiry = asset.warranty_expiry ? new Date(asset.warranty_expiry) : null;
      const isExpired = warrantyExpiry && warrantyExpiry < new Date();
      return {
        ...base,
        warranty_expiry: asset.warranty_expiry || '-',
        warranty_status: warrantyExpiry ? (isExpired ? (rtl ? 'منتهي' : 'Expired') : (rtl ? 'ساري' : 'Active')) : '-'
      };
    case 'location':
      return {
        ...base,
        site: rtl ? asset.site?.name_ar || asset.site?.name : asset.site?.name || '-',
        branch: rtl ? asset.branch?.name_ar || asset.branch?.name : asset.branch?.name || '-'
      };
    case 'health':
      return {
        ...base,
        health_score: asset.health?.score?.toString() || '-',
        risk_level: asset.health?.risk_level || '-'
      };
    case 'maintenance':
      const maintenanceHistory = asset.maintenance || [];
      return {
        ...base,
        maintenance_count: maintenanceHistory.length.toString(),
        total_cost: maintenanceHistory.reduce((sum: number, m: any) => sum + (m.cost || 0), 0).toLocaleString()
      };
    default:
      return {
        ...base,
        serial_number: asset.serial_number || '-',
        purchase_date: asset.purchase_date || '-'
      };
  }
}
