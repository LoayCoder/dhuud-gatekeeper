import React from 'react';
import { useTranslation } from 'react-i18next';
import { History, FileSpreadsheet, User, AlertTriangle, CheckCircle, AlertCircle, Boxes, Package, Layers, Cog } from 'lucide-react';
import { useAssetImportHistory, type AssetImportHistoryRecord } from '@/hooks/use-asset-import-history';
import { formatDateTime, formatRelativeTime } from '@/lib/date-utils';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AssetImportHistoryTableProps {
  limit?: number;
}

function getStatusVariant(status: string): 'completed' | 'pending' | 'critical' {
  switch (status) {
    case 'success': return 'completed';
    case 'partial': return 'pending';
    case 'failed': return 'critical';
    default: return 'pending';
  }
}

function ImportSummary({ record }: { record: AssetImportHistoryRecord }) {
  const { t } = useTranslation();
  
  const items = [
    { 
      icon: Boxes, 
      label: t('assetCategories.title', 'Categories'),
      created: record.categories_created, 
      updated: record.categories_updated 
    },
    { 
      icon: Package, 
      label: t('assetTypes.title', 'Types'),
      created: record.types_created, 
      updated: record.types_updated 
    },
    { 
      icon: Layers, 
      label: t('assetSubtypes.title', 'Subtypes'),
      created: record.subtypes_created, 
      updated: record.subtypes_updated 
    },
    { 
      icon: Cog, 
      label: t('assetParts.title', 'Parts'),
      created: record.parts_created, 
      updated: record.parts_updated 
    },
  ];

  const totalCreated = record.categories_created + record.types_created + 
                       record.subtypes_created + record.parts_created;
  const totalUpdated = record.categories_updated + record.types_updated + 
                       record.subtypes_updated + record.parts_updated;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="text-sm tabular-nums cursor-help">
            <span className="text-green-600 dark:text-green-400">+{totalCreated}</span>
            {totalUpdated > 0 && (
              <>
                <span className="text-muted-foreground mx-1">/</span>
                <span className="text-blue-600 dark:text-blue-400">↻{totalUpdated}</span>
              </>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="p-3">
          <div className="space-y-2 text-xs">
            {items.map(({ icon: Icon, label, created, updated }) => (
              (created > 0 || updated > 0) && (
                <div key={label} className="flex items-center gap-2">
                  <Icon className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{label}:</span>
                  {created > 0 && <span className="text-green-600">+{created}</span>}
                  {updated > 0 && <span className="text-blue-600">↻{updated}</span>}
                </div>
              )
            ))}
            {record.skipped_count > 0 && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertTriangle className="h-3 w-3" />
                <span>{t('common.skipped', 'Skipped')}: {record.skipped_count}</span>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function AssetImportHistoryTable({ limit = 15 }: AssetImportHistoryTableProps) {
  const { t } = useTranslation();
  const { data: history, isLoading, error } = useAssetImportHistory(limit);

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mb-2" />
        <p className="text-sm text-muted-foreground">
          {t('common.error.generic', 'Failed to load data')}
        </p>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <History className="h-12 w-12 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">
          {t('assetCategories.bulkImport.noHistory', 'No import history yet')}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          {t('assetCategories.bulkImport.noHistoryDesc', 'Import operations will appear here')}
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('common.date', 'Date')}</TableHead>
            <TableHead>{t('common.user', 'User')}</TableHead>
            <TableHead>{t('common.file', 'File')}</TableHead>
            <TableHead>{t('common.mode', 'Mode')}</TableHead>
            <TableHead>{t('common.status', 'Status')}</TableHead>
            <TableHead className="text-end">{t('common.items', 'Items')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.map((record) => (
            <TableRow key={record.id}>
              <TableCell>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-sm cursor-help">
                        {formatRelativeTime(record.created_at)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {formatDateTime(record.created_at)}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm truncate max-w-[120px]">
                    {record.user_profile?.full_name || record.user_profile?.email || t('common.unknown', 'Unknown')}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm truncate max-w-[150px]">
                    {record.file_name || t('common.noFile', 'No file')}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                  {record.import_mode === 'update_or_insert' 
                    ? t('assetCategories.bulkImport.updateOrInsert', 'Update/Insert')
                    : t('assetCategories.bulkImport.insertOnly', 'Insert Only')
                  }
                </span>
              </TableCell>
              <TableCell>
                <StatusBadge status={getStatusVariant(record.status)} size="sm">
                  {record.status === 'success' && <CheckCircle className="h-3 w-3" />}
                  {record.status === 'partial' && <AlertTriangle className="h-3 w-3" />}
                  {record.status === 'failed' && <AlertCircle className="h-3 w-3" />}
                  <span className="capitalize">{record.status}</span>
                </StatusBadge>
              </TableCell>
              <TableCell className="text-end">
                <ImportSummary record={record} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
