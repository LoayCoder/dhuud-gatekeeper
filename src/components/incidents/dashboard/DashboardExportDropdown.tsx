import { useState, RefObject } from "react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Download, FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { exportToCSV, ExportColumn } from "@/lib/export-utils";
import { 
  generateBrandedPDFFromElement, 
  preloadImageWithDimensions,
} from "@/lib/pdf-utils";
import { useDocumentBranding } from "@/hooks/use-document-branding";
import { useTheme } from "@/contexts/ThemeContext";
import type { HSSEEventDashboardData } from "@/hooks/use-hsse-event-dashboard";
import type { EventsByLocationData } from "@/hooks/use-events-by-location";
import ExcelJS from "exceljs";
import { format } from "date-fns";

interface RCAData {
  root_cause_distribution?: Array<{ category: string; count: number; percentage: number }>;
}

interface DashboardExportDropdownProps {
  dashboardRef: RefObject<HTMLElement>;
  dashboardData?: HSSEEventDashboardData;
  locationData?: EventsByLocationData;
  rcaData?: RCAData;
}

export function DashboardExportDropdown({
  dashboardRef,
  dashboardData,
  locationData,
  rcaData,
}: DashboardExportDropdownProps) {
  const { t, i18n } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);
  const { getHeaderConfig, getFooterConfig, getWatermarkConfig } = useDocumentBranding();
  const { activeLogoUrl } = useTheme();

  const isRTL = i18n.dir() === "rtl";

  // Generate filename with date
  const getExportFilename = (type: string, extension: string) => {
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    return `HSSE-Dashboard-${type}-${dateStr}.${extension}`;
  };

  // Get KPI data for export
  const getKPIData = () => {
    if (!dashboardData) return [];
    const { summary, actions } = dashboardData;
    
    return [
      { metric: t('hsseDashboard.totalEvents'), value: summary.total_events, period: t('hsseDashboard.export.currentPeriod') },
      { metric: t('hsseDashboard.totalIncidents'), value: summary.total_incidents, period: t('hsseDashboard.export.currentPeriod') },
      { metric: t('hsseDashboard.totalObservations'), value: summary.total_observations, period: t('hsseDashboard.export.currentPeriod') },
      { metric: t('hsseDashboard.openInvestigations'), value: summary.open_investigations, period: t('hsseDashboard.export.current') },
      { metric: t('hsseDashboard.closedThisMonth'), value: summary.closed_this_month, period: t('hsseDashboard.export.thisMonth') },
      { metric: t('hsseDashboard.avgClosureDays'), value: `${summary.avg_closure_days} ${t('hsseDashboard.export.days')}`, period: t('hsseDashboard.export.average') },
      { metric: t('hsseDashboard.overdueActions'), value: actions.overdue_actions, period: t('hsseDashboard.export.current') },
      { metric: t('hsseDashboard.totalActions'), value: actions.total_actions, period: t('hsseDashboard.export.currentPeriod') },
    ];
  };

  const kpiColumns: ExportColumn[] = [
    { key: 'metric', label: t('hsseDashboard.export.metric') },
    { key: 'value', label: t('hsseDashboard.export.value') },
    { key: 'period', label: t('hsseDashboard.export.period') },
  ];

  // Get distribution data for export
  const getDistributionData = () => {
    if (!dashboardData) return [];
    const rows: { category: string; type: string; count: number; percentage: string }[] = [];

    // Event type distribution
    const eventTypes = dashboardData.by_event_type;
    const totalEvents = Object.values(eventTypes).reduce((sum, val) => sum + val, 0) || 1;
    Object.entries(eventTypes).forEach(([key, value]) => {
      rows.push({
        category: t('hsseDashboard.export.eventType'),
        type: key,
        count: value,
        percentage: `${((value / totalEvents) * 100).toFixed(1)}%`,
      });
    });

    // Severity distribution
    const severities = dashboardData.by_severity;
    const totalSeverity = Object.values(severities).reduce((sum, val) => sum + val, 0) || 1;
    Object.entries(severities).forEach(([key, value]) => {
      rows.push({
        category: t('hsseDashboard.export.severity'),
        type: key,
        count: value,
        percentage: `${((value / totalSeverity) * 100).toFixed(1)}%`,
      });
    });

    return rows;
  };

  const distributionColumns: ExportColumn[] = [
    { key: 'category', label: t('hsseDashboard.export.category') },
    { key: 'type', label: t('hsseDashboard.export.type') },
    { key: 'count', label: t('hsseDashboard.export.count') },
    { key: 'percentage', label: t('hsseDashboard.export.percentage') },
  ];

  // Get trend data for export
  const getTrendData = () => {
    return dashboardData?.monthly_trend || [];
  };

  const trendColumns: ExportColumn[] = [
    { key: 'month', label: t('hsseDashboard.export.month') },
    { key: 'total', label: t('hsseDashboard.export.totalEvents') },
    { key: 'incidents', label: t('hsseDashboard.export.incidents') },
    { key: 'observations', label: t('hsseDashboard.export.observations') },
  ];

  // Get location data for export
  const getLocationData = () => {
    if (!locationData) return [];
    const rows: { locationType: string; name: string; events: number }[] = [];

    locationData.by_branch?.forEach(item => {
      rows.push({
        locationType: t('hsseDashboard.export.branch'),
        name: item.branch_name || '',
        events: item.total_events || 0,
      });
    });

    locationData.by_site?.forEach(item => {
      rows.push({
        locationType: t('hsseDashboard.export.site'),
        name: item.site_name || '',
        events: item.total_events || 0,
      });
    });

    locationData.by_department?.forEach(item => {
      rows.push({
        locationType: t('hsseDashboard.export.department'),
        name: item.department_name || '',
        events: item.total_events || 0,
      });
    });

    return rows;
  };

  const locationColumns: ExportColumn[] = [
    { key: 'locationType', label: t('hsseDashboard.export.locationType') },
    { key: 'name', label: t('hsseDashboard.export.name') },
    { key: 'events', label: t('hsseDashboard.export.events') },
  ];

  // Get RCA data for export
  const getRCAData = () => {
    return rcaData?.root_cause_distribution?.map(item => ({
      rootCause: item.category,
      frequency: item.count,
      percentage: `${item.percentage.toFixed(1)}%`,
    })) || [];
  };

  const rcaColumns: ExportColumn[] = [
    { key: 'rootCause', label: t('hsseDashboard.export.rootCause') },
    { key: 'frequency', label: t('hsseDashboard.export.frequency') },
    { key: 'percentage', label: t('hsseDashboard.export.percentage') },
  ];

  const handlePDFExport = async (fullReport: boolean) => {
    if (!dashboardRef.current) {
      toast.error(t('hsseDashboard.export.error'));
      return;
    }

    setIsExporting(true);
    try {
      const headerConfig = getHeaderConfig();
      const footerConfig = getFooterConfig();
      const watermarkConfig = getWatermarkConfig();

      // Preload logo
      let logoData = null;
      if (headerConfig.logoUrl) {
        logoData = await preloadImageWithDimensions(headerConfig.logoUrl);
      }

      // Generate PDF from the dashboard element
      await generateBrandedPDFFromElement(dashboardRef.current, {
        filename: getExportFilename(fullReport ? 'Full-Report' : 'Summary', 'pdf'),
        margin: 10,
        quality: 2,
        header: {
          logoBase64: logoData?.base64 || null,
          logoWidth: logoData?.width,
          logoHeight: logoData?.height,
          logoPosition: headerConfig.logoPosition as 'left' | 'center' | 'right',
          primaryText: headerConfig.primaryText,
          secondaryText: headerConfig.secondaryText,
          bgColor: headerConfig.backgroundColor,
          textColor: headerConfig.textColor,
        },
        footer: {
          text: footerConfig.text,
          showPageNumbers: footerConfig.showPageNumbers,
          showDatePrinted: footerConfig.showDatePrinted,
          bgColor: footerConfig.backgroundColor,
          textColor: footerConfig.textColor,
        },
        watermark: {
          text: watermarkConfig.text,
          enabled: watermarkConfig.enabled,
          opacity: watermarkConfig.opacity,
        },
        isRTL,
      });

      toast.success(t('hsseDashboard.export.success'));
    } catch (error) {
      console.error("PDF export failed:", error);
      toast.error(t('hsseDashboard.export.error'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleCSVExport = () => {
    try {
      const kpiData = getKPIData();
      
      exportToCSV(
        kpiData as Record<string, unknown>[],
        getExportFilename('KPIs', 'csv'),
        kpiColumns
      );

      toast.success(t('hsseDashboard.export.success'));
    } catch (error) {
      console.error("CSV export failed:", error);
      toast.error(t('hsseDashboard.export.error'));
    }
  };

  const handleExcelExport = async () => {
    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'HSSE Dashboard';
      workbook.created = new Date();

      // Sheet 1: Summary KPIs
      const summarySheet = workbook.addWorksheet(t('hsseDashboard.export.sheetSummary'));
      const kpiData = getKPIData();
      
      summarySheet.columns = kpiColumns.map(col => ({
        header: col.label,
        key: col.key,
        width: 25,
      }));
      summarySheet.addRows(kpiData);
      styleHeaderRow(summarySheet);

      // Sheet 2: Distribution Data
      const distSheet = workbook.addWorksheet(t('hsseDashboard.export.sheetDistribution'));
      const distData = getDistributionData();
      
      distSheet.columns = distributionColumns.map(col => ({
        header: col.label,
        key: col.key,
        width: 20,
      }));
      distSheet.addRows(distData);
      styleHeaderRow(distSheet);

      // Sheet 3: Monthly Trends
      const trendSheet = workbook.addWorksheet(t('hsseDashboard.export.sheetTrends'));
      const trendData = getTrendData();
      
      trendSheet.columns = trendColumns.map(col => ({
        header: col.label,
        key: col.key,
        width: 18,
      }));
      trendSheet.addRows(trendData);
      styleHeaderRow(trendSheet);

      // Sheet 4: Location Analytics
      const locSheet = workbook.addWorksheet(t('hsseDashboard.export.sheetLocations'));
      const locData = getLocationData();
      
      locSheet.columns = locationColumns.map(col => ({
        header: col.label,
        key: col.key,
        width: 22,
      }));
      locSheet.addRows(locData);
      styleHeaderRow(locSheet);

      // Sheet 5: RCA Summary
      const rcaSheet = workbook.addWorksheet(t('hsseDashboard.export.sheetRCA'));
      const rcaRows = getRCAData();
      
      rcaSheet.columns = rcaColumns.map(col => ({
        header: col.label,
        key: col.key,
        width: 25,
      }));
      rcaSheet.addRows(rcaRows);
      styleHeaderRow(rcaSheet);

      // Generate and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = getExportFilename('Report', 'xlsx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(t('hsseDashboard.export.success'));
    } catch (error) {
      console.error("Excel export failed:", error);
      toast.error(t('hsseDashboard.export.error'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 me-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 me-2" />
          )}
          {t('hsseDashboard.export.title')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isRTL ? "start" : "end"} className="w-56 bg-popover z-50">
        <DropdownMenuItem onClick={() => handlePDFExport(false)} disabled={isExporting}>
          <FileText className="h-4 w-4 me-2" />
          {t('hsseDashboard.export.pdfSummary')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handlePDFExport(true)} disabled={isExporting}>
          <FileText className="h-4 w-4 me-2" />
          {t('hsseDashboard.export.pdfFull')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCSVExport} disabled={isExporting}>
          <FileSpreadsheet className="h-4 w-4 me-2" />
          {t('hsseDashboard.export.csv')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExcelExport} disabled={isExporting}>
          <FileSpreadsheet className="h-4 w-4 me-2" />
          {t('hsseDashboard.export.excel')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Helper to style header row in Excel
function styleHeaderRow(sheet: ExcelJS.Worksheet) {
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };
  headerRow.alignment = { horizontal: 'center' };
}
