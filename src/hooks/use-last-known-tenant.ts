import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TenantBrandingData } from '@/contexts/ThemeContext';

const LAST_TENANT_KEY = 'last_known_tenant_id';

/**
 * Hook to manage "Remember Tenant Branding" feature.
 * Stores the last logged-in tenant ID in localStorage so the login page
 * can display that tenant's branding even after logout.
 */
export function useLastKnownTenant() {
  /**
   * Get stored tenant ID from localStorage
   */
  const getLastTenantId = useCallback((): string | null => {
    try {
      return localStorage.getItem(LAST_TENANT_KEY);
    } catch {
      return null;
    }
  }, []);

  /**
   * Save tenant ID to localStorage after successful login
   */
  const saveLastTenantId = useCallback((tenantId: string): void => {
    try {
      localStorage.setItem(LAST_TENANT_KEY, tenantId);
    } catch (error) {
      console.error('Failed to save last tenant ID:', error);
    }
  }, []);

  /**
   * Fetch branding for stored tenant (used on login page)
   * Only fetches non-sensitive branding data
   */
  const fetchLastTenantBranding = useCallback(async (): Promise<TenantBrandingData | null> => {
    const tenantId = getLastTenantId();
    if (!tenantId) return null;

    try {
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          name,
          brand_color,
          secondary_color,
          brand_color_dark,
          secondary_color_dark,
          logo_light_url,
          logo_dark_url,
          sidebar_icon_light_url,
          sidebar_icon_dark_url,
          app_icon_light_url,
          app_icon_dark_url,
          background_color,
          background_theme,
          background_image_url,
          favicon_url
        `)
        .eq('id', tenantId)
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch last tenant branding:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching last tenant branding:', error);
      return null;
    }
  }, [getLastTenantId]);

  /**
   * Clear stored tenant on explicit request (e.g., "Not your organization?" link)
   */
  const clearLastTenant = useCallback((): void => {
    try {
      localStorage.removeItem(LAST_TENANT_KEY);
    } catch (error) {
      console.error('Failed to clear last tenant ID:', error);
    }
  }, []);

  /**
   * Check if there's a stored tenant
   */
  const hasLastTenant = useCallback((): boolean => {
    return !!getLastTenantId();
  }, [getLastTenantId]);

  return {
    getLastTenantId,
    saveLastTenantId,
    fetchLastTenantBranding,
    clearLastTenant,
    hasLastTenant,
  };
}
