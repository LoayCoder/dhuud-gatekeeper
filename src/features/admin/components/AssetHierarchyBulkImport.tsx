/**
 * Asset Hierarchy Bulk Import Dialog
 * Allows admins to upload Excel files to bulk import categories, types, subtypes, and parts.
 * Also supports exporting existing data, smart update/insert mode, and real-time progress tracking.
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
  History,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { 
  parseHierarchyFile, 
  downloadHierarchyTemplate, 
  exportAssetHierarchy,
  type ParseResult, 
  type ImportMode,
} from '@/lib/asset-hierarchy-import-utils';
import { useBulkImportAssetHierarchy, type ImportProgress } from '@/hooks/use-bulk-import-asset-hierarchy';
import AssetHierarchyValidationEditor from './AssetHierarchyValidationEditor';
import { AssetImportHistoryTable } from './AssetImportHistoryTable';

// Import step type
type ImportStep = 'upload' | 'validate' | 'import';

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

/**
 * Progress Panel Component - Shows real-time import progress for each hierarchy level
 */
function ImportProgressPanel({ progress }: { progress: ImportProgress }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  
  const levels = [
    { 
      key: 'categories' as const, 
      icon: FolderTree, 
      label: t('assetCategories.levels.categories', 'Categories'),
      colorClass: 'text-primary',
    },
    { 
      key: 'types' as const, 
      icon: Tag, 
      label: t('assetCategories.levels.types', 'Types'),
      colorClass: 'text-blue-500',
    },
    { 
      key: 'subtypes' as const, 
      icon: Layers, 
      label: t('assetCategories.levels.subtypes', 'Subtypes'),
      colorClass: 'text-green-500',
    },
    { 
      key: 'parts' as const, 
      icon: Wrench, 
      label: t('assetCategories.levels.parts', 'Parts'),
      colorClass: 'text-orange-500',
    },
  ];
  
  const getPhaseIndex = (phase: ImportProgress['phase']): number => {
    const phaseOrder = ['idle', 'categories', 'types', 'subtypes', 'parts', 'complete'];
    return phaseOrder.indexOf(phase);
  };
  
  const currentPhaseIndex = getPhaseIndex(progress.phase);
  
  // Calculate overall progress
  const totalItems = progress.categories.total + progress.types.total + 
                     progress.subtypes.total + progress.parts.total;
  const completedItems = progress.categories.current + progress.types.current + 
                         progress.subtypes.current + progress.parts.current;
  const overallPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  
  return (
    <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
      {/* Header with overall percentage */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          {progress.phase === 'complete' ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-green-600">
                {t('assetCategories.bulkImport.importComplete', 'Import Complete!')}
              </span>
            </>
          ) : (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>{t('assetCategories.bulkImport.importing', 'Importing...')}</span>
            </>
          )}
        </div>
        <span className="text-lg font-semibold tabular-nums">{overallPercentage}%</span>
      </div>
      
      {/* Overall progress bar */}
      <Progress 
        value={overallPercentage} 
        className="h-2"
        dir={isRTL ? 'rtl' : 'ltr'}
      />
      
      {/* Progress for each level */}
      <div className="space-y-3">
        {levels.map(({ key, icon: Icon, label, colorClass }) => {
          const data = progress[key];
          const levelPhaseIndex = getPhaseIndex(key);
          const isActive = progress.phase === key;
          const isComplete = currentPhaseIndex > levelPhaseIndex && data.total > 0;
          const isPending = currentPhaseIndex < levelPhaseIndex;
          const percentage = data.total > 0 ? (data.current / data.total) * 100 : 0;
          
          return (
            <div 
              key={key} 
              className={`space-y-1.5 transition-opacity ${isPending ? 'opacity-50' : 'opacity-100'}`}
            >
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${colorClass}`} />
                  <span className={isActive ? 'font-medium' : ''}>{label}</span>
                  {isActive && (
                    <span className="text-xs text-muted-foreground animate-pulse">
                      {t('assetCategories.bulkImport.processing', 'Processing...')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {isComplete && data.total > 0 && (
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  )}
                  <span className="font-mono text-xs tabular-nums">
                    {data.current}/{data.total}
                  </span>
                </div>
              </div>
              <Progress 
                value={percentage} 
                className="h-1.5"
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>
          );
        })}
      </div>
      
      {/* Completion summary */}
      {progress.phase === 'complete' && (
        <div className="mt-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-700 dark:text-green-300">
            {t('assetCategories.bulkImport.successfullyImported', 'Successfully imported {{count}} items', { count: completedItems })}
          </p>
        </div>
      )}
    </div>
  );
}

export function AssetHierarchyBulkImport({
  open,
  onOpenChange,
}: AssetHierarchyBulkImportProps) {
  const { t } = useTranslation();
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [updateMode, setUpdateMode] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const bulkImport = useBulkImportAssetHierarchy();

  // Revalidate rows after inline edits
  const revalidateRows = useCallback(() => {
    if (!parseResult) return;
    
    // Re-run validation on all rows
    const allRows = [...parseResult.rows];
    const revalidatedRows = allRows.map((row, index) => {
      const errors: string[] = [];
      
      // Level is required
      if (!row.level) {
        errors.push('Level is required (Category, Type, Subtype, or Part)');
      }
      
      // Name EN is required
      if (!row.nameEn || row.nameEn.trim().length < 1) {
        errors.push('Name (EN) is required');
      }
      
      // Parent code validation for non-Category levels
      if (row.level !== 'Category') {
        if (!row.parentCode || row.parentCode.trim().length < 1) {
          errors.push('Parent Code is required for Types, Subtypes, and Parts');
        } else {
          // Check if parent exists in previous rows
          const parentExists = allRows.slice(0, index).some(r => {
            const parentCode = r.code?.toLowerCase().trim();
            const expectedCode = row.parentCode?.toLowerCase().trim();
            return parentCode === expectedCode;
          });
          if (!parentExists) {
            errors.push(`Parent "${row.parentCode}" not found in previous rows`);
          }
        }
      }
      
      // Validate parent level hierarchy
      if (row.level === 'Type' && row.parentCode) {
        const parent = allRows.slice(0, index).find(r => r.code?.toLowerCase().trim() === row.parentCode?.toLowerCase().trim());
        if (parent && parent.level !== 'Category') {
          errors.push('Type must have a Category as parent');
        }
      }
      
      if (row.level === 'Subtype' && row.parentCode) {
        const parent = allRows.slice(0, index).find(r => r.code?.toLowerCase().trim() === row.parentCode?.toLowerCase().trim());
        if (parent && parent.level !== 'Type') {
          errors.push('Subtype must have a Type as parent');
        }
      }
      
      if (row.level === 'Part' && row.parentCode) {
        const parent = allRows.slice(0, index).find(r => r.code?.toLowerCase().trim() === row.parentCode?.toLowerCase().trim());
        if (parent && parent.level !== 'Type' && parent.level !== 'Subtype') {
          errors.push('Part must have a Type or Subtype as parent');
        }
      }
      
      return {
        ...row,
        isValid: errors.length === 0,
        errors,
      };
    });
    
    // Regroup by level
    const categories = revalidatedRows.filter(r => r.level === 'Category');
    const types = revalidatedRows.filter(r => r.level === 'Type');
    const subtypes = revalidatedRows.filter(r => r.level === 'Subtype');
    const parts = revalidatedRows.filter(r => r.level === 'Part');
    
    setParseResult({
      ...parseResult,
      rows: revalidatedRows,
      categories,
      types,
      subtypes,
      parts,
      validCount: revalidatedRows.filter(r => r.isValid).length,
      invalidCount: revalidatedRows.filter(r => !r.isValid).length,
    });
  }, [parseResult]);

  const handleRowsChange = useCallback((newRows: typeof parseResult.rows) => {
    if (!parseResult) return;
    
    // Regroup by level
    const categories = newRows.filter(r => r.level === 'Category');
    const types = newRows.filter(r => r.level === 'Type');
    const subtypes = newRows.filter(r => r.level === 'Subtype');
    const parts = newRows.filter(r => r.level === 'Part');
    
    setParseResult({
      ...parseResult,
      rows: newRows,
      categories,
      types,
      subtypes,
      parts,
      validCount: newRows.filter(r => r.isValid).length,
      invalidCount: newRows.filter(r => !r.isValid).length,
    });
  }, [parseResult]);

  const resetState = useCallback(() => {
    setParseResult(null);
    setFileName(null);
    setCurrentStep('upload');
    bulkImport.resetProgress();
  }, [bulkImport]);

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
      // Move to validation step after parsing
      if (!result.parseError) {
        setCurrentStep('validate');
      }
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
    setCurrentStep('import');
    await bulkImport.mutateAsync({ parseResult, mode, fileName: fileName || undefined });
    
    // Wait 2 seconds to show completion state before closing
    await new Promise(resolve => setTimeout(resolve, 2000));
    handleClose(false);
  };

  const handleProceedToImport = () => {
    if (!parseResult || parseResult.validCount === 0) return;
    setCurrentStep('import');
  };

  const handleBackToValidation = () => {
    setCurrentStep('validate');
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

        <Tabs defaultValue="import" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="import">
              <Upload className="h-4 w-4 me-2" />
              {t('common.import', 'Import')}
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 me-2" />
              {t('common.history', 'History')}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="history" className="mt-0">
            <AssetImportHistoryTable />
          </TabsContent>
          
          <TabsContent value="import" className="mt-0 space-y-4">
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

          {/* Progress Panel - shown during import step */}
          {(currentStep === 'import' || bulkImport.isPending) && (
            <ImportProgressPanel progress={bulkImport.progress} />
          )}

          {/* File Upload Zone - hidden during import */}
          {!parseResult && !bulkImport.isPending && (
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
          {parseResult?.parseError && !bulkImport.isPending && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{parseResult.parseError}</AlertDescription>
            </Alert>
          )}

          {/* STEP: VALIDATE - Show validation editor with inline editing */}
          {currentStep === 'validate' && parseResult && !parseResult.parseError && !bulkImport.isPending && (
            <>
              {/* File info header */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{fileName}</Badge>
                  <Button variant="ghost" size="sm" onClick={resetState}>
                    <X className="h-4 w-4 me-1" />
                    {t('common.clear', 'Clear')}
                  </Button>
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

              {/* Validation Editor */}
              <AssetHierarchyValidationEditor
                rows={parseResult.rows}
                onRowsChange={handleRowsChange}
                onRevalidate={revalidateRows}
              />

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
            </>
          )}

          {/* STEP: IMPORT - Show progress panel */}
          {currentStep === 'import' && bulkImport.isPending && (
            <ImportProgressPanel progress={bulkImport.progress} />
          )}
          </TabsContent>
        </Tabs>

        {/* Actions - Dynamic based on step */}
        <div className="flex justify-between gap-2 pt-4">
          <div>
            {currentStep === 'validate' && (
              <Button variant="outline" onClick={resetState}>
                {t('assetCategories.bulkImport.uploadDifferentFile', 'Upload Different File')}
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleClose(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            
            {currentStep === 'validate' && (
              <Button
                onClick={handleImport}
                disabled={!parseResult || validRows.length === 0}
              >
                <Upload className="h-4 w-4 me-2" />
                {invalidRows.length > 0 
                  ? t('assetCategories.bulkImport.importValidItems', 'Import {{count}} Valid Items', { count: validRows.length })
                  : t('assetCategories.bulkImport.importItems', 'Import {{count}} Items', { count: validRows.length })
                }
              </Button>
            )}
            
            {currentStep === 'import' && bulkImport.isPending && (
              <Button disabled>
                <Loader2 className="h-4 w-4 me-2 animate-spin" />
                {t('common.importing', 'Importing...')}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

