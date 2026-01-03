import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TranslationRequest {
  content: Record<string, string>;
  sourceLanguage: string;
  targetLanguages: string[];
  pageType: string;
  tenantId: string;
}

const LANGUAGE_NAMES: Record<string, string> = {
  ar: "Arabic",
  en: "English",
  ur: "Urdu",
  hi: "Hindi",
  fil: "Filipino",
  zh: "Chinese (Simplified)",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, sourceLanguage, targetLanguages, pageType, tenantId }: TranslationRequest = await req.json();

    if (!content || !sourceLanguage || !targetLanguages?.length) {
      throw new Error("Missing required fields: content, sourceLanguage, targetLanguages");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`[Translate] Starting translation from ${sourceLanguage} to ${targetLanguages.join(", ")}`);
    console.log(`[Translate] Page type: ${pageType}, Tenant: ${tenantId}`);

    const translations: Record<string, Record<string, string>> = {};

    for (const targetLang of targetLanguages) {
      if (targetLang === sourceLanguage) {
        console.log(`[Translate] Skipping ${targetLang} (same as source)`);
        continue;
      }

      console.log(`[Translate] Translating to ${LANGUAGE_NAMES[targetLang] || targetLang}...`);

      const isRTL = targetLang === "ar" || targetLang === "ur";
      const sourceLangName = LANGUAGE_NAMES[sourceLanguage] || sourceLanguage;
      const targetLangName = LANGUAGE_NAMES[targetLang] || targetLang;

      const systemPrompt = `You are a professional translator specializing in workplace safety and visitor management content.

CRITICAL RULES:
1. Translate the content from ${sourceLangName} to ${targetLangName}
2. PRESERVE all variable placeholders exactly as they appear (e.g., {{worker_name}}, {{company_name}}, {{date}})
3. Do NOT translate variable names inside {{ }}
4. Maintain the same tone and formality level
5. Use appropriate ${isRTL ? "RTL" : "LTR"} punctuation and formatting
6. For Arabic/Urdu, ensure proper RTL text structure
7. Return ONLY a valid JSON object with the same keys as the input

INPUT FORMAT: JSON object with field names as keys and text to translate as values
OUTPUT FORMAT: Same JSON structure with translated values`;

      const userPrompt = `Translate this content to ${targetLangName}. Return ONLY valid JSON:

${JSON.stringify(content, null, 2)}`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Translate] AI error for ${targetLang}:`, response.status, errorText);
        
        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please try again later.");
        }
        if (response.status === 402) {
          throw new Error("Payment required. Please add credits to your workspace.");
        }
        
        throw new Error(`Translation failed for ${targetLang}: ${errorText}`);
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content || "";

      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = rawContent;
      const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      try {
        const translatedContent = JSON.parse(jsonStr);
        translations[targetLang] = translatedContent;
        console.log(`[Translate] Successfully translated to ${targetLang}`);
      } catch (parseError) {
        console.error(`[Translate] Failed to parse JSON for ${targetLang}:`, parseError);
        console.error(`[Translate] Raw content:`, rawContent);
        throw new Error(`Invalid JSON response for ${targetLang} translation`);
      }
    }

    console.log(`[Translate] Completed translations for ${Object.keys(translations).length} languages`);

    return new Response(
      JSON.stringify({
        success: true,
        translations,
        sourceLanguage,
        targetLanguages: Object.keys(translations),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Translate] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : "Translation failed" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
