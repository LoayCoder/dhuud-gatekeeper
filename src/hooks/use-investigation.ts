import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { Json } from "@/integrations/supabase/types";

// Types
export interface RootCauseEntry {
  id: string;
  text: string; // Description
  category?: string; // Root Cause Category
  added_at?: string;
  added_by?: string;
}

export interface ContributingFactorEntry {
  id: string;
  text: string;
}

export interface Investigation {
  id: string;
  incident_id: string;
  investigator_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  immediate_cause: string | null;
  underlying_cause: string | null;
  root_cause: string | null;
  contributing_factors: string | null;
  findings_summary: string | null;
  five_whys: FiveWhyEntry[] | null;
  root_causes: RootCauseEntry[] | null;
  contributing_factors_list: ContributingFactorEntry[] | null;
  ai_summary: string | null;
  ai_summary_generated_at: string | null;
  ai_summary_language: string | null;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  // Investigator assignment fields (matches DB columns)
  assigned_by: string | null;
  assigned_at: string | null;
  assignment_notes: string | null;
  // V1.1 RCA Fields
  rca_id?: string;
  is_rca_locked?: boolean;
  rca_locked_by?: string | null;
  rca_locked_at?: string | null;
}

export interface FiveWhyEntry {
  why: string;
  answer: string;
}

export interface CorrectiveAction {
  id: string;
  incident_id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  responsible_department_id: string | null;
  start_date: string | null;
  due_date: string | null;
  priority: string | null;
  status: string | null;
  action_type: string | null;
  category: string | null;
  linked_root_cause_id: string | null;
  linked_cause_type: string | null;
  completed_date: string | null;
  verified_by: string | null;
  verified_at: string | null;
  verification_notes: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_notes: string | null;
  tenant_id: string;
  created_at: string;
  // Joined fields
  assignee?: { id: string; full_name: string | null; job_title: string | null } | null;
  department?: { id: string; name: string } | null;
}

export interface IncidentAuditLog {
  id: string;
  incident_id: string;
  actor_id: string | null;
  action: string;
  old_value: Json | null;
  new_value: Json | null;
  details: Json | null;
  ip_address: string | null;
  created_at: string;
}

// Investigation Hooks
export function useInvestigation(incidentId: string | null) {
  return useQuery({
    queryKey: ['investigation', incidentId],
    queryFn: async () => {
      if (!incidentId) return null;
      
      // Fetch Legacy Investigation Data
      const { data: invData, error: invError } = await supabase
        .from('investigations')
        .select('*')
        .eq('incident_id', incidentId)
        .is('deleted_at', null)
        .maybeSingle();

      if (invError) throw invError;
      if (!invData) return null;

      // Fetch V1.1 RCA Data
      const { data: rcaData, error: rcaError } = await supabase
        .from('incident_rca')
        .select('*')
        .eq('incident_id', incidentId)
        .maybeSingle();

      if (rcaError) {
        console.error('Error fetching RCA data:', rcaError);
        // Don't block if RCA fetch fails (might be permission issue or missing table in some envs)
      }
      
      // Prioritize RCA table data over Legacy columns
      
      // Parse five_whys
      let parsedWhys: FiveWhyEntry[] = [];
      const sourceWhys = rcaData?.five_whys || invData.five_whys;
      if (Array.isArray(sourceWhys)) {
        parsedWhys = (sourceWhys as unknown as FiveWhyEntry[]).filter(
          (item): item is FiveWhyEntry => 
            typeof item === 'object' && item !== null && 'why' in item && 'answer' in item
        );
      }

      // Parse root_causes
      let parsedRootCauses: RootCauseEntry[] = [];
      const sourceRootCauses = rcaData?.root_causes || invData.root_causes;
      if (Array.isArray(sourceRootCauses)) {
        parsedRootCauses = (sourceRootCauses as unknown as RootCauseEntry[]).filter(
          (item): item is RootCauseEntry => 
            typeof item === 'object' && item !== null && 'id' in item && 'text' in item
        );
      }

      // Parse contributing_factors_list
      let parsedContributingFactors: ContributingFactorEntry[] = [];
      const sourceFactors = rcaData?.contributing_factors || invData.contributing_factors_list;
      if (Array.isArray(sourceFactors)) {
        parsedContributingFactors = (sourceFactors as unknown as ContributingFactorEntry[]).filter(
          (item): item is ContributingFactorEntry => 
            typeof item === 'object' && item !== null && 'id' in item && 'text' in item
        );
      }
      
      return {
        id: invData.id,
        incident_id: invData.incident_id,
        investigator_id: invData.investigator_id,
        started_at: invData.started_at,
        completed_at: invData.completed_at,
        immediate_cause: rcaData?.immediate_causes?.[0] || invData.immediate_cause, // Map array[0] to string for legacy compat
        underlying_cause: rcaData?.underlying_causes?.[0] || invData.underlying_cause,
        root_cause: invData.root_cause, // Legacy text field still used for summary? Or keep separate.
        contributing_factors: invData.contributing_factors, // Legacy text field
        findings_summary: invData.findings_summary,
        five_whys: parsedWhys,
        root_causes: parsedRootCauses,
        contributing_factors_list: parsedContributingFactors,
        ai_summary: invData.ai_summary ?? null,
        ai_summary_generated_at: invData.ai_summary_generated_at ?? null,
        ai_summary_language: invData.ai_summary_language ?? null,
        tenant_id: invData.tenant_id,
        created_at: invData.created_at,
        updated_at: invData.updated_at,
        assigned_by: invData.assigned_by ?? null,
        assigned_at: invData.assigned_at ?? null,
        assignment_notes: invData.assignment_notes ?? null,
        // RCA V1.1
        rca_id: rcaData?.id,
        is_rca_locked: rcaData?.is_locked || false,
        rca_locked_by: rcaData?.locked_by,
        rca_locked_at: rcaData?.locked_at,
      } as Investigation;
    },
    enabled: !!incidentId,
    staleTime: 60 * 1000, // 1 minute before refetch
    gcTime: 5 * 60 * 1000, // 5 minutes in cache
  });
}

