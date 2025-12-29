import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useDropzone } from "react-dropzone";
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useContractorCompanies, ContractorCompany } from "@/hooks/contractor-management/use-contractor-companies";
import { useCreateContractorWorker } from "@/hooks/contractor-management/use-contractor-workers";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface WorkerBulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface WorkerRow {
  full_name: string;
  full_name_ar?: string;
  national_id: string;
  mobile_number: string;
  nationality?: string;
  company_name: string;
  preferred_language?: string;
  // Validation state
  isValid?: boolean;
  errors?: string[];
  companyId?: string;
}

export function WorkerBulkImportDialog({ open, onOpenChange }: WorkerBulkImportDialogProps) {
  const { t } = useTranslation();
  const [parsedData, setParsedData] = useState<WorkerRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; failed: number } | null>(null);

  const { data: companies = [] } = useContractorCompanies();
  const createWorker = useCreateContractorWorker();

  const validateRow = useCallback((row: WorkerRow, companies: ContractorCompany[]): WorkerRow => {
    const errors: string[] = [];

    // Required fields
    if (!row.full_name?.trim()) errors.push(t("contractors.import.errors.nameRequired", "Name is required"));
    if (!row.national_id?.trim()) errors.push(t("contractors.import.errors.idRequired", "National ID is required"));
    if (!row.mobile_number?.trim()) errors.push(t("contractors.import.errors.mobileRequired", "Mobile is required"));
    if (!row.company_name?.trim()) errors.push(t("contractors.import.errors.companyRequired", "Company is required"));

    // Find matching company
    const company = companies.find(c => 
      c.company_name.toLowerCase().trim() === row.company_name?.toLowerCase().trim()
    );
    
    if (row.company_name && !company) {
      errors.push(t("contractors.import.errors.companyNotFound", "Company not found"));
    }

    // Validate mobile format (basic check)
    if (row.mobile_number && !/^[+]?[\d\s-]{8,15}$/.test(row.mobile_number.trim())) {
      errors.push(t("contractors.import.errors.invalidMobile", "Invalid mobile format"));
    }

    return {
      ...row,
      isValid: errors.length === 0,
      errors,
      companyId: company?.id,
    };
  }, [t]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet);

        // Map Excel columns to our format
        const mappedData: WorkerRow[] = jsonData.map((row) => ({
          full_name: row["Full Name"] || row["Name"] || row["full_name"] || "",
          full_name_ar: row["Name (Arabic)"] || row["full_name_ar"] || "",
          national_id: String(row["National ID"] || row["ID"] || row["national_id"] || ""),
          mobile_number: String(row["Mobile"] || row["Mobile Number"] || row["mobile_number"] || ""),
          nationality: row["Nationality"] || row["nationality"] || "",
          company_name: row["Company"] || row["Company Name"] || row["company_name"] || "",
          preferred_language: row["Language"] || row["preferred_language"] || "en",
        }));

        // Validate all rows
        const validatedData = mappedData.map(row => validateRow(row, companies));
        setParsedData(validatedData);
      } catch (error) {
        console.error("Error parsing file:", error);
        toast.error(t("contractors.import.parseError", "Failed to parse file"));
      }
    };
    reader.readAsArrayBuffer(file);
  }, [companies, validateRow, t]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
    },
  });

  const downloadTemplate = () => {
    const template = [
      {
        "Full Name": "John Smith",
        "Name (Arabic)": "جون سميث",
        "National ID": "1234567890",
        "Mobile": "+966501234567",
        "Nationality": "Saudi Arabia",
        "Company": "ABC Contracting",
        "Language": "en",
      },
      {
        "Full Name": "Ahmed Ali",
        "Name (Arabic)": "أحمد علي",
        "National ID": "0987654321",
        "Mobile": "+966509876543",
        "Nationality": "Egypt",
        "Company": "XYZ Services",
        "Language": "ar",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Workers");
    XLSX.writeFile(wb, "worker_import_template.xlsx");
  };

  const handleImport = async () => {
    const validRows = parsedData.filter(row => row.isValid);
    if (validRows.length === 0) {
      toast.error(t("contractors.import.noValidRows", "No valid rows to import"));
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    
    let success = 0;
    let failed = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        await createWorker.mutateAsync({
          company_id: row.companyId!,
          full_name: row.full_name.trim(),
          full_name_ar: row.full_name_ar?.trim() || null,
          national_id: row.national_id.trim(),
          mobile_number: row.mobile_number.trim(),
          nationality: row.nationality?.trim() || null,
          preferred_language: row.preferred_language || "en",
        });
        success++;
      } catch (error) {
        console.error("Error importing worker:", error);
        failed++;
      }
      setImportProgress(((i + 1) / validRows.length) * 100);
    }

    setImportResults({ success, failed });
    setIsImporting(false);

    if (failed === 0) {
      toast.success(t("contractors.import.success", "All workers imported successfully"));
    } else {
      toast.warning(t("contractors.import.partialSuccess", `${success} imported, ${failed} failed`));
    }
  };

  const handleClose = () => {
    setParsedData([]);
    setImportProgress(0);
    setImportResults(null);
    onOpenChange(false);
  };

  const validCount = parsedData.filter(r => r.isValid).length;
  const invalidCount = parsedData.length - validCount;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{t("contractors.import.title", "Bulk Import Workers")}</DialogTitle>
          <DialogDescription>
            {t("contractors.import.description", "Upload an Excel file to import multiple workers at once")}
          </DialogDescription>
        </DialogHeader>

        {parsedData.length === 0 ? (
          <div className="space-y-4">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
            >
              <input {...getInputProps()} />
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {isDragActive
                  ? t("contractors.import.dropHere", "Drop file here...")
                  : t("contractors.import.dragOrClick", "Drag & drop Excel/CSV file or click to browse")}
              </p>
            </div>

            <div className="flex justify-center">
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="h-4 w-4 me-2" />
                {t("contractors.import.downloadTemplate", "Download Template")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center gap-4">
              <Badge variant="default" className="px-3 py-1">
                <CheckCircle className="h-3 w-3 me-1" />
                {validCount} {t("contractors.import.valid", "Valid")}
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="destructive" className="px-3 py-1">
                  <AlertCircle className="h-3 w-3 me-1" />
                  {invalidCount} {t("contractors.import.invalid", "Invalid")}
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={() => setParsedData([])}>
                <X className="h-4 w-4 me-1" />
                {t("contractors.import.clearData", "Clear")}
              </Button>
            </div>

            {/* Preview Table */}
            <ScrollArea className="h-[400px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>{t("contractors.workers.name", "Name")}</TableHead>
                    <TableHead>{t("contractors.workers.nationalId", "National ID")}</TableHead>
                    <TableHead>{t("contractors.workers.mobile", "Mobile")}</TableHead>
                    <TableHead>{t("contractors.workers.company", "Company")}</TableHead>
                    <TableHead>{t("common.status", "Status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.map((row, index) => (
                    <TableRow key={index} className={!row.isValid ? "bg-destructive/10" : ""}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{row.full_name}</TableCell>
                      <TableCell className="font-mono text-sm">{row.national_id}</TableCell>
                      <TableCell dir="ltr">{row.mobile_number}</TableCell>
                      <TableCell>{row.company_name}</TableCell>
                      <TableCell>
                        {row.isValid ? (
                          <Badge variant="default">
                            <CheckCircle className="h-3 w-3 me-1" />
                            {t("contractors.import.valid", "Valid")}
                          </Badge>
                        ) : (
                          <div className="space-y-1">
                            {row.errors?.map((err, i) => (
                              <Badge key={i} variant="destructive" className="text-xs">
                                {err}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {/* Import Progress */}
            {isImporting && (
              <div className="space-y-2">
                <Progress value={importProgress} />
                <p className="text-sm text-center text-muted-foreground">
                  {t("contractors.import.importing", "Importing workers...")} {Math.round(importProgress)}%
                </p>
              </div>
            )}

            {/* Import Results */}
            {importResults && (
              <Alert>
                <AlertDescription>
                  {t("contractors.import.results", `Import complete: ${importResults.success} succeeded, ${importResults.failed} failed`)}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t("common.cancel", "Cancel")}
          </Button>
          {parsedData.length > 0 && !importResults && (
            <Button onClick={handleImport} disabled={isImporting || validCount === 0}>
              <Upload className="h-4 w-4 me-2" />
              {t("contractors.import.importWorkers", `Import ${validCount} Workers`)}
            </Button>
          )}
          {importResults && (
            <Button onClick={handleClose}>
              {t("common.done", "Done")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
