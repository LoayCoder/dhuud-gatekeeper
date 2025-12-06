import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

export type AssetLinkType = 'involved' | 'damaged' | 'caused_by' | 'affected';

export interface IncidentAssetLink {
  id: string;
  incident_id: string;
  asset_id: string;
  link_type: AssetLinkType;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  asset?: {
    id: string;
    asset_code: string;
    name: string;
    status: string;
    category?: { name: string; name_ar: string | null };
    site?: { name: string };
    building?: { name: string };
  };
}

export interface AssetIncidentLink {
  id: string;
  incident_id: string;
  asset_id: string;
  link_type: AssetLinkType;
  notes: string | null;
  created_at: string;
  incident?: {
    id: string;
    reference_id: string;
    title: string;
    event_type: string;
    severity: string | null;
    status: string;
    occurred_at: string;
  };
}

// Fetch linked assets for an incident
export function useIncidentAssets(incidentId: string | undefined) {
  return useQuery({
    queryKey: ['incident-assets', incidentId],
    queryFn: async () => {
      if (!incidentId) return [];
      
      const { data, error } = await supabase
        .from('incident_asset_links')
        .select(`
          id,
          incident_id,
          asset_id,
          link_type,
          notes,
          created_at,
          created_by,
          asset:hsse_assets(
            id,
            asset_code,
            name,
            status,
            category:asset_categories(name, name_ar),
            site:sites(name),
            building:buildings(name)
          )
        `)
        .eq('incident_id', incidentId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as IncidentAssetLink[];
    },
    enabled: !!incidentId,
  });
}

// Fetch incidents linked to an asset
export function useAssetIncidents(assetId: string | undefined) {
  return useQuery({
    queryKey: ['asset-incidents', assetId],
    queryFn: async () => {
      if (!assetId) return [];
      
      const { data, error } = await supabase
        .from('incident_asset_links')
        .select(`
          id,
          incident_id,
          asset_id,
          link_type,
          notes,
          created_at,
          incident:incidents(
            id,
            reference_id,
            title,
            event_type,
            severity,
            status,
            occurred_at
          )
        `)
        .eq('asset_id', assetId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as AssetIncidentLink[];
    },
    enabled: !!assetId,
  });
}

// Link an asset to an incident
export function useLinkAssetToIncident() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      incidentId,
      assetId,
      linkType,
      notes,
    }: {
      incidentId: string;
      assetId: string;
      linkType: AssetLinkType;
      notes?: string;
    }) => {
      const tenantId = (profile as any)?.tenant_id;
      const userId = (profile as any)?.id;
      if (!tenantId) throw new Error('No tenant');

      const { data, error } = await supabase
        .from('incident_asset_links')
        .insert({
          tenant_id: tenantId,
          incident_id: incidentId,
          asset_id: assetId,
          link_type: linkType,
          notes: notes || null,
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incident-assets', variables.incidentId] });
      queryClient.invalidateQueries({ queryKey: ['asset-incidents', variables.assetId] });
      toast.success('Asset linked successfully');
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast.error('This asset is already linked to this incident');
      } else {
        toast.error('Failed to link asset');
      }
    },
  });
}

// Unlink an asset from an incident
export function useUnlinkAssetFromIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      linkId,
      incidentId,
      assetId,
    }: {
      linkId: string;
      incidentId: string;
      assetId: string;
    }) => {
      const { error } = await supabase
        .from('incident_asset_links')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', linkId);

      if (error) throw error;
      return { incidentId, assetId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['incident-assets', data.incidentId] });
      queryClient.invalidateQueries({ queryKey: ['asset-incidents', data.assetId] });
      toast.success('Asset unlinked successfully');
    },
    onError: () => {
      toast.error('Failed to unlink asset');
    },
  });
}

// Simple debounce hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Search assets for linking
export function useSearchAssetsForLinking(search: string, excludeAssetIds: string[] = []) {
  const { profile } = useAuth();
  const tenantId = (profile as any)?.tenant_id;

  return useQuery({
    queryKey: ['search-assets-for-linking', search, excludeAssetIds],
    queryFn: async () => {
      if (!tenantId || search.length < 2) return [];

      let query = supabase
        .from('hsse_assets')
        .select(`
          id,
          asset_code,
          name,
          status,
          criticality_level,
          category:asset_categories(name, name_ar),
          site:sites(name),
          building:buildings(name)
        `)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .or(`asset_code.ilike.%${search}%,name.ilike.%${search}%`)
        .limit(10);

      if (excludeAssetIds.length > 0) {
        query = query.not('id', 'in', `(${excludeAssetIds.join(',')})`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId && search.length >= 2,
  });
}