export function useCreateInvestigation() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (incidentId: string) => {
      if (!profile?.tenant_id || !user?.id) {
        throw new Error('User not authenticated');
      }

      // Create legacy investigation record
      const { data, error } = await supabase
        .from('investigations')
        .insert({
          incident_id: incidentId,
          tenant_id: profile.tenant_id,
          investigator_id: user.id,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Ensure RCA record exists (V1.1)
      const { error: rcaError } = await supabase
        .from('incident_rca')
        .insert({
          incident_id: incidentId,
          tenant_id: profile.tenant_id,
        });

      if (rcaError) {
         console.warn('Failed to auto-create incident_rca (non-critical if created later):', rcaError);
      }

      // Log audit entry
      await supabase.from('incident_audit_logs').insert({
        incident_id: incidentId,
        tenant_id: profile.tenant_id,
        actor_id: user.id,
        action: 'investigation_started',
        new_value: { investigation_id: data.id },
      });

      return data;
    },
    onSuccess: (_, incidentId) => {
      queryClient.invalidateQueries({ queryKey: ['investigation', incidentId] });
      toast.success(t('investigation.started', 'Investigation started'));
    },
    onError: (error) => {
      toast.error(t('common.error', 'Error: ') + error.message);
    },
  });
}

export function useUpdateInvestigation() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ 
      id, 
      incidentId,
      updates 
    }: { 
      id: string; 
      incidentId: string;
      updates: Partial<Omit<Investigation, 'id' | 'tenant_id' | 'created_at'>> 
    }) => {
      if (!profile?.tenant_id || !user?.id) {
        throw new Error('User not authenticated');
      }

      // 1. Update Legacy Table
      // Convert typed arrays to Json for database
      const dbUpdates: Record<string, unknown> = {
        ...updates,
        updated_at: new Date().toISOString(),
      };
      
      // Filter out RCA-specific fields from legacy update if needed, but keeping them synced is safer for now
      // Explicitly cast complex types to Json
      if (updates.five_whys !== undefined) {
        dbUpdates.five_whys = updates.five_whys as unknown as Json;
      }
      if (updates.root_causes !== undefined) {
        dbUpdates.root_causes = updates.root_causes as unknown as Json;
      }
      if (updates.contributing_factors_list !== undefined) {
        dbUpdates.contributing_factors_list = updates.contributing_factors_list as unknown as Json;
      }

      const { data, error } = await supabase
        .from('investigations')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // 2. Upsert V1.1 RCA Table
      // We map the legacy fields to new schema structure
      const rcaUpdates: any = {
        incident_id: incidentId,
        tenant_id: profile.tenant_id,
        updated_at: new Date().toISOString(),
      };

      if (updates.five_whys !== undefined) rcaUpdates.five_whys = updates.five_whys;
      if (updates.root_causes !== undefined) rcaUpdates.root_causes = updates.root_causes;
      if (updates.contributing_factors_list !== undefined) rcaUpdates.contributing_factors = updates.contributing_factors_list;
      if (updates.immediate_cause !== undefined) rcaUpdates.immediate_causes = [updates.immediate_cause];
      if (updates.underlying_cause !== undefined) rcaUpdates.underlying_causes = [updates.underlying_cause];

      const { error: rcaError } = await supabase
        .from('incident_rca')
        .upsert(rcaUpdates, { onConflict: 'incident_id' });

      if (rcaError) throw rcaError;

      // Log audit entry
      await supabase.from('incident_audit_logs').insert({
        incident_id: incidentId,
        tenant_id: profile.tenant_id,
        actor_id: user.id,
        action: 'investigation_updated',
        new_value: updates as unknown as Json,
      });

      return data;
    },
    onSuccess: (_, { incidentId }) => {
      queryClient.invalidateQueries({ queryKey: ['investigation', incidentId] });
      toast.success(t('investigation.updated', 'Investigation updated'));
    },
    onError: (error) => {
      toast.error(t('common.error', 'Error: ') + error.message);
    },
  });
}

