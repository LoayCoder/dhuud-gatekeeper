import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { 
  PropertyTypeCode, 
  DamageSeverityCode, 
  OperationalImpactCode, 
  RepairStatusCode 
} from '@/lib/property-damage-constants';

export interface IncidentPropertyDamage {
  id: string;
  tenant_id: string;
  incident_id: string;
  property_name: string;
  property_type: PropertyTypeCode | null;
  asset_tag: string | null;
  location_description: string | null;
  damage_date: string | null;
  damage_description: string | null;
  damage_severity: DamageSeverityCode | null;
  repair_cost_estimate: number | null;
  replacement_cost_estimate: number | null;
  cost_currency: string;
  cost_assessment_by: string | null;
  cost_assessment_date: string | null;
  operational_impact: OperationalImpactCode | null;
  downtime_hours: number;
  safety_hazard_created: boolean;
  safety_hazard_description: string | null;
  repair_status: RepairStatusCode;
  repair_completed_date: string | null;
  actual_repair_cost: number | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joined data
  recorded_by_profile?: {
    full_name: string | null;
  };
}

export interface CreateIncidentPropertyDamageInput {
  incident_id: string;
  property_name: string;
  property_type?: PropertyTypeCode | null;
  asset_tag?: string | null;
  location_description?: string | null;
  damage_date?: string | null;
  damage_description?: string | null;
  damage_severity?: DamageSeverityCode | null;
  repair_cost_estimate?: number | null;
  replacement_cost_estimate?: number | null;
  cost_currency?: string;
  cost_assessment_by?: string | null;
  cost_assessment_date?: string | null;
  operational_impact?: OperationalImpactCode | null;
  downtime_hours?: number;
  safety_hazard_created?: boolean;
  safety_hazard_description?: string | null;
  repair_status?: RepairStatusCode;
  repair_completed_date?: string | null;
  actual_repair_cost?: number | null;
}

export interface UpdateIncidentPropertyDamageInput extends Partial<Omit<CreateIncidentPropertyDamageInput, 'incident_id'>> {
  id: string;
}

/**
 * Fetch all property damages for an incident
 */
export function useIncidentPropertyDamages(incidentId: string | null) {
  return useQuery({
    queryKey: ['incident-property-damages', incidentId],
    queryFn: async () => {
      if (!incidentId) return [];

      const { data, error } = await supabase
        .from('incident_property_damages')
        .select(`
          *,
          recorded_by_profile:profiles!incident_property_damages_recorded_by_fkey(full_name)
        `)
        .eq('incident_id', incidentId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      return (data || []) as IncidentPropertyDamage[];
    },
    enabled: !!incidentId,
  });
}

/**
 * Create a new property damage record
 */
export function useCreateIncidentPropertyDamage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (input: CreateIncidentPropertyDamageInput) => {
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
        property_name: input.property_name,
        property_type: input.property_type,
        asset_tag: input.asset_tag,
        location_description: input.location_description,
        damage_date: input.damage_date,
        damage_description: input.damage_description,
        damage_severity: input.damage_severity,
        repair_cost_estimate: input.repair_cost_estimate,
        replacement_cost_estimate: input.replacement_cost_estimate,
        cost_currency: input.cost_currency || 'SAR',
        cost_assessment_by: input.cost_assessment_by,
        cost_assessment_date: input.cost_assessment_date,
        operational_impact: input.operational_impact,
        downtime_hours: input.downtime_hours || 0,
        safety_hazard_created: input.safety_hazard_created || false,
        safety_hazard_description: input.safety_hazard_description,
        repair_status: input.repair_status || 'pending',
        repair_completed_date: input.repair_completed_date,
        actual_repair_cost: input.actual_repair_cost,
        tenant_id: profile.tenant_id,
        recorded_by: user.id,
      };

      const { data, error } = await supabase
        .from('incident_property_damages')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incident-property-damages', variables.incident_id] });
      toast.success(t('investigation.propertyDamage.created', 'Property damage record created'));
    },
    onError: (error) => {
      console.error('Error creating property damage:', error);
      toast.error(t('common.error', 'An error occurred'));
    },
  });
}

/**
 * Update an existing property damage record
 */
export function useUpdateIncidentPropertyDamage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateIncidentPropertyDamageInput) => {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      
      if (updates.property_name !== undefined) updateData.property_name = updates.property_name;
      if (updates.property_type !== undefined) updateData.property_type = updates.property_type;
      if (updates.asset_tag !== undefined) updateData.asset_tag = updates.asset_tag;
      if (updates.location_description !== undefined) updateData.location_description = updates.location_description;
      if (updates.damage_date !== undefined) updateData.damage_date = updates.damage_date;
      if (updates.damage_description !== undefined) updateData.damage_description = updates.damage_description;
      if (updates.damage_severity !== undefined) updateData.damage_severity = updates.damage_severity;
      if (updates.repair_cost_estimate !== undefined) updateData.repair_cost_estimate = updates.repair_cost_estimate;
      if (updates.replacement_cost_estimate !== undefined) updateData.replacement_cost_estimate = updates.replacement_cost_estimate;
      if (updates.cost_currency !== undefined) updateData.cost_currency = updates.cost_currency;
      if (updates.cost_assessment_by !== undefined) updateData.cost_assessment_by = updates.cost_assessment_by;
      if (updates.cost_assessment_date !== undefined) updateData.cost_assessment_date = updates.cost_assessment_date;
      if (updates.operational_impact !== undefined) updateData.operational_impact = updates.operational_impact;
      if (updates.downtime_hours !== undefined) updateData.downtime_hours = updates.downtime_hours;
      if (updates.safety_hazard_created !== undefined) updateData.safety_hazard_created = updates.safety_hazard_created;
      if (updates.safety_hazard_description !== undefined) updateData.safety_hazard_description = updates.safety_hazard_description;
      if (updates.repair_status !== undefined) updateData.repair_status = updates.repair_status;
      if (updates.repair_completed_date !== undefined) updateData.repair_completed_date = updates.repair_completed_date;
      if (updates.actual_repair_cost !== undefined) updateData.actual_repair_cost = updates.actual_repair_cost;

      const { data, error } = await supabase
        .from('incident_property_damages')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['incident-property-damages', data.incident_id] });
      toast.success(t('investigation.propertyDamage.updated', 'Property damage record updated'));
    },
    onError: (error) => {
      console.error('Error updating property damage:', error);
      toast.error(t('common.error', 'An error occurred'));
    },
  });
}

/**
 * Soft delete a property damage record
 */
export function useDeleteIncidentPropertyDamage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id, incidentId }: { id: string; incidentId: string }) => {
      const { error } = await supabase
        .from('incident_property_damages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      return { id, incidentId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['incident-property-damages', data.incidentId] });
      toast.success(t('investigation.propertyDamage.deleted', 'Property damage record deleted'));
    },
    onError: (error) => {
      console.error('Error deleting property damage:', error);
      toast.error(t('common.error', 'An error occurred'));
    },
  });
}
