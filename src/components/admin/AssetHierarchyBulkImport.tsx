/**
 * Asset Hierarchy Bulk Import Dialog
 * Allows admins to upload Excel files to bulk import categories, types, subtypes, and parts.
 * Also supports exporting existing data and smart update/insert mode.
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  X, 
  Loader2,
  Layers,
  Tag,
  FolderTree,
  Wrench,
  FileDown,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { 
  parseHierarchyFile, 
  downloadHierarchyTemplate, 
  exportAssetHierarchy,
  type ParseResult, 
  type ImportMode,
} from '@/lib/asset-hierarchy-import-utils';
import { useBulkImportAssetHierarchy } from '@/hooks/use-bulk-import-asset-hierarchy';

interface AssetHierarchyBulkImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function LevelIcon({ level }: { level: string }) {
  switch (level) {
    case 'Category':
      return <FolderTree className="h-3.5 w-3.5 text-primary" />;
    case 'Type':
      return <Tag className="h-3.5 w-3.5 text-blue-500" />;
    case 'Subtype':
      return <Layers className="h-3.5 w-3.5 text-green-500" />;
    case 'Part':
      return <Wrench className="h-3.5 w-3.5 text-orange-500" />;
    default:
      return null;
  }
}

function LevelBadge({ level }: { level: string }) {
  const variantMap: Record<string, 'default' | 'secondary' | 'outline'> = {
    Category: 'default',
    Type: 'secondary',
    Subtype: 'outline',
    Part: 'outline',
  };
  
  return (
    <Badge variant={variantMap[level] || 'outline'} className="text-xs gap-1">
      <LevelIcon level={level} />
      {level}
    </Badge>
  );
}

export default function AssetHierarchyBulkImport({
  open,
  onOpenChange,
}: AssetHierarchyBulkImportProps) {
  const { t } = useTranslation();
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [updateMode, setUpdateMode] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const bulkImport = useBulkImportAssetHierarchy();

  const resetState = useCallback(() => {
    setParseResult(null);
    setFileName(null);
  }, []);

  const handleClose = useCallback((open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  }, [onOpenChange, resetState]);

  const parseFile = useCallback((file: File) => {
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const result = parseHierarchyFile(data.buffer);
      setParseResult(result);
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      parseFile(acceptedFiles[0]);
    }
  }, [parseFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const success = await exportAssetHierarchy();
      if (success) {
        toast.success(t('assetCategories.bulkImport.exportSuccess', 'Export Complete'), {
          description: t('assetCategories.bulkImport.exportSuccessDesc', 'Asset hierarchy exported to Excel file'),
        });
      } else {
        toast.error(t('assetCategories.bulkImport.noDataToExport', 'No data to export'));
      }
    } catch {
      toast.error(t('assetCategories.bulkImport.exportFailed', 'Export Failed'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    if (!parseResult || parseResult.validCount === 0) return;
    
    const mode: ImportMode = updateMode ? 'update_or_insert' : 'insert_only';
    await bulkImport.mutateAsync({ parseResult, mode });
    handleClose(false);
  };

  const validRows = parseResult?.rows.filter(r => r.isValid) || [];
  const invalidRows = parseResult?.rows.filter(r => !r.isValid) || [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {t('assetCategories.bulkImport.title', 'Bulk Import Asset Hierarchy')}
          </DialogTitle>
          <DialogDescription>
            {t('assetCategories.bulkImport.description', 'Upload an Excel file to import categories, types, subtypes, and inspectable parts in one operation.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template & Export Actions */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">
              {t('assetCategories.bulkImport.downloadTemplateHint', 'Download a template or export existing data')}
            </span>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExport}
                disabled={isExporting}
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 me-2 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4 me-2" />
                )}
                {t('assetCategories.bulkImport.exportButton', 'Export')}
              </Button>
              <Button variant="outline" size="sm" onClick={downloadHierarchyTemplate}>
                <Download className="h-4 w-4 me-2" />
                {t('assetCategories.bulkImport.template', 'Template')}
              </Button>
            </div>
          </div>

          {/* File Upload Zone */}
          {!parseResult && (
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
              `}
            >
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-primary font-medium">
                  {t('assetCategories.bulkImport.dropHere', 'Drop the file here...')}
                </p>
              ) : (
                <>
                  <p className="font-medium mb-1">
                    {t('assetCategories.bulkImport.dragDrop', 'Drag & drop a file here, or click to select')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('assetCategories.bulkImport.supportedFormats', 'Supports: .xlsx, .xls, .csv')}
                  </p>
                </>
              )}
            </div>
          )}

          {/* Parse Error */}
          {parseResult?.parseError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{parseResult.parseError}</AlertDescription>
            </Alert>
          )}

          {/* Parsed Results */}
          {parseResult && !parseResult.parseError && (
            <>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{fileName}</Badge>
                  <Button variant="ghost" size="sm" onClick={resetState}>
                    <X className="h-4 w-4 me-1" />
                    {t('common.clear', 'Clear')}
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  <Badge className="bg-green-500">
                    {validRows.length} {t('common.valid', 'valid')}
                  </Badge>
                  {invalidRows.length > 0 && (
                    <Badge variant="destructive">
                      {invalidRows.length} {t('common.invalid', 'invalid')}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-2">
                <div className="p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <FolderTree className="h-4 w-4 text-primary" />
                    {t('assetCategories.levels.categories', 'Categories')}
                  </div>
                  <p className="text-xl font-semibold">{parseResult.categories.length}</p>
                </div>
                <div className="p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Tag className="h-4 w-4 text-blue-500" />
                    {t('assetCategories.levels.types', 'Types')}
                  </div>
                  <p className="text-xl font-semibold">{parseResult.types.length}</p>
                </div>
                <div className="p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Layers className="h-4 w-4 text-green-500" />
                    {t('assetCategories.levels.subtypes', 'Subtypes')}
                  </div>
                  <p className="text-xl font-semibold">{parseResult.subtypes.length}</p>
                </div>
                <div className="p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Wrench className="h-4 w-4 text-orange-500" />
                    {t('assetCategories.levels.parts', 'Parts')}
                  </div>
                  <p className="text-xl font-semibold">{parseResult.parts.length}</p>
                </div>
              </div>

              {/* Update Mode Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="space-y-0.5">
                  <Label htmlFor="update-mode" className="font-medium">
                    {t('assetCategories.bulkImport.updateMode', 'Update existing items')}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t('assetCategories.bulkImport.updateModeHint', 'When enabled, existing items will be updated with new data. Otherwise, duplicates will be skipped.')}
                  </p>
                </div>
                <Switch
                  id="update-mode"
                  checked={updateMode}
                  onCheckedChange={setUpdateMode}
                />
              </div>

              {/* Invalid Rows Warning */}
              {invalidRows.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {t('assetCategories.bulkImport.invalidRows', '{{count}} rows have errors and will be skipped.', { count: invalidRows.length })}
                  </AlertDescription>
                </Alert>
              )}

              {/* Preview Table */}
              <ScrollArea className="h-[240px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">#</TableHead>
                      <TableHead className="w-[100px]">{t('assetCategories.bulkImport.level', 'Level')}</TableHead>
                      <TableHead>{t('assetCategories.bulkImport.code', 'Code')}</TableHead>
                      <TableHead>{t('assetCategories.bulkImport.name', 'Name')}</TableHead>
                      <TableHead>{t('assetCategories.bulkImport.parent', 'Parent')}</TableHead>
                      <TableHead className="w-[80px]">{t('common.status', 'Status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parseResult.rows.map((row, idx) => (
                      <TableRow 
                        key={idx} 
                        className={!row.isValid ? 'bg-destructive/10' : undefined}
                      >
                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell>
                          <LevelBadge level={row.level} />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{row.code || '-'}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{row.nameEn}</span>
                            {row.nameAr && (
                              <span className="text-xs text-muted-foreground" dir="rtl">
                                {row.nameAr}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{row.parentCode || '-'}</TableCell>
                        <TableCell>
                          {row.isValid ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <span 
                              className="text-xs text-destructive" 
                              title={row.errors.join(', ')}
                            >
                              {row.errors[0]}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* Import Notice */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t('assetCategories.bulkImport.importNotice', 'Existing items with the same code will be updated. New items will be created.')}
                </AlertDescription>
              </Alert>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => handleClose(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleImport}
            disabled={!parseResult || validRows.length === 0 || bulkImport.isPending}
          >
            {bulkImport.isPending ? (
              <>
                <Loader2 className="h-4 w-4 me-2 animate-spin" />
                {t('common.importing', 'Importing...')}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 me-2" />
                {t('assetCategories.bulkImport.importItems', 'Import {{count}} Items', { count: validRows.length })}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
