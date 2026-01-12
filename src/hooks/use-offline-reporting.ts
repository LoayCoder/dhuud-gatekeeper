/**
 * Offline Reporting Hook
 * Pre-caches all reference data needed for offline incident reporting
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineDataCache, CACHE_STORES } from '@/lib/offline-data-cache';
import { useAuth } from '@/contexts/AuthContext';

// Types for cached reference data
export interface CachedSite {
  id: string;
  name: string;
  name_ar?: string;
  branch_id?: string;
  latitude?: number;
  longitude?: number;
}

export interface CachedBranch {
  id: string;
  name: string;
  name_ar?: string;
}

export interface CachedDepartment {
  id: string;
  name: string;
  name_ar?: string;
  branch_id?: string;
}

export interface CachedBuilding {
  id: string;
  name: string;
  name_ar?: string;
  site_id?: string;
}

export interface CachedContractorCompany {
  id: string;
  company_name: string;
  company_name_ar?: string;
  status: string;
}

export interface CachedEventType {
  id: string;
  name: string;
  name_ar?: string;
  code: string;
  category: string;
}

export interface CachedEventSubtype {
  id: string;
  name: string;
  name_ar?: string;
  code: string;
  parent_type_id?: string;
}

export interface OfflineReportingCache {
  sites: CachedSite[];
  branches: CachedBranch[];
  departments: CachedDepartment[];
  buildings: CachedBuilding[];
  contractorCompanies: CachedContractorCompany[];
  eventTypes: CachedEventType[];
  eventSubtypes: CachedEventSubtype[];
  cachedAt: number;
}

const CACHE_KEY = 'reporting_reference_data';
const CACHE_MAX_AGE = 4 * 60 * 60 * 1000; // 4 hours
const STALE_TIME = 30 * 60 * 1000; // 30 minutes

export function useOfflineReporting() {
  const { profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isCacheReady, setIsCacheReady] = useState(false);
  const [lastCachedAt, setLastCachedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load cache status on mount
  useEffect(() => {
    checkCacheStatus();
  }, []);

  const checkCacheStatus = useCallback(async () => {
    try {
      const cached = await offlineDataCache.get<OfflineReportingCache>(
        CACHE_STORES.REFERENCE_DATA,
        CACHE_KEY,
        { staleTime: STALE_TIME, maxAge: CACHE_MAX_AGE }
      );

      if (cached.data && !cached.isMiss) {
        setIsCacheReady(true);
        setLastCachedAt(cached.data.cachedAt);
      }
    } catch (err) {
      console.error('Failed to check cache status:', err);
    }
  }, []);

  const prefetchReportingData = useCallback(async (force = false): Promise<boolean> => {
    if (!profile?.tenant_id) {
      setError('No tenant ID available');
      return false;
    }

    // Check if we have fresh cache and force is false
    if (!force) {
      const cached = await offlineDataCache.get<OfflineReportingCache>(
        CACHE_STORES.REFERENCE_DATA,
        CACHE_KEY,
        { staleTime: STALE_TIME, maxAge: CACHE_MAX_AGE }
      );

      if (cached.data && !cached.isStale) {
        console.log('[OfflineReporting] Using fresh cache');
        setIsCacheReady(true);
        setLastCachedAt(cached.data.cachedAt);
        return true;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('[OfflineReporting] Prefetching all reference data...');

      // Fetch all reference data in parallel using type assertions for flexibility
      const [
        sitesResult,
        branchesResult,
        departmentsResult,
        buildingsResult,
        contractorCompaniesResult,
        eventTypesResult,
        eventSubtypesResult,
      ] = await Promise.all([
        // Sites with GPS coordinates
        (supabase
          .from('sites')
          .select('id, name, branch_id, latitude, longitude')
          .eq('tenant_id', profile.tenant_id)
          .is('deleted_at', null)
          .eq('is_active', true)) as any,

        // Branches
        (supabase
          .from('branches')
          .select('id, name')
          .eq('tenant_id', profile.tenant_id)
          .is('deleted_at', null)
          .eq('is_active', true)) as any,

        // Departments
        (supabase
          .from('departments')
          .select('id, name, branch_id')
          .eq('tenant_id', profile.tenant_id)
          .is('deleted_at', null)
          .eq('is_active', true)) as any,

        // Buildings
        (supabase
          .from('buildings')
          .select('id, name, site_id')
          .eq('tenant_id', profile.tenant_id)
          .is('deleted_at', null)
          .eq('is_active', true)) as any,

        // Contractor companies (active only)
        (supabase
          .from('contractor_companies')
          .select('id, company_name, company_name_ar, status')
          .eq('tenant_id', profile.tenant_id)
          .is('deleted_at', null)
          .eq('status', 'active')) as any,

        // Event types (categories)
        (supabase
          .from('hsse_event_types')
          .select('id, name, name_ar, code, category')
          .eq('tenant_id', profile.tenant_id)
          .is('deleted_at', null)
          .eq('is_active', true)
          .is('parent_type_id', null)) as any,

        // Event subtypes
        (supabase
          .from('hsse_event_types')
          .select('id, name, name_ar, code, parent_type_id')
          .eq('tenant_id', profile.tenant_id)
          .is('deleted_at', null)
          .eq('is_active', true)
          .not('parent_type_id', 'is', null)) as any,
      ]);

      // Check for errors
      if (sitesResult.error) throw sitesResult.error;
      if (branchesResult.error) throw branchesResult.error;
      if (departmentsResult.error) throw departmentsResult.error;
      if (buildingsResult.error) throw buildingsResult.error;
      if (contractorCompaniesResult.error) throw contractorCompaniesResult.error;
      if (eventTypesResult.error) throw eventTypesResult.error;
      if (eventSubtypesResult.error) throw eventSubtypesResult.error;

      const cacheData: OfflineReportingCache = {
        sites: sitesResult.data || [],
        branches: branchesResult.data || [],
        departments: departmentsResult.data || [],
        buildings: buildingsResult.data || [],
        contractorCompanies: contractorCompaniesResult.data || [],
        eventTypes: eventTypesResult.data || [],
        eventSubtypes: eventSubtypesResult.data || [],
        cachedAt: Date.now(),
      };

      // Store in IndexedDB
      await offlineDataCache.set(
        CACHE_STORES.REFERENCE_DATA,
        CACHE_KEY,
        cacheData,
        { maxAge: CACHE_MAX_AGE }
      );

      console.log('[OfflineReporting] Cache populated:', {
        sites: cacheData.sites.length,
        branches: cacheData.branches.length,
        departments: cacheData.departments.length,
        buildings: cacheData.buildings.length,
        contractorCompanies: cacheData.contractorCompanies.length,
        eventTypes: cacheData.eventTypes.length,
        eventSubtypes: cacheData.eventSubtypes.length,
      });

      setIsCacheReady(true);
      setLastCachedAt(cacheData.cachedAt);
      return true;
    } catch (err) {
      console.error('[OfflineReporting] Failed to prefetch:', err);
      setError(err instanceof Error ? err.message : 'Failed to cache data');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id]);

  const getCachedData = useCallback(async (): Promise<OfflineReportingCache | null> => {
    try {
      const cached = await offlineDataCache.get<OfflineReportingCache>(
        CACHE_STORES.REFERENCE_DATA,
        CACHE_KEY,
        { staleTime: STALE_TIME, maxAge: CACHE_MAX_AGE }
      );

      return cached.data;
    } catch (err) {
      console.error('[OfflineReporting] Failed to get cached data:', err);
      return null;
    }
  }, []);

  // Individual getters for convenience
  const getOfflineSites = useCallback(async (): Promise<CachedSite[]> => {
    const data = await getCachedData();
    return data?.sites || [];
  }, [getCachedData]);

  const getOfflineBranches = useCallback(async (): Promise<CachedBranch[]> => {
    const data = await getCachedData();
    return data?.branches || [];
  }, [getCachedData]);

  const getOfflineDepartments = useCallback(async (): Promise<CachedDepartment[]> => {
    const data = await getCachedData();
    return data?.departments || [];
  }, [getCachedData]);

  const getOfflineBuildings = useCallback(async (): Promise<CachedBuilding[]> => {
    const data = await getCachedData();
    return data?.buildings || [];
  }, [getCachedData]);

  const getOfflineContractorCompanies = useCallback(async (): Promise<CachedContractorCompany[]> => {
    const data = await getCachedData();
    return data?.contractorCompanies || [];
  }, [getCachedData]);

  const getOfflineEventTypes = useCallback(async (): Promise<CachedEventType[]> => {
    const data = await getCachedData();
    return data?.eventTypes || [];
  }, [getCachedData]);

  const getOfflineEventSubtypes = useCallback(async (parentTypeId?: string): Promise<CachedEventSubtype[]> => {
    const data = await getCachedData();
    if (!data) return [];
    
    if (parentTypeId) {
      return data.eventSubtypes.filter(s => s.parent_type_id === parentTypeId);
    }
    return data.eventSubtypes;
  }, [getCachedData]);

  return {
    // State
    isLoading,
    isCacheReady,
    lastCachedAt,
    error,

    // Actions
    prefetchReportingData,
    getCachedData,

    // Individual getters
    getOfflineSites,
    getOfflineBranches,
    getOfflineDepartments,
    getOfflineBuildings,
    getOfflineContractorCompanies,
    getOfflineEventTypes,
    getOfflineEventSubtypes,
  };
}
