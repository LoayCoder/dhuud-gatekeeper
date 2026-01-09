import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { BodyDiagramData } from '@/lib/body-parts-constants';

export interface IncidentInjury {
  id: string;
  tenant_id: string;
  incident_id: string;
  injured_person_name: string;
  national_id: string | null;
  is_platform_user: boolean;
  linked_user_id: string | null;
  linked_contractor_worker_id: string | null;
  injury_date: string | null;
  injury_severity: 'minor' | 'moderate' | 'severe' | 'critical' | null;
  injury_type: string[] | null;
  injury_description: string | null;
  body_parts_affected: string[] | null;
  body_diagram_data: BodyDiagramData;
  first_aid_provided: boolean;
  first_aid_description: string | null;
  medical_attention_required: boolean;
  hospitalized: boolean;
  days_lost: number;
  restricted_duty_days: number;
  recorded_by: string | null;
  recorder_role: 'investigator' | 'medical_staff' | 'first_aider' | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joined data
  recorded_by_profile?: {
    full_name: string | null;
  };
  linked_user?: {
    full_name: string | null;
    national_id: string | null;
  };
  linked_contractor_worker?: {
    full_name: string | null;
    national_id: string | null;
  };
}

export interface CreateIncidentInjuryInput {
  incident_id: string;
  injured_person_name: string;
  national_id?: string | null;
  is_platform_user?: boolean;
  linked_user_id?: string | null;
  linked_contractor_worker_id?: string | null;
  injury_date?: string | null;
  injury_severity?: 'minor' | 'moderate' | 'severe' | 'critical' | null;
  injury_type?: string[] | null;
  injury_description?: string | null;
  body_parts_affected?: string[] | null;
  body_diagram_data?: BodyDiagramData;
  first_aid_provided?: boolean;
  first_aid_description?: string | null;
  medical_attention_required?: boolean;
  hospitalized?: boolean;
  days_lost?: number;
  restricted_duty_days?: number;
  recorder_role?: 'investigator' | 'medical_staff' | 'first_aider' | null;
}

export interface UpdateIncidentInjuryInput extends Partial<Omit<CreateIncidentInjuryInput, 'incident_id'>> {
  id: string;
}

/**
 * Fetch all injuries for an incident
 */
export function useIncidentInjuries(incidentId: string | null) {
  return useQuery({
    queryKey: ['incident-injuries', incidentId],
    queryFn: async () => {
      if (!incidentId) return [];

      const { data, error } = await supabase
        .from('incident_injuries')
        .select(`
          *,
          recorded_by_profile:profiles!incident_injuries_recorded_by_fkey(full_name)
        `)
        .eq('incident_id', incidentId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Transform body_diagram_data from Json to typed object
      return (data || []).map(injury => ({
        ...injury,
        body_diagram_data: (injury.body_diagram_data as unknown as BodyDiagramData) || {
          front: [],
          back: [],
          left: [],
          right: [],
        },
        linked_user: null,
        linked_contractor_worker: null,
      })) as IncidentInjury[];
    },
    enabled: !!incidentId,
  });
}

/**
 * Create a new injury record
 */
export function useCreateIncidentInjury() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (input: CreateIncidentInjuryInput) => {
      // Get current user for recorded_by and tenant_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) throw new Error('No tenant found');

      const insertData = {
        incident_id: input.incident_id,
        injured_person_name: input.injured_person_name,
        national_id: input.national_id,
        is_platform_user: input.is_platform_user,
        linked_user_id: input.linked_user_id,
        linked_contractor_worker_id: input.linked_contractor_worker_id,
        injury_date: input.injury_date,
        injury_severity: input.injury_severity,
        injury_type: input.injury_type,
        injury_description: input.injury_description,
        body_parts_affected: input.body_parts_affected,
        body_diagram_data: input.body_diagram_data as unknown as Record<string, unknown>,
        first_aid_provided: input.first_aid_provided,
        first_aid_description: input.first_aid_description,
        medical_attention_required: input.medical_attention_required,
        hospitalized: input.hospitalized,
        days_lost: input.days_lost,
        restricted_duty_days: input.restricted_duty_days,
        recorder_role: input.recorder_role,
        tenant_id: profile.tenant_id,
        recorded_by: user.id,
      };

      const { data, error } = await supabase
        .from('incident_injuries')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incident-injuries', variables.incident_id] });
      toast.success(t('investigation.injuries.created', 'Injury record created'));
    },
    onError: (error) => {
      console.error('Error creating injury:', error);
      toast.error(t('common.error', 'An error occurred'));
    },
  });
}

/**
 * Update an existing injury record
 */
export function useUpdateIncidentInjury() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateIncidentInjuryInput) => {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      
      if (updates.injured_person_name !== undefined) updateData.injured_person_name = updates.injured_person_name;
      if (updates.national_id !== undefined) updateData.national_id = updates.national_id;
      if (updates.is_platform_user !== undefined) updateData.is_platform_user = updates.is_platform_user;
      if (updates.linked_user_id !== undefined) updateData.linked_user_id = updates.linked_user_id;
      if (updates.linked_contractor_worker_id !== undefined) updateData.linked_contractor_worker_id = updates.linked_contractor_worker_id;
      if (updates.injury_date !== undefined) updateData.injury_date = updates.injury_date;
      if (updates.injury_severity !== undefined) updateData.injury_severity = updates.injury_severity;
      if (updates.injury_type !== undefined) updateData.injury_type = updates.injury_type;
      if (updates.injury_description !== undefined) updateData.injury_description = updates.injury_description;
      if (updates.body_parts_affected !== undefined) updateData.body_parts_affected = updates.body_parts_affected;
      if (updates.body_diagram_data !== undefined) updateData.body_diagram_data = updates.body_diagram_data as unknown as Record<string, unknown>;
      if (updates.first_aid_provided !== undefined) updateData.first_aid_provided = updates.first_aid_provided;
      if (updates.first_aid_description !== undefined) updateData.first_aid_description = updates.first_aid_description;
      if (updates.medical_attention_required !== undefined) updateData.medical_attention_required = updates.medical_attention_required;
      if (updates.hospitalized !== undefined) updateData.hospitalized = updates.hospitalized;
      if (updates.days_lost !== undefined) updateData.days_lost = updates.days_lost;
      if (updates.restricted_duty_days !== undefined) updateData.restricted_duty_days = updates.restricted_duty_days;
      if (updates.recorder_role !== undefined) updateData.recorder_role = updates.recorder_role;

      const { data, error } = await supabase
        .from('incident_injuries')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['incident-injuries', data.incident_id] });
      toast.success(t('investigation.injuries.updated', 'Injury record updated'));
    },
    onError: (error) => {
      console.error('Error updating injury:', error);
      toast.error(t('common.error', 'An error occurred'));
    },
  });
}

/**
 * Soft delete an injury record
 */
export function useDeleteIncidentInjury() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id, incidentId }: { id: string; incidentId: string }) => {
      const { error } = await supabase
        .from('incident_injuries')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      return { id, incidentId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['incident-injuries', data.incidentId] });
      toast.success(t('investigation.injuries.deleted', 'Injury record deleted'));
    },
    onError: (error) => {
      console.error('Error deleting injury:', error);
      toast.error(t('common.error', 'An error occurred'));
    },
  });
}
