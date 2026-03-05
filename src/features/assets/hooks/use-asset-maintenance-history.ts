import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export interface MaintenanceHistoryEntry {
  id: string;
  tenant_id: string;
  asset_id: string;
  schedule_id?: string;
  maintenance_type: string;
  performed_date: string;
  performed_by?: string;
  planned_duration_hours?: number;
  actual_duration_hours?: number;
  cost?: number;
  currency: string;
  parts_used: unknown[];
  findings: Record<string, unknown>;
  notes?: string;
  condition_before?: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  condition_after?: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  failure_mode?: string;
  root_cause?: string;
  next_recommended_action?: string;
  was_unplanned: boolean;
  downtime_hours?: number;
  created_at: string;
}

export interface CreateMaintenanceHistoryInput {
  asset_id: string;
  schedule_id?: string;
  maintenance_type: string;
  performed_date: string;
  planned_duration_hours?: number;
  actual_duration_hours?: number;
  cost?: number;
  currency?: string;
  parts_used?: Array<{ name: string; quantity: number; cost?: number }>;
  findings?: Record<string, unknown>;
  notes?: string;
  condition_before?: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  condition_after?: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  failure_mode?: string;
  root_cause?: string;
  next_recommended_action?: string;
  was_unplanned?: boolean;
  downtime_hours?: number;
}

export function useAssetMaintenanceHistory(assetId: string | undefined) {
  return useQuery({
    queryKey: ['asset-maintenance-history', assetId],
    queryFn: async () => {
      if (!assetId) return [];
      
      const { data, error } = await supabase
        .from('asset_maintenance_history')
        .select(`
          *,
          performer:profiles!asset_maintenance_history_performed_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq('asset_id', assetId)
        .is('deleted_at', null)
        .order('performed_date', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
    enabled: !!assetId,
  });
}

export function useCreateMaintenanceHistory() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMaintenanceHistoryInput) => {
      if (!profile?.tenant_id) throw new Error('No tenant');

      const { data, error } = await supabase
        .from('asset_maintenance_history')
        .insert({
          tenant_id: profile.tenant_id,
          asset_id: input.asset_id,
          schedule_id: input.schedule_id,
          maintenance_type: input.maintenance_type,
          performed_date: input.performed_date,
          performed_by: user?.id,
          planned_duration_hours: input.planned_duration_hours,
          actual_duration_hours: input.actual_duration_hours,
          cost: input.cost,
          currency: input.currency || 'SAR',
          parts_used: (input.parts_used || []) as any,
          findings: (input.findings || {}) as any,
          notes: input.notes,
          condition_before: input.condition_before,
          condition_after: input.condition_after,
          failure_mode: input.failure_mode,
          root_cause: input.root_cause,
          next_recommended_action: input.next_recommended_action,
          was_unplanned: input.was_unplanned || false,
          downtime_hours: input.downtime_hours,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['asset-maintenance-history', variables.asset_id] });
      queryClient.invalidateQueries({ queryKey: ['asset-health-score', variables.asset_id] });
      toast({
        title: t('assets.maintenance.historyRecorded', 'Maintenance Recorded'),
        description: t('assets.maintenance.historyRecordedDesc', 'Maintenance history entry saved successfully'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error', 'Error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Statistics for AI analysis
export function useMaintenanceStatistics(assetId: string | undefined) {
  const historyQuery = useAssetMaintenanceHistory(assetId);

  const history = historyQuery.data || [];
  
  const stats = {
    totalEntries: history.length,
    unplannedCount: history.filter(h => h.was_unplanned).length,
    totalCost: history.reduce((sum, h) => sum + (h.cost || 0), 0),
    avgDuration: history.length > 0 
      ? history.reduce((sum, h) => sum + (h.actual_duration_hours || 0), 0) / history.length 
      : 0,
    totalDowntime: history.reduce((sum, h) => sum + (h.downtime_hours || 0), 0),
    failureModes: [...new Set(history.filter(h => h.failure_mode).map(h => h.failure_mode))],
    conditionTrend: calculateConditionTrend(history),
    maintenanceFrequency: calculateFrequency(history),
  };

  return {
    ...historyQuery,
    stats,
  };
}

function calculateConditionTrend(history: MaintenanceHistoryEntry[]): 'improving' | 'stable' | 'declining' | 'unknown' {
  const conditionOrder = { excellent: 5, good: 4, fair: 3, poor: 2, critical: 1 };
  
  const recentEntries = history
    .filter(h => h.condition_after)
    .slice(0, 5);
  
  if (recentEntries.length < 2) return 'unknown';
  
  const scores = recentEntries.map(h => conditionOrder[h.condition_after!] || 3);
  const avgRecent = scores.slice(0, 2).reduce((a, b) => a + b, 0) / 2;
  const avgOlder = scores.slice(-2).reduce((a, b) => a + b, 0) / 2;
  
  if (avgRecent > avgOlder + 0.5) return 'improving';
  if (avgRecent < avgOlder - 0.5) return 'declining';
  return 'stable';
}

function calculateFrequency(history: MaintenanceHistoryEntry[]): number {
  if (history.length < 2) return 0;
  
  const dates = history.map(h => new Date(h.performed_date).getTime()).sort((a, b) => b - a);
  const intervals: number[] = [];
  
  for (let i = 0; i < dates.length - 1; i++) {
    intervals.push((dates[i] - dates[i + 1]) / (1000 * 60 * 60 * 24));
  }
  
  return intervals.length > 0 
    ? intervals.reduce((a, b) => a + b, 0) / intervals.length 
    : 0;
}
