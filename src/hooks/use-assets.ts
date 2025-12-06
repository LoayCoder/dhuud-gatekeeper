import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useState, useCallback } from 'react';
import type { Database } from '@/integrations/supabase/types';

type Asset = Database['public']['Tables']['hsse_assets']['Row'];
type AssetInsert = Database['public']['Tables']['hsse_assets']['Insert'];
type AssetUpdate = Database['public']['Tables']['hsse_assets']['Update'];
type AssetCategory = Database['public']['Tables']['asset_categories']['Row'];
type AssetType = Database['public']['Tables']['asset_types']['Row'];
type AssetSubtype = Database['public']['Tables']['asset_subtypes']['Row'];
type AssetStatus = Database['public']['Enums']['asset_status'];
type AssetCondition = Database['public']['Enums']['asset_condition'];

export interface AssetFilters {
  search?: string;
  status?: AssetStatus | null;
  condition?: AssetCondition | null;
  categoryId?: string | null;
  branchId?: string | null;
  siteId?: string | null;
}

export interface AssetWithRelations extends Asset {
  category?: { id: string; name: string; name_ar: string | null; icon: string | null } | null;
  type?: { id: string; name: string; name_ar: string | null } | null;
  subtype?: { id: string; name: string; name_ar: string | null } | null;
  branch?: { id: string; name: string } | null;
  site?: { id: string; name: string } | null;
  building?: { id: string; name: string; name_ar: string | null } | null;
  floor_zone?: { id: string; name: string; name_ar: string | null } | null;
  primary_photo?: { storage_path: string } | null;
}

const PAGE_SIZE = 20;

export function useAssets(filters: AssetFilters = {}) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ['assets', tenantId, filters, page],
    queryFn: async () => {
      if (!tenantId) return { data: [], count: 0 };

      let query = supabase
        .from('hsse_assets')
        .select(`
          id, asset_code, name, description, status, condition_rating, criticality_level,
          next_inspection_due, created_at,
          category:asset_categories!hsse_assets_category_id_fkey(id, name, name_ar, icon),
          type:asset_types!hsse_assets_type_id_fkey(id, name, name_ar),
          branch:branches!hsse_assets_branch_id_fkey(id, name),
          site:sites!hsse_assets_site_id_fkey(id, name)
        `, { count: 'exact' })
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.search) {
        query = query.or(`asset_code.ilike.%${filters.search}%,name.ilike.%${filters.search}%,serial_number.ilike.%${filters.search}%`);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.condition) {
        query = query.eq('condition_rating', filters.condition);
      }
      if (filters.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }
      if (filters.branchId) {
        query = query.eq('branch_id', filters.branchId);
      }
      if (filters.siteId) {
        query = query.eq('site_id', filters.siteId);
      }

      // Apply pagination
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      return { 
        data: data as AssetWithRelations[], 
        count: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
        hasNextPage: (count ?? 0) > page * PAGE_SIZE,
        hasPreviousPage: page > 1
      };
    },
    enabled: !!tenantId,
  });

  const goToPage = useCallback((newPage: number) => setPage(newPage), []);
  const goToNextPage = useCallback(() => setPage(p => p + 1), []);
  const goToPreviousPage = useCallback(() => setPage(p => Math.max(1, p - 1)), []);
  const goToFirstPage = useCallback(() => setPage(1), []);

  return {
    ...query,
    page,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
  };
}

export function useAsset(id: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['asset', id],
    queryFn: async () => {
      if (!id || !tenantId) return null;

      const { data, error } = await supabase
        .from('hsse_assets')
        .select(`
          *,
          category:asset_categories!hsse_assets_category_id_fkey(id, name, name_ar, icon, color),
          type:asset_types!hsse_assets_type_id_fkey(id, name, name_ar),
          subtype:asset_subtypes!hsse_assets_subtype_id_fkey(id, name, name_ar),
          branch:branches!hsse_assets_branch_id_fkey(id, name),
          site:sites!hsse_assets_site_id_fkey(id, name),
          building:buildings!hsse_assets_building_id_fkey(id, name, name_ar),
          floor_zone:floors_zones!hsse_assets_floor_zone_id_fkey(id, name, name_ar)
        `)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      return data as AssetWithRelations;
    },
    enabled: !!id && !!tenantId,
  });
}

