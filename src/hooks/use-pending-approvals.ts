import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { useUserRoles } from '@/hooks/use-user-roles';

// Pending incident approvals for managers
export interface PendingIncidentApproval {
  id: string;
  reference_id: string | null;
  title: string;
  status: string | null;
  severity: string | null;
  event_type: string | null;
  created_at: string | null;
  reporter?: { id: string; full_name: string | null } | null;
}

export interface PendingActionApproval {
  id: string;
  reference_id: string | null;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  category: string | null;
  due_date: string | null;
  completed_date: string | null;
  incident_id: string | null;
  assigned_to: string | null;
  responsible_department_id: string | null;
  created_at: string | null;
  linked_cause_type: string | null;
  linked_root_cause_id: string | null;
  completion_notes: string | null;
  // Joined data
  assigned_user?: { id: string; full_name: string | null } | null;
  department?: { id: string; name: string } | null;
  incident?: { id: string; reference_id: string | null; title: string; event_type?: string | null } | null;
}

export interface PendingSeverityApproval {
  id: string;
  reference_id: string | null;
  title: string;
  severity_v2: 'level_1' | 'level_2' | 'level_3' | 'level_4' | 'level_5' | null;
  original_severity_v2: 'level_1' | 'level_2' | 'level_3' | 'level_4' | 'level_5' | null;
  severity_change_justification: string | null;
  severity_pending_approval: boolean;
  created_at: string | null;
  reporter?: { id: string; full_name: string | null } | null;
}

// Fetch actions with status='completed' pending verification
// Only HSSE Expert, HSSE Manager, Environmental Expert, Environmental Manager can verify
export function usePendingActionApprovals() {
  const { profile, user } = useAuth();
  const { hasRole } = useUserRoles();

  // Define which roles can verify actions per permission matrix
  const isAdmin = hasRole('admin');
  const isHSSEExpert = hasRole('hsse_expert');
  const isHSSEManager = hasRole('hsse_manager');
  const isEnvironmentalExpert = hasRole('environmental_expert');
  const isEnvironmentalManager = hasRole('environmental_manager');
  
  // Only these specific roles can verify corrective actions
  const canVerifyActions = isAdmin || isHSSEExpert || isHSSEManager || 
                           isEnvironmentalExpert || isEnvironmentalManager;

  return useQuery({
    queryKey: ['pending-action-approvals', profile?.tenant_id, user?.id, canVerifyActions],
    queryFn: async () => {
      if (!profile?.tenant_id || !user?.id) return [];

      // If user doesn't have verification permissions, return empty
      if (!canVerifyActions) return [];

      // Build query for completed actions
      let query = supabase
        .from('corrective_actions')
        .select(`
          id, reference_id, title, description, status, priority, category, 
          due_date, completed_date, incident_id, assigned_to,
          responsible_department_id, created_at,
          linked_cause_type, linked_root_cause_id, completion_notes,
          assigned_user:profiles!corrective_actions_assigned_to_fkey(id, full_name),
          department:departments!corrective_actions_responsible_department_id_fkey(id, name),
          incident:incidents!corrective_actions_incident_id_fkey(id, reference_id, title, event_type)
        `)
        .eq('tenant_id', profile.tenant_id)
        .eq('status', 'completed')
        .is('deleted_at', null)
        .order('completed_date', { ascending: true });

      const { data, error } = await query;
      if (error) throw error;
      
      let actions = (data || []) as (PendingActionApproval & { incident?: { event_type?: string } })[];
      
      // Environmental roles can only verify environment-related actions
      if ((isEnvironmentalExpert || isEnvironmentalManager) && !isAdmin && !isHSSEExpert && !isHSSEManager) {
        actions = actions.filter(action => 
          action.category === 'environmental' || 
          action.incident?.event_type === 'environmental'
        );
      }
      
      return actions as PendingActionApproval[];
    },
    enabled: !!profile?.tenant_id && !!user?.id,
  });
}

