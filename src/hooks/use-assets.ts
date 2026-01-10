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
    queryKey: ['asset', tenantId, id],
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
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['asset-categories', tenantId],
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

  const { user } = useAuth();

  return useMutation({
    mutationFn: async (asset: Omit<AssetInsert, 'tenant_id' | 'created_by'>) => {
      if (!profile?.tenant_id || !user?.id) throw new Error('No tenant or user');

      const { data, error } = await supabase
        .from('hsse_assets')
        .insert({
          ...asset,
          tenant_id: profile.tenant_id,
          created_by: user.id,
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

  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: AssetUpdate & { id: string }) => {
      if (!profile?.tenant_id || !user?.id) throw new Error('No tenant or user');

      const { data, error } = await supabase
        .from('hsse_assets')
        .update({
          ...updates,
          updated_by: user.id,
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
      queryClient.invalidateQueries({ queryKey: ['asset', profile?.tenant_id, data.id] });
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

  return useMutation({
    mutationFn: async (id: string) => {
      // Use SECURITY DEFINER function to bypass RLS issues
      // This also cascades soft-delete to all related records
      const { error } = await supabase
        .rpc('soft_delete_hsse_asset', { p_asset_id: id });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset-dashboard-stats'] });
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
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['asset-photos', tenantId, assetId],
    queryFn: async () => {
      if (!assetId || !tenantId) return [];

      const { data, error } = await supabase
        .from('asset_photos')
        .select('id, storage_path, file_name, is_primary, caption, created_at')
        .eq('asset_id', assetId)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!assetId && !!tenantId,
  });
}

export function useAssetDocuments(assetId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['asset-documents', tenantId, assetId],
    queryFn: async () => {
      if (!assetId || !tenantId) return [];

      const { data, error } = await supabase
        .from('asset_documents')
        .select('id, storage_path, file_name, title, document_type, expiry_date, created_at')
        .eq('asset_id', assetId)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!assetId && !!tenantId,
  });
}

export function useAssetMaintenanceSchedules(assetId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['asset-maintenance', tenantId, assetId],
    queryFn: async () => {
      if (!assetId || !tenantId) return [];

      const { data, error } = await supabase
        .from('asset_maintenance_schedules')
        .select('*')
        .eq('asset_id', assetId)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('next_due', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!assetId && !!tenantId,
  });
}

export function useAssetAuditLogs(assetId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['asset-audit-logs', tenantId, assetId],
    queryFn: async () => {
      if (!assetId || !tenantId) return [];

      const { data, error } = await supabase
        .from('asset_audit_logs')
        .select(`
          id, action, old_value, new_value, created_at, ip_address,
          actor:profiles!asset_audit_logs_actor_id_fkey(id, full_name)
        `)
        .eq('asset_id', assetId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!assetId && !!tenantId,
  });
}

// Generate unique asset code
export function generateAssetCode(categoryCode: string, sequence: number): string {
  const year = new Date().getFullYear();
  const paddedSeq = String(sequence).padStart(4, '0');
  // Strip TEST- prefix if present (for production-safe codes)
  const cleanCode = categoryCode.replace(/^TEST-/i, '');
  return `${cleanCode}-${year}-${paddedSeq}`;
}

// Generate sequential codes from a base code
export function generateSequentialCodes(baseCode: string, quantity: number): string[] {
  if (quantity <= 0) return [];
  if (quantity === 1) return [baseCode];

  const codes: string[] = [];
  
  // Try to find trailing number pattern (e.g., "FE-001" -> "001")
  const match = baseCode.match(/(\d+)$/);
  
  if (match) {
    const numberPart = match[0];
    const prefix = baseCode.slice(0, -numberPart.length);
    const startNum = parseInt(numberPart, 10);
    const padLength = numberPart.length;
    
    for (let i = 0; i < quantity; i++) {
      const newNum = startNum + i;
      codes.push(`${prefix}${String(newNum).padStart(padLength, '0')}`);
    }
  } else {
    // No number suffix found - append sequential numbers
    for (let i = 0; i < quantity; i++) {
      codes.push(`${baseCode}-${String(i + 1).padStart(3, '0')}`);
    }
  }
  
  return codes;
}

// Bulk create assets mutation
export function useCreateBulkAssets() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      baseAsset: Omit<AssetInsert, 'tenant_id' | 'created_by' | 'asset_code'>;
      quantity: number;
      startCode: string;
    }) => {
      if (!profile?.tenant_id || !user?.id) throw new Error('No tenant or user');
      
      const { baseAsset, quantity, startCode } = params;
      const codes = generateSequentialCodes(startCode, quantity);
      
      // Check for existing codes to avoid duplicates
      const { data: existingAssets } = await supabase
        .from('hsse_assets')
        .select('asset_code')
        .eq('tenant_id', profile.tenant_id)
        .in('asset_code', codes)
        .is('deleted_at', null);
      
      if (existingAssets && existingAssets.length > 0) {
        const duplicates = existingAssets.map(a => a.asset_code).join(', ');
        throw new Error(`Asset codes already exist: ${duplicates}`);
      }
      
      // Create assets array
      const assetsToInsert = codes.map(code => ({
        ...baseAsset,
        asset_code: code,
        tenant_id: profile.tenant_id,
        created_by: user.id,
      }));
      
      const { data, error } = await supabase
        .from('hsse_assets')
        .insert(assetsToInsert)
        .select('id, asset_code');
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success(t('assets.bulkCreateSuccess', { count: data.length }));
    },
    onError: (error: Error) => {
      console.error('Bulk create assets error:', error);
      toast.error(error.message || t('assets.bulkCreateError'));
    },
  });
}
