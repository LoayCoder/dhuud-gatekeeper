import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CursorPosition {
  created_at: string;
  id: string;
}

export interface CursorPaginationResult<T> {
  data: T[];
  isLoading: boolean;
  error: Error | null;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  goToNextPage: () => Promise<void>;
  goToPreviousPage: () => Promise<void>;
  goToFirstPage: () => Promise<void>;
  refresh: () => Promise<void>;
  totalEstimate: number | null;
  currentPage: number;
}

interface UseCursorPaginationProps<T> {
  queryFn: (cursor?: CursorPosition) => Promise<{ data: T[]; count: number | null }>;
  pageSize?: number;
  enabled?: boolean;
}

export function useCursorPagination<T extends { id: string; created_at: string }>({
  queryFn,
  pageSize = 25,
  enabled = true,
}: UseCursorPaginationProps<T>): CursorPaginationResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [cursors, setCursors] = useState<CursorPosition[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEstimate, setTotalEstimate] = useState<number | null>(null);

  const fetchData = useCallback(async (cursor?: CursorPosition) => {
    if (!enabled) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const { data: result, count } = await queryFn(cursor);

      let items = result || [];
      
      // Check if there's a next page (we fetch pageSize + 1)
      const hasMore = items.length > pageSize;
      if (hasMore) {
        items = items.slice(0, pageSize);
      }

      setData(items);
      setTotalEstimate(count);
      setHasNextPage(hasMore);
      setHasPreviousPage(cursor !== undefined);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch data'));
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [queryFn, pageSize, enabled]);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchData();
    }
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const goToFirstPage = useCallback(async () => {
    setCursors([]);
    setCurrentPage(1);
    await fetchData();
  }, [fetchData]);

  const goToNextPage = useCallback(async () => {
    if (data.length === 0 || !hasNextPage) return;

    const lastItem = data[data.length - 1];
    const newCursor: CursorPosition = {
      created_at: lastItem.created_at,
      id: lastItem.id,
    };

    setCursors(prev => [...prev, newCursor]);
    setCurrentPage(prev => prev + 1);
    await fetchData(newCursor);
  }, [data, hasNextPage, fetchData]);

  const goToPreviousPage = useCallback(async () => {
    if (!hasPreviousPage || cursors.length === 0) return;

    const newCursors = cursors.slice(0, -1);
    setCursors(newCursors);
    setCurrentPage(prev => Math.max(1, prev - 1));

    const previousCursor = newCursors[newCursors.length - 1];
    await fetchData(previousCursor);
  }, [cursors, hasPreviousPage, fetchData]);

  const refresh = useCallback(async () => {
    const currentCursor = cursors[cursors.length - 1];
    await fetchData(currentCursor);
  }, [cursors, fetchData]);

  return {
    data,
    isLoading,
    error,
    hasNextPage,
    hasPreviousPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    refresh,
    totalEstimate,
    currentPage,
  };
}

// Helper to build cursor condition for Supabase queries
export function buildCursorCondition(
  cursor: CursorPosition | undefined,
  orderBy: string = 'created_at',
  ascending: boolean = false
): string | null {
  if (!cursor) return null;
  
  if (ascending) {
    return `${orderBy}.gt.${cursor.created_at},and(${orderBy}.eq.${cursor.created_at},id.gt.${cursor.id})`;
  }
  return `${orderBy}.lt.${cursor.created_at},and(${orderBy}.eq.${cursor.created_at},id.lt.${cursor.id})`;
}
