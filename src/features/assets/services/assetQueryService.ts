import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Asset = Database['public']['Tables']['hsse_assets']['Row'];
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

export async function getAssets(tenantId: string, page: number, filters: AssetFilters = {}) {
    let query = supabase
        .from('hsse_assets')
        .select(`
      id, asset_code, name, description, status, condition_rating, criticality_level,
      next_inspection_due, created_at,
      category:asset_categories!hsse_assets_category_id_fkey(id, name, name_ar, icon),
      type:asset_types!hsse_assets_type_id_fkey(id, name, name_ar),
      branch:branches!hsse_assets_branch_id_fkey(id, name),
      site:sites!hsse_assets_site_id_fkey(id, name),
      building:buildings!hsse_assets_building_id_fkey(id, name, name_ar),
      floor_zone:floors_zones!hsse_assets_floor_zone_id_fkey(id, name, name_ar)
    `, { count: 'exact' })
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

    if (filters.search) {
        query = query.or(`asset_code.ilike.%${filters.search}%,name.ilike.%${filters.search}%,serial_number.ilike.%${filters.search}%`);
    }
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.condition) query = query.eq('condition_rating', filters.condition);
    if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
    if (filters.branchId) query = query.eq('branch_id', filters.branchId);
    if (filters.siteId) query = query.eq('site_id', filters.siteId);

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
}

export async function getAssetById(id: string, tenantId: string) {
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
}

export async function getAssetCategories() {
    const { data, error } = await supabase
        .from('asset_categories')
        .select('id, code, name, name_ar, icon, color')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('sort_order');

    if (error) throw error;
    return data;
}

export async function getAssetTypes(categoryId: string) {
    const { data, error } = await supabase
        .from('asset_types')
        .select('id, code, name, name_ar, inspection_interval_days, requires_certification')
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name');

    if (error) throw error;
    return data;
}

export async function getAssetSubtypes(typeId: string) {
    const { data, error } = await supabase
        .from('asset_subtypes')
        .select('id, code, name, name_ar')
        .eq('type_id', typeId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name');

    if (error) throw error;
    return data;
}

export async function getAssetPhotos(assetId: string, tenantId: string) {
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
}

export async function getAssetDocuments(assetId: string, tenantId: string) {
    const { data, error } = await supabase
        .from('asset_documents')
        .select('id, storage_path, file_name, title, document_type, expiry_date, created_at')
        .eq('asset_id', assetId)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}

export async function getAssetMaintenanceSchedules(assetId: string, tenantId: string) {
    const { data, error } = await supabase
        .from('asset_maintenance_schedules')
        .select('*')
        .eq('asset_id', assetId)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('next_due', { ascending: true });

    if (error) throw error;
    return data;
}

export async function getAssetAuditLogs(assetId: string, tenantId: string) {
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
}
