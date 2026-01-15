/**
 * Part Inspection Results Hook
 * 
 * CRUD operations for managing inspection results of asset type parts.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export type PartInspectionResult = 'pass' | 'fail' | 'na';

export interface AssetInspectionPartResult {
  id: string;
  inspection_id: string;
  part_id: string;
  tenant_id: string;
  result: PartInspectionResult;
  condition_rating: number | null;
  notes: string | null;
  photo_path: string | null;
  responded_by: string | null;
  responded_at: string;
  branch_id: string | null;
  deleted_at: string | null;
}

export interface SavePartResultInput {
  inspection_id: string;
  part_id: string;
  result: PartInspectionResult;
  condition_rating?: number;
  notes?: string;
  photo_path?: string;
}

export interface BulkSavePartResultsInput {
  inspection_id: string;
  results: Omit<SavePartResultInput, 'inspection_id'>[];
}

/**
 * Fetch all part results for a specific inspection
 */
export function usePartInspectionResults(inspectionId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['part-inspection-results', inspectionId, tenantId],
    queryFn: async () => {
      if (!inspectionId || !tenantId) return [];

      const { data, error } = await supabase
        .from('asset_inspection_part_results')
        .select(`
          *,
          part:asset_type_parts(
            id, code, name, name_ar, is_critical, default_response_type
          )
        `)
        .eq('inspection_id', inspectionId)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);

      if (error) throw error;
      return data as (AssetInspectionPartResult & { 
        part: { 
          id: string; 
          code: string; 
          name: string; 
          name_ar: string | null; 
          is_critical: boolean;
          default_response_type: string;
        } 
      })[];
    },
    enabled: !!inspectionId && !!tenantId,
  });
}

/**
 * Save or update a single part inspection result (upsert)
 */
export function useSavePartInspectionResult() {
  const { profile, user } = useAuth();
  const tenantId = profile?.tenant_id;
  const branchId = profile?.assigned_branch_id;
  const userId = user?.id;
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (input: SavePartResultInput) => {
      if (!tenantId) throw new Error('No tenant ID');

      // Upsert: update if exists, insert if not
      const { data, error } = await supabase
        .from('asset_inspection_part_results')
        .upsert(
          {
            inspection_id: input.inspection_id,
            part_id: input.part_id,
            tenant_id: tenantId,
            branch_id: branchId || null,
            result: input.result,
            condition_rating: input.condition_rating || null,
            notes: input.notes || null,
            photo_path: input.photo_path || null,
            responded_by: userId || null,
            responded_at: new Date().toISOString(),
          },
          {
            onConflict: 'inspection_id,part_id',
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data as AssetInspectionPartResult;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['part-inspection-results', variables.inspection_id] 
      });
    },
    onError: (error: Error) => {
      console.error('Failed to save part result:', error);
      toast.error(t('assetParts.saveFailed', 'Failed to save part result'));
    },
  });
}

/**
 * Bulk save multiple part inspection results
 */
export function useBulkSavePartInspectionResults() {
  const { profile, user } = useAuth();
  const tenantId = profile?.tenant_id;
  const branchId = profile?.assigned_branch_id;
  const userId = user?.id;
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (input: BulkSavePartResultsInput) => {
      if (!tenantId) throw new Error('No tenant ID');

      const records = input.results.map((r) => ({
        inspection_id: input.inspection_id,
        part_id: r.part_id,
        tenant_id: tenantId,
        branch_id: branchId || null,
        result: r.result,
        condition_rating: r.condition_rating || null,
        notes: r.notes || null,
        photo_path: r.photo_path || null,
        responded_by: userId || null,
        responded_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from('asset_inspection_part_results')
        .upsert(records, { onConflict: 'inspection_id,part_id' })
        .select();

      if (error) throw error;
      return data as AssetInspectionPartResult[];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['part-inspection-results', variables.inspection_id] 
      });
      toast.success(t('assetParts.resultsSaved', 'Part results saved'));
    },
    onError: (error: Error) => {
      console.error('Failed to bulk save part results:', error);
      toast.error(t('assetParts.bulkSaveFailed', 'Failed to save part results'));
    },
  });
}

/**
 * Delete a part inspection result
 */
export function useDeletePartInspectionResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, inspectionId }: { id: string; inspectionId: string }) => {
      const { error } = await supabase
        .from('asset_inspection_part_results')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      return { id, inspectionId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['part-inspection-results', data.inspectionId] 
      });
    },
  });
}

/**
 * Get summary stats for part inspection results
 */
export function usePartInspectionSummary(inspectionId: string | undefined) {
  const { data: results, isLoading } = usePartInspectionResults(inspectionId);

  const summary = {
    total: results?.length || 0,
    passed: results?.filter((r) => r.result === 'pass').length || 0,
    failed: results?.filter((r) => r.result === 'fail').length || 0,
    na: results?.filter((r) => r.result === 'na').length || 0,
    criticalFailed: results?.filter((r) => r.result === 'fail' && r.part?.is_critical).length || 0,
  };

  return { summary, isLoading };
}
