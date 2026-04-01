import { useState, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface ActionListState<T> {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sortField: keyof T | null;
  sortDirection: SortDirection;
  setSorting: (field: keyof T) => void;
  page: number;
  setPage: (p: number) => void;
  pageSize: number;
  totalPages: number;
  paginatedItems: T[];
  filteredCount: number;
}

interface UseActionListStateOptions {
  pageSize?: number;
  searchableFields?: string[];
}

export function useActionListState<T extends Record<string, unknown>>(
  items: T[],
  options: UseActionListStateOptions = {}
): ActionListState<T> {
  const { pageSize = 25, searchableFields } = options;
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);

  const setSorting = (field: keyof T) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setPage(1);
  };

  const filtered = useMemo(() => {
    let result = items;

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((item) => {
        const fields = searchableFields || Object.keys(item);
        return fields.some((key) => {
          const val = item[key];
          if (typeof val === 'string') return val.toLowerCase().includes(q);
          if (typeof val === 'number') return String(val).includes(q);
          if (val && typeof val === 'object' && 'full_name' in (val as Record<string, unknown>)) {
            return String((val as Record<string, unknown>).full_name || '').toLowerCase().includes(q);
          }
          if (val && typeof val === 'object' && 'title' in (val as Record<string, unknown>)) {
            return String((val as Record<string, unknown>).title || '').toLowerCase().includes(q);
          }
          return false;
        });
      });
    }

    // Sort
    if (sortField) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
        return sortDirection === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [items, searchQuery, sortField, sortDirection, searchableFields]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  return {
    searchQuery,
    setSearchQuery: (q: string) => { setSearchQuery(q); setPage(1); },
    sortField,
    sortDirection,
    setSorting,
    page: safePage,
    setPage,
    pageSize,
    totalPages,
    paginatedItems,
    filteredCount: filtered.length,
  };
}
