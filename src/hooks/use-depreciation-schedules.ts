import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export type DepreciationMethod = 'straight_line' | 'declining_balance' | 'units_of_production';
export type PeriodType = 'monthly' | 'quarterly' | 'yearly';

export interface DepreciationSchedule {
  id: string;
  asset_id: string;
  period_start: string;
  period_end: string;
  period_type: PeriodType;
  opening_value: number;
  depreciation_amount: number;
  accumulated_depreciation: number;
  closing_value: number;
  depreciation_method: DepreciationMethod;
  tenant_id: string;
  created_at: string;
  deleted_at: string | null;
}

export interface GenerateScheduleInput {
  asset_id: string;
  depreciation_method: DepreciationMethod;
  period_type: PeriodType;
  start_date: string;
  purchase_price: number;
  salvage_value: number;
  useful_life_years: number;
  declining_balance_rate?: number;
}

interface UseDepreciationSchedulesOptions {
  assetId?: string;
  periodType?: PeriodType;
}

export function useDepreciationSchedules(options: UseDepreciationSchedulesOptions = {}) {
  const { assetId, periodType } = options;
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Fetch schedules for an asset
  const {
    data: schedules,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['depreciation-schedules', assetId, periodType],
    queryFn: async () => {
      if (!assetId) return [];

      let query = supabase
        .from('asset_depreciation_schedules')
        .select('*')
        .eq('asset_id', assetId)
        .is('deleted_at', null)
        .order('period_start', { ascending: true });

      if (periodType) {
        query = query.eq('period_type', periodType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as DepreciationSchedule[];
    },
    enabled: !!assetId,
  });

  // Generate depreciation schedule
  const generateScheduleMutation = useMutation({
    mutationFn: async (input: GenerateScheduleInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get tenant_id from user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) throw new Error('Tenant not found');

      // First, delete existing schedules for this asset/period type
      await supabase
        .from('asset_depreciation_schedules')
        .update({ deleted_at: new Date().toISOString() })
        .eq('asset_id', input.asset_id)
        .eq('period_type', input.period_type)
        .is('deleted_at', null);

      // Generate schedules based on method
      const schedules = generateScheduleData(input, profile.tenant_id);

      const { data, error } = await supabase
        .from('asset_depreciation_schedules')
        .insert(schedules)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depreciation-schedules', assetId] });
      toast({
        title: t('common.success'),
        description: t('assets.depreciation.scheduleGenerated', 'Depreciation schedule generated successfully'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete a schedule period
  const deleteScheduleMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      const { error } = await supabase
        .from('asset_depreciation_schedules')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', scheduleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depreciation-schedules', assetId] });
      toast({
        title: t('common.success'),
        description: t('assets.depreciation.scheduleDeleted', 'Schedule period deleted'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Clear all schedules for asset
  const clearAllSchedulesMutation = useMutation({
    mutationFn: async (assetIdToClear: string) => {
      const { error } = await supabase
        .from('asset_depreciation_schedules')
        .update({ deleted_at: new Date().toISOString() })
        .eq('asset_id', assetIdToClear)
        .is('deleted_at', null);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depreciation-schedules', assetId] });
      toast({
        title: t('common.success'),
        description: t('assets.depreciation.allSchedulesCleared', 'All schedules cleared'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    schedules: schedules || [],
    isLoading,
    error,
    generateSchedule: generateScheduleMutation.mutate,
    isGenerating: generateScheduleMutation.isPending,
    deleteSchedule: deleteScheduleMutation.mutate,
    isDeleting: deleteScheduleMutation.isPending,
    clearAllSchedules: clearAllSchedulesMutation.mutate,
    isClearing: clearAllSchedulesMutation.isPending,
  };
}

// Helper function to generate schedule data
function generateScheduleData(input: GenerateScheduleInput, tenantId: string): Omit<DepreciationSchedule, 'id' | 'created_at'>[] {
  const {
    asset_id,
    depreciation_method,
    period_type,
    start_date,
    purchase_price,
    salvage_value,
    useful_life_years,
    declining_balance_rate = 2,
  } = input;

  const depreciableAmount = purchase_price - salvage_value;
  const periodsPerYear = period_type === 'monthly' ? 12 : period_type === 'quarterly' ? 4 : 1;
  const totalPeriods = useful_life_years * periodsPerYear;

  const schedules: Omit<DepreciationSchedule, 'id' | 'created_at'>[] = [];
  let currentValue = purchase_price;
  let accumulatedDepreciation = 0;
  const startDateObj = new Date(start_date);

  for (let i = 0; i < totalPeriods; i++) {
    if (currentValue <= salvage_value) break;

    const periodStart = new Date(startDateObj);
    const periodEnd = new Date(startDateObj);

    if (period_type === 'monthly') {
      periodStart.setMonth(startDateObj.getMonth() + i);
      periodEnd.setMonth(startDateObj.getMonth() + i + 1);
      periodEnd.setDate(periodEnd.getDate() - 1);
    } else if (period_type === 'quarterly') {
      periodStart.setMonth(startDateObj.getMonth() + i * 3);
      periodEnd.setMonth(startDateObj.getMonth() + (i + 1) * 3);
      periodEnd.setDate(periodEnd.getDate() - 1);
    } else {
      periodStart.setFullYear(startDateObj.getFullYear() + i);
      periodEnd.setFullYear(startDateObj.getFullYear() + i + 1);
      periodEnd.setDate(periodEnd.getDate() - 1);
    }

    let depreciationAmount: number;

    if (depreciation_method === 'straight_line') {
      depreciationAmount = depreciableAmount / totalPeriods;
    } else if (depreciation_method === 'declining_balance') {
      const annualRate = declining_balance_rate / useful_life_years;
      const periodRate = annualRate / periodsPerYear;
      depreciationAmount = currentValue * periodRate;
    } else {
      // units_of_production - treat like straight line for now
      depreciationAmount = depreciableAmount / totalPeriods;
    }

    // Ensure we don't depreciate below salvage value
    if (currentValue - depreciationAmount < salvage_value) {
      depreciationAmount = currentValue - salvage_value;
    }

    const openingValue = currentValue;
    currentValue -= depreciationAmount;
    accumulatedDepreciation += depreciationAmount;

    schedules.push({
      asset_id,
      period_start: periodStart.toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0],
      period_type,
      opening_value: Math.round(openingValue * 100) / 100,
      depreciation_amount: Math.round(depreciationAmount * 100) / 100,
      accumulated_depreciation: Math.round(accumulatedDepreciation * 100) / 100,
      closing_value: Math.round(currentValue * 100) / 100,
      depreciation_method,
      tenant_id: tenantId,
      deleted_at: null,
    });
  }

  return schedules;
}

// Hook to get summary statistics
export function useDepreciationSummary(assetId?: string) {
  const { schedules, isLoading } = useDepreciationSchedules({ assetId });

  const summary = schedules.length > 0 ? {
    totalPeriods: schedules.length,
    totalDepreciation: schedules.reduce((sum, s) => sum + s.depreciation_amount, 0),
    currentBookValue: schedules[schedules.length - 1]?.closing_value ?? 0,
    accumulatedDepreciation: schedules[schedules.length - 1]?.accumulated_depreciation ?? 0,
    firstPeriod: schedules[0]?.period_start,
    lastPeriod: schedules[schedules.length - 1]?.period_end,
    method: schedules[0]?.depreciation_method,
    periodType: schedules[0]?.period_type,
  } : null;

  return { summary, isLoading };
}
