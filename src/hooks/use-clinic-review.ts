import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";

interface ClinicReviewInput {
  incidentId: string;
  notes?: string;
}

/**
 * Hook to check if user can perform clinic review
 * For incidents with injuries requiring medical attention
 */
export function useCanPerformClinicReview(incidentId: string | null) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['can-perform-clinic-review', user?.id, incidentId],
    queryFn: async () => {
      if (!user?.id || !incidentId) return false;
      
      const { data, error } = await supabase
        .rpc('can_perform_clinic_review', {
          _user_id: user.id,
          _incident_id: incidentId
        });
      
      if (error) {
        console.error('Error checking clinic review permission:', error);
        return false;
      }
      
      return data as boolean;
    },
    enabled: !!user?.id && !!incidentId,
  });
}

/**
 * Hook for clinic/medical staff to complete injury review
 */
export function useSubmitClinicReview() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async (input: ClinicReviewInput) => {
      const { incidentId, notes } = input;
      
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      const { data, error } = await supabase
        .rpc('submit_clinic_review', {
          _incident_id: incidentId,
          _user_id: user.id,
          _notes: notes || null
        });
      
      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; new_status?: string };
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to submit clinic review');
      }
      
      // Send notification
      try {
        await supabase.functions.invoke('send-workflow-notification', {
          body: { 
            incidentId, 
            action: 'clinic_review_completed', 
            notes,
            newStatus: result.new_status
          },
        });
      } catch (e) {
        console.error('Failed to send notification:', e);
      }
      
      return { incidentId, newStatus: result.new_status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });
      queryClient.invalidateQueries({ queryKey: ['pending-clinic-reviews'] });
      
      toast({
        title: t('workflow.clinic.reviewComplete', 'Clinic Review Complete'),
        description: t('workflow.clinic.reviewCompleteDesc', 'Incident forwarded to HSSE Expert for investigator assignment'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error', 'Error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to get incidents pending clinic review
 */
export function usePendingClinicReviews() {
  const { user, profile } = useAuth();
  
  return useQuery({
    queryKey: ['pending-clinic-reviews', user?.id, profile?.tenant_id],
    queryFn: async () => {
      if (!user?.id || !profile?.tenant_id) return [];
      
      const { data, error } = await supabase
        .from('incidents')
        .select(`
          id, reference_id, title, description, event_type,
          severity_v2, status, occurred_at, created_at,
          clinic_review_required,
          reporter:profiles!incidents_reporter_id_fkey(id, full_name),
          site:sites!incidents_site_id_fkey(id, name)
        `)
        .eq('tenant_id', profile.tenant_id)
        .eq('status', 'pending_clinic_review')
        .is('deleted_at', null)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching pending clinic reviews:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!user?.id && !!profile?.tenant_id,
  });
}