export function useLockRCA() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ incidentId }: { incidentId: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('lock_rca', {
        p_incident_id: incidentId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { incidentId }) => {
      queryClient.invalidateQueries({ queryKey: ['investigation', incidentId] });
      // Also invalidate closure checks if any
      queryClient.invalidateQueries({ queryKey: ['incident-closure-check', incidentId] });
      toast.success(t('investigation.rca.locked', 'RCA Locked successfully'));
    },
    onError: (error) => {
      toast.error(t('common.error', 'Error: ') + error.message);
    },
  });
}

// Corrective Actions Hooks
export function useCorrectiveActions(incidentId: string | null) {
  return useQuery({
    queryKey: ['corrective-actions', incidentId],
    queryFn: async () => {
      if (!incidentId) return [];
      
      const { data, error } = await supabase
        .from('corrective_actions')
        .select(`
          id, reference_id, title, description, status, priority, action_type,
          due_date, start_date, assigned_to, responsible_department_id,
          category, linked_root_cause_id, linked_cause_type, deleted_at,
          incident_id, tenant_id, created_at, completed_date,
          verified_by, verified_at, verification_notes,
          rejected_by, rejected_at, rejection_notes,
          assignee:profiles!assigned_to(id, full_name, job_title),
          department:departments!responsible_department_id(id, name)
        `)
        .eq('incident_id', incidentId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CorrectiveAction[];
    },
    enabled: !!incidentId,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateCorrectiveAction() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (action: {
      incident_id: string;
      title: string;
      description?: string;
      assigned_to?: string;
      responsible_department_id?: string;
      start_date?: string;
      due_date?: string;
      priority?: string;
      action_type?: string;
      category?: string;
      linked_root_cause_id?: string;
      linked_cause_type?: string;
    }) => {
      if (!profile?.tenant_id || !user?.id) {
        throw new Error('User not authenticated');
      }

      // Fetch incident's branch_id and event_type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: incident } = await supabase
        .from('incidents')
        .select('branch_id, event_type')
        .eq('id', action.incident_id)
        .single();

      const { data, error } = await supabase
        .from('corrective_actions')
        .insert({
          ...action,
          tenant_id: profile.tenant_id,
          branch_id: incident?.branch_id || null,
          status: 'assigned',
        })
        .select()
        .single();

      if (error) throw error;

      // Log audit entry
      await supabase.from('incident_audit_logs').insert({
        incident_id: action.incident_id,
        tenant_id: profile.tenant_id,
        actor_id: user.id,
        action: 'action_created',
        new_value: { action_id: data.id, title: action.title },
      });

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['corrective-actions', data.incident_id] });
      toast.success(t('investigation.actions.created', 'Action created. Notification will be sent upon investigation release.'));
    },
    onError: (error) => {
      toast.error(t('common.error', 'Error: ') + error.message);
    },
  });
}

