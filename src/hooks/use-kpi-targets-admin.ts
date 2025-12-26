import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export interface KPITargetAdmin {
  id: string;
  kpi_code: string;
  target_value: number;
  warning_threshold: number | null;
  critical_threshold: number | null;
  comparison_type?: 'less_than' | 'greater_than';
  description?: string | null;
  is_active?: boolean;
}

export interface KPIAuditLog {
  id: string;
  kpi_code: string;
  action_type: 'created' | 'updated' | 'deleted';
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  changed_by: string | null;
  changed_at: string;
  notes: string | null;
}

// KPI metadata - stored client-side since schema doesn't have these columns
export const KPI_METADATA: Record<string, { name: string; nameAr: string; comparison_type: 'less_than' | 'greater_than'; description: string }> = {
  trir: { 
    name: 'TRIR', 
    nameAr: 'معدل الحوادث القابلة للتسجيل',
    comparison_type: 'less_than', 
    description: 'Total recordable incidents per 200,000 man-hours' 
  },
  ltifr: { 
    name: 'LTIFR', 
    nameAr: 'معدل إصابات العمل المفقود',
    comparison_type: 'less_than', 
    description: 'Lost time injuries per 1,000,000 man-hours' 
  },
  dart_rate: { 
    name: 'DART Rate', 
    nameAr: 'معدل أيام العمل المفقودة',
    comparison_type: 'less_than', 
    description: 'Days away from work cases per 200,000 man-hours' 
  },
  fatality_rate: { 
    name: 'Fatality Rate', 
    nameAr: 'معدل الوفيات',
    comparison_type: 'less_than', 
    description: 'Fatalities per 200,000 man-hours' 
  },
  severity_rate: { 
    name: 'Severity Rate', 
    nameAr: 'معدل الخطورة',
    comparison_type: 'less_than', 
    description: 'Average lost days per recordable incident' 
  },
  near_miss_rate: { 
    name: 'Near Miss Rate', 
    nameAr: 'معدل الحوادث الوشيكة',
    comparison_type: 'greater_than', 
    description: 'Near misses per 200,000 man-hours (higher is better - indicates reporting culture)' 
  },
  action_closure_pct: { 
    name: 'Action Closure %', 
    nameAr: 'نسبة إغلاق الإجراءات',
    comparison_type: 'greater_than', 
    description: 'Percentage of corrective actions closed on time' 
  },
  observation_completion_pct: { 
    name: 'Observation Completion %', 
    nameAr: 'نسبة اكتمال الملاحظات',
    comparison_type: 'greater_than', 
    description: 'Percentage of observations resolved' 
  },
};

export const AVAILABLE_KPI_CODES = Object.keys(KPI_METADATA);

export function useKPITargetsAdmin() {
  return useQuery({
    queryKey: ['kpi-targets-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kpi_targets')
        .select('id, kpi_code, target_value, warning_threshold, critical_threshold')
        .is('deleted_at', null)
        .order('kpi_code');

      if (error) throw error;
      return (data ?? []) as KPITargetAdmin[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useKPIAuditLogs(kpiCode?: string) {
  return useQuery({
    queryKey: ['kpi-audit-logs', kpiCode],
    queryFn: async () => {
      let query = supabase
        .from('kpi_audit_logs')
        .select('id, kpi_code, action_type, old_value, new_value, changed_by, changed_at, notes')
        .is('deleted_at', null)
        .order('changed_at', { ascending: false })
        .limit(100);

      if (kpiCode) {
        query = query.eq('kpi_code', kpiCode);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as KPIAuditLog[];
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateKPITarget() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      kpi_code,
      target_value,
      warning_threshold,
      critical_threshold,
    }: {
      kpi_code: string;
      target_value: number;
      warning_threshold: number;
      critical_threshold: number;
    }) => {
      // Get user's tenant_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) throw new Error('No tenant found');

      const { data, error } = await supabase
        .from('kpi_targets')
        .insert({
          tenant_id: profile.tenant_id,
          kpi_code,
          target_value,
          warning_threshold,
          critical_threshold,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-targets-admin'] });
      queryClient.invalidateQueries({ queryKey: ['kpi-targets'] });
      queryClient.invalidateQueries({ queryKey: ['kpi-audit-logs'] });
      toast.success(t('kpiAdmin.createSuccess', 'KPI target created successfully'));
    },
    onError: (error) => {
      toast.error(t('kpiAdmin.createError', 'Failed to create KPI target'));
      console.error('KPI create error:', error);
    },
  });
}

export function useUpdateKPITarget() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      id,
      target_value,
      warning_threshold,
      critical_threshold,
    }: {
      id: string;
      target_value: number;
      warning_threshold: number;
      critical_threshold: number;
    }) => {
      const { data, error } = await supabase
        .from('kpi_targets')
        .update({
          target_value,
          warning_threshold,
          critical_threshold,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-targets-admin'] });
      queryClient.invalidateQueries({ queryKey: ['kpi-targets'] });
      queryClient.invalidateQueries({ queryKey: ['kpi-audit-logs'] });
      toast.success(t('kpiAdmin.saveSuccess', 'KPI target updated successfully'));
    },
    onError: (error) => {
      toast.error(t('kpiAdmin.saveError', 'Failed to update KPI target'));
      console.error('KPI update error:', error);
    },
  });
}

export function useDeleteKPITarget() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete
      const { data, error } = await supabase
        .from('kpi_targets')
        .update({
          deleted_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-targets-admin'] });
      queryClient.invalidateQueries({ queryKey: ['kpi-targets'] });
      queryClient.invalidateQueries({ queryKey: ['kpi-audit-logs'] });
      toast.success(t('kpiAdmin.deleteSuccess', 'KPI target deleted successfully'));
    },
    onError: (error) => {
      toast.error(t('kpiAdmin.deleteError', 'Failed to delete KPI target'));
      console.error('KPI delete error:', error);
    },
  });
}

export function useSeedDefaultTargets() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async () => {
      // Get user's tenant_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) throw new Error('No tenant found');

      const { error } = await supabase.rpc('seed_default_kpi_targets', {
        p_tenant_id: profile.tenant_id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-targets-admin'] });
      queryClient.invalidateQueries({ queryKey: ['kpi-targets'] });
      toast.success(t('kpiAdmin.seedSuccess', 'Default KPI targets created successfully'));
    },
    onError: (error) => {
      toast.error(t('kpiAdmin.seedError', 'Failed to create default targets'));
      console.error('KPI seed error:', error);
    },
  });
}
