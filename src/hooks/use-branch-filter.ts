import { useBranch } from "@/contexts/BranchContext";
import { useMemo } from "react";

/**
 * Hook to get branch filtering parameters for data queries.
 * 
 * Returns:
 * - branchIds: Array of branch IDs to filter by, or null for "all branches"
 * - activeBranchId: The single active branch ID, or null for "all branches"
 * - isAllBranchesMode: True when viewing data from all branches
 * - queryKey: A stable array to include in react-query keys for proper cache invalidation
 * 
 * Usage in queries:
 * ```ts
 * const { branchIds, isAllBranchesMode, queryKey } = useBranchFilter();
 * 
 * const { data } = useQuery({
 *   queryKey: ['my-data', ...queryKey],
 *   queryFn: async () => {
 *     let query = supabase.from('table').select('*');
 *     
 *     // Only filter by branch if not in "all branches" mode
 *     if (!isAllBranchesMode && branchIds) {
 *       query = query.in('branch_id', branchIds);
 *     }
 *     
 *     return query;
 *   }
 * });
 * ```
 */
export function useBranchFilter() {
  const { 
    activeBranch, 
    accessibleBranches, 
    isAllBranchesMode, 
    hasFullBranchAccess,
    getBranchFilter,
    isLoading 
  } = useBranch();

  // Memoize the branch filter for stable references
  const branchIds = useMemo(() => getBranchFilter(), [getBranchFilter]);
  
  // Create a stable query key segment based on branch selection
  const queryKey = useMemo(() => {
    if (isAllBranchesMode) {
      return ['branch', 'all'] as const;
    }
    if (activeBranch) {
      return ['branch', activeBranch.id] as const;
    }
    // Fallback: all accessible branches
    return ['branch', accessibleBranches.map(b => b.id).join(',')] as const;
  }, [isAllBranchesMode, activeBranch, accessibleBranches]);

  return {
    // The active branch ID (null for "all branches" mode)
    activeBranchId: activeBranch?.id || null,
    
    // Array of branch IDs to filter by, or null for "all branches"
    branchIds,
    
    // True when showing data from all branches
    isAllBranchesMode,
    
    // True if user has access to all branches
    hasFullBranchAccess,
    
    // The active branch object
    activeBranch,
    
    // All accessible branches (useful for aggregation)
    accessibleBranches,
    
    // Stable query key segment for cache management
    queryKey,
    
    // Whether branch data is still loading
    isLoading,
  };
}

/**
 * Apply branch filter to a Supabase query builder.
 * 
 * @param query - The Supabase query builder
 * @param branchIds - Array of branch IDs to filter by, or null for no filter
 * @param columnName - The name of the branch_id column (default: 'branch_id')
 * @returns The modified query builder
 */
export function applyBranchFilter<T extends { in: (column: string, values: string[]) => T }>(
  query: T,
  branchIds: string[] | null,
  columnName = 'branch_id'
): T {
  if (branchIds === null || branchIds.length === 0) {
    // No filter - return query as-is
    return query;
  }
  
  if (branchIds.length === 1) {
    // Single branch - use eq for efficiency
    return (query as any).eq(columnName, branchIds[0]);
  }
  
  // Multiple branches - use in
  return query.in(columnName, branchIds);
}
