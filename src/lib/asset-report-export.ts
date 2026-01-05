/**
 * Asset Report Export Utility
 * Generates Excel and PDF reports from asset data
 */

import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';

interface ReportColumn {
  id: string;
  label: string;
}

interface ReportFilter {
  field: string;
  operator: string;
  value: string;
}

/**
 * Export assets to Excel format
 */
export async function exportToExcel(
  data: Record<string, unknown>[],
  columns: ReportColumn[],
  reportTitle: string = 'Asset Report'
): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'HSSE Platform';
  workbook.created = new Date();
  
  const worksheet = workbook.addWorksheet('Assets', {
    views: [{ rightToLeft: false }], // Will be flipped for RTL if needed
  });
  
  // Add title row
  const titleRow = worksheet.addRow([reportTitle]);
  titleRow.font = { bold: true, size: 16 };
  worksheet.mergeCells(1, 1, 1, columns.length);
  
  // Add empty row
  worksheet.addRow([]);
  
  // Add headers
  const headerRow = worksheet.addRow(columns.map(col => col.label));
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' },
  };
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  
  // Set column widths
  columns.forEach((col, index) => {
    worksheet.getColumn(index + 1).width = getColumnWidth(col.id);
  });
  
  // Add data rows
  data.forEach((item) => {
    const rowData = columns.map(col => formatCellValue(item, col.id));
    const row = worksheet.addRow(rowData);
    
    // Alternate row colors
    if (worksheet.rowCount % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3F4F6' },
      };
    }
  });
  
  // Add auto-filter
  worksheet.autoFilter = {
    from: { row: 3, column: 1 },
    to: { row: worksheet.rowCount, column: columns.length },
  };
  
  // Generate blob
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
}

/**
 * Export assets to PDF format
 */
export async function exportToPDF(
  data: Record<string, unknown>[],
  columns: ReportColumn[],
  reportTitle: string = 'Asset Report'
): Promise<Blob> {
  // Create PDF in landscape for better table fit
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  
  // Add title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(reportTitle, margin, 20);
  
  // Add generation date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, 28);
  
  // Calculate column widths
  const availableWidth = pageWidth - (margin * 2);
  const colWidth = Math.min(availableWidth / columns.length, 40);
  
  // Table settings
  let currentY = 35;
  const rowHeight = 8;
  const headerHeight = 10;
  
  // Draw header
  doc.setFillColor(79, 70, 229); // Indigo
  doc.rect(margin, currentY, availableWidth, headerHeight, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  
  columns.forEach((col, index) => {
    const x = margin + (index * colWidth) + 2;
    const text = truncateText(col.label, colWidth - 4);
    doc.text(text, x, currentY + 7);
  });
  
  currentY += headerHeight;
  
  // Draw data rows
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  
  data.forEach((item, rowIndex) => {
    // Check if we need a new page
    if (currentY + rowHeight > pageHeight - margin) {
      doc.addPage();
      currentY = margin;
      
      // Redraw header on new page
      doc.setFillColor(79, 70, 229);
      doc.rect(margin, currentY, availableWidth, headerHeight, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      
      columns.forEach((col, index) => {
        const x = margin + (index * colWidth) + 2;
        const text = truncateText(col.label, colWidth - 4);
        doc.text(text, x, currentY + 7);
      });
      
      currentY += headerHeight;
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
    }
    
    // Alternate row background
    if (rowIndex % 2 === 0) {
      doc.setFillColor(243, 244, 246);
      doc.rect(margin, currentY, availableWidth, rowHeight, 'F');
    }
    
    // Draw cell values
    columns.forEach((col, index) => {
      const x = margin + (index * colWidth) + 2;
      const value = formatCellValue(item, col.id);
      const text = truncateText(String(value), colWidth - 4);
      doc.text(text, x, currentY + 5.5);
    });
    
    currentY += rowHeight;
  });
  
  // Add page numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin - 25,
      pageHeight - 10
    );
  }
  
  return doc.output('blob');
}

