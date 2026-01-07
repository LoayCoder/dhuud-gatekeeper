import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AssetDependencies {
  maintenanceSchedules: number;
  costTransactions: number;
  inspections: number;
  documents: number;
  photos: number;
  maintenanceHistory: number;
  totalLinkedRecords: number;
}

export function useCheckAssetDependencies() {
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (assetIds: string[]): Promise<AssetDependencies> => {
      if (!profile?.tenant_id || assetIds.length === 0) {
        return {
          maintenanceSchedules: 0,
          costTransactions: 0,
          inspections: 0,
          documents: 0,
          photos: 0,
          maintenanceHistory: 0,
          totalLinkedRecords: 0,
        };
      }

      // Query each related table for counts in parallel
      const [schedules, costs, inspections, docs, photos, history] = await Promise.all([
        supabase
          .from('asset_maintenance_schedules')
          .select('id', { count: 'exact', head: true })
          .in('asset_id', assetIds)
          .is('deleted_at', null),
        supabase
          .from('asset_cost_transactions')
          .select('id', { count: 'exact', head: true })
          .in('asset_id', assetIds)
          .is('deleted_at', null),
        supabase
          .from('asset_inspections')
          .select('id', { count: 'exact', head: true })
          .in('asset_id', assetIds)
          .is('deleted_at', null),
        supabase
          .from('asset_documents')
          .select('id', { count: 'exact', head: true })
          .in('asset_id', assetIds)
          .is('deleted_at', null),
        supabase
          .from('asset_photos')
          .select('id', { count: 'exact', head: true })
          .in('asset_id', assetIds)
          .is('deleted_at', null),
        supabase
          .from('asset_maintenance_history')
          .select('id', { count: 'exact', head: true })
          .in('asset_id', assetIds)
          .is('deleted_at', null),
      ]);

      const maintenanceSchedules = schedules.count || 0;
      const costTransactions = costs.count || 0;
      const inspectionsCount = inspections.count || 0;
      const documents = docs.count || 0;
      const photosCount = photos.count || 0;
      const maintenanceHistory = history.count || 0;

      const totalLinkedRecords =
        maintenanceSchedules +
        costTransactions +
        inspectionsCount +
        documents +
        photosCount +
        maintenanceHistory;

      return {
        maintenanceSchedules,
        costTransactions,
        inspections: inspectionsCount,
        documents,
        photos: photosCount,
        maintenanceHistory,
        totalLinkedRecords,
      };
    },
  });
}