// Fetch incidents with pending severity changes (HSSE Manager/Admin only)
export function usePendingSeverityApprovals() {
  const { profile, user } = useAuth();
  const { hasRole, isLoading: rolesLoading } = useUserRoles();

  const isAdmin = hasRole('admin');
  const isHSSEManager = hasRole('hsse_manager');
  const canApprove = isAdmin || isHSSEManager;

  return useQuery({
    queryKey: ['pending-severity-approvals', profile?.tenant_id, canApprove],
    queryFn: async () => {
      if (!profile?.tenant_id || !user?.id) return [];

      // Only admin or HSSE manager can approve severity changes
      if (!canApprove) return [];

      const { data, error } = await supabase
        .from('incidents')
        .select(`
          id, reference_id, title, severity_v2, original_severity_v2,
          severity_change_justification, severity_pending_approval, created_at,
          reporter:profiles!incidents_reporter_id_fkey(id, full_name)
        `)
        .eq('tenant_id', profile.tenant_id)
        .eq('severity_pending_approval', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as PendingSeverityApproval[];
    },
    enabled: !!profile?.tenant_id && !!user?.id && !rolesLoading,
  });
}

// Verify or reject a completed action
export function useVerifyAction() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      actionId, 
      approved, 
      notes 
    }: { 
      actionId: string; 
      approved: boolean; 
      notes?: string;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Fetch action details for email notification
      const { data: action, error: fetchError } = await supabase
        .from('corrective_actions')
        .select(`
          id, title, return_count, incident_id,
          assigned_user:profiles!corrective_actions_assigned_to_fkey(id, full_name, email),
          incident:incidents!corrective_actions_incident_id_fkey(id, reference_id)
        `)
        .eq('id', actionId)
        .single();

      if (fetchError) throw fetchError;

      const updateData = approved
        ? {
            status: 'closed', // Auto-close after HSSE Expert verification
            verified_by: user.id,
            verified_at: new Date().toISOString(),
            verification_notes: notes || null,
          }
        : {
            status: 'returned_for_correction',
            rejected_by: user.id,
            rejected_at: new Date().toISOString(),
            rejection_notes: notes || null,
            last_returned_at: new Date().toISOString(),
            last_return_reason: notes || null,
            return_count: (action?.return_count || 0) + 1,
          };

      const { error } = await supabase
        .from('corrective_actions')
        .update(updateData)
        .eq('id', actionId);

      if (error) throw error;

      // Send email notification for returned actions
      if (!approved && action?.assigned_user) {
        const assignedUser = action.assigned_user as { id: string; full_name: string | null; email: string | null };
        const incident = action.incident as { id: string; reference_id: string | null } | null;
        
        if (assignedUser.email) {
          try {
            await supabase.functions.invoke('send-action-email', {
              body: {
                type: 'action_returned',
                recipient_email: assignedUser.email,
                recipient_name: assignedUser.full_name || 'Team Member',
                action_title: action.title,
                incident_reference: incident?.reference_id || undefined,
                rejection_notes: notes || undefined,
                return_count: (action.return_count || 0) + 1,
              },
            });
            console.log('Action returned email sent to:', assignedUser.email);
          } catch (emailError) {
            console.error('Failed to send action returned email:', emailError);
          }
        }
      }

      // Send email notification for closed actions & log audit entry
      if (approved && action?.assigned_user) {
        const assignedUser = action.assigned_user as { id: string; full_name: string | null; email: string | null };
        const incident = action.incident as { id: string; reference_id: string | null } | null;
        
        // Get verifier name for email
        const { data: verifierProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        
        // Send closure notification email
        if (assignedUser.email) {
          try {
            await supabase.functions.invoke('send-action-email', {
              body: {
                type: 'action_closed',
                recipient_email: assignedUser.email,
                recipient_name: assignedUser.full_name || 'Team Member',
                action_title: action.title,
                incident_reference: incident?.reference_id || undefined,
                verification_notes: notes || undefined,
                verifier_name: verifierProfile?.full_name || 'HSSE Expert',
              },
            });
            console.log('Action closed email sent to:', assignedUser.email);
          } catch (emailError) {
            console.error('Failed to send action closed email:', emailError);
          }
        }
        
        // Log audit entry for action closure
        if (incident?.id && profile?.tenant_id) {
          try {
            await supabase.from('incident_audit_logs').insert({
              incident_id: incident.id,
              tenant_id: profile.tenant_id,
              actor_id: user.id,
              action: 'action_closed_by_verifier',
              new_value: {
                action_id: actionId,
                action_title: action.title,
                verification_notes: notes || null,
                closed_at: new Date().toISOString(),
                closed_by: verifierProfile?.full_name || user.id,
              },
            });
            console.log('Audit log entry created for action closure');
          } catch (auditError) {
            console.error('Failed to create audit log:', auditError);
          }
        }
      }

      return { approved };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['pending-action-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['corrective-actions'] });
      queryClient.invalidateQueries({ queryKey: ['my-corrective-actions'] });
      toast({
        title: t('common.success'),
        description: result.approved
          ? t('investigation.approvals.actionClosed', 'Action verified and closed successfully')
          : t('investigation.approvals.actionRejected', 'Action rejected and returned to assignee'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Approve or reject a severity change
export function useApproveSeverityChange() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      incidentId,
      approved,
    }: {
      incidentId: string;
      approved: boolean;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      let updateData: Record<string, unknown>;

      if (approved) {
        // Approve: clear pending flag, record approver
        updateData = {
          severity_pending_approval: false,
          severity_approved_by: user.id,
          severity_approved_at: new Date().toISOString(),
        };
      } else {
        // Reject: revert to original severity_v2
        const { data: incident } = await supabase
          .from('incidents')
          .select('original_severity_v2')
          .eq('id', incidentId)
          .single();

        updateData = {
          severity_v2: incident?.original_severity_v2,
          severity_pending_approval: false,
          severity_change_justification: null,
        };
      }

      const { error } = await supabase
        .from('incidents')
        .update(updateData)
        .eq('id', incidentId);

      if (error) throw error;
      return { approved };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['pending-severity-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });
      toast({
        title: t('common.success'),
        description: result.approved
          ? t('investigation.approvals.severityApproved', 'Severity change approved')
          : t('investigation.approvals.severityRejected', 'Severity change rejected'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Check if user can access approvals tab
export function useCanAccessApprovals() {
  const { hasRole, hasRoleInCategory, isLoading } = useUserRoles();

  const canAccess = !isLoading && (
    hasRole('admin') ||
    hasRole('manager') ||
    hasRoleInCategory('hsse') ||
    hasRoleInCategory('environmental')
  );

  // Only specific roles can verify corrective actions per permission matrix
  const canVerifyActions = !isLoading && (
    hasRole('admin') ||
    hasRole('hsse_manager') ||
    hasRole('hsse_expert') ||
    hasRole('environmental_expert') ||
    hasRole('environmental_manager')
  );

  const canApproveSeverity = !isLoading && (
    hasRole('admin') ||
    hasRole('hsse_manager')
  );

  return { canAccess, canApproveSeverity, canVerifyActions, isLoading };
}

// Fetch incidents pending manager approval for the current user
export function usePendingIncidentApprovals() {
  const { profile, user, isLoading: authLoading } = useAuth();

  return useQuery({
    queryKey: ['pending-incident-approvals', profile?.tenant_id, user?.id],
    queryFn: async () => {
      // Double-check requirements inside queryFn
      if (!profile?.tenant_id || !user?.id) {
        console.log('[PendingApprovals] Missing tenant_id or user_id:', { 
          tenant_id: profile?.tenant_id, 
          user_id: user?.id 
        });
        return [];
      }

      console.log('[PendingApprovals] Fetching incidents for tenant:', profile.tenant_id, 'user:', user.id);

      // Get incidents that are pending manager approval or escalated to HSSE Manager
      const { data: incidents, error } = await supabase
        .from('incidents')
        .select(`
          id, reference_id, title, status, severity, event_type, created_at,
          reporter:profiles!incidents_reporter_id_fkey(id, full_name),
          reporter_id
        `)
        .eq('tenant_id', profile.tenant_id)
        .in('status', ['pending_manager_approval', 'hsse_manager_escalation', 'pending_closure', 'pending_final_closure', 'pending_dept_rep_approval'])
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[PendingApprovals] Error fetching incidents:', error);
        throw error;
      }
      
      console.log('[PendingApprovals] Found incidents:', incidents?.length || 0, incidents);
      
      if (!incidents || incidents.length === 0) return [];

      // Filter to only incidents where current user can approve
      const approvableIncidents: PendingIncidentApproval[] = [];
      
      for (const incident of incidents) {
        try {
          const { data: canApprove, error: rpcError } = await supabase.rpc('can_approve_investigation', {
            _user_id: user.id,
            _incident_id: incident.id,
          });
          
          if (rpcError) {
            console.error('[PendingApprovals] RPC error for incident:', incident.id, rpcError);
            continue; // Skip this incident but continue processing others
          }
          
          console.log('[PendingApprovals] can_approve_investigation result:', incident.reference_id, canApprove);
          
          if (canApprove) {
            approvableIncidents.push({
              id: incident.id,
              reference_id: incident.reference_id,
              title: incident.title,
              status: incident.status,
              severity: incident.severity,
              event_type: incident.event_type,
              created_at: incident.created_at,
              reporter: incident.reporter as { id: string; full_name: string | null } | null,
            });
          }
        } catch (err) {
          console.error('[PendingApprovals] Exception checking approval for incident:', incident.id, err);
          // Continue processing other incidents
        }
      }
      
      console.log('[PendingApprovals] Final approvable incidents:', approvableIncidents.length, approvableIncidents);
      return approvableIncidents;
    },
    // Only enable when auth is fully loaded AND we have the required data
    enabled: !authLoading && !!profile?.tenant_id && !!user?.id,
    // Refetch on window focus for fresh data
    refetchOnWindowFocus: true,
  });
}
