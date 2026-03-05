import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AssetLookupResult {
  found: boolean;
  asset: {
    id: string;
    asset_code: string;
    barcode_value: string | null;
    name: string;
    status: string;
    category_id: string | null;
    site_id: string | null;
    building_id: string | null;
  } | null;
}

/**
 * Hook to resolve an asset by its asset_code or barcode_value
 * Enforces tenant isolation via RLS
 */
export function useAssetByCode(assetCode: string | null) {
  const { profile } = useAuth();

  return useQuery<AssetLookupResult>({
    queryKey: ['asset-by-code', assetCode, profile?.tenant_id],
    queryFn: async (): Promise<AssetLookupResult> => {
      if (!assetCode || !profile?.tenant_id) {
        return { found: false, asset: null };
      }

      // Query by asset_code OR barcode_value (tenant isolation enforced by RLS)
      const { data, error } = await supabase
        .from('hsse_assets')
        .select(`
          id,
          asset_code,
          barcode_value,
          name,
          status,
          category_id,
          site_id,
          building_id
        `)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .or(`asset_code.eq.${assetCode},barcode_value.eq.${assetCode}`)
        .maybeSingle();

      if (error) {
        console.error('Error looking up asset by code:', error);
        throw error;
      }

      if (!data) {
        return { found: false, asset: null };
      }

      return { found: true, asset: data };
    },
    enabled: !!assetCode && !!profile?.tenant_id,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}
