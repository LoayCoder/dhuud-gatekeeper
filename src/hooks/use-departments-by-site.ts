import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSiteDepartments } from './use-site-departments';

interface Department {
  id: string;
  name: string;
  branch_id?: string | null;
  division_id?: string | null;
  division_name?: string | null;
}

interface UseDepartmentsBySiteResult {
  departments: Department[];
  isLoading: boolean;
  hasSiteMapping: boolean;
  usingFallback: boolean;
  primaryDepartmentId: string | null;
  error: Error | null;
}

/**
 * Hook for hierarchical department filtering based on Site → Department relationships.
 * 
 * PRIMARY BEHAVIOR:
 * - When a site is selected, shows only departments explicitly assigned to that site
 *   via the site_departments table.
 * 
 * FALLBACK BEHAVIOR:
 * - If a site has no explicit department mappings, falls back to showing all
 *   departments belonging to the same branch.
 * 
 * HYBRID SUPPORT:
 * - Always includes departments where branch_id is null (tenant-wide departments)
 * 
 * @param siteId - The selected site ID (optional)
 * @param branchId - The selected branch ID (optional, used for fallback)
 * @returns Object containing filtered departments and metadata about the filtering mode
 */
export function useDepartmentsBySite(
  siteId?: string,
  branchId?: string
): UseDepartmentsBySiteResult {
  // Fetch site-specific department mappings
  const { 
    departments: siteDepartmentMappings, 
    isLoading: siteDeptLoading 
  } = useSiteDepartments(siteId);

  // Fetch all departments for the branch (used as fallback)
  const { 
    data: branchDepartments = [], 
    isLoading: branchDeptLoading,
    error: branchError 
  } = useQuery({
    queryKey: ['departments-by-branch', branchId],
    queryFn: async () => {
      if (!branchId) return [];

      const { data, error } = await supabase
        .from('departments')
        .select(`
          id,
          name,
          branch_id,
          division_id,
          divisions:division_id (
            name
          )
        `)
        .is('deleted_at', null)
        .or(`branch_id.eq.${branchId},branch_id.is.null`);

      if (error) throw error;
      
      return (data || []).map(dept => ({
        id: dept.id,
        name: dept.name,
        branch_id: dept.branch_id,
        division_id: dept.division_id,
        division_name: (dept.divisions as { name: string } | null)?.name || null,
      })) as Department[];
    },
    enabled: !!branchId,
  });

  // Compute the final result
  const result = useMemo<UseDepartmentsBySiteResult>(() => {
    const isLoading = siteDeptLoading || branchDeptLoading;
    
    // No site selected - show all branch departments
    if (!siteId) {
      return {
        departments: branchDepartments,
        isLoading,
        hasSiteMapping: false,
        usingFallback: true,
        primaryDepartmentId: null,
        error: branchError as Error | null,
      };
    }

    // Check if site has explicit department mappings
    const hasSiteMapping = siteDepartmentMappings && siteDepartmentMappings.length > 0;

    if (hasSiteMapping) {
      // PRIMARY PATH: Use site-specific departments
      const siteDepartments: Department[] = siteDepartmentMappings
        .filter(mapping => mapping.department)
        .map(mapping => ({
          id: mapping.department!.id,
          name: mapping.department!.name,
          branch_id: branchId || null,
          division_id: null,
          division_name: null,
        }));

      // Find primary department
      const primaryMapping = siteDepartmentMappings.find(m => m.is_primary);
      const primaryDepartmentId = primaryMapping?.department_id || null;

      // Also include hybrid departments (branch_id is null)
      const hybridDepartments = branchDepartments.filter(d => d.branch_id === null);
      const siteDeptIds = new Set(siteDepartments.map(d => d.id));
      const uniqueHybridDepts = hybridDepartments.filter(d => !siteDeptIds.has(d.id));

      return {
        departments: [...siteDepartments, ...uniqueHybridDepts],
        isLoading,
        hasSiteMapping: true,
        usingFallback: false,
        primaryDepartmentId,
        error: null,
      };
    }

    // FALLBACK PATH: Site has no department mappings, show all branch departments
    return {
      departments: branchDepartments,
      isLoading,
      hasSiteMapping: false,
      usingFallback: true,
      primaryDepartmentId: null,
      error: branchError as Error | null,
    };
  }, [siteId, branchId, siteDepartmentMappings, branchDepartments, siteDeptLoading, branchDeptLoading, branchError]);

  return result;
}

/**
 * Filter departments by branch only (no site filtering).
 * Useful for components that don't have site context.
 * 
 * @param branchId - The branch ID to filter by
 * @returns Departments belonging to that branch or hybrid (null branch_id)
 */
export function useDepartmentsByBranch(branchId?: string) {
  return useQuery({
    queryKey: ['departments-by-branch-only', branchId],
    queryFn: async () => {
      if (!branchId) {
        // No branch selected - return empty array
        return [];
      }

      const { data, error } = await supabase
        .from('departments')
        .select(`
          id,
          name,
          branch_id,
          division_id,
          divisions:division_id (
            name
          )
        `)
        .is('deleted_at', null)
        .or(`branch_id.eq.${branchId},branch_id.is.null`);

      if (error) throw error;
      
      return (data || []).map(dept => ({
        id: dept.id,
        name: dept.name,
        branch_id: dept.branch_id,
        division_id: dept.division_id,
        division_name: (dept.divisions as { name: string } | null)?.name || null,
      })) as Department[];
    },
    enabled: !!branchId,
  });
}
