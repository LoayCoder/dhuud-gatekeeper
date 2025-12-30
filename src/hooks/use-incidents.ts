import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import type { Database } from '@/integrations/supabase/types';
import type { SeverityLevelV2 } from '@/lib/hsse-severity-levels';

type Incident = Database['public']['Tables']['incidents']['Row'];
type IncidentInsert = Database['public']['Tables']['incidents']['Insert'];

export interface ClosedOnSpotPayload {
  closed_on_spot: boolean;
  photo_paths?: string[];
}

export interface IncidentFormData {
  title: string;
  description: string;
  event_type: string;
  subtype?: string;
  occurred_at: string;
  location?: string;
  department?: string;
  // New 5-level severity system
  severity?: SeverityLevelV2;
  severity_override_reason?: string;
  erp_activated?: boolean;
  injury_classification?: string;
  risk_rating?: 'low' | 'medium' | 'high'; // For observations only
  immediate_actions?: string;
  closed_on_spot_data?: ClosedOnSpotPayload; // For observations closed on the spot
  has_injury: boolean;
  injury_details?: {
    count?: number;
    description?: string;
  };
  has_damage: boolean;
  damage_details?: {
    description?: string;
    estimated_cost?: number;
  };
  // Location fields
  site_id?: string;
  branch_id?: string;
  department_id?: string;
  latitude?: number;
  longitude?: number;
  // Location address fields (from reverse geocoding)
  location_country?: string;
  location_city?: string;
  location_district?: string;
  location_street?: string;
  location_formatted?: string;
  // Major event linkage
  special_event_id?: string;
  // Recognition fields for positive observations
  recognition_type?: 'individual' | 'department' | 'contractor';
  recognized_user_id?: string;
  recognized_contractor_worker_id?: string;
  // Report against contractor
  related_contractor_company_id?: string;
}

export function useCreateIncident() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: IncidentFormData) => {
      if (!profile?.tenant_id) {
        throw new Error('User tenant not found');
      }
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Determine if this is an observation (simplified workflow)
      const isObservation = data.event_type === 'observation';
      
      const insertData: IncidentInsert & { risk_rating?: string; severity_v2?: string; severity_override_reason?: string; erp_activated?: boolean } = {
        tenant_id: profile.tenant_id,
        reporter_id: user.id,
        title: data.title,
        description: data.description,
        event_type: data.event_type,
        subtype: data.subtype || null,
        occurred_at: data.occurred_at,
        location: data.location || null,
        department: data.department || null,
        // Keep old severity null for now, use severity_v2 for new system
        severity: null,
        immediate_actions: data.immediate_actions || null,
        // Observations don't have injury/damage details
        has_injury: isObservation ? false : data.has_injury,
        injury_details: isObservation ? null : (data.has_injury ? data.injury_details : null),
        has_damage: isObservation ? false : data.has_damage,
        damage_details: isObservation ? null : (data.has_damage ? data.damage_details : null),
        status: 'submitted',
        // Location fields
        site_id: data.site_id || null,
        branch_id: data.branch_id || null,
        department_id: data.department_id || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        // Major event linkage
        special_event_id: data.special_event_id || null,
      };

      // Add location address fields (cast to bypass type check until types regenerate)
      if (data.location_country) (insertData as Record<string, unknown>).location_country = data.location_country;
      if (data.location_city) (insertData as Record<string, unknown>).location_city = data.location_city;
      if (data.location_district) (insertData as Record<string, unknown>).location_district = data.location_district;
      if (data.location_street) (insertData as Record<string, unknown>).location_street = data.location_street;
      if (data.location_formatted) (insertData as Record<string, unknown>).location_formatted = data.location_formatted;
      
      // Add severity_v2 for BOTH incidents AND observations (unified 5-level system)
      if (data.severity) {
        (insertData as Record<string, unknown>).severity_v2 = data.severity;
        // Only incidents can have severity override reasons and ERP activation
        if (!isObservation) {
          if (data.severity_override_reason) {
            (insertData as Record<string, unknown>).severity_override_reason = data.severity_override_reason;
          }
          if (data.erp_activated !== undefined) {
            (insertData as Record<string, unknown>).erp_activated = data.erp_activated;
          }
        }
      }
      
      // Add risk_rating for observations (cast to any to bypass type check for new column)
      if (isObservation && data.risk_rating) {
        (insertData as Record<string, unknown>).risk_rating = data.risk_rating;
      }

      // Add closed_on_spot_data for observations marked as closed on the spot
      if (isObservation && data.closed_on_spot_data) {
        (insertData as Record<string, unknown>).immediate_actions_data = data.closed_on_spot_data;
        // Set status to 'closed' if closed on spot
        if (data.closed_on_spot_data.closed_on_spot) {
          insertData.status = 'closed';
        }
      }

      // Add recognition fields for positive observations
      if (isObservation && data.recognition_type) {
        (insertData as Record<string, unknown>).recognition_type = data.recognition_type;
        if (data.recognized_user_id) {
          (insertData as Record<string, unknown>).recognized_user_id = data.recognized_user_id;
        }
        if (data.recognized_contractor_worker_id) {
          (insertData as Record<string, unknown>).recognized_contractor_worker_id = data.recognized_contractor_worker_id;
        }
      }

      // Add related contractor company for negative observations
      if (isObservation && data.related_contractor_company_id) {
        (insertData as Record<string, unknown>).related_contractor_company_id = data.related_contractor_company_id;
      }

      const { data: incident, error } = await supabase
        .from('incidents')
        .insert(insertData)
        .select('id, reference_id')
        .single();

      if (error) throw error;
      return incident;
    },
    onSuccess: (incident) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast({
        title: t('incidents.successTitle'),
        description: t('incidents.successMessage', { referenceId: incident.reference_id }),
      });
      
      // Trigger matrix-based notification dispatcher (fire and forget)
      supabase.functions.invoke('dispatch-incident-notification', {
        body: { incident_id: incident.id, event_type: 'incident_created' }
      }).catch(err => console.warn('Failed to dispatch incident notification:', err));
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