export function useUpdateCorrectiveAction() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ 
      id, 
      incidentId,
      updates 
    }: { 
      id: string; 
      incidentId: string;
      updates: Partial<CorrectiveAction> 
    }) => {
      if (!profile?.tenant_id || !user?.id) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('corrective_actions')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log audit entry
      await supabase.from('incident_audit_logs').insert({
        incident_id: incidentId,
        tenant_id: profile.tenant_id,
        actor_id: user.id,
        action: 'action_updated',
        new_value: updates as unknown as Json,
      });

      return data;
    },
    onSuccess: (_, { incidentId }) => {
      queryClient.invalidateQueries({ queryKey: ['corrective-actions', incidentId] });
      toast.success(t('investigation.actions.updated', 'Action updated'));
    },
    onError: (error) => {
      toast.error(t('common.error', 'Error: ') + error.message);
    },
  });
}

// Verify Corrective Action Hook
export function useVerifyCorrectiveAction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (input: {
      actionId: string;
      incidentId: string;
      verification_notes?: string;
      approved: boolean;
    }) => {
      if (!user?.id) throw new Error('No user');

      const updateData = input.approved
        ? {
            status: 'closed',
            verified_by: user.id,
            verified_at: new Date().toISOString(),
            verification_notes: input.verification_notes,
          }
        : {
            status: 'returned_for_correction',
            rejected_by: user.id,
            rejected_at: new Date().toISOString(),
            rejection_notes: input.verification_notes,
            last_return_reason: input.verification_notes,
          };

      const { error } = await supabase
        .from('corrective_actions')
        .update(updateData)
        .eq('id', input.actionId);

      if (error) throw error;

      // If approved (closed), trigger the auto-closure check for the incident
      // Note: The database trigger 'trigger_check_auto_final_closure' handles this automatically
      // when status changes to 'closed'. We don't need to do anything extra here.
    },
    onSuccess: (_, { incidentId, approved }) => {
      queryClient.invalidateQueries({ queryKey: ['corrective-actions', incidentId] });
      // Invalidate incident query to reflect potential status change (auto-closure)
      queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });

      const message = approved
        ? t('investigation.actions.verified', 'Action verified and closed')
        : t('investigation.actions.returned', 'Action returned for correction');
      toast.success(message);
    },
    onError: (error) => {
      toast.error(t('common.error', 'Error: ') + error.message);
    },
  });
}

// Delete Corrective Action Hook
export function useDeleteCorrectiveAction() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id, incidentId }: { id: string; incidentId: string }) => {
      // Use SECURITY DEFINER RPC function to bypass RLS
      const { data, error } = await supabase.rpc('soft_delete_corrective_action', {
        p_action_id: id,
      });

      if (error) throw error;

      return { id, incidentId };
    },
    onSuccess: (_, { incidentId }) => {
      queryClient.invalidateQueries({ queryKey: ['corrective-actions', incidentId] });
      toast.success(t('investigation.actions.deleted', 'Action deleted'));
    },
    onError: (error) => {
      toast.error(t('common.error', 'Error: ') + error.message);
    },
  });
}

// Submit Investigation Hook
export function useSubmitInvestigation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ incidentId }: { incidentId: string }) => {
      // Get fresh auth state
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) throw new Error('No tenant found');

      // Update incident status to pending_closure and set submitted timestamp
      // Cast to any to handle enum type mismatch
      const { error: updateError } = await supabase
        .from('incidents')
        .update({
          status: 'pending_closure' as unknown as string,
          closure_requested_by: user.id,
          closure_requested_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .eq('id', incidentId);

      if (updateError) throw updateError;

      // Log audit entry
      await supabase.from('incident_audit_logs').insert({
        incident_id: incidentId,
        tenant_id: profile.tenant_id,
        actor_id: user.id,
        action: 'investigation_submitted',
        new_value: { submitted_at: new Date().toISOString() },
      });

      // Send notifications to all action assignees
      try {
        await supabase.functions.invoke('send-investigation-submitted', {
          body: { incident_id: incidentId },
        });
      } catch (notifyError) {
        console.error('Failed to send investigation submitted notifications:', notifyError);
      }

      return { incidentId };
    },
    onSuccess: (_, { incidentId }) => {
      queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast.success(t('investigation.submit.success', 'Investigation submitted for review'));
    },
    onError: (error) => {
      toast.error(t('common.error', 'Error: ') + error.message);
    },
  });
}

// Audit Logs Hook
export function useIncidentAuditLogs(incidentId: string | null) {
  return useQuery({
    queryKey: ['incident-audit-logs', incidentId],
    queryFn: async () => {
      if (!incidentId) return [];
      
      const { data, error } = await supabase
        .from('incident_audit_logs')
        .select('*')
        .eq('incident_id', incidentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as IncidentAuditLog[];
    },
    enabled: !!incidentId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}
