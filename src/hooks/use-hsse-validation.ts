/**
 * HSSE Validation Hooks for Observation Workflow
 * 
 * Supports the 3-scenario workflow:
 * - Levels 1-2: Close on Spot (bypass HSSE review)
 * - Levels 3-4: HSSE Expert Validation required, auto-close when all actions verified
 * - Level 5: HSSE Manager approval required for final closure
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { 
  getSeverityConfig, 
  type SeverityLevelV2,
  type HSSEValidationStatus 
} from "@/lib/hsse-severity-levels";

interface HSSEValidationInput {
  incidentId: string;
  decision: 'accept' | 'reject';
  notes?: string;
}

interface ManagerClosureInput {
  incidentId: string;
  justification: string;
}

/**
 * Check if user can perform HSSE validation on observations
 */
export function useCanPerformHSSEValidation() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['can-perform-hsse-validation', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      // Check if user has HSSE Expert, HSSE Manager, or Environmental role
      const { data: roles, error } = await supabase
        .from('user_role_assignments')
        .select('roles(name)')
        .eq('user_id', user.id)
        .is('deleted_at', null);
      
      if (error || !roles) return false;
      
      const roleNames = roles.map((r: any) => r.roles?.name).filter(Boolean);
      return roleNames.some((name: string) => 
        ['hsse_expert', 'hsse_manager', 'environmental'].includes(name)
      );
    },
    enabled: !!user?.id,
  });
}

/**
 * Check if user can perform final closure (HSSE Manager only)
 */
export function useCanPerformFinalClosure() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['can-perform-final-closure', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      // Only HSSE Manager or Admin can finalize Level 5 closures
      const { data: roles, error } = await supabase
        .from('user_role_assignments')
        .select('roles(name)')
        .eq('user_id', user.id)
        .is('deleted_at', null);
      
      if (error || !roles) return false;
      
      const roleNames = roles.map((r: any) => r.roles?.name).filter(Boolean);
      return roleNames.some((name: string) => 
        ['hsse_manager', 'admin'].includes(name)
      );
    },
    enabled: !!user?.id,
  });
}

/**
 * Get observations pending HSSE validation
 */
export function usePendingHSSEValidation() {
  const { user } = useAuth();
  const { data: canValidate } = useCanPerformHSSEValidation();
  
  return useQuery({
    queryKey: ['pending-hsse-validation', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select(`
          id, reference_id, title, description, event_type, subtype,
          severity_v2, status, occurred_at, location,
          site_id, sites(name),
          reporter_id, profiles!incidents_reporter_id_fkey(full_name)
        `)
        .eq('event_type', 'observation')
        .eq('status', 'pending_hsse_validation')
        .is('deleted_at', null)
        .order('occurred_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && canValidate === true,
  });
}

/**
 * Get observations pending final closure (Level 5)
 */
export function usePendingFinalClosure() {
  const { user } = useAuth();
  const { data: canClose } = useCanPerformFinalClosure();
  
  return useQuery({
    queryKey: ['pending-final-closure', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select(`
          id, reference_id, title, description, event_type, subtype,
          severity_v2, status, occurred_at, location,
          site_id, sites(name),
          reporter_id, profiles!incidents_reporter_id_fkey(full_name)
        `)
        .eq('event_type', 'observation')
        .eq('status', 'pending_final_closure')
        .eq('closure_requires_manager', true)
        .is('deleted_at', null)
        .order('occurred_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && canClose === true,
  });
}

/**
 * Hook for HSSE Expert to accept/reject observation risk & actions
 */
export function useHSSEValidation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (input: HSSEValidationInput) => {
      const { incidentId, decision, notes } = input;
      
      // Get the incident to check severity
      const { data: incident, error: fetchError } = await supabase
        .from('incidents')
        .select('severity_v2, closure_requires_manager')
        .eq('id', incidentId)
        .single();
      
      if (fetchError || !incident) throw new Error('Incident not found');
      
      const severity = incident.severity_v2 as SeverityLevelV2;
      const config = getSeverityConfig(severity);
      
      let newStatus: string;
      const updateData: Record<string, unknown> = {
        hsse_validation_status: decision === 'accept' ? 'accepted' : 'rejected',
        hsse_validated_by: user?.id,
        hsse_validated_at: new Date().toISOString(),
        hsse_validation_notes: notes,
      };
      
      if (decision === 'accept') {
        // Check if Level 5 - requires manager closure
        if (config?.requiresManagerClosure) {
          newStatus = 'pending_final_closure';
          updateData.closure_requires_manager = true;
        } else {
          // For Levels 3-4: Auto-close if all actions are verified
          // Check if there are pending actions
          const { count: pendingActions } = await supabase
            .from('corrective_actions')
            .select('id', { count: 'exact', head: true })
            .eq('incident_id', incidentId)
            .not('status', 'eq', 'verified')
            .is('deleted_at', null);
          
          if (pendingActions && pendingActions > 0) {
            // Still has pending actions - stay in action pending status
            newStatus = 'observation_actions_pending';
          } else {
            // All actions verified (or no actions) - close
            newStatus = 'closed';
          }
        }
      } else {
        // Rejected - return to department rep for correction
        newStatus = 'pending_dept_rep_approval';
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
        action: `hsse_validation_${decision}`,
        details: { decision, notes, severity },
      });
      
      // Send notification
      try {
        await supabase.functions.invoke('send-workflow-notification', {
          body: { incidentId, action: `hsse_validation_${decision}`, notes },
        });
      } catch (e) {
        console.error('Failed to send notification:', e);
      }
      
      return { incidentId, newStatus };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });
      queryClient.invalidateQueries({ queryKey: ['pending-hsse-validation'] });
      
      toast({
        title: variables.decision === 'accept' ? "Validation Accepted" : "Validation Rejected",
        description: variables.decision === 'accept'
          ? "Risk and actions have been validated"
          : "Returned to department for correction",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook for HSSE Manager to finalize Level 5 observation closure
 */
export function useManagerFinalClosure() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (input: ManagerClosureInput) => {
      const { incidentId, justification } = input;
      
      const updateData: Record<string, unknown> = {
        status: 'closed',
        hsse_manager_decision: 'approved',
        hsse_manager_decision_by: user?.id,
        hsse_manager_justification: justification,
      };
      
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
        action: 'manager_final_closure',
        details: { justification },
      });
      
      // Send notification
      try {
        await supabase.functions.invoke('send-workflow-notification', {
          body: { incidentId, action: 'manager_final_closure', justification },
        });
      } catch (e) {
        console.error('Failed to send notification:', e);
      }
      
      return { incidentId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });
      queryClient.invalidateQueries({ queryKey: ['pending-final-closure'] });
      
      toast({
        title: "Observation Closed",
        description: "Level 5 observation has been finalized and closed by HSSE Manager",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
