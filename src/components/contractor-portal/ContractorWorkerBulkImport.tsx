import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle, X, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useBulkImportContractorWorkers } from "./use-bulk-import-contractor-workers";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";

interface ContractorWorkerBulkImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
}

interface ParsedWorker {
  full_name: string;
  national_id: string;
  mobile_number: string;
  nationality?: string;
  preferred_language?: string;
  isValid: boolean;
  errors: string[];
}

const REQUIRED_COLUMNS = ["full_name", "national_id", "mobile_number"];
const OPTIONAL_COLUMNS = ["nationality", "preferred_language", "full_name_ar"];

const COLUMN_ALIASES: Record<string, string[]> = {
  full_name: ["name", "fullname", "full_name", "worker_name", "worker name", "الاسم"],
  national_id: ["national_id", "nationalid", "id_number", "id number", "iqama", "رقم الهوية"],
  mobile_number: ["mobile", "mobile_number", "phone", "phone_number", "رقم الجوال"],
  nationality: ["nationality", "country", "الجنسية"],
  preferred_language: ["language", "preferred_language", "lang", "اللغة"],
  full_name_ar: ["full_name_ar", "name_ar", "arabic_name", "الاسم بالعربية"],
};

function normalizeColumnName(col: string): string | null {
  const normalized = col.toLowerCase().trim();
  for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.includes(normalized) || key === normalized) {
      return key;
    }
  }
  return null;
}

function validateWorker(worker: Partial<ParsedWorker>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!worker.full_name || worker.full_name.trim().length < 2) {
    errors.push("Name is required (min 2 characters)");
  }
  if (!worker.national_id || worker.national_id.trim().length < 5) {
    errors.push("National ID is required (min 5 characters)");
  }
  if (!worker.mobile_number || worker.mobile_number.trim().length < 8) {
    errors.push("Mobile number is required (min 8 characters)");
  }
  
  return { isValid: errors.length === 0, errors };
}

