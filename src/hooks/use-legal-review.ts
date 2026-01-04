import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useUserRoles } from "@/hooks/use-user-roles";

export type LegalDecision = 'approved' | 'requires_changes' | 'blocked';

export interface LegalReviewInput {
  incidentId: string;
  decision: LegalDecision;
  notes: string;
}

export interface LegalReviewTrigger {
  id: string;
  tenant_id: string;
  trigger_type: string;
  trigger_value: string | null;
  is_active: boolean;
  auto_route: boolean;
}

// Check if user has legal/HR review permission
export function useCanPerformLegalReview() {
  const { user } = useAuth();
  const { hasRole } = useUserRoles();

  return useQuery({
    queryKey: ['can-perform-legal-review', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      // Check for legal_reviewer or hr_manager role
      return hasRole('legal_reviewer') || hasRole('hr_manager') || hasRole('hsse_manager');
    },
    enabled: !!user?.id,
  });
}

// Get legal review triggers for tenant
export function useLegalReviewTriggers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['legal-review-triggers'],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from('legal_review_triggers')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)
        .is('deleted_at', null);

      if (error) throw error;
      return (data || []) as LegalReviewTrigger[];
    },
    enabled: !!user?.id,
  });
}

// Check if incident requires legal review based on triggers
export function useIncidentRequiresLegalReview(incidentId: string | null) {
  const { data: triggers } = useLegalReviewTriggers();

  return useQuery({
    queryKey: ['incident-requires-legal-review', incidentId],
    queryFn: async () => {
      if (!incidentId || !triggers?.length) return false;

      const { data: incident } = await supabase
        .from('incidents')
        .select('severity_v2, has_injury, event_type, requires_legal_review')
        .eq('id', incidentId)
        .single();

      if (!incident) return false;
      if (incident.requires_legal_review) return true;

      // Check each trigger
      for (const trigger of triggers) {
        if (trigger.trigger_type === 'severity_level' && incident.severity_v2 === trigger.trigger_value) {
          return true;
        }
        if (trigger.trigger_type === 'has_injury' && incident.has_injury) {
          return true;
        }
        if (trigger.trigger_type === 'incident_type' && incident.event_type === trigger.trigger_value) {
          return true;
        }
      }

      return false;
    },
    enabled: !!incidentId && !!triggers?.length,
  });
}

// Submit legal review decision
export function useLegalReview() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: LegalReviewInput) => {
      const { incidentId, decision, notes } = input;

      let newStatus: string;
      const updateData: Record<string, unknown> = {
        legal_reviewer_id: user?.id,
        legal_reviewed_at: new Date().toISOString(),
        legal_review_notes: notes,
        legal_decision: decision,
      };

      switch (decision) {
        case 'approved':
          // Continue to department approval
          newStatus = 'pending_manager_approval';
          break;
        case 'requires_changes':
          // Return to HSSE Expert for changes
          newStatus = 'submitted';
          break;
        case 'blocked':
          // Block the incident from proceeding
          newStatus = 'closed';
          updateData.closed_reason = 'blocked_by_legal';
          break;
        default:
          throw new Error('Invalid decision');
      }

      updateData.status = newStatus;

      const { error } = await supabase
        .from('incidents')
        .update(updateData)
        .eq('id', incidentId);

      if (error) throw error;

      // Log audit entry
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .single();

      await supabase.from('incident_audit_logs').insert({
        incident_id: incidentId,
        tenant_id: profile?.tenant_id,
        actor_id: user?.id,
        action: `legal_review_${decision}`,
        details: { decision, notes },
      });

      // Send notification
      try {
        await supabase.functions.invoke('send-workflow-notification', {
          body: { incidentId, action: `legal_${decision}`, notes },
        });
      } catch (e) {
        console.error('Failed to send notification:', e);
      }

      return { incidentId, newStatus };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });

      const messages: Record<LegalDecision, string> = {
        approved: 'Legal review approved. Proceeding to department approval.',
        requires_changes: 'Returned to HSSE Expert for changes.',
        blocked: 'Incident blocked by legal review.',
      };

      toast({
        title: 'Legal Review Complete',
        description: messages[variables.decision],
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
