/**
 * Visitor Bulk Import Dialog
 * Allows importing multiple visitors from CSV/Excel files
 */
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Upload,
  FileSpreadsheet,
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  useBulkImportVisitors,
  ParsedVisitorRow,
  BulkVisitorRow,
  validateVisitorRow,
  mapColumnHeader,
  parseCSVLine,
} from '@/hooks/use-bulk-import-visitors';

interface VisitorBulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type ImportStatus = 'idle' | 'parsing' | 'preview' | 'importing' | 'complete';

export function VisitorBulkImportDialog({
  open,
  onOpenChange,
  onSuccess,
}: VisitorBulkImportDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();

  const [status, setStatus] = useState<ImportStatus>('idle');
  const [parsedRows, setParsedRows] = useState<ParsedVisitorRow[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [fileName, setFileName] = useState<string>('');

  const bulkImportMutation = useBulkImportVisitors();

  const resetState = () => {
    setStatus('idle');
    setParsedRows([]);
    setImportProgress(0);
    setFileName('');
  };

  const handleClose = () => {
    if (status === 'importing') return; // Prevent closing during import
    resetState();
    onOpenChange(false);
  };

  // Parse CSV content
  const parseCSVContent = (content: string): BulkVisitorRow[] => {
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];

    // Parse header
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine);
    
    // Map headers to field names
    const columnMap: Record<number, string> = {};
    headers.forEach((header, index) => {
      const fieldName = mapColumnHeader(header);
      if (fieldName) {
        columnMap[index] = fieldName;
      }
    });

    // Check if we have at least the required field
    if (!Object.values(columnMap).includes('full_name')) {
      return [];
    }

    // Parse data rows
    const rows: BulkVisitorRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.every(v => !v.trim())) continue; // Skip empty rows

      const row: Partial<BulkVisitorRow> = {};
      values.forEach((value, index) => {
        const fieldName = columnMap[index];
        if (fieldName) {
          (row as Record<string, string>)[fieldName] = value;
        }
      });

      if (row.full_name) {
        rows.push(row as BulkVisitorRow);
      }
    }

    return rows;
  };

  // Parse Excel content
  const parseExcelContent = (buffer: ArrayBuffer): BulkVisitorRow[] => {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Get raw data as array of arrays
    const rawData = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
    if (rawData.length < 2) return [];

    // Parse header
    const headers = rawData[0] as string[];
    const columnMap: Record<number, string> = {};
    headers.forEach((header, index) => {
      if (header) {
        const fieldName = mapColumnHeader(String(header));
        if (fieldName) {
          columnMap[index] = fieldName;
        }
      }
    });

    // Check if we have at least the required field
    if (!Object.values(columnMap).includes('full_name')) {
      return [];
    }

    // Parse data rows
    const rows: BulkVisitorRow[] = [];
    for (let i = 1; i < rawData.length; i++) {
      const values = rawData[i] as string[];
      if (!values || values.every(v => !v || !String(v).trim())) continue;

      const row: Partial<BulkVisitorRow> = {};
      values.forEach((value, index) => {
        const fieldName = columnMap[index];
        if (fieldName && value !== undefined && value !== null) {
          (row as Record<string, string>)[fieldName] = String(value);
        }
      });

      if (row.full_name) {
        rows.push(row as BulkVisitorRow);
      }
    }

    return rows;
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setStatus('parsing');
    setFileName(file.name);

    try {
      let rawRows: BulkVisitorRow[] = [];

      if (file.name.endsWith('.csv')) {
        const content = await file.text();
        rawRows = parseCSVContent(content);
      } else {
        const buffer = await file.arrayBuffer();
        rawRows = parseExcelContent(buffer);
      }

      if (rawRows.length === 0) {
        setStatus('idle');
        return;
      }

      // Validate each row
      const validated = rawRows.map((row, index) => 
        validateVisitorRow(row, index + 2, t) // +2 for 1-indexed + header row
      );

      setParsedRows(validated);
      setStatus('preview');
    } catch (error) {
      console.error('Failed to parse file:', error);
      setStatus('idle');
    }
  }, [t]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
    disabled: status !== 'idle',
  });

  const handleImport = async () => {
    const validRows = parsedRows.filter(r => r.valid);
    if (validRows.length === 0) return;

    setStatus('importing');
    setImportProgress(10);

    try {
      // Simulate progress during import
      const progressInterval = setInterval(() => {
        setImportProgress(prev => Math.min(prev + 10, 90));
      }, 300);

      await bulkImportMutation.mutateAsync(validRows);

      clearInterval(progressInterval);
      setImportProgress(100);
      setStatus('complete');

      setTimeout(() => {
        onSuccess?.();
        handleClose();
      }, 1500);
    } catch (error) {
      setStatus('preview');
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      ['full_name', 'phone', 'national_id', 'company_name', 'nationality', 'email', 'host_name', 'visitor_type'],
      ['أحمد محمد علي', '+966501234567', '1234567890', 'شركة ABC', 'SA', 'ahmed@example.com', 'محمد خالد', 'guest'],
      ['John Smith', '+966509876543', '0987654321', 'XYZ Corp', 'US', 'john@example.com', 'Ahmed Ali', 'contractor'],
      ['سارة الأحمد', '+966551112233', '1122334455', 'شركة DEF', 'SA', 'sara@example.com', 'فاطمة علي', 'vendor'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Visitors');
    XLSX.writeFile(wb, 'visitor_import_template.xlsx');
  };

  const validCount = parsedRows.filter(r => r.valid).length;
  const invalidCount = parsedRows.filter(r => !r.valid).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col" dir={direction}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {t('bulkImportVisitors.title', 'Bulk Import Visitors')}
          </DialogTitle>
          <DialogDescription>
            {t('bulkImportVisitors.description', 'Upload an Excel or CSV file to import multiple visitors at once.')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {status === 'idle' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 me-2" />
                  {t('bulkImportVisitors.downloadTemplate', 'Download Template')}
                </Button>
              </div>

              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
              >
                <input {...getInputProps()} />
                <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                {isDragActive ? (
                  <p className="text-primary font-medium">
                    {t('bulkImportVisitors.dropHere', 'Drop the file here...')}
                  </p>
                ) : (
                  <>
                    <p className="font-medium mb-1">
                      {t('bulkImportVisitors.dragDrop', 'Drag and drop an Excel or CSV file here')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('bulkImportVisitors.orClick', 'or click to select a file')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {t('bulkImportVisitors.supportedFormats', 'Supported formats: .xlsx, .xls, .csv')}
                    </p>
                  </>
                )}
              </div>

              <div className="bg-muted/50 rounded-lg p-4 text-sm">
                <p className="font-medium mb-2">{t('bulkImportVisitors.columnFormat', 'Expected Columns')}:</p>
                <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                  <li><strong>full_name / الاسم</strong> ({t('common.required', 'required')})</li>
                  <li><strong>phone / رقم الجوال</strong> ({t('common.optional', 'optional')})</li>
                  <li><strong>national_id / رقم الهوية</strong> ({t('common.optional', 'optional')})</li>
                  <li><strong>company_name / الشركة</strong> ({t('common.optional', 'optional')})</li>
                  <li><strong>nationality / الجنسية</strong> ({t('common.optional', 'optional')})</li>
                  <li><strong>email / البريد الإلكتروني</strong> ({t('common.optional', 'optional')})</li>
                  <li><strong>host_name / المستضيف</strong> ({t('common.optional', 'optional')})</li>
                  <li><strong>visitor_type / نوع الزائر</strong> ({t('bulkImportVisitors.typeNote', 'guest, contractor, vendor, delivery, interview, vip, other')})</li>
                </ul>
              </div>
            </div>
          )}

          {status === 'parsing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">
                {t('bulkImportVisitors.parsing', 'Parsing file...')}
              </p>
            </div>
          )}

          {status === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                    <CheckCircle2 className="h-3 w-3 me-1" />
                    {t('bulkImportVisitors.validRows', '{{count}} valid', { count: validCount })}
                  </Badge>
                  {invalidCount > 0 && (
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                      <XCircle className="h-3 w-3 me-1" />
                      {t('bulkImportVisitors.invalidRows', '{{count}} invalid', { count: invalidCount })}
                    </Badge>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {fileName}
                </span>
              </div>

              {invalidCount > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {t('bulkImportVisitors.invalidWarning', '{{count}} rows have errors and will be skipped during import.', { count: invalidCount })}
                  </AlertDescription>
                </Alert>
              )}

              <ScrollArea className="h-[300px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead className="text-start">{t('visitors.name', 'Name')}</TableHead>
                      <TableHead className="text-start">{t('visitors.phone', 'Phone')}</TableHead>
                      <TableHead className="text-start">{t('visitors.nationalId', 'National ID')}</TableHead>
                      <TableHead className="text-start">{t('visitors.company', 'Company')}</TableHead>
                      <TableHead className="text-start">{t('common.status', 'Status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.map((row, idx) => (
                      <TableRow 
                        key={idx} 
                        className={!row.valid ? 'bg-destructive/5' : undefined}
                      >
                        <TableCell className="text-center text-muted-foreground">
                          {row.rowIndex}
                        </TableCell>
                        <TableCell className="font-medium">{row.full_name}</TableCell>
                        <TableCell className="text-muted-foreground">{row.phone || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{row.national_id || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{row.company_name || '-'}</TableCell>
                        <TableCell>
                          {row.valid ? (
                            <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                              <CheckCircle2 className="h-3 w-3 me-1" />
                              {t('common.valid', 'Valid')}
                            </Badge>
                          ) : (
                            <div className="space-y-1">
                              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                                <XCircle className="h-3 w-3 me-1" />
                                {t('common.invalid', 'Invalid')}
                              </Badge>
                              <p className="text-xs text-destructive">
                                {row.errors.join(', ')}
                              </p>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}

          {status === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground mb-4">
                {t('bulkImportVisitors.importing', 'Importing visitors...')}
              </p>
              <Progress value={importProgress} className="w-64" />
            </div>
          )}

          {status === 'complete' && (
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle2 className="h-12 w-12 text-success mb-4" />
              <p className="text-lg font-medium text-success">
                {t('bulkImportVisitors.importComplete', 'Import Complete!')}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {status === 'idle' && (
            <Button variant="outline" onClick={handleClose}>
              {t('common.cancel', 'Cancel')}
            </Button>
          )}

          {status === 'preview' && (
            <>
              <Button variant="outline" onClick={resetState}>
                {t('common.back', 'Back')}
              </Button>
              <Button 
                onClick={handleImport}
                disabled={validCount === 0 || bulkImportMutation.isPending}
              >
                <Users className="h-4 w-4 me-2" />
                {t('bulkImportVisitors.importCount', 'Import {{count}} Visitors', { count: validCount })}
              </Button>
            </>
          )}

          {status === 'complete' && (
            <Button onClick={handleClose}>
              {t('common.close', 'Close')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
