import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Edit2,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ImportAsset, AssetValidationError, AssetValidationWarning } from '@/lib/asset-import-utils';
import { ImportFieldEditor } from './ImportFieldEditor';

interface ImportPreviewTableProps {
  assets: ImportAsset[];
  errors: AssetValidationError[];
  warnings: AssetValidationWarning[];
  onAssetUpdate: (index: number, asset: ImportAsset) => void;
  highlightedRow?: number;
  lookupOptions?: {
    categories: string[];
    types: string[];
    subtypes: string[];
    branches: string[];
    sites: string[];
    buildings: string[];
    floorsZones: string[];
  };
}

const VISIBLE_COLUMNS: (keyof ImportAsset)[] = [
  'name',
  'category_name',
  'type_name',
  'serial_number',
  'branch_name',
  'site_name',
  'status'
];

const COLUMN_LABELS: Record<string, string> = {
  name: 'Name',
  category_name: 'Category',
  type_name: 'Type',
  subtype_name: 'Subtype',
  serial_number: 'Serial Number',
  manufacturer: 'Manufacturer',
  model: 'Model',
  description: 'Description',
  branch_name: 'Branch',
  site_name: 'Site',
  building_name: 'Building',
  floor_zone_name: 'Floor/Zone',
  status: 'Status',
  condition_rating: 'Condition',
  criticality_level: 'Criticality',
};

const PAGE_SIZE = 10;