export function useAssetCategories() {
  return useQuery({
    queryKey: ['asset-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_categories')
        .select('id, code, name, name_ar, icon, color')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('sort_order');

      if (error) throw error;
      return data;
    },
  });
}

export function useAssetTypes(categoryId: string | null) {
  return useQuery({
    queryKey: ['asset-types', categoryId],
    queryFn: async () => {
      if (!categoryId) return [];

      const { data, error } = await supabase
        .from('asset_types')
        .select('id, code, name, name_ar, inspection_interval_days, requires_certification')
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!categoryId,
  });
}

export function useAssetSubtypes(typeId: string | null) {
  return useQuery({
    queryKey: ['asset-subtypes', typeId],
    queryFn: async () => {
      if (!typeId) return [];

      const { data, error } = await supabase
        .from('asset_subtypes')
        .select('id, code, name, name_ar')
        .eq('type_id', typeId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!typeId,
  });
}

export function useCreateAsset() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (asset: Omit<AssetInsert, 'tenant_id' | 'created_by'>) => {
      if (!profile?.tenant_id) throw new Error('No tenant');

      const { data, error } = await supabase
        .from('hsse_assets')
        .insert({
          ...asset,
          tenant_id: profile.tenant_id,
          created_by: profile.id,
        })
        .select('id, asset_code')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success(t('assets.createSuccess', { code: data.asset_code }));
    },
    onError: (error) => {
      console.error('Create asset error:', error);
      toast.error(t('assets.createError'));
    },
  });
}

export function useUpdateAsset() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: AssetUpdate & { id: string }) => {
      if (!profile?.tenant_id) throw new Error('No tenant');

      const { data, error } = await supabase
        .from('hsse_assets')
        .update({
          ...updates,
          updated_by: profile.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id)
        .select('id, asset_code')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset', data.id] });
      toast.success(t('assets.updateSuccess'));
    },
    onError: (error) => {
      console.error('Update asset error:', error);
      toast.error(t('assets.updateError'));
    },
  });
}

export function useDeleteAsset() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!profile?.tenant_id) throw new Error('No tenant');

      // Soft delete
      const { error } = await supabase
        .from('hsse_assets')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success(t('assets.deleteSuccess'));
    },
    onError: (error) => {
      console.error('Delete asset error:', error);
      toast.error(t('assets.deleteError'));
    },
  });
}

export function useAssetPhotos(assetId: string | undefined) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['asset-photos', assetId],
    queryFn: async () => {
      if (!assetId || !profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from('asset_photos')
        .select('id, storage_path, file_name, is_primary, caption, created_at')
        .eq('asset_id', assetId)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!assetId && !!profile?.tenant_id,
  });
}

export function useAssetDocuments(assetId: string | undefined) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['asset-documents', assetId],
    queryFn: async () => {
      if (!assetId || !profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from('asset_documents')
        .select('id, storage_path, file_name, title, document_type, expiry_date, created_at')
        .eq('asset_id', assetId)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!assetId && !!profile?.tenant_id,
  });
}

export function useAssetMaintenanceSchedules(assetId: string | undefined) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['asset-maintenance', assetId],
    queryFn: async () => {
      if (!assetId || !profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from('asset_maintenance_schedules')
        .select('*')
        .eq('asset_id', assetId)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .order('next_due', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!assetId && !!profile?.tenant_id,
  });
}

export function useAssetAuditLogs(assetId: string | undefined) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['asset-audit-logs', assetId],
    queryFn: async () => {
      if (!assetId || !profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from('asset_audit_logs')
        .select(`
          id, action, old_value, new_value, created_at, ip_address,
          actor:profiles!asset_audit_logs_actor_id_fkey(id, full_name)
        `)
        .eq('asset_id', assetId)
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!assetId && !!profile?.tenant_id,
  });
}

// Generate unique asset code
export function generateAssetCode(categoryCode: string, sequence: number): string {
  const year = new Date().getFullYear();
  const paddedSeq = String(sequence).padStart(4, '0');
  return `${categoryCode}-${year}-${paddedSeq}`;
}
