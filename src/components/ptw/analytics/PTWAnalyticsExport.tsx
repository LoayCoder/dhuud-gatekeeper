import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, FileJson } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { PTWAnalyticsData } from "@/hooks/ptw/use-ptw-analytics";
import { PTWPermit } from "@/hooks/ptw/use-ptw-permits";
import { exportToCSV, exportToExcel, ExportColumn } from "@/lib/export-utils";
import { generateBrandedPDFFromElement, createPDFRenderContainer, removePDFRenderContainer } from "@/lib/pdf-utils";

interface PTWAnalyticsExportProps {
  analytics: PTWAnalyticsData;
  permits?: PTWPermit[];
  dateRange?: { start?: Date; end?: Date };
}

export function PTWAnalyticsExport({
  analytics,
  permits = [],
  dateRange,
}: PTWAnalyticsExportProps) {
  const { t } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);

  const getDateRangeString = () => {
    if (dateRange?.start && dateRange?.end) {
      return `${format(dateRange.start, "yyyy-MM-dd")}_to_${format(dateRange.end, "yyyy-MM-dd")}`;
    }
    return format(new Date(), "yyyy-MM-dd");
  };

  const handleExportCSV = () => {
    if (permits.length === 0) {
      toast.error(t("common.noDataToExport", "No data to export"));
      return;
    }

    const columns: ExportColumn[] = [
      { key: "reference_id", label: t("ptw.fields.referenceId", "Reference ID") },
      { key: "status", label: t("ptw.fields.status", "Status") },
      {
        key: "permit_type",
        label: t("ptw.fields.permitType", "Permit Type"),
        formatter: (value) => (value as { name?: string })?.name || "",
      },
      {
        key: "project",
        label: t("ptw.fields.project", "Project"),
        formatter: (value) => (value as { name?: string })?.name || "",
      },
      {
        key: "site",
        label: t("ptw.fields.site", "Site"),
        formatter: (value) => (value as { name?: string })?.name || "",
      },
      {
        key: "applicant",
        label: t("ptw.fields.applicant", "Applicant"),
        formatter: (value) => (value as { full_name?: string })?.full_name || "",
      },
      {
        key: "planned_start_time",
        label: t("ptw.fields.plannedStart", "Planned Start"),
        formatter: (value) => value ? format(new Date(value as string), "yyyy-MM-dd HH:mm") : "",
      },
      {
        key: "planned_end_time",
        label: t("ptw.fields.plannedEnd", "Planned End"),
        formatter: (value) => value ? format(new Date(value as string), "yyyy-MM-dd HH:mm") : "",
      },
      {
        key: "requested_at",
        label: t("ptw.fields.requestedAt", "Requested At"),
        formatter: (value) => value ? format(new Date(value as string), "yyyy-MM-dd HH:mm") : "",
      },
      {
        key: "closed_at",
        label: t("ptw.fields.closedAt", "Closed At"),
        formatter: (value) => value ? format(new Date(value as string), "yyyy-MM-dd HH:mm") : "",
      },
      { key: "extension_count", label: t("ptw.fields.extensions", "Extensions") },
    ];

    exportToCSV(permits as unknown as Record<string, unknown>[], `ptw_permits_${getDateRangeString()}.csv`, columns);
    toast.success(t("common.exportSuccess", "Export completed"));
  };

  const handleExportExcel = () => {
    if (permits.length === 0) {
      toast.error(t("common.noDataToExport", "No data to export"));
      return;
    }

    const columns: ExportColumn[] = [
      { key: "reference_id", label: t("ptw.fields.referenceId", "Reference ID") },
      { key: "status", label: t("ptw.fields.status", "Status") },
      {
        key: "permit_type",
        label: t("ptw.fields.permitType", "Permit Type"),
        formatter: (value) => (value as { name?: string })?.name || "",
      },
      {
        key: "project",
        label: t("ptw.fields.project", "Project"),
        formatter: (value) => (value as { name?: string })?.name || "",
      },
      {
        key: "applicant",
        label: t("ptw.fields.applicant", "Applicant"),
        formatter: (value) => (value as { full_name?: string })?.full_name || "",
      },
      {
        key: "planned_start_time",
        label: t("ptw.fields.plannedStart", "Planned Start"),
        formatter: (value) => value ? format(new Date(value as string), "yyyy-MM-dd HH:mm") : "",
      },
      {
        key: "planned_end_time",
        label: t("ptw.fields.plannedEnd", "Planned End"),
        formatter: (value) => value ? format(new Date(value as string), "yyyy-MM-dd HH:mm") : "",
      },
      { key: "extension_count", label: t("ptw.fields.extensions", "Extensions") },
    ];

    exportToExcel(permits as unknown as Record<string, unknown>[], `ptw_permits_${getDateRangeString()}.xlsx`, columns);
    toast.success(t("common.exportSuccess", "Export completed"));
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      // Create a temporary container for PDF rendering
      const container = createPDFRenderContainer();

      // Build summary HTML
      container.innerHTML = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px;">
          <h1 style="color: #1e3a5f; margin-bottom: 24px;">PTW Analytics Report</h1>
          <p style="color: #666; margin-bottom: 24px;">Generated on ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}</p>
          
          <h2 style="color: #1e3a5f; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Summary</h2>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px;">
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px;">
              <div style="font-size: 24px; font-weight: bold;">${analytics.totalPermits}</div>
              <div style="color: #666;">Total Permits</div>
            </div>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px;">
              <div style="font-size: 24px; font-weight: bold;">${analytics.activePermits}</div>
              <div style="color: #666;">Active Permits</div>
            </div>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px;">
              <div style="font-size: 24px; font-weight: bold;">${analytics.closedPermits}</div>
              <div style="color: #666;">Closed Permits</div>
            </div>
          </div>

          <h2 style="color: #1e3a5f; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Compliance Metrics</h2>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px;">
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px;">
              <div style="font-size: 20px; font-weight: bold;">${analytics.compliance.completionRate}%</div>
              <div style="color: #666;">Completion Rate</div>
            </div>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px;">
              <div style="font-size: 20px; font-weight: bold;">${analytics.compliance.onTimeRate}%</div>
              <div style="color: #666;">On-Time Closure</div>
            </div>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px;">
              <div style="font-size: 20px; font-weight: bold;">${analytics.compliance.extensionRate}%</div>
              <div style="color: #666;">Extension Rate</div>
            </div>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px;">
              <div style="font-size: 20px; font-weight: bold;">${analytics.avgLifecycleDays} days</div>
              <div style="color: #666;">Avg Lifecycle</div>
            </div>
          </div>

          <h2 style="color: #1e3a5f; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Monthly Trend</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 8px; text-align: start; border: 1px solid #e5e7eb;">Month</th>
                <th style="padding: 8px; text-align: end; border: 1px solid #e5e7eb;">Total</th>
                <th style="padding: 8px; text-align: end; border: 1px solid #e5e7eb;">Closed</th>
              </tr>
            </thead>
            <tbody>
              ${analytics.monthlyTrends.slice(-6).map(m => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #e5e7eb;">${m.monthLabel}</td>
                  <td style="padding: 8px; text-align: end; border: 1px solid #e5e7eb;">${m.total}</td>
                  <td style="padding: 8px; text-align: end; border: 1px solid #e5e7eb;">${m.closed}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <h2 style="color: #1e3a5f; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Top Projects</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 8px; text-align: start; border: 1px solid #e5e7eb;">Project</th>
                <th style="padding: 8px; text-align: end; border: 1px solid #e5e7eb;">Total</th>
                <th style="padding: 8px; text-align: end; border: 1px solid #e5e7eb;">Active</th>
                <th style="padding: 8px; text-align: end; border: 1px solid #e5e7eb;">Closed</th>
              </tr>
            </thead>
            <tbody>
              ${analytics.projectPerformance.slice(0, 5).map(p => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #e5e7eb;">${p.projectName}</td>
                  <td style="padding: 8px; text-align: end; border: 1px solid #e5e7eb;">${p.totalPermits}</td>
                  <td style="padding: 8px; text-align: end; border: 1px solid #e5e7eb;">${p.activePermits}</td>
                  <td style="padding: 8px; text-align: end; border: 1px solid #e5e7eb;">${p.closedPermits}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `;

      await generateBrandedPDFFromElement(container, {
        filename: `ptw_analytics_${getDateRangeString()}.pdf`,
        header: {
          primaryText: "PTW Analytics Report",
        },
        footer: {
          showPageNumbers: true,
          showDatePrinted: true,
        },
      });

      removePDFRenderContainer(container);
      toast.success(t("common.exportSuccess", "PDF generated successfully"));
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error(t("common.exportError", "Failed to generate PDF"));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          <Download className="me-2 h-4 w-4" />
          {isExporting ? t("common.exporting", "Exporting...") : t("common.export", "Export")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t("common.exportOptions", "Export Options")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleExportCSV}>
          <FileText className="me-2 h-4 w-4" />
          {t("common.exportCSV", "Export as CSV")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportExcel}>
          <FileSpreadsheet className="me-2 h-4 w-4" />
          {t("common.exportExcel", "Export as Excel")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleExportPDF}>
          <FileJson className="me-2 h-4 w-4" />
          {t("common.exportPDF", "Export as PDF")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
