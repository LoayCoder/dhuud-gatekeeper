import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { offlineDataCache, CACHE_STORES } from '@/lib/offline-data-cache';
import { useNetworkStatus } from './use-network-status';
import type { AssetWithRelations } from './use-assets';

const ASSETS_CACHE_KEY = 'all_assets';
const ASSET_DETAIL_PREFIX = 'asset_';

interface UseOfflineAssetsReturn {
  cachedAssets: AssetWithRelations[];
  isCaching: boolean;
  lastCachedAt: Date | null;
  cacheAssets: () => Promise<void>;
  getCachedAsset: (assetId: string) => Promise<AssetWithRelations | null>;
  clearCache: () => Promise<void>;
  cacheCount: number;
}

export function useOfflineAssets(): UseOfflineAssetsReturn {
  const { profile } = useAuth();
  const { isOnline } = useNetworkStatus();
  const queryClient = useQueryClient();
  
  const [cachedAssets, setCachedAssets] = useState<AssetWithRelations[]>([]);
  const [isCaching, setIsCaching] = useState(false);
  const [lastCachedAt, setLastCachedAt] = useState<Date | null>(null);
  const [cacheCount, setCacheCount] = useState(0);

  // Load cached assets on mount
  useEffect(() => {
    const loadCachedAssets = async () => {
      try {
        const result = await offlineDataCache.get<AssetWithRelations[]>(
          CACHE_STORES.ASSETS,
          ASSETS_CACHE_KEY
        );
        
        if (result.data) {
          setCachedAssets(result.data);
          setCacheCount(result.data.length);
        }
      } catch (error) {
        console.error('Failed to load cached assets:', error);
      }
    };

    loadCachedAssets();
  }, []);

  // Cache assets for offline use
  const cacheAssets = useCallback(async () => {
    if (!profile?.tenant_id) return;
    
    setIsCaching(true);
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      const query = db
        .from('hsse_assets')
        .select(`
          id,
          asset_code,
          name,
          description,
          status,
          condition_rating,
          serial_number,
          manufacturer,
          model,
          installation_date,
          warranty_expiry,
          next_inspection_due,
          created_at,
          updated_at,
          category:asset_categories(id, name, name_ar, code),
          type:asset_types(id, name, name_ar),
          branch:branches(id, name, name_ar),
          site:sites(id, name, name_ar),
          building:buildings(id, name, name_ar),
          floor_zone:floor_zones(id, name, name_ar)
        `)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(500);

      const { data, error } = await query;

      if (error) throw error;

      const assets = (data || []) as unknown as AssetWithRelations[];

      // Cache the assets list
      await offlineDataCache.set(
        CACHE_STORES.ASSETS,
        ASSETS_CACHE_KEY,
        assets,
        { staleTime: 5 * 60 * 1000, maxAge: 24 * 60 * 60 * 1000 }
      );

      // Cache each asset individually for quick lookups
      for (const asset of assets) {
        await offlineDataCache.set(
          CACHE_STORES.ASSETS,
          `${ASSET_DETAIL_PREFIX}${asset.id}`,
          asset,
          { staleTime: 5 * 60 * 1000, maxAge: 24 * 60 * 60 * 1000 }
        );
      }

      setCachedAssets(assets);
      setCacheCount(assets.length);
      setLastCachedAt(new Date());
      
      queryClient.setQueryData(['assets', 'offline'], assets);
    } catch (error) {
      console.error('Failed to cache assets:', error);
    } finally {
      setIsCaching(false);
    }
  }, [profile?.tenant_id, queryClient]);

  // Get a single cached asset
  const getCachedAsset = useCallback(async (assetId: string): Promise<AssetWithRelations | null> => {
    try {
      const result = await offlineDataCache.get<AssetWithRelations>(
        CACHE_STORES.ASSETS,
        `${ASSET_DETAIL_PREFIX}${assetId}`
      );
      
      return result.data || null;
    } catch (error) {
      console.error('Failed to get cached asset:', error);
      return null;
    }
  }, []);

  // Clear the cache
  const clearCache = useCallback(async () => {
    try {
      await offlineDataCache.clear(CACHE_STORES.ASSETS);
      setCachedAssets([]);
      setCacheCount(0);
      setLastCachedAt(null);
    } catch (error) {
      console.error('Failed to clear asset cache:', error);
    }
  }, []);

  // Auto-cache when online and cache is stale
  useEffect(() => {
    if (isOnline && profile?.tenant_id) {
      const checkAndRefreshCache = async () => {
        const result = await offlineDataCache.get<AssetWithRelations[]>(
          CACHE_STORES.ASSETS,
          ASSETS_CACHE_KEY
        );
        
        if (result.isStale || result.isMiss) {
          await cacheAssets();
        }
      };

      checkAndRefreshCache();
    }
  }, [isOnline, profile?.tenant_id, cacheAssets]);

  return {
    cachedAssets,
    isCaching,
    lastCachedAt,
    cacheAssets,
    getCachedAsset,
    clearCache,
    cacheCount,
  };
}
