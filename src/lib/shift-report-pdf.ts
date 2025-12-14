import jsPDF from 'jspdf';
import { format } from 'date-fns';

interface ShiftReport {
  shift: {
    name: string;
    zone: string;
    start_time: string;
    end_time: string;
    date: string;
  };
  guards: Array<{
    id: string;
    name: string;
    title: string;
  }>;
  summary: {
    total_visitors: number;
    total_contractors: number;
    total_patrols: number;
    total_incidents: number;
    total_alerts: number;
  };
  visitors?: Array<{
    name: string;
    entry_time: string;
    exit_time?: string;
    destination: string;
    car_plate?: string;
    purpose?: string;
  }>;
  contractors?: Array<{
    name: string;
    company?: string;
    entry_time: string;
    exit_time?: string;
    validation_status: string;
    access_type: string;
  }>;
  patrols?: Array<{
    checkpoint_name: string;
    checked_at: string;
    status: string;
    notes?: string;
    distance_from_checkpoint?: number;
  }>;
  incidents?: Array<{
    id: string;
    reference_id: string;
    title: string;
    severity: string;
    event_type: string;
    occurred_at: string;
    status: string;
  }>;
  alerts?: Array<{
    guard_name: string;
    zone_name: string;
    alert_type: string;
    severity: string;
    message?: string;
    created_at: string;
    resolved_at?: string;
  }>;
  generated_at: string;
}

interface BrandingConfig {
  tenantName: string;
  logoUrl?: string;
  primaryColor?: string;
}

