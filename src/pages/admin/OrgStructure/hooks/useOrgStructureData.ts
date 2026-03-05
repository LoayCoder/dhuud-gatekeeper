import { useCallback, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgStructureState } from "./useOrgStructureState";
import { Department, Section, Site, Building, FloorZone } from '../types';

export function useOrgStructureData(state: ReturnType<typeof useOrgStructureState>) {
  const applyBranchFilter = useCallback(<T extends unknown>(query: T, column = 'branch_id'): T => {
    if (state.isAllBranchesMode || !state.branchIds || state.branchIds.length === 0) {
      return query;
    }
    const q = query as { eq: (c: string, v: string) => T; in: (c: string, v: string[]) => T };
    if (state.branchIds.length === 1) {
      return q.eq(column, state.branchIds[0]);
    }
    return q.in(column, state.branchIds);
  }, [state.branchIds, state.isAllBranchesMode]);

  const fetchData = useCallback(async () => {
    if (!state.profile?.tenant_id) {
      state.setLoading(false);
      return;
    }

    const tenantId = state.profile.tenant_id;
    state.setLoading(true);

    try {
      const branchesQuery = supabase.from('branches')
        .select('id, name, location, latitude, longitude')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('name');

      let divisionsQuery = supabase.from('divisions')
        .select('id, name, branch_id, branches(name)')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('name');

      if (!state.isAllBranchesMode && state.branchIds && state.branchIds.length > 0) {
        if (state.branchIds.length === 1) {
          divisionsQuery = divisionsQuery.or(`branch_id.eq.${state.branchIds[0]},branch_id.is.null`);
        } else {
          divisionsQuery = divisionsQuery.or(`branch_id.in.(${state.branchIds.join(',')}),branch_id.is.null`);
        }
      }

      let departmentsQuery = supabase.from('departments')
        .select('id, name, division_id, branch_id, divisions(name), branches(name)')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('name');

      if (!state.isAllBranchesMode && state.branchIds && state.branchIds.length > 0) {
        if (state.branchIds.length === 1) {
          departmentsQuery = departmentsQuery.or(`branch_id.eq.${state.branchIds[0]},branch_id.is.null`);
        } else {
          departmentsQuery = departmentsQuery.or(`branch_id.in.(${state.branchIds.join(',')}),branch_id.is.null`);
        }
      }

      let sectionsQuery = supabase.from('sections')
        .select('id, name, department_id, branch_id, departments(name), branches(name)')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('name');

      if (!state.isAllBranchesMode && state.branchIds && state.branchIds.length > 0) {
        if (state.branchIds.length === 1) {
          sectionsQuery = sectionsQuery.or(`branch_id.eq.${state.branchIds[0]},branch_id.is.null`);
        } else {
          sectionsQuery = sectionsQuery.or(`branch_id.in.(${state.branchIds.join(',')}),branch_id.is.null`);
        }
      }

      const sitesQuery = supabase.from('sites')
        .select('id, name, latitude, longitude, branch_id, is_active, boundary_polygon, branches(name)')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('name');

      let buildingsQuery = supabase.from('buildings')
        .select('id, name, name_ar, site_id, floor_count, is_active, branch_id, sites(name)')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('name');
      buildingsQuery = applyBranchFilter(buildingsQuery);

      let floorsZonesQuery = supabase.from('floors_zones')
        .select('id, name, name_ar, building_id, zone_type, level_number, is_active, branch_id, buildings(name)')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('level_number');
      floorsZonesQuery = applyBranchFilter(floorsZonesQuery);

      const [b, d, dep, sec, sit, bldg, fz] = await Promise.all([
        branchesQuery,
        divisionsQuery,
        departmentsQuery,
        sectionsQuery,
        sitesQuery,
        buildingsQuery,
        floorsZonesQuery,
      ]);

      if (b.data) state.setBranches(b.data);
      if (d.data) state.setDivisions(d.data);
      if (dep.data) state.setDepartments(dep.data as Department[]);
      if (sec.data) state.setSections(sec.data as Section[]);
      if (sit.data) state.setSites(sit.data as unknown as Site[]);
      if (bldg.data) state.setBuildings(bldg.data as unknown as Building[]);
      if (fz.data) state.setFloorsZones(fz.data as unknown as FloorZone[]);
    } catch (error) {
      console.error("Error fetching org structure:", error);
    } finally {
      state.setLoading(false);
    }
  }, [state.profile?.tenant_id, state.branchIds, state.isAllBranchesMode, applyBranchFilter, state]);

  useEffect(() => {
    if (!state.branchLoading) {
      fetchData();
    }
  }, [fetchData, state.branchLoading]);

  const filteredDivisionsForDropdown = useMemo(() => {
    if (state.selectedBranchForDepartment === 'all' || !state.selectedBranchForDepartment) {
      return state.divisions;
    }
    return state.divisions.filter(d =>
      d.branch_id === state.selectedBranchForDepartment || d.branch_id === null
    );
  }, [state.divisions, state.selectedBranchForDepartment]);

  const filteredDepartmentsForDropdown = useMemo(() => {
    if (state.selectedBranchForSection === 'all' || !state.selectedBranchForSection) {
      return state.departments;
    }
    return state.departments.filter(d =>
      d.branch_id === state.selectedBranchForSection || d.branch_id === null
    );
  }, [state.departments, state.selectedBranchForSection]);

  const filteredBranchesForDropdown = state.branches;
  const filteredSitesForDropdown = state.sites;
  const filteredBuildingsForDropdown = state.buildings;

  return {
    fetchData,
    filteredDivisionsForDropdown,
    filteredDepartmentsForDropdown,
    filteredBranchesForDropdown,
    filteredSitesForDropdown,
    filteredBuildingsForDropdown,
  };
}
