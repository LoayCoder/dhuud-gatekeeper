import type { Database } from '@/integrations/supabase/types';

export type AssetCategory = Database['public']['Tables']['asset_categories']['Row'];
export type AssetCategoryInsert = Database['public']['Tables']['asset_categories']['Insert'];
export type AssetCategoryUpdate = Database['public']['Tables']['asset_categories']['Update'];

export type AssetType = Database['public']['Tables']['asset_types']['Row'];
export type AssetTypeInsert = Database['public']['Tables']['asset_types']['Insert'];
export type AssetTypeUpdate = Database['public']['Tables']['asset_types']['Update'];

export type AssetSubtype = Database['public']['Tables']['asset_subtypes']['Row'];
export type AssetSubtypeInsert = Database['public']['Tables']['asset_subtypes']['Insert'];
export type AssetSubtypeUpdate = Database['public']['Tables']['asset_subtypes']['Update'];