export default function ContractorWorkerBulkImport({
  open,
  onOpenChange,
  companyId,
}: ContractorWorkerBulkImportProps) {
  const { t } = useTranslation();
  const [parsedWorkers, setParsedWorkers] = useState<ParsedWorker[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const bulkImport = useBulkImportContractorWorkers();

  const resetState = useCallback(() => {
    setParsedWorkers([]);
    setParseError(null);
    setFileName(null);
  }, []);

  const handleClose = useCallback((open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  }, [onOpenChange, resetState]);

  const parseFile = useCallback((file: File) => {
    setParseError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, { defval: "" });

        if (jsonData.length === 0) {
          setParseError(t("contractorPortal.bulkImport.emptyFile", "The file is empty or has no valid data rows."));
          return;
        }

        // Map columns using aliases
        const mappedWorkers: ParsedWorker[] = jsonData.map((row) => {
          const mapped: Partial<ParsedWorker> = {};
          for (const [key, value] of Object.entries(row)) {
            const normalizedKey = normalizeColumnName(key);
            if (normalizedKey) {
              (mapped as any)[normalizedKey] = String(value).trim();
            }
          }
          const validation = validateWorker(mapped);
          return {
            full_name: mapped.full_name || "",
            national_id: mapped.national_id || "",
            mobile_number: mapped.mobile_number || "",
            nationality: mapped.nationality,
            preferred_language: mapped.preferred_language || "ar",
            isValid: validation.isValid,
            errors: validation.errors,
          };
        });

        setParsedWorkers(mappedWorkers);
      } catch (err) {
        setParseError(t("contractorPortal.bulkImport.parseError", "Failed to parse the file. Please check the format."));
      }
    };
    reader.readAsArrayBuffer(file);
  }, [t]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      parseFile(acceptedFiles[0]);
    }
  }, [parseFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
    },
    maxFiles: 1,
  });

  const downloadTemplate = useCallback(() => {
    const templateData = [
      {
        full_name: "Ahmed Ali",
        national_id: "1234567890",
        mobile_number: "+966501234567",
        nationality: "SA",
        preferred_language: "ar",
      },
      {
        full_name: "John Smith",
        national_id: "0987654321",
        mobile_number: "+966509876543",
        nationality: "US",
        preferred_language: "en",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Workers");
    XLSX.writeFile(wb, "worker_import_template.xlsx");
  }, []);

  const validWorkers = parsedWorkers.filter((w) => w.isValid);
  const invalidWorkers = parsedWorkers.filter((w) => !w.isValid);

  const handleImport = async () => {
    if (validWorkers.length === 0) return;

    const workers = validWorkers.map((w) => ({
      company_id: companyId,
      full_name: w.full_name,
      national_id: w.national_id,
      mobile_number: w.mobile_number,
      nationality: w.nationality,
      preferred_language: w.preferred_language || "ar",
    }));

    await bulkImport.mutateAsync(workers);
    handleClose(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {t("contractorPortal.bulkImport.title", "Bulk Import Workers")}
          </DialogTitle>
          <DialogDescription>
            {t("contractorPortal.bulkImport.description", "Upload a CSV or Excel file to import multiple workers at once. All imported workers will be pending approval.")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Download */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm text-muted-foreground">
              {t("contractorPortal.bulkImport.downloadTemplate", "Download a template file to see the required format")}
            </span>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 me-2" />
              {t("contractorPortal.bulkImport.template", "Template")}
            </Button>
          </div>

          {/* File Upload Zone */}
          {parsedWorkers.length === 0 && (
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
              `}
            >
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-primary font-medium">
                  {t("contractorPortal.bulkImport.dropHere", "Drop the file here...")}
                </p>
              ) : (
                <>
                  <p className="font-medium mb-1">
                    {t("contractorPortal.bulkImport.dragDrop", "Drag & drop a file here, or click to select")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("contractorPortal.bulkImport.supportedFormats", "Supports: .xlsx, .xls, .csv")}
                  </p>
                </>
              )}
            </div>
          )}

          {/* Parse Error */}
          {parseError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}

          {/* Parsed Results */}
          {parsedWorkers.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{fileName}</Badge>
                  <Button variant="ghost" size="sm" onClick={resetState}>
                    <X className="h-4 w-4 me-1" />
                    {t("common.clear", "Clear")}
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge className="bg-green-500">{validWorkers.length} {t("common.valid", "valid")}</Badge>
                  {invalidWorkers.length > 0 && (
                    <Badge variant="destructive">{invalidWorkers.length} {t("common.invalid", "invalid")}</Badge>
                  )}
                </div>
              </div>

              {/* Invalid Workers Warning */}
              {invalidWorkers.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {t("contractorPortal.bulkImport.invalidRows", "{{count}} rows have errors and will be skipped.", { count: invalidWorkers.length })}
                  </AlertDescription>
                </Alert>
              )}

              {/* Preview Table */}
              <ScrollArea className="h-[300px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">#</TableHead>
                      <TableHead>{t("contractors.workers.name", "Name")}</TableHead>
                      <TableHead>{t("contractors.workers.nationalId", "National ID")}</TableHead>
                      <TableHead>{t("contractors.workers.mobile", "Mobile")}</TableHead>
                      <TableHead>{t("contractors.workers.nationality", "Nationality")}</TableHead>
                      <TableHead>{t("common.status", "Status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedWorkers.map((worker, idx) => (
                      <TableRow key={idx} className={!worker.isValid ? "bg-destructive/10" : undefined}>
                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell>{worker.full_name || "-"}</TableCell>
                        <TableCell className="font-mono">{worker.national_id || "-"}</TableCell>
                        <TableCell>{worker.mobile_number || "-"}</TableCell>
                        <TableCell>{worker.nationality || "-"}</TableCell>
                        <TableCell>
                          {worker.isValid ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <span className="text-xs text-destructive">{worker.errors.join(", ")}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* Pending Approval Notice */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t("contractorPortal.bulkImport.pendingNotice", "All imported workers will be saved with 'Pending Approval' status and require approval before becoming active.")}
                </AlertDescription>
              </Alert>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => handleClose(false)}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            onClick={handleImport}
            disabled={validWorkers.length === 0 || bulkImport.isPending}
          >
            {bulkImport.isPending ? (
              <>
                <Loader2 className="h-4 w-4 me-2 animate-spin" />
                {t("common.importing", "Importing...")}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 me-2" />
                {t("contractorPortal.bulkImport.importWorkers", "Import {{count}} Workers", { count: validWorkers.length })}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
