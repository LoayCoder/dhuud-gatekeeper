import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  fetchAISettings, 
  fetchAITags, 
  matchTagsByKeywords,
  getTenantFromAuth,
  DEFAULT_OBSERVATION_SETTINGS,
  type ObservationAISettings,
  type AITag
} from "../_shared/ai-settings.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisRequest {
  description: string;
  responseLanguage?: string;
  tenantId?: string; // Optional: can be passed directly or extracted from auth
}

interface AnalysisResult {
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
  
  // Classification (new)
  positiveNegative?: 'positive' | 'negative';
  
  // Tags (new)
  suggestedTags?: string[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { description, responseLanguage = 'en', tenantId: providedTenantId }: AnalysisRequest = await req.json();

    // Get tenant ID from auth or use provided one
    let tenantId: string | undefined = providedTenantId;
    if (!tenantId) {
      tenantId = (await getTenantFromAuth(req)) ?? undefined;
    }

    // Fetch dynamic settings and tags
    let settings: ObservationAISettings = DEFAULT_OBSERVATION_SETTINGS;
    let availableTags: AITag[] = [];
    
    if (tenantId) {
      console.log('[analyze-observation] Fetching settings for tenant:', tenantId);
      settings = await fetchAISettings<ObservationAISettings>(tenantId, 'observation', DEFAULT_OBSERVATION_SETTINGS);
      availableTags = await fetchAITags(tenantId, 'observation');
      console.log('[analyze-observation] Loaded', availableTags.length, 'tags');
    }

    // Map language codes to full names for the AI
    const languageNames: Record<string, string> = {
      'ar': 'Arabic',
      'en': 'English',
      'ur': 'Urdu',
      'hi': 'Hindi',
      'fil': 'Filipino'
    };
    const targetLanguage = settings.rewrite_rules.enable_translation 
      ? languageNames[settings.rewrite_rules.target_language] || 'English'
      : languageNames[responseLanguage] || 'English';

    if (!description || description.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Description is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[analyze-observation] Analyzing description:', description.substring(0, 100) + '...');

    // Build tag list for AI prompt
    const tagListForPrompt = availableTags.length > 0
      ? `\n\nAVAILABLE TAGS FOR AUTO-TAGGING:\n${availableTags.map(t => `- "${t.name}": keywords=[${t.keywords.join(', ')}]`).join('\n')}\n\nSelect tags from this list that match the observation content.`
      : '';

    const positiveNegativeInstruction = settings.classification.enable_positive_negative
      ? '\n8. **Positive/Negative Classification**: Determine if this is a positive observation (safe behavior) or negative (unsafe behavior/condition).'
      : '';

    const systemPrompt = `You are an HSSE (Health, Safety, Security, Environment) expert AI assistant analyzing workplace observations. Your task is to:

1. **Detect Language**: Identify the language of the input text.
2. **Translate**: If not ${targetLanguage}, translate to professional ${targetLanguage} while preserving technical terms.
3. **Score Clarity**: Evaluate how clear and specific the description is (0-100 scale).
4. **Identify Issues**: Find ambiguous terms ("some", "maybe", "probably", "few", "several") and missing context.
5. **Classify Observation Type**: Determine if it's an ${settings.classification.observation_types.join(', ')}.
6. **Assess Severity**: Rate using: ${settings.classification.severity_levels.join(', ')}.
7. **Calculate Likelihood**: Rate as rare, unlikely, possible, likely, or almost_certain.${positiveNegativeInstruction}

Severity Guidelines (HSSE Standards):
- level_1: Minor first aid, no lost time, minimal property damage
- level_2: Medical treatment, minor injury, moderate property damage
- level_3: Lost time injury, significant property damage, environmental impact
- level_4: Serious injury, major property damage, regulatory violation
- level_5: Fatality, catastrophic damage, major environmental disaster

Clarity Scoring Guidelines (SIMPLIFIED - focus on observation, not metadata):
- 100%: Clear description of what was observed, specific equipment/conditions involved
- 70-99%: Understandable observation with some context
- 50-69%: Basic observation but lacks detail
- Below 50%: Too vague to understand what happened

IMPORTANT: Do NOT penalize for missing:
- Person names (who)
- Specific times/dates (when)  
- Specific locations/zones (where)
Focus ONLY on whether the observation itself is clearly described (what happened).

CRITICAL VALIDATION RULES:
- Do NOT add validation errors about word count or observation length
- Do NOT penalize short but clear descriptions (e.g., "worker without helmet" is valid)
- A clear 3-5 word observation is VALID if clarity is high
- Only add errors for: ambiguous terms, missing activity/equipment context, unclear descriptions

CRITICAL LANGUAGE INSTRUCTIONS:
- Write ALL user-facing text in ${targetLanguage}:
  - validationErrors: Write in ${targetLanguage}
  - improvementSuggestions: Write in ${targetLanguage}
  - keyRisks: Write in ${targetLanguage}
  - ambiguousTerms: Write in ${targetLanguage}

- Keep these values in English (system codes only):
  - missingSections: Use ONLY these exact English keys: "equipment", "activity" (NO location, personnel, timing)
  - subtype: Use ONLY: "${settings.classification.observation_types.join('", "')}"
  - severity: Use ONLY: "${settings.classification.severity_levels.join('", "')}"
  - likelihood: Use ONLY: "rare", "unlikely", "possible", "likely", "almost_certain"${tagListForPrompt}

Required Output Format (JSON):
{
  "originalLanguage": "detected language name in English (e.g., 'Arabic', 'English', 'Hindi')",
  "originalText": "the original input text",
  "translatedText": "${targetLanguage} translation (same as original if already ${targetLanguage})",
  "translationRequired": boolean,
  "wordCount": number,
  "clarityScore": number (0-100),
  "isValid": boolean (true if clarityScore >= 70),
  "validationErrors": ["list in ${targetLanguage}"],
  "ambiguousTerms": ["list in ${targetLanguage}"],
  "missingSections": ["English keys only: equipment, activity"],
  "improvementSuggestions": ["list in ${targetLanguage}"],
  "subtype": one of: "${settings.classification.observation_types.join('", "')}",
  "subtypeConfidence": number (0-100),
  "severity": one of: "${settings.classification.severity_levels.join('", "')}",
  "severityConfidence": number (0-100),
  "likelihood": "rare" | "unlikely" | "possible" | "likely" | "almost_certain",
  "likelihoodConfidence": number (0-100),
  "keyRisks": ["list in ${targetLanguage}"],
  "positiveNegative": "positive" | "negative",
  "suggestedTags": ["list of tag names from available tags that match this observation"]
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this observation description and respond with ONLY valid JSON:\n\n"${description}"` }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please wait a moment and try again.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please contact administrator.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in AI response');
      return new Response(
        JSON.stringify({ error: 'No analysis result' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse JSON from response (handle markdown code blocks)
    let result: AnalysisResult;
    try {
      let jsonStr = content;
      // Remove markdown code blocks if present
      if (jsonStr.includes('```json')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonStr.includes('```')) {
        jsonStr = jsonStr.replace(/```\n?/g, '');
      }
      result = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      return new Response(
        JSON.stringify({ error: 'Failed to parse analysis result' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enhance with keyword-based tag matching if AI didn't provide tags
    if (settings.tagging.enabled && availableTags.length > 0) {
      const keywordMatchedTags = matchTagsByKeywords(description, availableTags);
      
      // Merge AI-suggested tags with keyword-matched tags
      const aiTags = result.suggestedTags || [];
      const allTags = [...new Set([...aiTags, ...keywordMatchedTags])];
      result.suggestedTags = allTags;
    }

    console.log('[analyze-observation] Analysis complete:', {
      language: result.originalLanguage,
      clarityScore: result.clarityScore,
      subtype: result.subtype,
      severity: result.severity,
      positiveNegative: result.positiveNegative,
      suggestedTags: result.suggestedTags
    });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-observation:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
