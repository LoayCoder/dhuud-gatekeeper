import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export type SpecialistDataType = 'injury' | 'property_damage' | 'environmental';
export type ReviewStatus = 'draft' | 'submitted' | 'approved' | 'returned';

interface ReviewStatusData {
  review_status: ReviewStatus;
  submitted_at: string | null;
  submitted_by: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
}

interface SubmittedRecord extends ReviewStatusData {
  id: string;
}

const TABLE_MAP: Record<SpecialistDataType, string> = {
  injury: 'incident_injuries',
  property_damage: 'incident_property_damages',
  environmental: 'environmental_incident_details',
};

// LooseClient for dynamic table access
interface LooseFrom {
  select: (columns: string) => LooseFrom;
  eq: (col: string, val: unknown) => LooseFrom;
  is: (col: string, val: unknown) => LooseFrom;
  in: (col: string, vals: unknown[]) => LooseFrom;
  update: (vals: Record<string, unknown>) => LooseFrom;
  then: (resolve: (value: { data: unknown[] | null; error: { message: string; code?: string } | null }) => void) => void;
}
const looseClient = supabase as unknown as { from: (table: string) => LooseFrom };

/**
 * Hook to manage specialist data review status for leader review cycles
 */
export function useSpecialistReview(incidentId: string | null, dataType: SpecialistDataType) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const tableName = TABLE_MAP[dataType];

  // Fetch review status for all records of this type
  const { data: records, isLoading } = useQuery({
    queryKey: ['specialist-review', incidentId, dataType],
    queryFn: async () => {
      if (!incidentId) return [];

      const { data, error } = await looseClient.from(tableName)
        .select('id, review_status, submitted_at, submitted_by, reviewed_at, reviewed_by, review_notes')
        .eq('incident_id', incidentId)
        .is('deleted_at', null);

      if (error) {
        // Column doesn't exist yet (migration not run)
        if (error.code === '42703' || error.message?.includes('column')) {
          return [];
        }
        throw error;
      }

      return (data || []) as SubmittedRecord[];
    },
    enabled: !!incidentId && !!profile?.tenant_id,
  });

  // Calculate aggregate status
  const aggregateStatus = (): ReviewStatus | null => {
    if (!records || records.length === 0) return null;
    if (records.some(r => r.review_status === 'returned')) return 'returned';
    if (records.some(r => r.review_status === 'draft')) return 'draft';
    if (records.some(r => r.review_status === 'submitted')) return 'submitted';
    if (records.every(r => r.review_status === 'approved')) return 'approved';
    return 'draft';
  };

  // Submit all records for review
  const submitForReview = useMutation({
    mutationFn: async () => {
      const profileId = profile?.id;
      if (!incidentId || !profileId) throw new Error('Missing required data');

      const { error } = await looseClient.from(tableName)
        .update({
          review_status: 'submitted',
          submitted_at: new Date().toISOString(),
          submitted_by: profileId,
        })
        .eq('incident_id', incidentId)
        .is('deleted_at', null)
        .in('review_status', ['draft', 'returned']);

      if (error) throw error;

      await supabase.from('incident_audit_logs').insert({
        incident_id: incidentId,
        tenant_id: profile?.tenant_id,
        actor_id: profileId,
        action: `${dataType}_submitted_for_review`,
        details: { data_type: dataType },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialist-review', incidentId, dataType] });
      toast.success(t('investigation.review.submitted', 'Data submitted for review'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('common.error', 'Failed to submit for review'));
    },
  });

  // Approve all records (for reviewers)
  const approveReview = useMutation({
    mutationFn: async (notes?: string) => {
      const profileId = profile?.id;
      if (!incidentId || !profileId) throw new Error('Missing required data');

      const { error } = await looseClient.from(tableName)
        .update({
          review_status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: profileId,
          review_notes: notes || null,
        })
        .eq('incident_id', incidentId)
        .is('deleted_at', null)
        .eq('review_status', 'submitted');

      if (error) throw error;

      await supabase.from('incident_audit_logs').insert({
        incident_id: incidentId,
        tenant_id: profile?.tenant_id,
        actor_id: profileId,
        action: `${dataType}_review_approved`,
        details: { data_type: dataType, notes },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialist-review', incidentId, dataType] });
      toast.success(t('investigation.review.approved', 'Data approved'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('common.error', 'Failed to approve'));
    },
  });

  // Return records for corrections (for reviewers)
  const returnForCorrections = useMutation({
    mutationFn: async (notes: string) => {
      const profileId = profile?.id;
      if (!incidentId || !profileId) throw new Error('Missing required data');
      if (!notes?.trim()) throw new Error('Notes are required when returning for corrections');

      const { error } = await looseClient.from(tableName)
        .update({
          review_status: 'returned',
          reviewed_at: new Date().toISOString(),
          reviewed_by: profileId,
          review_notes: notes,
        })
        .eq('incident_id', incidentId)
        .is('deleted_at', null)
        .eq('review_status', 'submitted');

      if (error) throw error;

      await supabase.from('incident_audit_logs').insert({
        incident_id: incidentId,
        tenant_id: profile?.tenant_id,
        actor_id: profileId,
        action: `${dataType}_returned_for_corrections`,
        details: { data_type: dataType, notes },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialist-review', incidentId, dataType] });
      toast.success(t('investigation.review.returned', 'Data returned for corrections'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('common.error', 'Failed to return for corrections'));
    },
  });

  // Reset to draft (after corrections made)
  const resetToDraft = useMutation({
    mutationFn: async () => {
      const profileId = profile?.id;
      if (!incidentId || !profileId) throw new Error('Missing required data');

      const { error } = await looseClient.from(tableName)
        .update({
          review_status: 'draft',
          review_notes: null,
        })
        .eq('incident_id', incidentId)
        .is('deleted_at', null)
        .eq('review_status', 'returned');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialist-review', incidentId, dataType] });
    },
  });

  return {
    records: records || [],
    recordCount: records?.length || 0,
    status: aggregateStatus(),
    isLoading,
    isDraft: aggregateStatus() === 'draft',
    isSubmitted: aggregateStatus() === 'submitted',
    isApproved: aggregateStatus() === 'approved',
    isReturned: aggregateStatus() === 'returned',
    returnNotes: records?.find(r => r.review_status === 'returned')?.review_notes || null,
    submitForReview: submitForReview.mutate,
    approveReview: approveReview.mutate,
    returnForCorrections: returnForCorrections.mutate,
    resetToDraft: resetToDraft.mutate,
    isSubmitting: submitForReview.isPending,
    isApproving: approveReview.isPending,
    isReturning: returnForCorrections.isPending,
  };
}