export function useIncidents() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['incidents', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from('incidents')
        .select('id, reference_id, title, event_type, severity, severity_v2, status, occurred_at, created_at')
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(0, 99); // Limit to first 100 incidents for performance

      if (error) throw error;
      return data as Incident[];
    },
    enabled: !!profile?.tenant_id,
    staleTime: 2 * 60 * 1000, // 2 minutes before refetch
    gcTime: 10 * 60 * 1000, // 10 minutes in cache
  });
}

export interface IncidentWithDetails {
  id: string;
  reference_id: string | null;
  title: string;
  description: string;
  event_type: string;
  subtype: string | null;
  occurred_at: string | null;
  location: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical' | null;
  severity_v2: 'level_1' | 'level_2' | 'level_3' | 'level_4' | 'level_5' | null;
  original_severity_v2: 'level_1' | 'level_2' | 'level_3' | 'level_4' | 'level_5' | null;
  severity_override_reason: string | null;
  status: 'submitted' | 'pending_review' | 'investigation_pending' | 'investigation_in_progress' | 'closed' | null;
  immediate_actions: string | null;
  has_injury: boolean | null;
  injury_details: Record<string, unknown> | null;
  has_damage: boolean | null;
  damage_details: Record<string, unknown> | null;
  latitude: number | null;
  longitude: number | null;
  // Location address fields (from reverse geocoding)
  location_country: string | null;
  location_city: string | null;
  location_district: string | null;
  location_street: string | null;
  location_formatted: string | null;
  media_attachments: unknown[] | null;
  ai_analysis_result: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
  tenant_id: string;
  reporter_id: string | null;
  branch_id: string | null;
  site_id: string | null;
  department_id: string | null;
  special_event_id: string | null;
  // Approval workflow fields
  approved_by: string | null;
  approved_at: string | null;
  approval_notes: string | null;
  investigation_locked: boolean | null;
  // Severity tracking fields (Actual)
  original_severity: 'low' | 'medium' | 'high' | 'critical' | null;
  severity_change_justification: string | null;
  severity_approved_by: string | null;
  severity_approved_at: string | null;
  severity_pending_approval: boolean | null;
  // Potential severity tracking fields
  potential_severity_v2: 'level_1' | 'level_2' | 'level_3' | 'level_4' | 'level_5' | null;
  original_potential_severity_v2: 'level_1' | 'level_2' | 'level_3' | 'level_4' | 'level_5' | null;
  potential_severity_pending_approval: boolean | null;
  potential_severity_justification: string | null;
  potential_severity_approved_by: string | null;
  potential_severity_approved_at: string | null;
  // Closure request fields
  closure_requested_by: string | null;
  closure_requested_at: string | null;
  closure_request_notes: string | null;
  // Joined relations
  reporter?: { id: string; full_name: string | null } | null;
  closure_requester?: { id: string; full_name: string | null } | null;
  branch?: { id: string; name: string } | null;
  site?: { id: string; name: string } | null;
  department_info?: { id: string; name: string } | null;
  special_event?: { id: string; name: string } | null;
}

