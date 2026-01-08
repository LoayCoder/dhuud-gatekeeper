import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

export interface IncidentAnalysisResult {
  // Translation
  originalLanguage: string;
  originalText: string;
  translatedText: string;
  translationRequired: boolean;
  
  // Rewritten content
  rewrittenTitle: string;
  rewrittenDescription: string;
  
  // Quality Validation
  clarityScore: number;
  
  // Classification
  eventType: 'observation' | 'incident';
  incidentType: string | null;
  incidentTypeConfidence: number;
  subtype: string;
  subtypeConfidence: number;
  severity: string;
  severityConfidence: number;
  
  // Injury/Damage
  hasInjury: boolean;
  injuryCount?: number;
  injuryType?: string;
  injuryDescription?: string;
  hasDamage: boolean;
  damageDescription?: string;
  estimatedCost?: number;
  
  // Key Risks & Actions
  keyRisks: string[];
  immediateActions: string[];
  
  // Tags
  suggestedTags: string[];
  
  // Confidence
  confidence: number;
  reasoning?: string;
}

export type IncidentValidationState = 
  | 'idle'
  | 'analyzing'
  | 'awaiting_translation_confirm'
  | 'analysis_ready'
  | 'validated';

export interface UseIncidentAIValidatorReturn {
  // State
  validationState: IncidentValidationState;
  analysisResult: IncidentAnalysisResult | null;
  error: string | null;
  processingTime: number;
  
  // Actions
  analyzeIncident: (title: string, description: string) => Promise<void>;
  confirmTranslation: () => void;
  confirmAnalysis: () => void;
  reset: () => void;
  
  // Helpers
  getRewrittenContent: () => { title: string; description: string } | null;
  
  // Validation checks
  isAnalyzing: boolean;
}

export function useIncidentAIValidator(): UseIncidentAIValidatorReturn {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [validationState, setValidationState] = useState<IncidentValidationState>('idle');
  const [analysisResult, setAnalysisResult] = useState<IncidentAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingTime, setProcessingTime] = useState(0);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setProcessingTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 100);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setProcessingTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
  }, []);

  const analyzeIncident = useCallback(async (title: string, description: string) => {
    // Reset state
    setError(null);
    setAnalysisResult(null);
    setValidationState('analyzing');
    startTimer();

    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-incident', {
        body: { 
          description,
          title,
          responseLanguage: i18n.language 
        }
      });

      stopTimer();

      if (fnError) {
        throw new Error(fnError.message || 'AI analysis failed');
      }

      if (data?.error) {
        // Handle specific error types
        if (data.error.includes('Rate limit')) {
          toast({
            title: t('common.error'),
            description: t('incidents.ai.rateLimitError', 'Rate limit exceeded. Please wait and try again.'),
            variant: 'destructive',
          });
        } else if (data.error.includes('credits')) {
          toast({
            title: t('common.error'),
            description: t('incidents.ai.creditsError', 'AI credits exhausted. Please contact administrator.'),
            variant: 'destructive',
          });
        }
        throw new Error(data.error);
      }

      // Detect if translation was required (non-English input)
      const isNonEnglish = /[\u0600-\u06FF\u0900-\u097F\u0C00-\u0C7F]/.test(description);
      
      const result: IncidentAnalysisResult = {
        // Translation
        originalLanguage: isNonEnglish ? 'Non-English' : 'English',
        originalText: description,
        translatedText: data.rewrittenDescription || description,
        translationRequired: isNonEnglish,
        
        // Rewritten content
        rewrittenTitle: data.rewrittenTitle || title,
        rewrittenDescription: data.rewrittenDescription || description,
        
        // Quality
        clarityScore: data.clarityScore || 75,
        
        // Classification
        eventType: data.eventType || 'incident',
        incidentType: data.incidentType || null,
        incidentTypeConfidence: (data.confidence || 0.8) * 100,
        subtype: data.subtype || '',
        subtypeConfidence: (data.confidence || 0.8) * 100,
        severity: data.severity || 'medium',
        severityConfidence: (data.confidence || 0.8) * 100 - 5,
        
        // Injury/Damage
        hasInjury: data.hasInjury || false,
        injuryCount: data.injuryCount,
        injuryType: data.injuryType,
        injuryDescription: data.injuryDescription,
        hasDamage: data.hasDamage || false,
        damageDescription: data.damageDescription,
        estimatedCost: data.estimatedCost,
        
        // Key Risks & Actions
        keyRisks: data.keyRisks || [],
        immediateActions: data.immediateActions || [],
        
        // Tags
        suggestedTags: data.suggestedTags || [],
        
        // Confidence
        confidence: data.confidence || 0.8,
        reasoning: data.reasoning,
      };
      
      setAnalysisResult(result);

      // Determine next state
      if (isNonEnglish) {
        setValidationState('awaiting_translation_confirm');
      } else {
        setValidationState('analysis_ready');
      }

    } catch (err) {
      stopTimer();
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setValidationState('idle');
      
      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [t, toast, startTimer, stopTimer]);

  const confirmTranslation = useCallback(() => {
    setValidationState('analysis_ready');
  }, []);

  const confirmAnalysis = useCallback(() => {
    setValidationState('validated');
  }, []);

  const getRewrittenContent = useCallback(() => {
    if (!analysisResult) return null;
    return {
      title: analysisResult.rewrittenTitle,
      description: analysisResult.rewrittenDescription,
    };
  }, [analysisResult]);

  const reset = useCallback(() => {
    setValidationState('idle');
    setAnalysisResult(null);
    setError(null);
    setProcessingTime(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return {
    validationState,
    analysisResult,
    error,
    processingTime,
    analyzeIncident,
    confirmTranslation,
    confirmAnalysis,
    reset,
    getRewrittenContent,
    isAnalyzing: validationState === 'analyzing',
  };
}
