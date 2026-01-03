import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface TranslationContent {
  title: string;
  description?: string;
}

interface UseInductionTranslationReturn {
  translate: (
    content: TranslationContent,
    sourceLanguage: string,
    targetLanguage: string
  ) => Promise<TranslationContent | null>;
  isTranslating: boolean;
}

export function useInductionTranslation(): UseInductionTranslationReturn {
  const [isTranslating, setIsTranslating] = useState(false);
  const { t } = useTranslation();

  const translate = async (
    content: TranslationContent,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<TranslationContent | null> => {
    if (sourceLanguage === targetLanguage) {
      toast.info(t("contractors.induction.sameLanguage", "Source and target languages are the same"));
      return null;
    }

    if (!content.title?.trim()) {
      toast.error(t("contractors.induction.titleRequired", "Title is required for translation"));
      return null;
    }

    setIsTranslating(true);

    try {
      // Prepare content for translation
      const translationPayload: Record<string, string> = {
        title: content.title,
      };
      
      if (content.description?.trim()) {
        translationPayload.description = content.description;
      }

      const { data, error } = await supabase.functions.invoke("translate-page-content", {
        body: {
          content: translationPayload,
          sourceLanguage,
          targetLanguages: [targetLanguage],
          pageType: "induction_video",
          tenantId: "system", // This is just for logging
        },
      });

      if (error) {
        console.error("[Translation] Error:", error);
        throw new Error(error.message || "Translation failed");
      }

      if (!data?.success) {
        throw new Error(data?.error || "Translation failed");
      }

      const translatedContent = data.translations?.[targetLanguage];
      
      if (!translatedContent) {
        throw new Error("No translation returned");
      }

      toast.success(t("contractors.induction.translationSuccess", "Content translated successfully"));

      return {
        title: translatedContent.title || content.title,
        description: translatedContent.description || content.description,
      };
    } catch (error) {
      console.error("[Translation] Error:", error);
      
      const message = error instanceof Error ? error.message : "Translation failed";
      
      if (message.includes("Rate limit")) {
        toast.error(t("contractors.induction.rateLimitError", "Rate limit exceeded. Please try again later."));
      } else if (message.includes("Payment required")) {
        toast.error(t("contractors.induction.paymentError", "Payment required. Please add credits."));
      } else {
        toast.error(t("contractors.induction.translationError", "Translation failed. Please try again."));
      }
      
      return null;
    } finally {
      setIsTranslating(false);
    }
  };

  return { translate, isTranslating };
}