export function ImportPreviewTable({
  assets,
  errors,
  warnings,
  onAssetUpdate,
  highlightedRow,
  lookupOptions
}: ImportPreviewTableProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [currentPage, setCurrentPage] = useState(1);
  const [editingCell, setEditingCell] = useState<{ row: number; field: keyof ImportAsset } | null>(null);
  const highlightedRef = useRef<HTMLTableRowElement>(null);

  const totalPages = Math.ceil(assets.length / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleAssets = assets.slice(startIndex, startIndex + PAGE_SIZE);

  // Scroll to highlighted row
  useEffect(() => {
    if (highlightedRow !== undefined && highlightedRef.current) {
      const rowPage = Math.ceil((highlightedRow - 2) / PAGE_SIZE);
      if (rowPage !== currentPage) {
        setCurrentPage(rowPage);
      }
      setTimeout(() => {
        highlightedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [highlightedRow]);

  const getRowStatus = (index: number): 'valid' | 'error' | 'warning' => {
    const rowNumber = index + 3; // Excel row number (1-indexed + 2 header rows)
    const hasErrors = errors.some(e => e.row === rowNumber);
    if (hasErrors) return 'error';
    const hasWarnings = warnings.some(w => w.row === rowNumber);
    if (hasWarnings) return 'warning';
    return 'valid';
  };

  const getRowErrors = (index: number): AssetValidationError[] => {
    const rowNumber = index + 3;
    return errors.filter(e => e.row === rowNumber);
  };

  const getCellError = (index: number, field: string): AssetValidationError | undefined => {
    const rowNumber = index + 3;
    return errors.find(e => e.row === rowNumber && e.field.toLowerCase() === field.toLowerCase());
  };

  const handleCellEdit = (rowIndex: number, field: keyof ImportAsset) => {
    setEditingCell({ row: rowIndex, field });
  };

  const handleCellSave = (rowIndex: number, field: keyof ImportAsset, value: string) => {
    const absoluteIndex = startIndex + rowIndex;
    const updatedAsset = { ...assets[absoluteIndex], [field]: value || undefined };
    onAssetUpdate(absoluteIndex, updatedAsset);
    setEditingCell(null);
  };

  const handleCellCancel = () => {
    setEditingCell(null);
  };

  const getFieldOptions = (field: keyof ImportAsset) => {
    if (!lookupOptions) return undefined;
    switch (field) {
      case 'category_name':
        return lookupOptions.categories.map(c => ({ value: c, label: c }));
      case 'type_name':
        return lookupOptions.types.map(t => ({ value: t, label: t }));
      case 'subtype_name':
        return lookupOptions.subtypes.map(s => ({ value: s, label: s }));
      case 'branch_name':
        return lookupOptions.branches.map(b => ({ value: b, label: b }));
      case 'site_name':
        return lookupOptions.sites.map(s => ({ value: s, label: s }));
      case 'building_name':
        return lookupOptions.buildings.map(b => ({ value: b, label: b }));
      case 'floor_zone_name':
        return lookupOptions.floorsZones.map(f => ({ value: f, label: f }));
      default:
        return undefined;
    }
  };

  return (
    <div className="space-y-3">
      {/* Summary badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="gap-1">
          {t('assets.import.totalRows')}: {assets.length}
        </Badge>
        <Badge variant="default" className="gap-1 bg-green-500">
          <CheckCircle2 className="h-3 w-3" />
          {t('assets.import.validRows')}: {assets.filter((_, i) => getRowStatus(i) === 'valid').length}
        </Badge>
        {errors.length > 0 && (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            {t('assets.import.invalidRows', { count: new Set(errors.map(e => e.row)).size })}
          </Badge>
        )}
      </div>

      {/* Table */}
      <ScrollArea className="h-[350px] border rounded-md">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-[60px] text-center">#</TableHead>
              <TableHead className="w-[60px]">{t('assets.import.status')}</TableHead>
              {VISIBLE_COLUMNS.map(col => (
                <TableHead key={col} className="min-w-[120px]">
                  {COLUMN_LABELS[col]}
                </TableHead>
              ))}
              <TableHead className="w-[80px]">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleAssets.map((asset, index) => {
              const absoluteIndex = startIndex + index;
              const rowNumber = absoluteIndex + 3;
              const status = getRowStatus(absoluteIndex);
              const rowErrors = getRowErrors(absoluteIndex);
              const isHighlighted = highlightedRow === rowNumber;

              return (
                <TableRow
                  key={absoluteIndex}
                  ref={isHighlighted ? highlightedRef : undefined}
                  className={cn(
                    status === 'error' && 'bg-red-50 dark:bg-red-950/20',
                    status === 'warning' && 'bg-amber-50 dark:bg-amber-950/20',
                    status === 'valid' && 'bg-green-50/50 dark:bg-green-950/10',
                    isHighlighted && 'ring-2 ring-primary ring-inset'
                  )}
                >
                  <TableCell className="text-center font-mono text-xs text-muted-foreground">
                    {rowNumber}
                  </TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex justify-center">
                            {status === 'valid' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                            {status === 'error' && <XCircle className="h-4 w-4 text-destructive" />}
                            {status === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-600" />}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {status === 'valid' && t('assets.import.valid')}
                          {status === 'error' && (
                            <div className="space-y-1">
                              {rowErrors.map((err, i) => (
                                <div key={i}>{err.field}: {t(`assets.import.${err.message}`)}</div>
                              ))}
                            </div>
                          )}
                          {status === 'warning' && t('assets.import.hasWarnings')}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  {VISIBLE_COLUMNS.map(col => {
                    const cellError = getCellError(absoluteIndex, col);
                    const isEditing = editingCell?.row === index && editingCell?.field === col;

                    if (isEditing) {
                      return (
                        <TableCell key={col} className="p-1">
                          <ImportFieldEditor
                            field={col}
                            value={asset[col] as string | undefined}
                            onChange={(value) => {}}
                            onSave={() => handleCellSave(index, col, asset[col] as string || '')}
                            onCancel={handleCellCancel}
                            hasError={!!cellError}
                            errorMessage={cellError ? t(`assets.import.${cellError.message}`) : undefined}
                            options={getFieldOptions(col)}
                          />
                        </TableCell>
                      );
                    }

                    return (
                      <TableCell 
                        key={col}
                        className={cn(
                          "cursor-pointer hover:bg-muted/50 transition-colors",
                          cellError && "bg-red-100 dark:bg-red-900/30"
                        )}
                        onClick={() => handleCellEdit(index, col)}
                      >
                        <div className="flex items-center gap-1">
                          <span className="truncate max-w-[150px]">
                            {asset[col] || <span className="text-muted-foreground italic">-</span>}
                          </span>
                          {cellError && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <XCircle className="h-3 w-3 text-destructive flex-shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  {t(`assets.import.${cellError.message}`)}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                    );
                  })}
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => handleCellEdit(index, 'name')}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t('assets.import.showingRows', { 
              start: startIndex + 1, 
              end: Math.min(startIndex + PAGE_SIZE, assets.length),
              total: assets.length 
            })}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              {direction === 'rtl' ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              {direction === 'rtl' ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
            <span className="text-sm px-2">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              {direction === 'rtl' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              {direction === 'rtl' ? <ChevronsLeft className="h-4 w-4" /> : <ChevronsRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
