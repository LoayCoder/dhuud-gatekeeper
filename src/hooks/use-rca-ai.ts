import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface RCAData {
  five_whys?: Array<{ question: string; answer: string }>;
  immediate_cause?: string;
  underlying_cause?: string;
  root_causes?: Array<{ id: string; text: string }>;
  contributing_factors?: string;
  incident_description?: string;
  incident_title?: string;
  witness_statements?: Array<{ name: string; statement: string }>;
  evidence_descriptions?: string[];
}

type ActionType = 'rewrite' | 'suggest_cause' | 'suggest_why' | 'generate_summary' | 'translate' | 'generate_whys';

interface UseRCAAIOptions {
  onSuccess?: (result: string) => void;
  onError?: (error: string) => void;
}

export function useRCAAI(options?: UseRCAAIOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  const callRCAAI = async (payload: {
    action: ActionType;
    text?: string;
    data?: RCAData;
    target_language?: string;
    context?: string;
    why_level?: number;
  }): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('rca-ai-assistant', {
        body: payload,
      });

      if (fnError) {
        throw new Error(fnError.message || 'AI service error');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const result = data?.result;
      if (!result) {
        throw new Error('No result from AI');
      }

      options?.onSuccess?.(result);
      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      options?.onError?.(errorMessage);

      // Show appropriate toast based on error type
      if (errorMessage.includes('Rate limit')) {
        toast({
          title: t('common.error'),
          description: t('investigation.rca.ai.rateLimitError', 'Rate limit exceeded. Please wait a moment and try again.'),
          variant: 'destructive',
        });
      } else if (errorMessage.includes('credits')) {
        toast({
          title: t('common.error'),
          description: t('investigation.rca.ai.creditsError', 'AI credits exhausted. Please contact administrator.'),
          variant: 'destructive',
        });
      } else {
        toast({
          title: t('common.error'),
          description: errorMessage,
          variant: 'destructive',
        });
      }

      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Convenience methods for each action type
  const rewriteText = (text: string, context?: string) => 
    callRCAAI({ action: 'rewrite', text, context });

  const suggestCause = (data: RCAData) => 
    callRCAAI({ action: 'suggest_cause', data });

  const suggestWhyAnswer = (data: RCAData, whyLevel: number) => 
    callRCAAI({ action: 'suggest_why', data, why_level: whyLevel });

  const generateSummary = (data: RCAData) => 
    callRCAAI({ action: 'generate_summary', data });

  const translateSummary = (text: string, targetLanguage: string) => 
    callRCAAI({ action: 'translate', text, target_language: targetLanguage });

  const generateWhyQuestions = (data: RCAData) => 
    callRCAAI({ action: 'generate_whys', data });

  return {
    isLoading,
    error,
    rewriteText,
    suggestCause,
    suggestWhyAnswer,
    generateSummary,
    translateSummary,
    generateWhyQuestions,
  };
}