export function useIncident(id: string | undefined) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['incident', id],
    queryFn: async () => {
      if (!id || !profile?.tenant_id) return null;

      const { data, error } = await supabase
        .from('incidents')
        .select(`
          id, reference_id, title, description, event_type, subtype, 
          occurred_at, location, severity, severity_v2, original_severity_v2, severity_override_reason, 
          potential_severity_v2, original_potential_severity_v2, potential_severity_pending_approval,
          potential_severity_justification, potential_severity_approved_by, potential_severity_approved_at,
          status, immediate_actions,
          has_injury, injury_details, has_damage, damage_details,
          latitude, longitude, 
          location_country, location_city, location_district, location_street, location_formatted,
          media_attachments, ai_analysis_result,
          created_at, updated_at, tenant_id, reporter_id,
          branch_id, site_id, department_id, special_event_id,
          closure_requested_by, closure_requested_at, closure_request_notes,
          reporter:profiles!incidents_reporter_id_fkey(id, full_name),
          closure_requester:profiles!incidents_closure_requested_by_fkey(id, full_name),
          branch:branches!incidents_branch_id_fkey(id, name),
          site:sites!incidents_site_id_fkey(id, name),
          department_info:departments!incidents_department_id_fkey(id, name),
          special_event:special_events!incidents_special_event_id_fkey(id, name)
        `)
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      
      // Cast and add new fields that may not be in types yet
      const extended = data as unknown as Record<string, unknown>;
      return {
        ...data,
        severity_v2: extended.severity_v2 ?? null,
        original_severity_v2: extended.original_severity_v2 ?? null,
        severity_override_reason: extended.severity_override_reason ?? null,
        approved_by: extended.approved_by ?? null,
        approved_at: extended.approved_at ?? null,
        approval_notes: extended.approval_notes ?? null,
        investigation_locked: extended.investigation_locked ?? false,
        original_severity: extended.original_severity ?? null,
        severity_change_justification: extended.severity_change_justification ?? null,
        severity_approved_by: extended.severity_approved_by ?? null,
        severity_approved_at: extended.severity_approved_at ?? null,
        severity_pending_approval: extended.severity_pending_approval ?? false,
        // Potential severity fields
        potential_severity_v2: extended.potential_severity_v2 ?? null,
        original_potential_severity_v2: extended.original_potential_severity_v2 ?? null,
        potential_severity_pending_approval: extended.potential_severity_pending_approval ?? false,
        potential_severity_justification: extended.potential_severity_justification ?? null,
        potential_severity_approved_by: extended.potential_severity_approved_by ?? null,
        potential_severity_approved_at: extended.potential_severity_approved_at ?? null,
        // Closure fields
        closure_requested_by: extended.closure_requested_by ?? null,
        closure_requested_at: extended.closure_requested_at ?? null,
        closure_request_notes: extended.closure_request_notes ?? null,
        closure_requester: (data as Record<string, unknown>).closure_requester ?? null,
        // Location address fields
        location_country: extended.location_country ?? null,
        location_city: extended.location_city ?? null,
        location_district: extended.location_district ?? null,
        location_street: extended.location_street ?? null,
        location_formatted: extended.location_formatted ?? null,
      } as IncidentWithDetails;
    },
    enabled: !!id && !!profile?.tenant_id,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes in cache
  });
}

