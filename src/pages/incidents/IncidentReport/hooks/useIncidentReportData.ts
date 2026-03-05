import { useMemo, useEffect } from 'react';
import { useTenantSites, useTenantBranches } from '@/hooks/use-org-hierarchy';
import { useDepartmentsBySite } from '@/hooks/use-departments-by-site';
import { useActiveEventCategories } from '@/hooks/use-active-event-categories';
import { useActiveEventSubtypes } from '@/hooks/use-active-event-subtypes';
import { useContractorCompanies } from '@/features/contractors/hooks/use-contractor-companies';
import { getSubtypesForEventType } from '@/lib/hsse-event-types';
import { OBSERVATION_TYPES } from '../helpers';
import { useIncidentReportState } from './useIncidentReportState';

export function useIncidentReportData(state: ReturnType<typeof useIncidentReportState>) {
  const { data: sites = [], isLoading: sitesLoading } = useTenantSites();
  const { data: branches = [], isLoading: branchesLoading } = useTenantBranches();
  const { data: dynamicCategories = [] } = useActiveEventCategories();
  const { data: contractorCompanies = [] } = useContractorCompanies();

  const filteredSites = useMemo(() => {
    if (!state.selectedBranchId) return sites;
    return sites.filter(site => site.branch_id === state.selectedBranchId);
  }, [sites, state.selectedBranchId]);

  const { 
    departments: filteredDepartments, 
    isLoading: departmentsLoading,
    usingFallback: departmentsUsingFallback,
    primaryDepartmentId: sitePrimaryDepartmentId
  } = useDepartmentsBySite(state.selectedSiteId, state.selectedBranchId);

  useEffect(() => {
    if (sitePrimaryDepartmentId && !state.form.getValues('department_id')) {
      state.form.setValue('department_id', sitePrimaryDepartmentId);
    }
  }, [sitePrimaryDepartmentId, state.form]);

  useEffect(() => {
    const currentDeptId = state.form.getValues('department_id');
    if (currentDeptId && filteredDepartments.length > 0) {
      const deptStillValid = filteredDepartments.some(d => d.id === currentDeptId);
      if (!deptStillValid) {
        state.form.setValue('department_id', '');
      }
    }
  }, [state.selectedSiteId, filteredDepartments, state.form]);

  const { data: dynamicSubtypes = [] } = useActiveEventSubtypes(
    state.eventType === 'incident' ? state.incidentType : undefined
  );

  const subtypeOptions = state.eventType === 'observation' 
    ? OBSERVATION_TYPES 
    : (dynamicSubtypes.length > 0 
        ? dynamicSubtypes.map(s => ({ value: s.code, labelKey: s.name_key }))
        : (state.incidentType ? getSubtypesForEventType(state.incidentType) : []));

  return {
    sites, sitesLoading,
    branches, branchesLoading,
    dynamicCategories,
    contractorCompanies,
    filteredSites,
    filteredDepartments,
    departmentsLoading,
    departmentsUsingFallback,
    dynamicSubtypes,
    subtypeOptions
  };
}