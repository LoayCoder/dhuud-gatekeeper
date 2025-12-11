import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { Json } from "@/integrations/supabase/types";

// Types
export interface RootCauseEntry {
  id: string;
  text: string;
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
      
      const { data, error } = await supabase
        .from('investigations')
        .select('*')
        .eq('incident_id', incidentId)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) return null;
      
      // Parse five_whys from Json to typed array safely
      let parsedWhys: FiveWhyEntry[] = [];
      if (Array.isArray(data.five_whys)) {
        parsedWhys = (data.five_whys as unknown as FiveWhyEntry[]).filter(
          (item): item is FiveWhyEntry => 
            typeof item === 'object' && item !== null && 'why' in item && 'answer' in item
        );
      }

      // Parse root_causes from Json
      let parsedRootCauses: RootCauseEntry[] = [];
      if (Array.isArray(data.root_causes)) {
        parsedRootCauses = (data.root_causes as unknown as RootCauseEntry[]).filter(
          (item): item is RootCauseEntry => 
            typeof item === 'object' && item !== null && 'id' in item && 'text' in item
        );
      }

      // Parse contributing_factors_list from Json
      let parsedContributingFactors: ContributingFactorEntry[] = [];
      if (Array.isArray(data.contributing_factors_list)) {
        parsedContributingFactors = (data.contributing_factors_list as unknown as ContributingFactorEntry[]).filter(
          (item): item is ContributingFactorEntry => 
            typeof item === 'object' && item !== null && 'id' in item && 'text' in item
        );
      }
      
      return {
        id: data.id,
        incident_id: data.incident_id,
        investigator_id: data.investigator_id,
        started_at: data.started_at,
        completed_at: data.completed_at,
        immediate_cause: data.immediate_cause,
        underlying_cause: data.underlying_cause,
        root_cause: data.root_cause,
        contributing_factors: data.contributing_factors,
        findings_summary: data.findings_summary,
        five_whys: parsedWhys,
        root_causes: parsedRootCauses,
        contributing_factors_list: parsedContributingFactors,
        ai_summary: data.ai_summary ?? null,
        ai_summary_generated_at: data.ai_summary_generated_at ?? null,
        ai_summary_language: data.ai_summary_language ?? null,
        tenant_id: data.tenant_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
        assigned_by: data.assigned_by ?? null,
        assigned_at: data.assigned_at ?? null,
        assignment_notes: data.assignment_notes ?? null,
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

      // Convert typed arrays to Json for database
      const dbUpdates: Record<string, unknown> = {
        ...updates,
        updated_at: new Date().toISOString(),
      };
      
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

// Corrective Actions Hooks
export function useCorrectiveActions(incidentId: string | null) {
  return useQuery({
    queryKey: ['corrective-actions', incidentId],
    queryFn: async () => {
      if (!incidentId) return [];
      
      const { data, error } = await supabase
        .from('corrective_actions')
        .select('*')
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

      const { data, error } = await supabase
        .from('corrective_actions')
        .insert({
          ...action,
          tenant_id: profile.tenant_id,
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

      // Send email notification if assigned
      if (action.assigned_to) {
        try {
          const { data: assignee } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', action.assigned_to)
            .single();
          
          const { data: assigneeAuth } = await supabase.auth.admin.getUserById(action.assigned_to);
          
          if (assigneeAuth?.user?.email) {
            await supabase.functions.invoke('send-action-email', {
              body: {
                type: 'action_assigned',
                recipient_email: assigneeAuth.user.email,
                recipient_name: assignee?.full_name || 'Team Member',
                action_title: action.title,
                action_priority: action.priority,
                action_description: action.description,
                due_date: action.due_date,
                incident_reference: action.incident_id,
              },
            });
          }
        } catch (emailError) {
          console.error('Failed to send action assignment email:', emailError);
        }
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['corrective-actions', data.incident_id] });
      toast.success(t('investigation.actions.created', 'Action created'));
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

// Delete Corrective Action Hook
export function useDeleteCorrectiveAction() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id, incidentId }: { id: string; incidentId: string }) => {
      // Get fresh auth state
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) throw new Error('No tenant found');

      // Soft delete the action
      const { error } = await supabase
        .from('corrective_actions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      // Log audit entry
      await supabase.from('incident_audit_logs').insert({
        incident_id: incidentId,
        tenant_id: profile.tenant_id,
        actor_id: user.id,
        action: 'action_deleted',
        old_value: { action_id: id },
      });

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
