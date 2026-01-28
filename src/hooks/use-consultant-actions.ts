/**
 * Consultant Actions Hooks
 * Enhanced capabilities for Contractor Consultant role
 * - Close on Spot (Level 1-2 observations)
 * - Escalate to HSSE Manager
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';

interface CloseOnSpotParams {
  incidentId: string;
  closureNotes: string;
  evidenceUploaded?: boolean;
}

interface EscalateToHSSEParams {
  incidentId: string;
  escalationReason: string;
}

/**
 * Hook for consultant to close observation on the spot
 * Only for Level 1-2 severity observations
 */
export function useConsultantCloseOnSpot() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ incidentId, closureNotes, evidenceUploaded }: CloseOnSpotParams) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Get current incident to verify severity
      const { data: incident, error: fetchError } = await supabase
        .from('incidents')
        .select('severity_v2, status, related_contractor_company_id')
        .eq('id', incidentId)
        .single();

      if (fetchError) throw fetchError;
      if (!incident) throw new Error('Incident not found');

      // Verify severity is Level 1-2
      const severity = incident.severity_v2;
      if (severity && !['level_1', 'level_2'].includes(severity)) {
        throw new Error('Close on Spot is only available for Level 1-2 observations');
      }

      // Must be a contractor observation
      if (!incident.related_contractor_company_id) {
        throw new Error('This is not a contractor observation');
      }

      // Update incident to closed status
      const { error: updateError } = await supabase
        .from('incidents')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          closure_notes: closureNotes,
          closure_approved_by: user.id,
          closure_approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', incidentId);

      if (updateError) throw updateError;

      // Get tenant_id for audit log
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      // Log audit entry
      if (profile?.tenant_id) {
        await supabase.from('incident_audit_logs').insert({
          incident_id: incidentId,
          action: 'consultant_closed_on_spot',
          actor_id: user.id,
          tenant_id: profile.tenant_id,
          new_value: { 
            closure_notes: closureNotes, 
            evidence_uploaded: evidenceUploaded 
          },
        });
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });
      toast.success(t('workflow.consultant.closedOnSpot', 'Observation closed successfully'));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Hook for consultant to escalate to HSSE Manager
 * For disputes or issues requiring higher authority
 */
export function useConsultantEscalateToHSSE() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ incidentId, escalationReason }: EscalateToHSSEParams) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Get current incident
      const { data: incident, error: fetchError } = await supabase
        .from('incidents')
        .select('status, tenant_id, branch_id')
        .eq('id', incidentId)
        .single();

      if (fetchError) throw fetchError;
      if (!incident) throw new Error('Incident not found');

      // Find HSSE Manager for this branch/tenant
      const { data: hsseManager } = await supabase
        .from('user_role_assignments')
        .select(`
          user_id,
          roles!inner(code, is_active)
        `)
        .eq('tenant_id', incident.tenant_id)
        .eq('roles.code', 'hsse_manager')
        .eq('roles.is_active', true)
        .or(`branch_id.eq.${incident.branch_id},branch_id.is.null`)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      // Update incident to escalation status (use hsse_manager_escalation which exists in enum)
      const { error: updateError } = await supabase
        .from('incidents')
        .update({
          status: 'hsse_manager_escalation',
          escalation_reason: escalationReason,
          escalated_by: user.id,
          escalated_at: new Date().toISOString(),
          approval_manager_id: hsseManager?.user_id || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', incidentId);

      if (updateError) throw updateError;

      // Get tenant_id for audit log
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      // Log audit entry
      if (profile?.tenant_id) {
        await supabase.from('incident_audit_logs').insert({
          incident_id: incidentId,
          action: 'consultant_escalated_to_hsse',
          actor_id: user.id,
          tenant_id: profile.tenant_id,
          new_value: { escalation_reason: escalationReason },
        });
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });
      toast.success(t('workflow.consultant.escalatedToHSSE', 'Escalated to HSSE Manager'));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
