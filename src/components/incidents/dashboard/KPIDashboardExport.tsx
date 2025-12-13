import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import { useTheme } from '@/contexts/ThemeContext';
import type { 
  LaggingIndicators, 
  LeadingIndicators, 
  ResponseMetrics, 
  PeopleMetrics 
} from '@/hooks/use-kpi-indicators';

interface KPIDashboardExportProps {
  laggingData: LaggingIndicators | null;
  leadingData: LeadingIndicators | null;
  responseData: ResponseMetrics | null;
  peopleData: PeopleMetrics | null;
  dateRange: { start: string; end: string };
  filters?: { branch?: string; site?: string };
}

export function KPIDashboardExport({
  laggingData,
  leadingData,
  responseData,
  peopleData,
  dateRange,
}: KPIDashboardExportProps) {
  const { t } = useTranslation();
  const { tenantName } = useTheme();
  const [isExporting, setIsExporting] = useState(false);

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = tenantName || 'HSSE Platform';
      workbook.created = new Date();

      // Summary Sheet
      const summarySheet = workbook.addWorksheet(t('kpiDashboard.summary', 'Summary'));
      summarySheet.columns = [
        { header: 'KPI', key: 'kpi', width: 35 },
        { header: 'Value', key: 'value', width: 20 },
        { header: 'Unit', key: 'unit', width: 15 },
      ];

      summarySheet.addRow({ kpi: t('common.dateRange', 'Date Range'), value: `${dateRange.start} - ${dateRange.end}`, unit: '' });
      summarySheet.addRow({});

      if (laggingData) {
        summarySheet.addRow({ kpi: 'TRIR', value: laggingData.trir.toFixed(2), unit: 'per 200k hrs' });
        summarySheet.addRow({ kpi: 'LTIFR', value: laggingData.ltifr.toFixed(2), unit: 'per 200k hrs' });
        summarySheet.addRow({ kpi: 'DART Rate', value: laggingData.dart_rate.toFixed(2), unit: 'per 200k hrs' });
        summarySheet.addRow({ kpi: 'Fatality Rate', value: laggingData.fatality_rate.toFixed(4), unit: 'per 200k hrs' });
        summarySheet.addRow({ kpi: 'Severity Rate', value: laggingData.severity_rate.toFixed(2), unit: 'days/incident' });
      }

      if (leadingData) {
        summarySheet.addRow({});
        summarySheet.addRow({ kpi: 'Near Miss Rate', value: leadingData.near_miss_rate.toFixed(2), unit: 'per 200k hrs' });
        summarySheet.addRow({ kpi: 'Action Closure %', value: leadingData.action_closure_pct.toFixed(1), unit: '%' });
        summarySheet.addRow({ kpi: 'Observation Completion %', value: leadingData.observation_completion_pct.toFixed(1), unit: '%' });
      }

      // Style header row
      summarySheet.getRow(1).font = { bold: true };
      summarySheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
      summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

      // Lagging Indicators Sheet
      if (laggingData) {
        const laggingSheet = workbook.addWorksheet(t('kpiDashboard.lagging', 'Lagging Indicators'));
        laggingSheet.columns = [
          { header: 'Metric', key: 'metric', width: 30 },
          { header: 'Value', key: 'value', width: 15 },
        ];
        laggingSheet.addRow({ metric: 'Total Recordable Injuries', value: laggingData.total_recordable_injuries });
        laggingSheet.addRow({ metric: 'Lost Time Injuries', value: laggingData.lost_time_injuries });
        laggingSheet.addRow({ metric: 'Restricted Duty Cases', value: laggingData.restricted_duty_cases });
        laggingSheet.addRow({ metric: 'Fatalities', value: laggingData.fatalities });
        laggingSheet.addRow({ metric: 'Total Lost Days', value: laggingData.total_lost_days });
        laggingSheet.addRow({ metric: 'Total Man-Hours', value: laggingData.total_manhours });
        laggingSheet.getRow(1).font = { bold: true };
      }

      // Leading Indicators Sheet
      if (leadingData) {
        const leadingSheet = workbook.addWorksheet(t('kpiDashboard.leading', 'Leading Indicators'));
        leadingSheet.columns = [
          { header: 'Metric', key: 'metric', width: 30 },
          { header: 'Value', key: 'value', width: 15 },
        ];
        leadingSheet.addRow({ metric: 'Total Near Misses', value: leadingData.total_near_misses });
        leadingSheet.addRow({ metric: 'Total Observations', value: leadingData.total_observations });
        leadingSheet.addRow({ metric: 'Closed Observations', value: leadingData.closed_observations });
        leadingSheet.addRow({ metric: 'Total Actions', value: leadingData.total_actions });
        leadingSheet.addRow({ metric: 'Closed Actions', value: leadingData.closed_actions });
        leadingSheet.addRow({ metric: 'Total Hazards Identified', value: leadingData.total_hazards });
        leadingSheet.getRow(1).font = { bold: true };
      }

      // Response Metrics Sheet
      if (responseData) {
        const responseSheet = workbook.addWorksheet(t('kpiDashboard.response', 'Response Metrics'));
        responseSheet.columns = [
          { header: 'Metric', key: 'metric', width: 35 },
          { header: 'Value', key: 'value', width: 15 },
        ];
        responseSheet.addRow({ metric: 'Avg Investigation Days', value: responseData.avg_investigation_days.toFixed(1) });
        responseSheet.addRow({ metric: 'Within Target %', value: responseData.within_target_pct.toFixed(1) + '%' });
        responseSheet.addRow({ metric: 'Repeat Incident Rate', value: responseData.repeat_incident_rate.toFixed(2) });
        responseSheet.addRow({ metric: 'Total Investigations', value: responseData.total_investigations });
        responseSheet.addRow({ metric: 'Total Incidents', value: responseData.total_incidents });
        responseSheet.getRow(1).font = { bold: true };
      }

      // People Metrics Sheet
      if (peopleData) {
        const peopleSheet = workbook.addWorksheet(t('kpiDashboard.people', 'People Metrics'));
        peopleSheet.columns = [
          { header: 'Metric', key: 'metric', width: 30 },
          { header: 'Value', key: 'value', width: 15 },
        ];
        peopleSheet.addRow({ metric: 'Total Man-Hours', value: peopleData.total_manhours });
        peopleSheet.addRow({ metric: 'Employee Hours', value: peopleData.employee_hours });
        peopleSheet.addRow({ metric: 'Contractor Hours', value: peopleData.contractor_hours });
        peopleSheet.addRow({ metric: 'Employee Incidents', value: peopleData.employee_incidents });
        peopleSheet.addRow({ metric: 'Contractor Incidents', value: peopleData.contractor_incidents });
        peopleSheet.addRow({ metric: 'Contractor Ratio', value: (peopleData.contractor_ratio * 100).toFixed(1) + '%' });
        peopleSheet.getRow(1).font = { bold: true };
      }

      // Generate file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `KPI_Dashboard_${dateRange.start}_${dateRange.end}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success(t('kpiDashboard.exportSuccess', 'Report exported successfully'));
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error(t('kpiDashboard.exportError', 'Failed to export report'));
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFontSize(20);
      doc.setTextColor(0, 51, 102);
      doc.text(t('kpiDashboard.title', 'HSSE Manager KPI Dashboard'), pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`${tenantName || 'Organization'}`, pageWidth / 2, 28, { align: 'center' });
      doc.text(`${t('common.dateRange', 'Date Range')}: ${dateRange.start} - ${dateRange.end}`, pageWidth / 2, 35, { align: 'center' });

      // KPI Summary
      let yPos = 50;
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(t('kpiDashboard.lagging', 'Lagging Indicators'), 20, yPos);

      yPos += 10;
      doc.setFontSize(11);
      if (laggingData) {
        const laggingItems = [
          { label: 'TRIR', value: laggingData.trir.toFixed(2) },
          { label: 'LTIFR', value: laggingData.ltifr.toFixed(2) },
          { label: 'DART Rate', value: laggingData.dart_rate.toFixed(2) },
          { label: 'Fatality Rate', value: laggingData.fatality_rate.toFixed(4) },
          { label: 'Severity Rate', value: laggingData.severity_rate.toFixed(2) },
        ];

        laggingItems.forEach((item, i) => {
          doc.text(`${item.label}: ${item.value}`, 25 + (i % 3) * 80, yPos + Math.floor(i / 3) * 8);
        });
      }

      yPos += 30;
      doc.setFontSize(14);
      doc.text(t('kpiDashboard.leading', 'Leading Indicators'), 20, yPos);

      yPos += 10;
      doc.setFontSize(11);
      if (leadingData) {
        const leadingItems = [
          { label: 'Near Miss Rate', value: leadingData.near_miss_rate.toFixed(2) },
          { label: 'Action Closure %', value: leadingData.action_closure_pct.toFixed(1) + '%' },
          { label: 'Observation %', value: leadingData.observation_completion_pct.toFixed(1) + '%' },
        ];

        leadingItems.forEach((item, i) => {
          doc.text(`${item.label}: ${item.value}`, 25 + i * 80, yPos);
        });
      }

      yPos += 20;
      doc.setFontSize(14);
      doc.text(t('kpiDashboard.response', 'Response Metrics'), 20, yPos);

      yPos += 10;
      doc.setFontSize(11);
      if (responseData) {
        doc.text(`Avg Investigation Days: ${responseData.avg_investigation_days.toFixed(1)}`, 25, yPos);
        doc.text(`Within Target: ${responseData.within_target_pct.toFixed(1)}%`, 105, yPos);
        doc.text(`Repeat Rate: ${responseData.repeat_incident_rate.toFixed(2)}`, 185, yPos);
      }

      // Footer
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(9);
      doc.setTextColor(128, 128, 128);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, pageHeight - 10);
      doc.text(`Page 1 of 1`, pageWidth - 30, pageHeight - 10);

      doc.save(`KPI_Dashboard_${dateRange.start}_${dateRange.end}.pdf`);
      toast.success(t('kpiDashboard.exportSuccess', 'Report exported successfully'));
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error(t('kpiDashboard.exportError', 'Failed to export report'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="me-2 h-4 w-4" />
          )}
          {t('common.export', 'Export')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToExcel}>
          <FileSpreadsheet className="me-2 h-4 w-4" />
          {t('kpiDashboard.exportExcel', 'Export to Excel')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPDF}>
          <FileText className="me-2 h-4 w-4" />
          {t('kpiDashboard.exportPdf', 'Export to PDF')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
