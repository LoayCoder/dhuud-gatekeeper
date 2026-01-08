import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useClientSiteRepExportData } from "@/hooks/contractor-management/use-client-site-rep-export-data";
import { exportToCSV, exportToExcel, ExportColumn } from "@/lib/export-utils";
import { format } from "date-fns";

interface ClientSiteRepExportProps {
  companyIds: string[];
}

export function ClientSiteRepExport({ companyIds }: ClientSiteRepExportProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const { fetchWorkersForExport, fetchIncidentsForExport, fetchViolationsForExport } = useClientSiteRepExportData();

  const dateStr = format(new Date(), "yyyy-MM-dd");

  const workerColumns: ExportColumn[] = [
    { key: "full_name", label: t("clientSiteRep.export.columns.fullName", "Full Name") },
    { key: "full_name_ar", label: t("clientSiteRep.export.columns.arabicName", "Arabic Name") },
    { key: "national_id", label: t("clientSiteRep.export.columns.nationalId", "National ID") },
    { key: "nationality", label: t("clientSiteRep.export.columns.nationality", "Nationality") },
    { key: "mobile_number", label: t("clientSiteRep.export.columns.mobile", "Mobile") },
    { key: "approval_status", label: t("clientSiteRep.export.columns.status", "Status") },
    { key: "company_name", label: t("clientSiteRep.export.columns.company", "Company") },
    { 
      key: "created_at", 
      label: t("clientSiteRep.export.columns.createdAt", "Created At"),
      formatter: (v) => v ? format(new Date(v as string), "yyyy-MM-dd HH:mm") : ""
    },
  ];

  const incidentColumns: ExportColumn[] = [
    { key: "reference_id", label: t("clientSiteRep.export.columns.reference", "Reference") },
    { key: "title", label: t("clientSiteRep.export.columns.title", "Title") },
    { key: "event_type", label: t("clientSiteRep.export.columns.type", "Type") },
    { key: "severity", label: t("clientSiteRep.export.columns.severity", "Severity") },
    { key: "status", label: t("clientSiteRep.export.columns.status", "Status") },
    { key: "location", label: t("clientSiteRep.export.columns.location", "Location") },
    { 
      key: "occurred_at", 
      label: t("clientSiteRep.export.columns.occurredAt", "Occurred At"),
      formatter: (v) => v ? format(new Date(v as string), "yyyy-MM-dd HH:mm") : ""
    },
    { key: "company_name", label: t("clientSiteRep.export.columns.company", "Company") },
  ];

  const violationColumns: ExportColumn[] = [
    { key: "violation_type", label: t("clientSiteRep.export.columns.violationType", "Violation Type") },
    { key: "severity", label: t("clientSiteRep.export.columns.severity", "Severity") },
    { key: "status", label: t("clientSiteRep.export.columns.status", "Status") },
    { key: "company_name", label: t("clientSiteRep.export.columns.company", "Company") },
    { 
      key: "reported_at", 
      label: t("clientSiteRep.export.columns.reportedAt", "Reported At"),
      formatter: (v) => v ? format(new Date(v as string), "yyyy-MM-dd HH:mm") : ""
    },
  ];

  const handleExport = async (type: "workers" | "incidents" | "violations", format: "csv" | "excel") => {
    if (!companyIds.length) {
      toast({
        title: t("common.error", "Error"),
        description: t("clientSiteRep.export.noCompanies", "No companies assigned"),
        variant: "destructive",
      });
      return;
    }

    const key = `${type}-${format}`;
    setLoading(key);

    try {
      if (type === "workers") {
        const data = await fetchWorkersForExport(companyIds);
        if (!data.length) {
          toast({ title: t("clientSiteRep.export.noWorkers", "No workers to export") });
          return;
        }
        const filename = `workers_report_${dateStr}`;
        format === "csv" 
          ? exportToCSV(data, `${filename}.csv`, workerColumns)
          : exportToExcel(data, `${filename}.xlsx`, workerColumns);
      } else if (type === "incidents") {
        const data = await fetchIncidentsForExport(companyIds);
        if (!data.length) {
          toast({ title: t("clientSiteRep.export.noIncidents", "No incidents to export") });
          return;
        }
        const filename = `incidents_report_${dateStr}`;
        format === "csv"
          ? exportToCSV(data, `${filename}.csv`, incidentColumns)
          : exportToExcel(data, `${filename}.xlsx`, incidentColumns);
      } else {
        const data = await fetchViolationsForExport(companyIds);
        if (!data.length) {
          toast({ title: t("clientSiteRep.export.noViolations", "No violations to export") });
          return;
        }
        const filename = `violations_report_${dateStr}`;
        format === "csv"
          ? exportToCSV(data, `${filename}.csv`, violationColumns)
          : exportToExcel(data, `${filename}.xlsx`, violationColumns);
      }

      toast({
        title: t("clientSiteRep.export.success", "Export successful"),
        description: t("clientSiteRep.export.downloadStarted", "Your download has started"),
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: t("common.error", "Error"),
        description: t("clientSiteRep.export.failed", "Failed to export data"),
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const isLoading = loading !== null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin me-2" />
          ) : (
            <Download className="h-4 w-4 me-2" />
          )}
          {t("clientSiteRep.export.title", "Export Reports")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t("clientSiteRep.export.workers", "Workers")}</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleExport("workers", "csv")} disabled={isLoading}>
          <FileText className="h-4 w-4 me-2" />
          {t("clientSiteRep.export.csv", "CSV")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("workers", "excel")} disabled={isLoading}>
          <FileSpreadsheet className="h-4 w-4 me-2" />
          {t("clientSiteRep.export.excel", "Excel")}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        
        <DropdownMenuLabel>{t("clientSiteRep.export.incidents", "Incidents")}</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleExport("incidents", "csv")} disabled={isLoading}>
          <FileText className="h-4 w-4 me-2" />
          {t("clientSiteRep.export.csv", "CSV")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("incidents", "excel")} disabled={isLoading}>
          <FileSpreadsheet className="h-4 w-4 me-2" />
          {t("clientSiteRep.export.excel", "Excel")}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        
        <DropdownMenuLabel>{t("clientSiteRep.export.violations", "Violations")}</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleExport("violations", "csv")} disabled={isLoading}>
          <FileText className="h-4 w-4 me-2" />
          {t("clientSiteRep.export.csv", "CSV")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("violations", "excel")} disabled={isLoading}>
          <FileSpreadsheet className="h-4 w-4 me-2" />
          {t("clientSiteRep.export.excel", "Excel")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
