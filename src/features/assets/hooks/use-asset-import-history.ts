import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AssetImportHistoryRecord {
  id: string;
  tenant_id: string;
  user_id: string;
  branch_id: string | null;
  file_name: string | null;
  import_mode: 'insert_only' | 'update_or_insert';
  categories_created: number;
  categories_updated: number;
  types_created: number;
  types_updated: number;
  subtypes_created: number;
  subtypes_updated: number;
  parts_created: number;
  parts_updated: number;
  total_rows_processed: number;
  skipped_count: number;
  status: 'success' | 'partial' | 'failed';
  error_messages: string[] | null;
  created_at: string;
  user_profile?: {
    full_name: string | null;
    email: string | null;
  } | null;
}

export function useAssetImportHistory(limit = 20) {
  return useQuery({
    queryKey: ['asset-import-history', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_import_history')
        .select(`
          id, 
          tenant_id,
          user_id,
          branch_id,
          file_name, 
          import_mode, 
          status, 
          created_at,
          categories_created, 
          categories_updated,
          types_created, 
          types_updated,
          subtypes_created, 
          subtypes_updated,
          parts_created, 
          parts_updated,
          total_rows_processed, 
          skipped_count, 
          error_messages
        `)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;

      // Fetch user profiles separately to avoid complex joins
      const userIds = [...new Set(data.map(d => d.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return data.map(record => ({
        ...record,
        user_profile: profileMap.get(record.user_id) || null,
      })) as AssetImportHistoryRecord[];
    },
  });
}
