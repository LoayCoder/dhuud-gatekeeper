import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface UseIncidentAIOptions {
  onSuccess?: (result: string) => void;
  onError?: (error: string) => void;
}

export function useIncidentAI(options?: UseIncidentAIOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  const translateAndRewrite = async (
    text: string, 
    fieldType: 'title' | 'description'
  ): Promise<string | null> => {
    if (!text || text.trim().length < 3) {
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('rca-ai-assistant', {
        body: { 
          action: 'translate_and_rewrite', 
          text,
          context: fieldType 
        },
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
          description: t('incidents.ai.rateLimitError', 'Rate limit exceeded. Please wait a moment and try again.'),
          variant: 'destructive',
        });
      } else if (errorMessage.includes('credits')) {
        toast({
          title: t('common.error'),
          description: t('incidents.ai.creditsError', 'AI credits exhausted. Please contact administrator.'),
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

  return {
    translateAndRewrite,
    isLoading,
    error,
  };
}
