import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface TranslationContent {
  content_pattern: string;
  email_subject?: string;
}

interface UseTemplateTranslationReturn {
  translate: (
    content: TranslationContent,
    sourceLanguage: string,
    targetLanguage: string
  ) => Promise<TranslationContent | null>;
  isTranslating: boolean;
}

export function useTemplateTranslation(): UseTemplateTranslationReturn {
  const [isTranslating, setIsTranslating] = useState(false);
  const { profile } = useAuth();

  const translate = async (
    content: TranslationContent,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<TranslationContent | null> => {
    if (!profile?.tenant_id) {
      toast.error('No tenant context available');
      return null;
    }

    if (sourceLanguage === targetLanguage) {
      toast.info('Source and target languages are the same');
      return null;
    }

    if (!content.content_pattern?.trim()) {
      toast.error('No content to translate');
      return null;
    }

    setIsTranslating(true);

    try {
      // Build content object for translation
      const translationContent: Record<string, string> = {
        content_pattern: content.content_pattern,
      };

      if (content.email_subject?.trim()) {
        translationContent.email_subject = content.email_subject;
      }

      const { data, error } = await supabase.functions.invoke('translate-page-content', {
        body: {
          content: translationContent,
          sourceLanguage,
          targetLanguages: [targetLanguage],
          pageType: 'notification_template',
          tenantId: profile.tenant_id,
        },
      });

      if (error) {
        console.error('[TemplateTranslation] Edge function error:', error);
        
        // Check for specific error types
        if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
          toast.error('Translation rate limit exceeded. Please try again later.');
        } else if (error.message?.includes('402') || error.message?.includes('Payment')) {
          toast.error('Translation credits depleted. Please add credits to continue.');
        } else {
          toast.error(`Translation failed: ${error.message}`);
        }
        return null;
      }

      if (!data?.success || !data?.translations?.[targetLanguage]) {
        toast.error('Translation returned empty result');
        return null;
      }

      const translated = data.translations[targetLanguage];
      toast.success('Content translated successfully');

      return {
        content_pattern: translated.content_pattern || content.content_pattern,
        email_subject: translated.email_subject || content.email_subject,
      };
    } catch (err) {
      console.error('[TemplateTranslation] Error:', err);
      toast.error('Failed to translate content');
      return null;
    } finally {
      setIsTranslating(false);
    }
  };

  return { translate, isTranslating };
}
