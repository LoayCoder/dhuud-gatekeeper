import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export interface AssetHealthScore {
  id: string;
  tenant_id: string;
  asset_id: string;
  score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  failure_probability?: number;
  days_until_predicted_failure?: number;
  contributing_factors: Record<string, unknown>;
  maintenance_compliance_pct?: number;
  age_factor?: number;
  condition_factor?: number;
  usage_factor?: number;
  environment_factor?: number;
  trend?: 'improving' | 'stable' | 'declining' | 'critical_decline';
  last_calculated_at: string;
  calculation_model_version: string;
}

export interface AssetFailurePrediction {
  id: string;
  tenant_id: string;
  asset_id: string;
  predicted_failure_type: string;
  predicted_date: string;
  confidence_pct: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommended_action?: string;
  estimated_repair_cost?: number;
  cost_if_ignored?: number;
  priority?: number;
  status: 'active' | 'acknowledged' | 'addressed' | 'dismissed' | 'occurred' | 'false_positive';
  acknowledged_by?: string;
  acknowledged_at?: string;
  addressed_at?: string;
  actual_failure_date?: string;
  prediction_model_version: string;
  model_inputs: Record<string, unknown>;
  created_at: string;
}

export function useAssetHealthScore(assetId: string | undefined) {
  return useQuery({
    queryKey: ['asset-health-score', assetId],
    queryFn: async () => {
      if (!assetId) return null;
      
      const { data, error } = await supabase
        .from('asset_health_scores')
        .select('*')
        .eq('asset_id', assetId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as AssetHealthScore | null;
    },
    enabled: !!assetId,
  });
}

export function useAssetHealthScores() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['asset-health-scores', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      
      const { data, error } = await supabase
        .from('asset_health_scores')
        .select(`
          *,
          asset:hsse_assets!inner(
            id,
            asset_code,
            name,
            status,
            category:asset_categories(name, name_ar)
          )
        `)
        .eq('tenant_id', profile.tenant_id)
        .order('score', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useAssetFailurePredictions(assetId?: string) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['asset-failure-predictions', assetId, profile?.tenant_id],
    queryFn: async () => {
      let query = supabase
        .from('asset_failure_predictions')
        .select(`
          *,
          asset:hsse_assets(id, asset_code, name)
        `)
        .eq('status', 'active')
        .order('predicted_date', { ascending: true });

      if (assetId) {
        query = query.eq('asset_id', assetId);
      } else if (profile?.tenant_id) {
        query = query.eq('tenant_id', profile.tenant_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (AssetFailurePrediction & { asset: { id: string; asset_code: string; name: string } })[];
    },
    enabled: !!profile?.tenant_id || !!assetId,
  });
}

export function useAcknowledgePrediction() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (predictionId: string) => {
      const { error } = await supabase
        .from('asset_failure_predictions')
        .update({
          status: 'acknowledged',
          acknowledged_by: user?.id,
          acknowledged_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', predictionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-failure-predictions'] });
      toast({
        title: t('assets.predictions.acknowledged', 'Prediction Acknowledged'),
      });
    },
  });
}

export function useAddressPrediction() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (predictionId: string) => {
      const { error } = await supabase
        .from('asset_failure_predictions')
        .update({
          status: 'addressed',
          addressed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', predictionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-failure-predictions'] });
      toast({
        title: t('assets.predictions.addressed', 'Issue Addressed'),
        description: t('assets.predictions.addressedDesc', 'Prediction marked as addressed'),
      });
    },
  });
}

export function useDismissPrediction() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ predictionId, reason }: { predictionId: string; reason?: string }) => {
      const { error } = await supabase
        .from('asset_failure_predictions')
        .update({
          status: 'dismissed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', predictionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-failure-predictions'] });
      toast({
        title: t('assets.predictions.dismissed', 'Prediction Dismissed'),
      });
    },
  });
}

export function useCalculateHealthScore() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assetId: string) => {
      const { data, error } = await supabase.functions.invoke('predict-asset-maintenance', {
        body: { asset_id: assetId, action: 'calculate_health' },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, assetId) => {
      queryClient.invalidateQueries({ queryKey: ['asset-health-score', assetId] });
      queryClient.invalidateQueries({ queryKey: ['asset-failure-predictions', assetId] });
      toast({
        title: t('assets.health.calculated', 'Health Score Updated'),
        description: t('assets.health.calculatedDesc', 'AI analysis complete'),
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
