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

      // Use any to handle dynamic table access until types are fully generated
      const { data, error } = await (supabase.from(tableName as unknown) as unknown)
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

    // If any record is returned, overall is returned
    if (records.some(r => r.review_status === 'returned')) return 'returned';
    // If any record is draft, overall is draft
    if (records.some(r => r.review_status === 'draft')) return 'draft';
    // If any record is submitted (awaiting review), overall is submitted
    if (records.some(r => r.review_status === 'submitted')) return 'submitted';
    // All approved
    if (records.every(r => r.review_status === 'approved')) return 'approved';

    return 'draft';
  };

  // Submit all records for review
  const submitForReview = useMutation({
    mutationFn: async () => {
      const profileId = (profile as unknown)?.id;
      if (!incidentId || !profileId) throw new Error('Missing required data');

      const { error } = await (supabase.from(tableName as unknown) as unknown)
        .update({
          review_status: 'submitted',
          submitted_at: new Date().toISOString(),
          submitted_by: profileId,
        })
        .eq('incident_id', incidentId)
        .is('deleted_at', null)
        .in('review_status', ['draft', 'returned']);

      if (error) throw error;

      // Log to audit trail
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
    onError: (error: unknown) => {
      toast.error(error.message || t('common.error', 'Failed to submit for review'));
    },
  });

  // Approve all records (for reviewers)
  const approveReview = useMutation({
    mutationFn: async (notes?: string) => {
      const profileId = (profile as unknown)?.id;
      if (!incidentId || !profileId) throw new Error('Missing required data');

      const { error } = await (supabase.from(tableName as unknown) as unknown)
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

      // Log to audit trail
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
    onError: (error: unknown) => {
      toast.error(error.message || t('common.error', 'Failed to approve'));
    },
  });

  // Return records for corrections (for reviewers)
  const returnForCorrections = useMutation({
    mutationFn: async (notes: string) => {
      const profileId = (profile as unknown)?.id;
      if (!incidentId || !profileId) throw new Error('Missing required data');
      if (!notes?.trim()) throw new Error('Notes are required when returning for corrections');

      const { error } = await (supabase.from(tableName as unknown) as unknown)
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

      // Log to audit trail
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
    onError: (error: unknown) => {
      toast.error(error.message || t('common.error', 'Failed to return for corrections'));
    },
  });

  // Reset to draft (after corrections made)
  const resetToDraft = useMutation({
    mutationFn: async () => {
      const profileId = (profile as unknown)?.id;
      if (!incidentId || !profileId) throw new Error('Missing required data');

      const { error } = await (supabase.from(tableName as unknown) as unknown)
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
    // Data
    records: records || [],
    recordCount: records?.length || 0,
    status: aggregateStatus(),
    isLoading,

    // Status checks
    isDraft: aggregateStatus() === 'draft',
    isSubmitted: aggregateStatus() === 'submitted',
    isApproved: aggregateStatus() === 'approved',
    isReturned: aggregateStatus() === 'returned',

    // Get return notes (from any returned record)
    returnNotes: records?.find(r => r.review_status === 'returned')?.review_notes || null,

    // Mutations
    submitForReview: submitForReview.mutate,
    approveReview: approveReview.mutate,
    returnForCorrections: returnForCorrections.mutate,
    resetToDraft: resetToDraft.mutate,

    // Loading states
    isSubmitting: submitForReview.isPending,
    isApproving: approveReview.isPending,
    isReturning: returnForCorrections.isPending,
  };
}
