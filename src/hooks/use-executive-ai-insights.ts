import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ExecutiveSummaryData } from "./use-executive-summary";
import { KPITargetAdmin, KPI_METADATA } from "./use-kpi-targets-admin";


export interface HSSEMaturityScore {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  components: {
    incident_prevention: number;
    action_effectiveness: number;
    kpi_performance: number;
    inspection_rigor: number;
    observation_culture: number;
  };
  narrative: string;
}

export interface RiskPosture {
  current: 'critical' | 'high' | 'moderate' | 'low';
  trend: 'improving' | 'stable' | 'declining';
  change_description: string;
}

export interface KPIHealth {
  kpi_name: string;
  status: 'red' | 'yellow' | 'green';
  current_value: number;
  target_value: number;
  gap: number;
}

export interface TopPriority {
  rank: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  recommended_actions: string[];
  expected_impact: string;
}

export interface ExecutiveNarratives {
  what_happened: string;
  why_it_happened: string;
  what_improved: string;
  what_needs_action: string;
}

export interface SystemicIssue {
  pattern: string;
  affected_areas: string[];
  recommendation: string;
}

export interface MonthComparison {
  incidents_change: number;
  observations_change: number;
  actions_closure_change: number;
  compliance_change: number;
  overall_trend: 'improving' | 'stable' | 'declining';
}

export interface ExecutiveAIInsights {
  hsse_maturity_score: HSSEMaturityScore;
  risk_posture: RiskPosture;
  kpi_health: KPIHealth[];
  top_priorities: TopPriority[];
  narratives: ExecutiveNarratives;
  systemic_issues: SystemicIssue[];
  month_comparison: MonthComparison;
}

interface GenerateInsightsParams {
  currentMonth: ExecutiveSummaryData;
  previousMonth?: ExecutiveSummaryData | null;
  kpiTargets?: KPITargetAdmin[];
}

export function useExecutiveAIInsights() {
  const { i18n } = useTranslation();
  const [insights, setInsights] = useState<ExecutiveAIInsights | null>(null);

  const mutation = useMutation({
    mutationFn: async ({ currentMonth, previousMonth, kpiTargets }: GenerateInsightsParams) => {
      // Transform KPI targets to include current values and names from metadata
      const kpiData = kpiTargets?.map(kpi => ({
        kpi_code: kpi.kpi_code,
        kpi_name: KPI_METADATA[kpi.kpi_code]?.name || kpi.kpi_code,
        target_value: kpi.target_value,
        current_value: 0, // Will be calculated from actual data
      }));

      const { data, error } = await supabase.functions.invoke('executive-ai-insights', {
        body: { 
          currentMonth,
          previousMonth: previousMonth || undefined,
          kpiTargets: kpiData,
          language: i18n.language
        }
      });

      if (error) throw error;
      return data as ExecutiveAIInsights;
    },
    onSuccess: (data) => {
      setInsights(data);
    },
    onError: (error: any) => {
      console.error("Executive AI Insights error:", error);
      if (error?.message?.includes('429') || error?.status === 429) {
        toast.error("Rate limit exceeded. Please try again later.");
      } else if (error?.message?.includes('402') || error?.status === 402) {
        toast.error("AI credits exhausted. Please contact support.");
      } else {
        toast.error("Failed to generate executive insights");
      }
    }
  });

  return {
    insights,
    isLoading: mutation.isPending,
    generateInsights: mutation.mutate,
    clearInsights: () => setInsights(null),
    error: mutation.error,
  };
}
