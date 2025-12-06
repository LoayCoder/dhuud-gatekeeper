import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { Database } from '@/integrations/supabase/types';

type MaintenanceSchedule = Database['public']['Tables']['asset_maintenance_schedules']['Row'];
type MaintenanceScheduleInsert = Database['public']['Tables']['asset_maintenance_schedules']['Insert'];
type MaintenanceScheduleUpdate = Database['public']['Tables']['asset_maintenance_schedules']['Update'];
type MaintenanceType = Database['public']['Enums']['maintenance_type'];
type MaintenanceFrequency = Database['public']['Enums']['maintenance_frequency'];

export interface MaintenanceScheduleWithAsset extends MaintenanceSchedule {
  asset?: {
    id: string;
    asset_code: string;
    name: string;
  } | null;
}

// Fetch maintenance schedules for a specific asset
export function useAssetMaintenanceSchedules(assetId: string | undefined) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['asset-maintenance', assetId],
    queryFn: async () => {
      if (!assetId || !profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from('asset_maintenance_schedules')
        .select('*')
        .eq('asset_id', assetId)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .order('next_due', { ascending: true });

      if (error) throw error;
      return data as MaintenanceSchedule[];
    },
    enabled: !!assetId && !!profile?.tenant_id,
  });
}

// Fetch all overdue maintenance tasks across all assets
export function useOverdueMaintenanceTasks() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['overdue-maintenance', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('asset_maintenance_schedules')
        .select(`
          id, schedule_type, frequency_type, frequency_value, next_due, description, vendor_name,
          asset:hsse_assets!asset_maintenance_schedules_asset_id_fkey(id, asset_code, name)
        `)
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .lt('next_due', today)
        .order('next_due', { ascending: true })
        .limit(20);

      if (error) throw error;
      return data as MaintenanceScheduleWithAsset[];
    },
    enabled: !!profile?.tenant_id,
  });
}

// Fetch upcoming maintenance tasks (next 30 days)
export function useUpcomingMaintenanceTasks(days: number = 30) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['upcoming-maintenance', profile?.tenant_id, days],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + days);

      const { data, error } = await supabase
        .from('asset_maintenance_schedules')
        .select(`
          id, schedule_type, frequency_type, frequency_value, next_due, description, vendor_name,
          asset:hsse_assets!asset_maintenance_schedules_asset_id_fkey(id, asset_code, name)
        `)
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .gte('next_due', today.toISOString().split('T')[0])
        .lte('next_due', futureDate.toISOString().split('T')[0])
        .order('next_due', { ascending: true })
        .limit(50);

      if (error) throw error;
      return data as MaintenanceScheduleWithAsset[];
    },
    enabled: !!profile?.tenant_id,
  });
}

// Create a new maintenance schedule
export function useCreateMaintenanceSchedule() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();

  return useMutation({
    mutationFn: async (schedule: Omit<MaintenanceScheduleInsert, 'tenant_id' | 'created_by'>) => {
      if (!profile?.tenant_id || !user?.id) throw new Error('No tenant or user');

      const { data, error } = await supabase
        .from('asset_maintenance_schedules')
        .insert({
          ...schedule,
          tenant_id: profile.tenant_id,
          created_by: user.id,
        })
        .select('id, asset_id')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['asset-maintenance', data.asset_id] });
      queryClient.invalidateQueries({ queryKey: ['overdue-maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-maintenance'] });
      toast.success(t('maintenance.createSuccess'));
    },
    onError: (error) => {
      console.error('Create maintenance schedule error:', error);
      toast.error(t('maintenance.createError'));
    },
  });
}

// Update an existing maintenance schedule
export function useUpdateMaintenanceSchedule() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: MaintenanceScheduleUpdate & { id: string }) => {
      if (!profile?.tenant_id) throw new Error('No tenant');

      const { data, error } = await supabase
        .from('asset_maintenance_schedules')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id)
        .select('id, asset_id')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['asset-maintenance', data.asset_id] });
      queryClient.invalidateQueries({ queryKey: ['overdue-maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-maintenance'] });
      toast.success(t('maintenance.updateSuccess'));
    },
    onError: (error) => {
      console.error('Update maintenance schedule error:', error);
      toast.error(t('maintenance.updateError'));
    },
  });
}

// Record maintenance completion (updates last_performed and calculates next_due)
export function useCompleteMaintenanceTask() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      id, 
      completedDate,
      notes 
    }: { 
      id: string; 
      completedDate: string;
      notes?: string;
    }) => {
      if (!profile?.tenant_id) throw new Error('No tenant');

      // First get the schedule to calculate next due date
      const { data: schedule, error: fetchError } = await supabase
        .from('asset_maintenance_schedules')
        .select('frequency_type, frequency_value')
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id)
        .single();

      if (fetchError) throw fetchError;

      // Calculate next due date based on frequency
      const completedDateObj = new Date(completedDate);
      let nextDue: Date;

      switch (schedule.frequency_type) {
        case 'daily':
          nextDue = new Date(completedDateObj);
          nextDue.setDate(nextDue.getDate() + (schedule.frequency_value || 1));
          break;
        case 'weekly':
          nextDue = new Date(completedDateObj);
          nextDue.setDate(nextDue.getDate() + (schedule.frequency_value || 1) * 7);
          break;
        case 'monthly':
          nextDue = new Date(completedDateObj);
          nextDue.setMonth(nextDue.getMonth() + (schedule.frequency_value || 1));
          break;
        case 'quarterly':
          nextDue = new Date(completedDateObj);
          nextDue.setMonth(nextDue.getMonth() + (schedule.frequency_value || 1) * 3);
          break;
        case 'semi_annually':
          nextDue = new Date(completedDateObj);
          nextDue.setMonth(nextDue.getMonth() + (schedule.frequency_value || 1) * 6);
          break;
        case 'annually':
          nextDue = new Date(completedDateObj);
          nextDue.setFullYear(nextDue.getFullYear() + (schedule.frequency_value || 1));
          break;
        default:
          nextDue = new Date(completedDateObj);
          nextDue.setMonth(nextDue.getMonth() + 1);
      }

      const { data, error } = await supabase
        .from('asset_maintenance_schedules')
        .update({
          last_performed: completedDate,
          next_due: nextDue.toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id)
        .select('id, asset_id')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['asset-maintenance', data.asset_id] });
      queryClient.invalidateQueries({ queryKey: ['overdue-maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-maintenance'] });
      toast.success(t('maintenance.completeSuccess'));
    },
    onError: (error) => {
      console.error('Complete maintenance error:', error);
      toast.error(t('maintenance.completeError'));
    },
  });
}

// Soft delete a maintenance schedule
export function useDeleteMaintenanceSchedule() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ id, assetId }: { id: string; assetId: string }) => {
      if (!profile?.tenant_id) throw new Error('No tenant');

      const { error } = await supabase
        .from('asset_maintenance_schedules')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id);

      if (error) throw error;
      return { assetId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['asset-maintenance', data.assetId] });
      queryClient.invalidateQueries({ queryKey: ['overdue-maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-maintenance'] });
      toast.success(t('maintenance.deleteSuccess'));
    },
    onError: (error) => {
      console.error('Delete maintenance schedule error:', error);
      toast.error(t('maintenance.deleteError'));
    },
  });
}

// Export types for use in components
export type { MaintenanceSchedule, MaintenanceScheduleInsert, MaintenanceType, MaintenanceFrequency };
