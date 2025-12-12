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
  // Joined data
  assigned_user?: { id: string; full_name: string | null } | null;
  department?: { id: string; name: string } | null;
  incident?: { id: string; reference_id: string | null; title: string } | null;
}

export interface PendingSeverityApproval {
  id: string;
  reference_id: string | null;
  title: string;
  severity: string | null;
  original_severity: string | null;
  severity_change_justification: string | null;
  severity_pending_approval: boolean;
  created_at: string | null;
  reporter?: { id: string; full_name: string | null } | null;
}

// Fetch actions with status='completed' pending verification
export function usePendingActionApprovals() {
  const { profile, user } = useAuth();
  const { hasRole, hasRoleInCategory } = useUserRoles();

  return useQuery({
    queryKey: ['pending-action-approvals', profile?.tenant_id, user?.id],
    queryFn: async () => {
      if (!profile?.tenant_id || !user?.id) return [];

      const isAdmin = hasRole('admin');
      const isHSSE = hasRoleInCategory('hsse');
      const isManager = hasRole('manager');

      // Build query for completed actions
      let query = supabase
        .from('corrective_actions')
        .select(`
          id, title, description, status, priority, category, 
          due_date, completed_date, incident_id, assigned_to,
          responsible_department_id, created_at,
          linked_cause_type, linked_root_cause_id,
          assigned_user:profiles!corrective_actions_assigned_to_fkey(id, full_name),
          department:departments!corrective_actions_responsible_department_id_fkey(id, name),
          incident:incidents!corrective_actions_incident_id_fkey(id, reference_id, title)
        `)
        .eq('tenant_id', profile.tenant_id)
        .eq('status', 'completed')
        .is('deleted_at', null)
        .order('completed_date', { ascending: true });

      // If manager (not admin/HSSE), filter by department
      if (isManager && !isAdmin && !isHSSE) {
        // Fetch manager's department from profiles
        const { data: managerProfile } = await supabase
          .from('profiles')
          .select('assigned_department_id')
          .eq('id', user.id)
          .single();
        
        if (managerProfile?.assigned_department_id) {
          query = query.eq('responsible_department_id', managerProfile.assigned_department_id);
        } else {
          // Manager without department can't see any approvals
          return [];
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as PendingActionApproval[];
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
          id, reference_id, title, severity, original_severity,
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
  const { user } = useAuth();
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

      const updateData = approved
        ? {
            status: 'verified',
            verified_by: user.id,
            verified_at: new Date().toISOString(),
            verification_notes: notes || null,
          }
        : {
            status: 'assigned', // Reject back to assigned
            rejected_by: user.id,
            rejected_at: new Date().toISOString(),
            rejection_notes: notes || null,
            completed_date: null, // Clear completion
          };

      const { error } = await supabase
        .from('corrective_actions')
        .update(updateData)
        .eq('id', actionId);

      if (error) throw error;
      return { approved };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['pending-action-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['corrective-actions'] });
      queryClient.invalidateQueries({ queryKey: ['my-corrective-actions'] });
      toast({
        title: t('common.success'),
        description: result.approved
          ? t('investigation.approvals.actionVerified', 'Action verified successfully')
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
        // Reject: revert to original severity
        const { data: incident } = await supabase
          .from('incidents')
          .select('original_severity')
          .eq('id', incidentId)
          .single();

        updateData = {
          severity: incident?.original_severity,
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
    hasRoleInCategory('hsse')
  );

  const canApproveSeverity = !isLoading && (
    hasRole('admin') ||
    hasRole('hsse_manager')
  );

  return { canAccess, canApproveSeverity, isLoading };
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
        .in('status', ['pending_manager_approval', 'hsse_manager_escalation', 'pending_closure', 'pending_final_closure'])
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
