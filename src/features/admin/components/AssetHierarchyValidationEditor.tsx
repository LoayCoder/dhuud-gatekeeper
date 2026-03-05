/**
 * Asset Hierarchy Validation Editor
 * Displays detailed validation errors/warnings for each row with inline editing capabilities
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Pencil,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  FolderTree,
  Tag,
  Layers,
  Wrench,
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { ParsedHierarchyRow, HierarchyLevel } from '@/lib/asset-hierarchy-import-utils';

interface AssetHierarchyValidationEditorProps {
  rows: ParsedHierarchyRow[];
  onRowsChange: (rows: ParsedHierarchyRow[]) => void;
  onRevalidate: () => void;
}

function LevelIcon({ level }: { level: HierarchyLevel }) {
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

interface EditableRowProps {
  row: ParsedHierarchyRow;
  index: number;
  allRows: ParsedHierarchyRow[];
  onSave: (index: number, updatedRow: ParsedHierarchyRow) => void;
  onCancel: () => void;
}

function EditableRow({ row, index, allRows, onSave, onCancel }: EditableRowProps) {
  const { t } = useTranslation();
  const [editedRow, setEditedRow] = useState<ParsedHierarchyRow>({ ...row });
  
  // Get available parent options based on level
  const parentOptions = useMemo(() => {
    const options: { code: string; name: string }[] = [];
    
    // Only include rows before current row
    allRows.slice(0, index).forEach((r) => {
      if (
        (editedRow.level === 'Type' && r.level === 'Category') ||
        (editedRow.level === 'Subtype' && r.level === 'Type') ||
        (editedRow.level === 'Part' && (r.level === 'Type' || r.level === 'Subtype'))
      ) {
        options.push({ code: r.code, name: r.nameEn });
      }
    });
    
    return options;
  }, [allRows, index, editedRow.level]);
  
  const handleSave = () => {
    onSave(index, editedRow);
  };
  
  return (
    <TableRow className="bg-accent/50">
      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
      <TableCell>
        <Select
          value={editedRow.level}
          onValueChange={(value) => setEditedRow({ ...editedRow, level: value as HierarchyLevel })}
        >
          <SelectTrigger className="h-8 w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Category">{t('assetCategories.levels.category', 'Category')}</SelectItem>
            <SelectItem value="Type">{t('assetCategories.levels.type', 'Type')}</SelectItem>
            <SelectItem value="Subtype">{t('assetCategories.levels.subtype', 'Subtype')}</SelectItem>
            <SelectItem value="Part">{t('assetCategories.levels.part', 'Part')}</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          value={editedRow.code}
          onChange={(e) => setEditedRow({ ...editedRow, code: e.target.value })}
          className="h-8 w-[100px] font-mono text-xs"
          placeholder="Code"
        />
      </TableCell>
      <TableCell>
        <Input
          value={editedRow.nameEn}
          onChange={(e) => setEditedRow({ ...editedRow, nameEn: e.target.value })}
          className="h-8 w-[160px]"
          placeholder={t('assetCategories.bulkImport.name', 'Name')}
        />
      </TableCell>
      <TableCell>
        {editedRow.level !== 'Category' ? (
          <Select
            value={editedRow.parentCode}
            onValueChange={(value) => setEditedRow({ ...editedRow, parentCode: value })}
          >
            <SelectTrigger className="h-8 w-[120px]">
              <SelectValue placeholder={t('assetCategories.bulkImport.selectParent', 'Select parent')} />
            </SelectTrigger>
            <SelectContent>
              {parentOptions.map((opt) => (
                <SelectItem key={opt.code} value={opt.code}>
                  <span className="font-mono text-xs">{opt.code}</span>
                  <span className="ms-2 text-muted-foreground text-xs">({opt.name})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={handleSave} className="h-7 w-7 p-0">
            <Check className="h-4 w-4 text-green-500" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel} className="h-7 w-7 p-0">
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function AssetHierarchyValidationEditor({
  rows,
  onRowsChange,
  onRevalidate,
}: AssetHierarchyValidationEditorProps) {
  const { t } = useTranslation();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);
  const [expandedErrors, setExpandedErrors] = useState<Set<number>>(new Set());
  
  const { validCount, invalidCount, warningCount } = useMemo(() => {
    return {
      validCount: rows.filter((r) => r.isValid).length,
      invalidCount: rows.filter((r) => !r.isValid).length,
      warningCount: 0, // Future: could add warning detection
    };
  }, [rows]);
  
  const displayedRows = useMemo(() => {
    if (showOnlyErrors) {
      return rows.map((row, index) => ({ row, originalIndex: index })).filter(({ row }) => !row.isValid);
    }
    return rows.map((row, index) => ({ row, originalIndex: index }));
  }, [rows, showOnlyErrors]);
  
  const handleRowSave = useCallback((index: number, updatedRow: ParsedHierarchyRow) => {
    const newRows = [...rows];
    newRows[index] = updatedRow;
    onRowsChange(newRows);
    setEditingIndex(null);
    // Trigger re-validation
    onRevalidate();
  }, [rows, onRowsChange, onRevalidate]);
  
  const toggleErrorExpanded = (index: number) => {
    const newExpanded = new Set(expandedErrors);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedErrors(newExpanded);
  };
  
  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Badge className="bg-green-500 gap-1">
            <CheckCircle className="h-3 w-3" />
            {validCount} {t('common.valid', 'valid')}
          </Badge>
          {invalidCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              {invalidCount} {t('common.errors', 'errors')}
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge variant="outline" className="text-amber-600 border-amber-500 gap-1">
              <AlertTriangle className="h-3 w-3" />
              {warningCount} {t('common.warnings', 'warnings')}
            </Badge>
          )}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowOnlyErrors(!showOnlyErrors)}
          className={cn(showOnlyErrors && 'bg-destructive/10 border-destructive/50')}
        >
          {showOnlyErrors 
            ? t('assetCategories.validation.showAll', 'Show All')
            : t('assetCategories.validation.showOnlyErrors', 'Show Only Errors')}
        </Button>
      </div>
      
      {/* Validation table */}
      <ScrollArea className="h-[300px] rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">#</TableHead>
              <TableHead className="w-[100px]">{t('assetCategories.bulkImport.level', 'Level')}</TableHead>
              <TableHead className="w-[100px]">{t('assetCategories.bulkImport.code', 'Code')}</TableHead>
              <TableHead>{t('assetCategories.bulkImport.name', 'Name')}</TableHead>
              <TableHead className="w-[100px]">{t('assetCategories.bulkImport.parent', 'Parent')}</TableHead>
              <TableHead className="w-[120px]">{t('common.status', 'Status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedRows.map(({ row, originalIndex }) => {
              if (editingIndex === originalIndex) {
                return (
                  <EditableRow
                    key={originalIndex}
                    row={row}
                    index={originalIndex}
                    allRows={rows}
                    onSave={handleRowSave}
                    onCancel={() => setEditingIndex(null)}
                  />
                );
              }
              
              const isExpanded = expandedErrors.has(originalIndex);
              const hasMultipleErrors = row.errors.length > 1;
              
              return (
                <Collapsible key={originalIndex} open={isExpanded} onOpenChange={() => toggleErrorExpanded(originalIndex)}>
                  <TableRow 
                    className={cn(
                      !row.isValid && 'bg-destructive/5',
                      'hover:bg-muted/50 transition-colors'
                    )}
                  >
                    <TableCell className="text-muted-foreground">{originalIndex + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <LevelIcon level={row.level} />
                        <span className="text-xs">{row.level}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.code || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">{row.nameEn}</span>
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
                        <div className="flex items-center gap-1.5">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-xs text-green-600">{t('common.valid', 'Valid')}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1.5 cursor-pointer">
                                <AlertCircle className="h-4 w-4 text-destructive" />
                                <span className="text-xs text-destructive truncate max-w-[100px]">
                                  {row.errors[0]}
                                </span>
                                {hasMultipleErrors && (
                                  <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                                      {isExpanded ? (
                                        <ChevronUp className="h-3 w-3" />
                                      ) : (
                                        <ChevronDown className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </CollapsibleTrigger>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-[300px]">
                              <ul className="list-disc list-inside space-y-1">
                                {row.errors.map((error, i) => (
                                  <li key={i} className="text-xs">{error}</li>
                                ))}
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 ms-1"
                            onClick={() => setEditingIndex(originalIndex)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                  
                  {hasMultipleErrors && (
                    <CollapsibleContent asChild>
                      <TableRow className="bg-destructive/5 border-0">
                        <TableCell colSpan={6} className="py-2 ps-12">
                          <div className="text-xs space-y-1">
                            <span className="font-medium text-destructive">
                              {t('assetCategories.validation.allErrors', 'All errors:')}
                            </span>
                            <ul className="list-disc list-inside space-y-0.5 text-destructive/80">
                              {row.errors.map((error, i) => (
                                <li key={i}>{error}</li>
                              ))}
                            </ul>
                          </div>
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  )}
                </Collapsible>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>
      
      {/* Help text */}
      <p className="text-xs text-muted-foreground">
        {t('assetCategories.validation.helpText', 
          'Click the pencil icon to edit rows with errors. Changes are validated automatically.'
        )}
      </p>
    </div>
  );
}

