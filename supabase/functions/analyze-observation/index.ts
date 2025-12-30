import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisRequest {
  description: string;
  responseLanguage?: string;
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

    const { description, responseLanguage = 'en' }: AnalysisRequest = await req.json();

    // Map language codes to full names for the AI
    const languageNames: Record<string, string> = {
      'ar': 'Arabic',
      'en': 'English',
      'ur': 'Urdu',
      'hi': 'Hindi',
      'fil': 'Filipino'
    };
    const targetLanguage = languageNames[responseLanguage] || 'English';

    if (!description || description.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Description is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing observation description:', description.substring(0, 100) + '...');

    const systemPrompt = `You are an HSSE (Health, Safety, Security, Environment) expert AI assistant analyzing workplace observations. Your task is to:

1. **Detect Language**: Identify the language of the input text.
2. **Translate**: If not English, translate to professional English while preserving technical terms.
3. **Score Clarity**: Evaluate how clear and specific the description is (0-100 scale).
4. **Identify Issues**: Find ambiguous terms ("some", "maybe", "probably", "few", "several") and missing context.
5. **Classify Observation Type**: Determine if it's an unsafe_act, unsafe_condition, safe_act, or safe_condition.
6. **Assess Severity**: Rate from level_1 (minor) to level_5 (catastrophic) based on potential harm.
7. **Calculate Likelihood**: Rate as rare, unlikely, possible, likely, or almost_certain.
8. **Identify Key Risks**: List specific hazards or risks mentioned.

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
  - subtype: Use ONLY: "unsafe_act", "unsafe_condition", "safe_act", "safe_condition"
  - severity: Use ONLY: "level_1", "level_2", "level_3", "level_4", "level_5"
  - likelihood: Use ONLY: "rare", "unlikely", "possible", "likely", "almost_certain"

Required Output Format (JSON):
{
  "originalLanguage": "detected language name in English (e.g., 'Arabic', 'English', 'Hindi')",
  "originalText": "the original input text",
  "translatedText": "English translation (same as original if already English)",
  "translationRequired": boolean,
  "wordCount": number,
  "clarityScore": number (0-100),
  "isValid": boolean (true if clarityScore >= 70),
  "validationErrors": ["list in ${targetLanguage}"],
  "ambiguousTerms": ["list in ${targetLanguage}"],
  "missingSections": ["English keys only: equipment, activity"],
  "improvementSuggestions": ["list in ${targetLanguage}"],
  "subtype": "unsafe_act" | "unsafe_condition" | "safe_act" | "safe_condition",
  "subtypeConfidence": number (0-100),
  "severity": "level_1" | "level_2" | "level_3" | "level_4" | "level_5",
  "severityConfidence": number (0-100),
  "likelihood": "rare" | "unlikely" | "possible" | "likely" | "almost_certain",
  "likelihoodConfidence": number (0-100),
  "keyRisks": ["list in ${targetLanguage}"]
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

    console.log('Analysis complete:', {
      language: result.originalLanguage,
      clarityScore: result.clarityScore,
      subtype: result.subtype,
      severity: result.severity
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
