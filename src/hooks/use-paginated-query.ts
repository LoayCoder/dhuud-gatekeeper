import { useState, useCallback } from 'react';
import { useQuery, UseQueryResult } from '@tanstack/react-query';

export interface PaginationState {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface UsePaginatedQueryOptions<T> {
  queryKey: unknown[];
  queryFn: (pagination: { from: number; to: number }) => Promise<{ data: T[]; count: number }>;
  pageSize?: number;
  enabled?: boolean;
}

export function usePaginatedQuery<T>({
  queryKey,
  queryFn,
  pageSize = 25,
  enabled = true,
}: UsePaginatedQueryOptions<T>) {
  const [page, setPage] = useState(1);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const query = useQuery({
    queryKey: [...queryKey, page, pageSize],
    queryFn: async () => {
      const result = await queryFn({ from, to });
      return {
        data: result.data,
        totalCount: result.count,
        page,
        pageSize,
        totalPages: Math.ceil(result.count / pageSize),
        hasNextPage: page < Math.ceil(result.count / pageSize),
        hasPreviousPage: page > 1,
      };
    },
    enabled,
  });

  const goToPage = useCallback((newPage: number) => {
    setPage(Math.max(1, newPage));
  }, []);

  const goToNextPage = useCallback(() => {
    if (query.data?.hasNextPage) {
      setPage((p) => p + 1);
    }
  }, [query.data?.hasNextPage]);

  const goToPreviousPage = useCallback(() => {
    if (query.data?.hasPreviousPage) {
      setPage((p) => Math.max(1, p - 1));
    }
  }, [query.data?.hasPreviousPage]);

  const goToFirstPage = useCallback(() => {
    setPage(1);
  }, []);

  return {
    ...query,
    page,
    pageSize,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    totalCount: query.data?.totalCount ?? 0,
    totalPages: query.data?.totalPages ?? 0,
    hasNextPage: query.data?.hasNextPage ?? false,
    hasPreviousPage: query.data?.hasPreviousPage ?? false,
  };
}
