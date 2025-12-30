import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export interface AnalysisResult {
  // Translation
  originalLanguage: string;
  originalText: string;
  translatedText: string;
  translationRequired: boolean;
  
  // Quality Validation
  wordCount: number;
  clarityScore: number;
  isValid: boolean;
  validationErrors: string[];
  ambiguousTerms: string[];
  missingSections: string[];
  improvementSuggestions: string[];
  
  // Auto-Selection
  subtype: string;
  subtypeConfidence: number;
  severity: string;
  severityConfidence: number;
  likelihood: string;
  likelihoodConfidence: number;
  
  // Key Risks
  keyRisks: string[];
}

export type ValidationState = 
  | 'idle'
  | 'analyzing'
  | 'awaiting_translation_confirm'
  | 'validation_failed'
  | 'validated';

export interface UseObservationAIValidatorReturn {
  // State
  validationState: ValidationState;
  analysisResult: AnalysisResult | null;
  error: string | null;
  processingTime: number;
  
  // Actions
  analyzeDescription: (description: string) => Promise<void>;
  confirmTranslation: () => void;
  reset: () => void;
  
  // Validation checks
  isBlocked: boolean;
  canSubmit: boolean;
  blockingReason: string | null;
}

export function useObservationAIValidator(): UseObservationAIValidatorReturn {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [validationState, setValidationState] = useState<ValidationState>('idle');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingTime, setProcessingTime] = useState(0);
  const [translationConfirmed, setTranslationConfirmed] = useState(false);
  
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

  const analyzeDescription = useCallback(async (description: string) => {
    // Reset state
    setError(null);
    setAnalysisResult(null);
    setTranslationConfirmed(false);
    setValidationState('analyzing');
    startTimer();

    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-observation', {
        body: { description }
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
            description: t('observations.ai.rateLimitError', 'Rate limit exceeded. Please wait and try again.'),
            variant: 'destructive',
          });
        } else if (data.error.includes('credits')) {
          toast({
            title: t('common.error'),
            description: t('observations.ai.creditsError', 'AI credits exhausted. Please contact administrator.'),
            variant: 'destructive',
          });
        }
        throw new Error(data.error);
      }

      const result = data as AnalysisResult;
      setAnalysisResult(result);

      // Determine next state
      if (result.translationRequired) {
        setValidationState('awaiting_translation_confirm');
      } else if (!result.isValid) {
        setValidationState('validation_failed');
      } else {
        setValidationState('validated');
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
    setTranslationConfirmed(true);
    
    if (analysisResult) {
      if (!analysisResult.isValid) {
        setValidationState('validation_failed');
      } else {
        setValidationState('validated');
      }
    }
  }, [analysisResult]);

  const reset = useCallback(() => {
    setValidationState('idle');
    setAnalysisResult(null);
    setError(null);
    setProcessingTime(0);
    setTranslationConfirmed(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Compute blocking status
  const getBlockingReason = (): string | null => {
    if (validationState === 'analyzing') {
      return t('observations.ai.analyzing', 'Analyzing your observation...');
    }
    
    if (validationState === 'awaiting_translation_confirm') {
      return t('observations.ai.confirmTranslationRequired', 'Please confirm the translation to continue.');
    }
    
    if (validationState === 'validation_failed' && analysisResult) {
      if (analysisResult.wordCount < 20) {
        return t('observations.ai.minWords', 'Please enter at least 20 words for meaningful analysis.');
      }
      if (analysisResult.clarityScore < 70) {
        return t('observations.ai.clarityLow', 'Input not clear enough for analysis. Please provide more specific details.');
      }
      return t('observations.ai.validationFailed', 'Input validation failed. Please improve your description.');
    }
    
    return null;
  };

  const isBlocked = validationState === 'analyzing' || 
    validationState === 'awaiting_translation_confirm' || 
    validationState === 'validation_failed';

  const canSubmit = validationState === 'validated' && 
    (!analysisResult?.translationRequired || translationConfirmed);

  return {
    validationState,
    analysisResult,
    error,
    processingTime,
    analyzeDescription,
    confirmTranslation,
    reset,
    isBlocked,
    canSubmit,
    blockingReason: getBlockingReason(),
  };
}
