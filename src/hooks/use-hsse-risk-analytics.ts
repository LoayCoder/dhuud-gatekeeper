import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export interface RiskPattern {
  pattern_type: 'location' | 'time' | 'type' | 'severity';
  description: string;
  confidence: number;
  affected_areas: string[];
  recommendation: string;
}

export interface RiskAnomaly {
  type: 'spike' | 'drop' | 'new_pattern';
  description: string;
  severity: 'info' | 'warning' | 'critical';
  date_range: string;
}

export interface RiskRecommendation {
  priority: 'high' | 'medium' | 'low';
  area: string;
  action: string;
  expected_impact: string;
}

export interface EmergingHazard {
  category: string;
  trend: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  early_indicators: string;
}

export interface PredictiveRisk {
  description: string;
  probability: 'low' | 'medium' | 'high';
  timeframe: string;
  prevention_action: string;
}

export interface BranchRiskScore {
  branch_name: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  top_issue: string;
}

export interface DepartmentRiskScore {
  department_name: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  top_issue: string;
}

export interface BehavioralInsight {
  observation_type: string;
  trend: 'improving' | 'declining' | 'stable';
  percentage_change: string;
  recommendation: string;
}

export interface AIRiskInsights {
  patterns: RiskPattern[];
  anomalies: RiskAnomaly[];
  recommendations: RiskRecommendation[];
  emerging_hazards: EmergingHazard[];
  predictive_risks: PredictiveRisk[];
  branch_risk_scores: BranchRiskScore[];
  department_risk_scores: DepartmentRiskScore[];
  behavioral_insights: BehavioralInsight[];
  summary: string;
}

export function useHSSERiskAnalytics() {
  const { i18n } = useTranslation();
  const [insights, setInsights] = useState<AIRiskInsights | null>(null);

  const mutation = useMutation({
    mutationFn: async (dashboardData: any) => {
      const { data, error } = await supabase.functions.invoke('hsse-risk-analytics', {
        body: { 
          dashboardData,
          language: i18n.language
        }
      });

      if (error) throw error;
      return data as AIRiskInsights;
    },
    onSuccess: (data) => {
      setInsights(data);
    },
    onError: (error: any) => {
      console.error("AI Risk Analytics error:", error);
      if (error?.message?.includes('429') || error?.status === 429) {
        toast.error("Rate limit exceeded. Please try again later.");
      } else if (error?.message?.includes('402') || error?.status === 402) {
        toast.error("AI credits exhausted. Please contact support.");
      } else {
        toast.error("Failed to generate AI insights");
      }
    }
  });

  return {
    insights,
    isLoading: mutation.isPending,
    generateInsights: mutation.mutate,
    clearInsights: () => setInsights(null),
  };
}
