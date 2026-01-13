import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import type { ShiftHandover, OutstandingIssue, EquipmentItem } from '@/hooks/use-shift-handovers';
import { parseOutstandingIssues, parseEquipmentChecklist } from '@/hooks/use-shift-handovers';

interface HandoverReportData extends ShiftHandover {
  outgoing_guard?: { full_name: string | null; employee_id?: string };
  incoming_guard?: { full_name: string | null; employee_id?: string };
  zone?: { zone_name: string | null; zone_code?: string };
}

interface GenerateOptions {
  locale?: 'ar' | 'en';
  includeLogo?: boolean;
  logoUrl?: string;
}

const COLORS = {
  primary: [30, 58, 95] as [number, number, number],
  secondary: [100, 116, 139] as [number, number, number],
  success: [34, 197, 94] as [number, number, number],
  warning: [245, 158, 11] as [number, number, number],
  danger: [239, 68, 68] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
  background: [248, 250, 252] as [number, number, number],
};

export async function generateHandoverReportPDF(
  handover: HandoverReportData,
  options: GenerateOptions = {}
): Promise<Blob> {
  const { locale = 'en' } = options;
  const isRTL = locale === 'ar';
  const dateLocale = isRTL ? ar : enUS;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Helper functions
  const addText = (text: string, x: number, yPos: number, options?: { 
    fontSize?: number; 
    fontStyle?: 'normal' | 'bold'; 
    color?: [number, number, number];
    align?: 'left' | 'center' | 'right';
  }) => {
    const { fontSize = 10, fontStyle = 'normal', color = [0, 0, 0], align = 'left' } = options || {};
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontStyle);
    doc.setTextColor(...color);
    doc.text(text, x, yPos, { align });
  };

  const drawLine = (y: number, color: [number, number, number] = COLORS.border) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
  };

  const drawRect = (x: number, y: number, w: number, h: number, fill: [number, number, number]) => {
    doc.setFillColor(...fill);
    doc.rect(x, y, w, h, 'F');
  };

  // === HEADER ===
  drawRect(0, 0, pageWidth, 35, COLORS.primary);
  
  addText('SHIFT HANDOVER REPORT', pageWidth / 2, 15, {
    fontSize: 18,
    fontStyle: 'bold',
    color: [255, 255, 255],
    align: 'center',
  });
  
  const dateStr = format(new Date(handover.shift_date), 'PPP', { locale: dateLocale });
  const zoneStr = handover.zone?.zone_name || 'All Zones';
  addText(`Date: ${dateStr} | Zone: ${zoneStr}`, pageWidth / 2, 25, {
    fontSize: 11,
    color: [200, 210, 220],
    align: 'center',
  });

  y = 45;

  // === GUARD INFORMATION ===
  addText('GUARD DETAILS', margin, y, { fontSize: 12, fontStyle: 'bold', color: COLORS.primary });
  y += 8;
  drawLine(y);
  y += 8;

  const colWidth = contentWidth / 2 - 5;
  
  // Outgoing Guard
  drawRect(margin, y, colWidth, 30, COLORS.background);
  addText('OUTGOING GUARD', margin + 5, y + 8, { fontSize: 9, color: COLORS.secondary });
  addText(handover.outgoing_guard?.full_name || 'Unknown', margin + 5, y + 16, { fontSize: 12, fontStyle: 'bold' });
  if (handover.outgoing_guard?.employee_id) {
    addText(`ID: ${handover.outgoing_guard.employee_id}`, margin + 5, y + 24, { fontSize: 9, color: COLORS.secondary });
  }

  // Arrow
  addText('→', pageWidth / 2, y + 15, { fontSize: 16, align: 'center', color: COLORS.primary });

  // Incoming Guard
  drawRect(margin + colWidth + 10, y, colWidth, 30, COLORS.background);
  addText('INCOMING GUARD', margin + colWidth + 15, y + 8, { fontSize: 9, color: COLORS.secondary });
  addText(handover.incoming_guard?.full_name || 'Pending Assignment', margin + colWidth + 15, y + 16, { fontSize: 12, fontStyle: 'bold' });
  if (handover.incoming_guard?.employee_id) {
    addText(`ID: ${handover.incoming_guard.employee_id}`, margin + colWidth + 15, y + 24, { fontSize: 9, color: COLORS.secondary });
  }

  y += 40;

  // === SHIFT DETAILS ===
  const handoverTime = handover.handover_time 
    ? format(new Date(handover.handover_time), 'HH:mm') 
    : format(new Date(handover.created_at), 'HH:mm');
  
  addText(`Handover Time: ${handoverTime}`, margin, y, { fontSize: 10 });
  addText(`Status: ${handover.status.toUpperCase()}`, pageWidth - margin, y, { fontSize: 10, align: 'right', color: handover.status === 'completed' ? COLORS.success : COLORS.warning });
  y += 12;

  // === PENDING TASKS / OUTSTANDING ISSUES ===
  const issues = parseOutstandingIssues(handover.outstanding_issues);
  
  if (issues.length > 0) {
    addText('PENDING TASKS / OUTSTANDING ISSUES', margin, y, { fontSize: 12, fontStyle: 'bold', color: COLORS.primary });
    y += 6;
    drawLine(y);
    y += 6;

    // Table header
    drawRect(margin, y, contentWidth, 8, COLORS.primary);
    addText('#', margin + 3, y + 5.5, { fontSize: 9, fontStyle: 'bold', color: [255, 255, 255] });
    addText('Description', margin + 15, y + 5.5, { fontSize: 9, fontStyle: 'bold', color: [255, 255, 255] });
    addText('Priority', pageWidth - margin - 25, y + 5.5, { fontSize: 9, fontStyle: 'bold', color: [255, 255, 255] });
    y += 8;

    issues.forEach((issue, index) => {
      const rowBg = index % 2 === 0 ? [255, 255, 255] as [number, number, number] : COLORS.background;
      drawRect(margin, y, contentWidth, 8, rowBg);
      
      addText(`${index + 1}`, margin + 3, y + 5.5, { fontSize: 9 });
      
      const desc = issue.description.length > 60 ? issue.description.substring(0, 57) + '...' : issue.description;
      addText(desc, margin + 15, y + 5.5, { fontSize: 9 });
      
      const priorityColor = issue.priority === 'high' ? COLORS.danger : issue.priority === 'medium' ? COLORS.warning : COLORS.success;
      addText(issue.priority.toUpperCase(), pageWidth - margin - 25, y + 5.5, { fontSize: 8, color: priorityColor });
      
      y += 8;
    });
    y += 6;
  }

  // === EQUIPMENT CHECKLIST ===
  const equipment = parseEquipmentChecklist(handover.equipment_checklist);
  
  if (equipment.length > 0) {
    addText('EQUIPMENT CHECKLIST', margin, y, { fontSize: 12, fontStyle: 'bold', color: COLORS.primary });
    y += 6;
    drawLine(y);
    y += 6;

    // Table header
    drawRect(margin, y, contentWidth, 8, COLORS.primary);
    addText('Item', margin + 5, y + 5.5, { fontSize: 9, fontStyle: 'bold', color: [255, 255, 255] });
    addText('Status', margin + 80, y + 5.5, { fontSize: 9, fontStyle: 'bold', color: [255, 255, 255] });
    addText('Notes', margin + 110, y + 5.5, { fontSize: 9, fontStyle: 'bold', color: [255, 255, 255] });
    y += 8;

    equipment.forEach((item, index) => {
      const rowBg = index % 2 === 0 ? [255, 255, 255] as [number, number, number] : COLORS.background;
      drawRect(margin, y, contentWidth, 8, rowBg);
      
      addText(item.item, margin + 5, y + 5.5, { fontSize: 9 });
      
      const statusIcon = item.status === 'ok' ? '✓' : item.status === 'damaged' ? '⚠' : '✗';
      const statusColor = item.status === 'ok' ? COLORS.success : item.status === 'damaged' ? COLORS.warning : COLORS.danger;
      addText(`${statusIcon} ${item.status.toUpperCase()}`, margin + 80, y + 5.5, { fontSize: 9, color: statusColor });
      
      if (item.notes) {
        const notes = item.notes.length > 30 ? item.notes.substring(0, 27) + '...' : item.notes;
        addText(notes, margin + 110, y + 5.5, { fontSize: 8, color: COLORS.secondary });
      }
      
      y += 8;
    });
    y += 6;
  }

  // === KEY OBSERVATIONS ===
  if (handover.key_observations) {
    addText('KEY OBSERVATIONS', margin, y, { fontSize: 12, fontStyle: 'bold', color: COLORS.primary });
    y += 6;
    drawLine(y);
    y += 6;
    
    const lines = doc.splitTextToSize(handover.key_observations, contentWidth - 10);
    lines.forEach((line: string) => {
      addText(`• ${line}`, margin + 5, y, { fontSize: 9 });
      y += 5;
    });
    y += 4;
  }

  // === VISITOR INFO ===
  if (handover.visitor_info) {
    addText('VISITOR SUMMARY', margin, y, { fontSize: 12, fontStyle: 'bold', color: COLORS.primary });
    y += 6;
    drawLine(y);
    y += 6;
    addText(handover.visitor_info, margin + 5, y, { fontSize: 9 });
    y += 10;
  }

  // === NEXT SHIFT PRIORITIES ===
  if (handover.next_shift_priorities) {
    addText('PRIORITIES FOR NEXT SHIFT', margin, y, { fontSize: 12, fontStyle: 'bold', color: COLORS.primary });
    y += 6;
    drawLine(y);
    y += 6;
    
    const priorities = handover.next_shift_priorities.split('\n').filter(Boolean);
    priorities.forEach((priority, idx) => {
      addText(`${idx + 1}. ${priority}`, margin + 5, y, { fontSize: 9 });
      y += 5;
    });
    y += 4;
  }

  // === SIGNATURES ===
  if (handover.outgoing_signature || handover.incoming_signature) {
    y = Math.max(y, pageHeight - 50);
    drawLine(y);
    y += 8;
    
    addText('SIGNATURES', margin, y, { fontSize: 12, fontStyle: 'bold', color: COLORS.primary });
    y += 10;

    if (handover.outgoing_signature) {
      addText('Outgoing Guard:', margin, y, { fontSize: 9, color: COLORS.secondary });
      // Draw signature placeholder/image would go here
      addText('[Signed]', margin, y + 8, { fontSize: 10, fontStyle: 'bold' });
    }

    if (handover.incoming_signature) {
      addText('Incoming Guard:', pageWidth / 2 + 10, y, { fontSize: 9, color: COLORS.secondary });
      addText('[Signed]', pageWidth / 2 + 10, y + 8, { fontSize: 10, fontStyle: 'bold' });
    }

    if (handover.signature_timestamp) {
      addText(`Signed: ${format(new Date(handover.signature_timestamp), 'PPp', { locale: dateLocale })}`, margin, y + 18, { fontSize: 8, color: COLORS.secondary });
    }
  }

  // === FOOTER ===
  const footerY = pageHeight - 10;
  drawRect(0, footerY - 5, pageWidth, 15, COLORS.background);
  addText(`Generated: ${format(new Date(), 'PPp')}`, margin, footerY, { fontSize: 8, color: COLORS.secondary });
  addText('CONFIDENTIAL', pageWidth / 2, footerY, { fontSize: 8, color: COLORS.secondary, align: 'center' });
  addText(`Ref: ${handover.id.substring(0, 8).toUpperCase()}`, pageWidth - margin, footerY, { fontSize: 8, color: COLORS.secondary, align: 'right' });

  return doc.output('blob');
}

export function downloadHandoverPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