// Hook to get corrective actions assigned to the current user (only released actions)
export function useMyCorrectiveActions() {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['my-corrective-actions', user?.id],
    queryFn: async () => {
      if (!user?.id || !profile?.tenant_id) return [];

      // Only show actions that have been released (investigation approved by HSSE Manager)
      const { data, error } = await supabase
        .from('corrective_actions')
        .select(`
          id, reference_id, title, description, status, priority, due_date, incident_id, 
          created_at, completed_date, released_at, return_count,
          rejection_notes, last_return_reason, rejected_at,
          rejected_by_profile:profiles!corrective_actions_rejected_by_fkey(id, full_name)
        `)
        .eq('assigned_to', user.id)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .not('released_at', 'is', null) // Only show released actions
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!profile?.tenant_id,
  });
}

// Hook to update action status (for assigned users) with enhanced workflow and optimistic updates
export function useUpdateMyActionStatus() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      status,
      progressNotes,
      completionNotes,
      overdueJustification,
    }: { 
      id: string; 
      status: string;
      progressNotes?: string;
      completionNotes?: string;
      overdueJustification?: string;
    }) => {
      const updateData: Record<string, unknown> = { status };
      
      // If starting work, set started_at and progress notes
      if (status === 'in_progress') {
        updateData.started_at = new Date().toISOString();
        if (progressNotes) {
          updateData.progress_notes = progressNotes;
        }
      }
      
      // If marking as completed, set completion data
      if (status === 'completed') {
        updateData.completed_date = new Date().toISOString().split('T')[0];
        if (completionNotes) {
          updateData.completion_notes = completionNotes;
        }
        if (overdueJustification) {
          updateData.overdue_justification = overdueJustification;
        }
      }

      const { error } = await supabase
        .from('corrective_actions')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      return { id, status };
    },
    // Optimistic update: immediately reflect the new status in the UI
    onMutate: async ({ id, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['my-corrective-actions', user?.id] });

      // Snapshot the previous value
      const previousActions = queryClient.getQueryData(['my-corrective-actions', user?.id]);

      // Optimistically update to the new status
      queryClient.setQueryData(['my-corrective-actions', user?.id], (old: unknown[]) =>
        old?.map((action: Record<string, unknown>) =>
          action.id === id 
            ? { 
                ...action, 
                status,
                ...(status === 'in_progress' ? { started_at: new Date().toISOString() } : {}),
                ...(status === 'completed' ? { completed_date: new Date().toISOString().split('T')[0] } : {}),
              } 
            : action
        )
      );

      // Return context with the previous value for rollback
      return { previousActions };
    },
    // If mutation fails, rollback to the previous value
    onError: (error, _variables, context) => {
      if (context?.previousActions) {
        queryClient.setQueryData(['my-corrective-actions', user?.id], context.previousActions);
      }
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
    // Always refetch after error or success to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['my-corrective-actions'] });
      queryClient.invalidateQueries({ queryKey: ['corrective-actions'] });
      queryClient.invalidateQueries({ queryKey: ['pending-action-approvals'] });
    },
    onSuccess: () => {
      toast({
        title: t('common.success'),
        description: t('investigation.actionStatusUpdated'),
      });
    },
  });
}

// Hook to update incident status (for HSSE/admin users)
export function useUpdateIncidentStatus() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Database['public']['Enums']['incident_status'] }) => {
      const { error } = await supabase
        .from('incidents')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });
      toast({
        title: t('common.success'),
        description: t('incidents.statusUpdated'),
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

// Hook to soft-delete incident (admin only, non-closed incidents)
export function useDeleteIncident() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Use RPC function that bypasses RLS with proper security checks
      const { error } = await supabase
        .rpc('soft_delete_incident', { p_incident_id: id });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast({
        title: t('common.success'),
        description: t('incidents.deleteSuccess'),
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