/**
 * Get appropriate column width for Excel
 */
function getColumnWidth(columnId: string): number {
  const widthMap: Record<string, number> = {
    asset_code: 18,
    name: 30,
    description: 40,
    serial_number: 20,
    category: 18,
    type: 18,
    subtype: 18,
    status: 15,
    condition_rating: 15,
    criticality_level: 15,
    branch: 20,
    site: 20,
    building: 18,
    floor_zone: 15,
    manufacturer: 20,
    model: 20,
    purchase_price: 15,
    current_book_value: 15,
    salvage_value: 15,
    currency: 10,
    installation_date: 15,
    warranty_expiry: 15,
    next_inspection_due: 18,
    created_at: 18,
    gps_lat: 12,
    gps_lng: 12,
  };
  
  return widthMap[columnId] || 15;
}

/**
 * Format cell value for export
 */
function formatCellValue(item: Record<string, unknown>, columnId: string): string | number {
  const value = getNestedValue(item, columnId);
  
  if (value === null || value === undefined) {
    return '';
  }
  
  // Handle nested objects (relations)
  if (typeof value === 'object' && value !== null) {
    if ('name' in value) {
      return String((value as { name: string }).name);
    }
    if ('name_ar' in value) {
      return String((value as { name_ar: string }).name_ar || '');
    }
    return JSON.stringify(value);
  }
  
  // Handle dates
  if (columnId.includes('date') || columnId.includes('_at') || columnId.includes('expiry') || columnId.includes('due')) {
    if (typeof value === 'string' && value.includes('T')) {
      return new Date(value).toLocaleDateString();
    }
  }
  
  // Handle numbers
  if (typeof value === 'number') {
    if (columnId.includes('price') || columnId.includes('value') || columnId.includes('cost')) {
      return value.toLocaleString();
    }
    return value;
  }
  
  // Handle status/condition values
  if (columnId === 'status' || columnId === 'condition_rating' || columnId === 'criticality_level') {
    return String(value).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  
  return String(value);
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  // Handle relation fields
  const relationMap: Record<string, string> = {
    category: 'category.name',
    type: 'type.name',
    subtype: 'subtype.name',
    branch: 'branch.name',
    site: 'site.name',
    building: 'building.name',
    floor_zone: 'floor_zone.name',
  };
  
  const actualPath = relationMap[path] || path;
  const parts = actualPath.split('.');
  
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  
  return current;
}

/**
 * Truncate text to fit in column
 */
function truncateText(text: string, maxWidth: number): string {
  // Rough approximation: 2 chars per mm at font size 8-9
  const maxChars = Math.floor(maxWidth * 2);
  
  if (text.length <= maxChars) {
    return text;
  }
  
  return text.substring(0, maxChars - 3) + '...';
}

/**
 * Build select query for Supabase based on columns
 */
export function buildSelectQuery(columns: string[]): string {
  const baseFields = new Set<string>();
  const relations = new Set<string>();
  
  const relationFields: Record<string, string> = {
    category: 'category:asset_categories!hsse_assets_category_id_fkey(id, name, name_ar)',
    type: 'type:asset_types!hsse_assets_type_id_fkey(id, name, name_ar)',
    subtype: 'subtype:asset_subtypes!hsse_assets_subtype_id_fkey(id, name, name_ar)',
    branch: 'branch:branches!hsse_assets_branch_id_fkey(id, name)',
    site: 'site:sites!hsse_assets_site_id_fkey(id, name)',
    building: 'building:buildings!hsse_assets_building_id_fkey(id, name, name_ar)',
    floor_zone: 'floor_zone:floors_zones!hsse_assets_floor_zone_id_fkey(id, name, name_ar)',
  };
  
  columns.forEach(col => {
    if (relationFields[col]) {
      relations.add(relationFields[col]);
    } else {
      baseFields.add(col);
    }
  });
  
  // Always include id
  baseFields.add('id');
  
  const selectParts = [...baseFields, ...relations];
  return selectParts.join(', ');
}
