import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Inbox, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useActionListState, type SortDirection } from '@/hooks/use-action-list-state';

export interface ActionListColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
  primary?: boolean;
  /** If true, column is hidden from the main row and shown in the expandable detail strip */
  expandable?: boolean;
}

interface ActionListTableProps<T extends Record<string, unknown>> {
  items: T[];
  columns: ActionListColumn<T>[];
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  searchableFields?: string[];
  headerActions?: React.ReactNode;
}

export function ActionListTable<T extends Record<string, unknown>>({
  items,
  columns,
  onRowClick,
  isLoading,
  emptyMessage,
  emptyIcon,
  searchableFields,
  headerActions,
}: ActionListTableProps<T>) {
  const { t } = useTranslation();
  const [expandedRows, setExpandedRows] = useState<Set<string | number>>(new Set());

  const {
    searchQuery,
    setSearchQuery,
    sortField,
    sortDirection,
    setSorting,
    page,
    setPage,
    totalPages,
    paginatedItems,
    filteredCount,
  } = useActionListState<T>(items, { searchableFields });

  const visibleColumns = useMemo(() => columns.filter(c => !c.expandable), [columns]);
  const expandableColumns = useMemo(() => columns.filter(c => c.expandable), [columns]);
  const hasExpandable = expandableColumns.length > 0;

  const toggleRow = useCallback((id: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full rounded-md" />
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Sticky search + header actions */}
      <div className="sticky top-0 z-10 bg-background pb-2 space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('actionCenter.table.search', 'Search...')}
              className="ps-9 h-10"
            />
          </div>
          {headerActions}
        </div>
        <p className="text-xs text-muted-foreground">
          {t('actionCenter.table.showing', 'Showing {{count}} of {{total}}', {
            count: paginatedItems.length,
            total: filteredCount,
          })}
        </p>
      </div>

      {/* Table / Cards */}
      {paginatedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          {emptyIcon || <Inbox className="h-10 w-10 mb-2 opacity-40" />}
          <p className="text-sm">{emptyMessage || t('actionCenter.table.noResults', 'No results found')}</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b bg-muted/60">
                  {hasExpandable && <th className="w-8" />}
                  {visibleColumns.map((col) => (
                    <th
                      key={String(col.key)}
                      className={cn(
                        'px-3 py-2.5 text-start font-medium text-muted-foreground whitespace-nowrap',
                        col.sortable && 'cursor-pointer select-none hover:text-foreground',
                        col.primary && 'w-[40%]',
                        col.className,
                      )}
                      onClick={col.sortable ? () => setSorting(col.key as keyof T) : undefined}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {col.sortable && (
                          <SortIcon field={col.key as string} sortField={sortField as string | null} direction={sortDirection} />
                        )}
                      </span>
                    </th>
                  ))}
                  {onRowClick && <th className="w-8" />}
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((item, idx) => {
                  const rowId = (item as Record<string, unknown>).id as string || idx;
                  const isExpanded = expandedRows.has(rowId);

                  return (
                    <>
                      <tr
                        key={rowId}
                        className={cn(
                          'border-b transition-colors',
                          idx % 2 === 1 && 'bg-muted/20',
                          onRowClick && 'cursor-pointer hover:bg-accent/50 active:bg-accent/70',
                        )}
                        onClick={() => onRowClick?.(item)}
                      >
                        {hasExpandable && (
                          <td className="px-2 py-2.5 align-middle">
                            <button
                              type="button"
                              className="p-1 rounded hover:bg-muted/60 transition-transform"
                              onClick={(e) => toggleRow(rowId, e)}
                              aria-label={isExpanded ? 'Collapse' : 'Expand'}
                            >
                              <ChevronDown className={cn(
                                'h-4 w-4 text-muted-foreground transition-transform duration-200',
                                isExpanded && 'rotate-180',
                                !isExpanded && 'rtl:-rotate-90 ltr:-rotate-90',
                              )} />
                            </button>
                          </td>
                        )}
                        {visibleColumns.map((col) => (
                          <td
                            key={String(col.key)}
                            className={cn('px-3 py-2.5 align-middle', col.className)}
                          >
                            {col.render
                              ? col.render(item)
                              : String(item[col.key as keyof T] ?? '—')}
                          </td>
                        ))}
                        {onRowClick && (
                          <td className="px-2 py-2.5 align-middle text-muted-foreground">
                            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                          </td>
                        )}
                      </tr>
                      {hasExpandable && isExpanded && (
                        <tr key={`${rowId}-detail`} className="border-b bg-muted/30">
                          <td colSpan={visibleColumns.length + (onRowClick ? 2 : 1)} className="px-4 py-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-2">
                              {expandableColumns.map((col) => (
                                <div key={String(col.key)} className="flex flex-col gap-0.5">
                                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{col.label}</span>
                                  <span className="text-xs font-medium">
                                    {col.render ? col.render(item) : String(item[col.key as keyof T] ?? '—')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-2">
            {paginatedItems.map((item, idx) => {
              const rowId = (item as Record<string, unknown>).id as string || idx;
              const isExpanded = expandedRows.has(rowId);
              const primaryCol = visibleColumns.find(c => c.primary);
              const otherVisibleCols = visibleColumns.filter(c => c !== primaryCol);

              return (
                <div
                  key={rowId}
                  className={cn(
                    'rounded-lg border p-3 space-y-2 transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-muted/50 active:bg-muted',
                  )}
                >
                  {/* Primary column as card header */}
                  {primaryCol && (
                    <div
                      className="flex items-start justify-between gap-2"
                      onClick={() => onRowClick?.(item)}
                    >
                      <div className="font-medium text-sm line-clamp-2 flex-1">
                        {primaryCol.render ? primaryCol.render(item) : String(item[primaryCol.key as keyof T] ?? '—')}
                      </div>
                      {onRowClick && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5 rtl:rotate-180" />
                      )}
                    </div>
                  )}
                  {/* Other visible fields */}
                  <div
                    className="grid grid-cols-2 gap-x-3 gap-y-1"
                    onClick={() => onRowClick?.(item)}
                  >
                    {otherVisibleCols.map((col) => (
                      <div key={String(col.key)} className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{col.label}</span>
                        <span className="text-xs font-medium">
                          {col.render ? col.render(item) : String(item[col.key as keyof T] ?? '—')}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* Expandable detail toggle */}
                  {hasExpandable && (
                    <>
                      <button
                        type="button"
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground w-full pt-1 min-h-[44px]"
                        onClick={(e) => toggleRow(rowId, e)}
                      >
                        <ChevronDown className={cn(
                          'h-3.5 w-3.5 transition-transform duration-200',
                          isExpanded && 'rotate-180',
                        )} />
                        <span>{isExpanded
                          ? t('actionCenter.table.lessDetails', 'Less details')
                          : t('actionCenter.table.moreDetails', 'More details')
                        }</span>
                      </button>
                      {isExpanded && (
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-1 border-t border-border/50">
                          {expandableColumns.map((col) => (
                            <div key={String(col.key)} className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{col.label}</span>
                              <span className="text-xs font-medium">
                                {col.render ? col.render(item) : String(item[col.key as keyof T] ?? '—')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="h-9 min-h-[44px] w-9 p-0"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-9 min-h-[44px] w-9 p-0"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          </Button>
        </div>
      )}
    </div>
  );
}

function SortIcon({ field, sortField, direction }: { field: string; sortField: string | null; direction: SortDirection }) {
  if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
  return direction === 'asc'
    ? <ArrowUp className="h-3 w-3" />
    : <ArrowDown className="h-3 w-3" />;
}
