import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { KPITargetAdmin, KPI_METADATA } from "./use-kpi-targets-admin";

export interface KPIEvaluation {
  kpi_code: string;
  kpi_name: string;
  current_value: number;
  target_value: number;
  performance_percentage: number;
  status: 'exceeding' | 'on-track' | 'at-risk' | 'failing';
  gap_analysis: {
    gap_value: number;
    gap_percentage: number;
    primary_causes: string[];
    contributing_factors: string[];
  };
  ai_insights: {
    root_causes: string[];
    recommendations: string[];
    estimated_impact: string;
    target_suggestion?: number;
  };
  trend_forecast: {
    projected_value: number;
    timeframe: string;
    confidence: number;
  };
}

export interface OverallSummary {
  total_kpis: number;
  exceeding_count: number;
  on_track_count: number;
  at_risk_count: number;
  failing_count: number;
  top_priority_actions: string[];
  performance_narrative: string;
}

export interface KPIEvaluationResult {
  evaluations: KPIEvaluation[];
  overall_summary: OverallSummary;
}

export function useKPIEvaluation() {
  const { i18n, t } = useTranslation();
  const [result, setResult] = useState<KPIEvaluationResult | null>(null);

  const mutation = useMutation({
    mutationFn: async ({ targets, currentValues }: { 
      targets: KPITargetAdmin[], 
      currentValues: Record<string, number> 
    }) => {
      // Prepare KPI data with current values - get name from metadata
      const kpiTargets = targets.map(target => ({
        kpi_code: target.kpi_code,
        kpi_name: KPI_METADATA[target.kpi_code]?.name || target.kpi_code,
        target_value: target.target_value,
        warning_threshold: target.warning_threshold,
        critical_threshold: target.critical_threshold,
        current_value: currentValues[target.kpi_code] ?? null,
      }));

      const { data, error } = await supabase.functions.invoke('kpi-ai-evaluation', {
        body: { 
          kpiTargets,
          currentValues,
          language: i18n.language
        }
      });

      if (error) throw error;
      return data as KPIEvaluationResult;
    },
    onSuccess: (data) => {
      setResult(data);
      toast.success(t('kpiAdmin.evaluationComplete', 'KPI evaluation complete'));
    },
    onError: (error: any) => {
      console.error("KPI Evaluation error:", error);
      if (error?.message?.includes('429') || error?.status === 429) {
        toast.error(t('common.rateLimitExceeded', 'Rate limit exceeded. Please try again later.'));
      } else if (error?.message?.includes('402') || error?.status === 402) {
        toast.error(t('common.creditsExhausted', 'AI credits exhausted. Please contact support.'));
      } else {
        toast.error(t('kpiAdmin.evaluationFailed', 'Failed to evaluate KPIs'));
      }
    }
  });

  return {
    result,
    evaluations: result?.evaluations ?? [],
    summary: result?.overall_summary ?? null,
    isLoading: mutation.isPending,
    evaluate: mutation.mutate,
    clearResult: () => setResult(null),
  };
}
