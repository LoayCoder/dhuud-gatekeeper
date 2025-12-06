import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { Json } from "@/integrations/supabase/types";

// Types
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
  tenant_id: string;
  created_at: string;
  updated_at: string;
  // Investigator assignment fields
  assigned_by: string | null;
  assignment_date: string | null;
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
  due_date: string | null;
  priority: string | null;
  status: string | null;
  action_type: string | null;
  completed_date: string | null;
  verified_by: string | null;
  verified_at: string | null;
  verification_notes: string | null;
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
      
      return {
        ...data,
        five_whys: parsedWhys,
        // New fields - may not exist in types yet
        assigned_by: (data as Record<string, unknown>).assigned_by as string | null ?? null,
        assignment_date: (data as Record<string, unknown>).assignment_date as string | null ?? null,
        assignment_notes: (data as Record<string, unknown>).assignment_notes as string | null ?? null,
      } as Investigation;
    },
    enabled: !!incidentId,
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

      // Convert five_whys to Json type for database
      const dbUpdates = {
        ...updates,
        five_whys: updates.five_whys as unknown as Json,
        updated_at: new Date().toISOString(),
      };

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
      due_date?: string;
      priority?: string;
      action_type?: string;
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
  });
}