export async function generateShiftReportPDF(
  report: ShiftReport,
  branding: BrandingConfig
): Promise<Blob> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  // Helper functions
  const addPage = () => {
    pdf.addPage();
    yPos = margin;
  };

  const checkPageBreak = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      addPage();
    }
  };

  const drawHeader = () => {
    // Title
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Security Shift Report', margin, yPos);
    yPos += 8;

    // Tenant name
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100);
    pdf.text(branding.tenantName, margin, yPos);
    yPos += 6;

    // Generation date
    pdf.setFontSize(9);
    pdf.text(`Generated: ${format(new Date(report.generated_at), 'PPpp')}`, margin, yPos);
    pdf.setTextColor(0);
    yPos += 10;
  };

  const drawShiftInfo = () => {
    checkPageBreak(40);

    pdf.setFillColor(240, 240, 240);
    pdf.roundedRect(margin, yPos, pageWidth - 2 * margin, 35, 3, 3, 'F');

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Shift Information', margin + 5, yPos + 8);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const col1X = margin + 5;
    const col2X = margin + 80;

    pdf.text(`Shift: ${report.shift.name}`, col1X, yPos + 16);
    pdf.text(`Zone: ${report.shift.zone || 'N/A'}`, col2X, yPos + 16);
    pdf.text(`Date: ${format(new Date(report.shift.date), 'PPP')}`, col1X, yPos + 24);
    pdf.text(`Time: ${report.shift.start_time} - ${report.shift.end_time}`, col2X, yPos + 24);

    yPos += 42;
  };

  const drawSummary = () => {
    checkPageBreak(30);

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Summary', margin, yPos);
    yPos += 8;

    const boxWidth = (pageWidth - 2 * margin - 20) / 5;
    const summaryItems = [
      { label: 'Visitors', value: report.summary.total_visitors },
      { label: 'Contractors', value: report.summary.total_contractors },
      { label: 'Patrols', value: report.summary.total_patrols },
      { label: 'Incidents', value: report.summary.total_incidents },
      { label: 'Alerts', value: report.summary.total_alerts },
    ];

    summaryItems.forEach((item, index) => {
      const x = margin + index * (boxWidth + 5);
      pdf.setFillColor(245, 245, 245);
      pdf.roundedRect(x, yPos, boxWidth, 20, 2, 2, 'F');

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(String(item.value), x + boxWidth / 2, yPos + 9, { align: 'center' });

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100);
      pdf.text(item.label, x + boxWidth / 2, yPos + 16, { align: 'center' });
      pdf.setTextColor(0);
    });

    yPos += 28;
  };

  const drawGuards = () => {
    if (!report.guards || report.guards.length === 0) return;

    checkPageBreak(20 + report.guards.length * 6);

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Assigned Guards', margin, yPos);
    yPos += 8;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    report.guards.forEach((guard) => {
      pdf.text(`• ${guard.name || 'Unknown'} - ${guard.title || 'Guard'}`, margin + 5, yPos);
      yPos += 5;
    });

    yPos += 5;
  };

  const drawTable = (
    title: string,
    headers: string[],
    rows: string[][],
    colWidths: number[]
  ) => {
    if (rows.length === 0) return;

    checkPageBreak(25);

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, margin, yPos);
    yPos += 8;

    // Table header
    pdf.setFillColor(50, 50, 50);
    pdf.rect(margin, yPos, pageWidth - 2 * margin, 7, 'F');

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255);

    let xPos = margin + 2;
    headers.forEach((header, index) => {
      pdf.text(header, xPos, yPos + 5);
      xPos += colWidths[index];
    });

    pdf.setTextColor(0);
    yPos += 8;

    // Table rows
    pdf.setFont('helvetica', 'normal');
    rows.forEach((row, rowIndex) => {
      checkPageBreak(7);

      if (rowIndex % 2 === 0) {
        pdf.setFillColor(248, 248, 248);
        pdf.rect(margin, yPos - 1, pageWidth - 2 * margin, 6, 'F');
      }

      xPos = margin + 2;
      row.forEach((cell, colIndex) => {
        const truncatedCell = cell.length > 25 ? cell.substring(0, 22) + '...' : cell;
        pdf.text(truncatedCell, xPos, yPos + 3);
        xPos += colWidths[colIndex];
      });

      yPos += 6;
    });

    yPos += 5;
  };

  // Generate PDF content
  drawHeader();
  drawShiftInfo();
  drawSummary();
  drawGuards();

  // Visitors table
  if (report.visitors && report.visitors.length > 0) {
    const visitorRows = report.visitors.map((v) => [
      v.name || 'N/A',
      v.entry_time ? format(new Date(v.entry_time), 'HH:mm') : '--',
      v.exit_time ? format(new Date(v.exit_time), 'HH:mm') : '--',
      v.destination || 'N/A',
      v.car_plate || '--',
    ]);
    drawTable(
      `Visitors (${report.summary.total_visitors})`,
      ['Name', 'Entry', 'Exit', 'Destination', 'Plate'],
      visitorRows,
      [50, 25, 25, 50, 30]
    );
  }

  // Contractors table
  if (report.contractors && report.contractors.length > 0) {
    const contractorRows = report.contractors.map((c) => [
      c.name || 'N/A',
      c.company || 'N/A',
      c.entry_time ? format(new Date(c.entry_time), 'HH:mm') : '--',
      c.validation_status || 'N/A',
    ]);
    drawTable(
      `Contractors (${report.summary.total_contractors})`,
      ['Name', 'Company', 'Entry', 'Status'],
      contractorRows,
      [50, 50, 30, 50]
    );
  }

  // Patrol logs table
  if (report.patrols && report.patrols.length > 0) {
    const patrolRows = report.patrols.map((p) => [
      p.checkpoint_name || 'N/A',
      p.checked_at ? format(new Date(p.checked_at), 'HH:mm') : '--',
      p.status || 'N/A',
      p.distance_from_checkpoint ? `${p.distance_from_checkpoint.toFixed(0)}m` : '--',
    ]);
    drawTable(
      `Patrol Checkpoints (${report.summary.total_patrols})`,
      ['Checkpoint', 'Time', 'Status', 'Distance'],
      patrolRows,
      [60, 30, 40, 50]
    );
  }

  // Incidents table
  if (report.incidents && report.incidents.length > 0) {
    const incidentRows = report.incidents.map((i) => [
      i.reference_id || 'N/A',
      i.title?.substring(0, 30) || 'N/A',
      i.severity || 'N/A',
      i.status || 'N/A',
    ]);
    drawTable(
      `Incidents (${report.summary.total_incidents})`,
      ['Reference', 'Title', 'Severity', 'Status'],
      incidentRows,
      [40, 70, 35, 35]
    );
  }

  // Alerts table
  if (report.alerts && report.alerts.length > 0) {
    const alertRows = report.alerts.map((a) => [
      a.guard_name || 'N/A',
      a.alert_type || 'N/A',
      a.created_at ? format(new Date(a.created_at), 'HH:mm') : '--',
      a.resolved_at ? format(new Date(a.resolved_at), 'HH:mm') : 'Open',
    ]);
    drawTable(
      `Geofence Alerts (${report.summary.total_alerts})`,
      ['Guard', 'Type', 'Created', 'Resolved'],
      alertRows,
      [50, 50, 40, 40]
    );
  }

  // Footer on each page
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    pdf.text(
      `${branding.tenantName} - Confidential`,
      margin,
      pageHeight - 10
    );
  }

  return pdf.output('blob');
}
