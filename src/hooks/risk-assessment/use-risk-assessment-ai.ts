import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ActionType = 
  | 'analyze_activity' 
  | 'suggest_hazards' 
  | 'suggest_controls' 
  | 'calculate_risk_score' 
  | 'validate_assessment' 
  | 'generate_team_recommendations';

interface AIHazard {
  description: string;
  descriptionAr?: string;
  category: string;
  likelihood: number;
  severity: number;
  confidence: number;
  source?: string;
}

interface AIControl {
  hazardDescription: string;
  controlType: 'elimination' | 'substitution' | 'engineering' | 'administrative' | 'ppe';
  description: string;
  descriptionAr?: string;
  effectiveness: number;
  implementationDifficulty: 'low' | 'medium' | 'high';
  estimatedCost: 'low' | 'medium' | 'high';
  priority: number;
}

interface AIAnalysisResult {
  riskScore: number;
  confidenceLevel: number;
  riskRating: 'low' | 'medium' | 'high' | 'critical';
  primaryHazards: AIHazard[];
  recommendations: string[];
  warnings: string[];
  historicalContext?: string;
}

interface AITeamRecommendation {
  role: string;
  roleAr: string;
  isRequired: boolean;
  justification: string;
  competenciesNeeded: string[];
}

interface UseRiskAssessmentAIOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  language?: 'en' | 'ar';
}

export function useRiskAssessmentAI(options: UseRiskAssessmentAIOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { language = 'en' } = options;

  const callAI = async (action: ActionType, payload: Record<string, any>) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('risk-ai-assistant', {
        body: {
          action,
          language,
          ...payload,
        },
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'AI analysis failed');
      }

      options.onSuccess?.(data.data);
      return data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI analysis failed';
      setError(message);
      options.onError?.(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Analyze activity and get initial risk assessment
  const analyzeActivity = async (params: {
    activityName: string;
    activityDescription: string;
    location?: string;
    industry?: string;
  }): Promise<AIAnalysisResult | null> => {
    return callAI('analyze_activity', params);
  };

  // Suggest hazards based on activity
  const suggestHazards = async (params: {
    activityName: string;
    activityDescription: string;
    activityCategory?: string;
    location?: string;
  }): Promise<{ hazards: AIHazard[] } | null> => {
    return callAI('suggest_hazards', params);
  };

  // Suggest controls for hazards
  const suggestControls = async (params: {
    hazards: Array<{
      description: string;
      category: string;
      likelihood: number;
      severity: number;
    }>;
  }): Promise<{ controls: AIControl[] } | null> => {
    return callAI('suggest_controls', params);
  };

  // Calculate overall risk score
  const calculateRiskScore = async (params: {
    hazards: Array<{
      description: string;
      category: string;
      likelihood: number;
      severity: number;
    }>;
    controls?: Array<{
      description: string;
      type: string;
    }>;
  }): Promise<{
    overallRiskScore: number;
    riskRating: 'low' | 'medium' | 'high' | 'critical';
    confidenceLevel: number;
    residualRiskScore: number;
    riskReduction: number;
    factors: Array<{ factor: string; weight: number; contribution: number }>;
  } | null> => {
    return callAI('calculate_risk_score', params);
  };

  // Validate assessment completeness
  const validateAssessment = async (params: {
    activityName: string;
    hazards?: Array<{ description: string; category: string }>;
    controls?: Array<{ description: string; type: string }>;
    teamSize?: number;
  }): Promise<{
    isComplete: boolean;
    completenessScore: number;
    missingElements: string[];
    warnings: string[];
    recommendations: string[];
    approvalRecommendation: 'approve' | 'needs_revision' | 'reject';
  } | null> => {
    return callAI('validate_assessment', params);
  };

  // Get team composition recommendations
  const getTeamRecommendations = async (params: {
    activityName: string;
    activityCategory?: string;
    industry?: string;
  }): Promise<{
    recommendedRoles: AITeamRecommendation[];
    minimumTeamSize: number;
    optimalTeamSize: number;
  } | null> => {
    return callAI('generate_team_recommendations', params);
  };

  return {
    isLoading,
    error,
    analyzeActivity,
    suggestHazards,
    suggestControls,
    calculateRiskScore,
    validateAssessment,
    getTeamRecommendations,
  };
}
