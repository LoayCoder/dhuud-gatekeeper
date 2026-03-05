import { useEffect } from "react";
import { useUsersPaginated, UseUsersPaginatedFilters } from "@/hooks/use-users-paginated";
import { supabase } from "@/integrations/supabase/client";

export interface UserManagementState {
  searchInput: string;
  setSearchTerm: (term: string) => void;
  searchTerm: string;
  userTypeFilter: string;
  statusFilter: string;
  branchFilter: string;
  divisionFilter: string;
  roleFilter: string;
  setSelectedUsers: (users: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  profile: { tenant_id?: string } | null | undefined;
  setBranches: (branches: { id: string; name: string }[]) => void;
  setDivisions: (divisions: { id: string; name: string }[]) => void;
}

export function useUserManagementData(state: UserManagementState) {
  const {
    searchInput, setSearchTerm, searchTerm,
    userTypeFilter, statusFilter, branchFilter, divisionFilter, roleFilter,
    setSelectedUsers, profile, setBranches, setDivisions
  } = state;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => { setSearchTerm(searchInput); }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, setSearchTerm]);

  // Build filters object for the hook
  const filters: UseUsersPaginatedFilters = {
    userType: userTypeFilter !== 'all' ? userTypeFilter : null,
    isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : null,
    branchId: branchFilter !== 'all' ? branchFilter : null,
    divisionId: divisionFilter !== 'all' ? divisionFilter : null,
    roleCode: roleFilter !== 'all' ? roleFilter : null,
    searchTerm: searchTerm || null,
  };

  // Use the optimized server-side paginated query
  const {
    users, isLoading: loading, page, totalPages, totalCount,
    hasNextPage, hasPreviousPage, goToNextPage, goToPreviousPage, goToPage,
    refetch: refetchUsers, resetPage,
  } = useUsersPaginated({ filters, pageSize: 25 });

  // Reset to page 1 when filters or search changes
  useEffect(() => {
    resetPage();
  }, [userTypeFilter, statusFilter, branchFilter, divisionFilter, roleFilter, searchTerm, resetPage]);

  // Clear selection when users change
  useEffect(() => {
    setSelectedUsers(new Set());
  }, [users, setSelectedUsers]);

  // Fetch branches and divisions for filters (one-time, tenant-scoped)
  useEffect(() => {
    const fetchFilterOptions = async () => {
      if (!profile?.tenant_id) return;
      const [b, d] = await Promise.all([
        supabase.from('branches').select('id, name').eq('tenant_id', profile.tenant_id).is('deleted_at', null).order('name').limit(100),
        supabase.from('divisions').select('id, name').eq('tenant_id', profile.tenant_id).is('deleted_at', null).order('name').limit(100),
      ]);
      if (b.data) setBranches(b.data);
      if (d.data) setDivisions(d.data);
    };
    fetchFilterOptions();
  }, [profile?.tenant_id, setBranches, setDivisions]);

  return {
    users, loading, page, totalPages, totalCount, hasNextPage, hasPreviousPage,
    goToNextPage, goToPreviousPage, goToPage, refetchUsers, resetPage, filters
  };
}
