/**
 * Branch-Aware Query Hook
 * Provides consistent branch filtering for data queries
 * Ensures proper multi-tenant and branch isolation
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useBranch } from '@/contexts/BranchContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { applyBranchFilter } from '@/hooks/use-branch-filter';

interface BranchAwareQueryOptions<T> {
  /** Table name to query */
  tableName: string;
  /** Select columns (Supabase select syntax) */
  selectColumns: string;
  /** Additional filters to apply */
  additionalFilters?: (query: any) => any;
  /** Column to order by (default: 'created_at') */
  orderBy?: string;
  /** Order ascending (default: false) */
  ascending?: boolean;
  /** Limit results (default: 100) */
  limit?: number;
  /** Column name for branch filter (default: 'branch_id') */
  branchColumn?: string;
  /** React Query options */
  queryOptions?: Omit<UseQueryOptions<T[], Error>, 'queryKey' | 'queryFn'>;
}

/**
 * Hook for branch-aware data queries
 * Automatically applies tenant_id and branch filtering
 */
export function useBranchAwareQuery<T>(
  queryKey: string[],
  options: BranchAwareQueryOptions<T>
) {
  const { profile } = useAuth();
  const { getBranchFilter, isLoading: branchLoading, isAllBranchesMode } = useBranch();
  
  const tenantId = profile?.tenant_id;
  const branchFilter = getBranchFilter();

  return useQuery<T[], Error>({
    queryKey: [
      ...queryKey, 
      tenantId, 
      isAllBranchesMode ? 'all' : branchFilter?.join(',') || 'none'
    ],
    queryFn: async () => {
      if (!tenantId) return [];
      
      // Use dynamic table access
      let query = supabase
        .from(options.tableName as any)
        .select(options.selectColumns)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);
      
      // Apply branch filter (respects all-branches mode)
      if (!isAllBranchesMode && branchFilter && branchFilter.length > 0) {
        query = applyBranchFilter(query as any, branchFilter, options.branchColumn || 'branch_id');
      }
      
      // Apply additional filters
      if (options.additionalFilters) {
        query = options.additionalFilters(query);
      }
      
      // Apply ordering
      query = query.order(
        options.orderBy || 'created_at', 
        { ascending: options.ascending ?? false }
      );
      
      // Apply limit
      query = query.limit(options.limit || 100);
      
      const { data, error } = await query;
      if (error) throw error;
      return data as T[];
    },
    enabled: !!tenantId && !branchLoading,
    ...options.queryOptions,
  });
}

/**
 * Hook for getting branch filter parameters
 * Use when you need to apply branch filtering manually
 */
export function useBranchFilterParams() {
  const { profile } = useAuth();
  const { getBranchFilter, isLoading, isAllBranchesMode, activeBranch } = useBranch();
  
  const tenantId = profile?.tenant_id;
  const branchFilter = getBranchFilter();

  return {
    tenantId,
    branchIds: branchFilter,
    isAllBranchesMode,
    activeBranchId: activeBranch?.id || null,
    isLoading,
    isReady: !!tenantId && !isLoading,
    
    /**
     * Apply branch filter to a query
     */
    applyFilter: <T extends { eq: (col: string, val: string) => T; in: (col: string, vals: string[]) => T }>(
      query: T,
      columnName = 'branch_id'
    ): T => {
      if (isAllBranchesMode || !branchFilter || branchFilter.length === 0) {
        return query;
      }
      return applyBranchFilter(query, branchFilter, columnName);
    },
    
    /**
     * Get query key segment for cache management
     */
    getQueryKey: (): (string | null)[] => {
      return [
        tenantId || null,
        isAllBranchesMode ? 'all-branches' : (branchFilter?.join(',') || null)
      ];
    },
  };
}
