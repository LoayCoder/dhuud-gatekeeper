import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

interface RCAData {
  five_whys?: Array<{ question: string; answer: string }>;
  immediate_cause?: string;
  underlying_cause?: string;
  root_causes?: Array<{ id: string; text: string }>;
  contributing_factors?: string;
  incident_description?: string;
  incident_title?: string;
}

type ActionType = 'rewrite' | 'suggest_cause' | 'suggest_why' | 'generate_summary' | 'translate';

interface RequestPayload {
  action: ActionType;
  text?: string;
  data?: RCAData;
  target_language?: string;
  context?: string;
  why_level?: number;
}

async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY is not configured');
  }

  console.log(`[RCA AI] Calling AI with system prompt length: ${systemPrompt.length}, user prompt length: ${userPrompt.length}`);

  const response = await fetch(AI_GATEWAY_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[RCA AI] AI Gateway error: ${response.status}`, errorText);
    
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again in a moment.');
    }
    if (response.status === 402) {
      throw new Error('AI credits exhausted. Please add funds to continue.');
    }
    throw new Error(`AI service error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('No response from AI');
  }

  console.log(`[RCA AI] AI response received, length: ${content.length}`);
  return content;
}

// Rewrite text for clarity and ISO 45001/OSHA alignment
async function handleRewrite(text: string, context?: string): Promise<string> {
  const systemPrompt = `You are an expert HSSE (Health, Safety, Security, Environment) technical writer specializing in incident investigation documentation.

Your task is to rewrite the provided text to be:
- Clear, concise, and professionally written
- Aligned with ISO 45001 and OSHA documentation standards
- Free of ambiguous language
- Focused on factual observations rather than assumptions
- Using active voice where appropriate

Return ONLY the rewritten text without any explanation or preamble.`;

  const userPrompt = context 
    ? `Context: ${context}\n\nText to rewrite:\n${text}`
    : `Text to rewrite:\n${text}`;

  return await callAI(systemPrompt, userPrompt);
}

// Suggest a root cause based on analysis
async function handleSuggestCause(data: RCAData): Promise<string> {
  const systemPrompt = `You are an expert HSSE incident investigator specializing in root cause analysis.

Based on the 5-Whys analysis and cause chain provided, suggest a potential root cause that:
- Addresses the systemic issue, not just symptoms
- Is actionable and can be addressed with corrective measures
- Follows the hierarchy: Immediate → Underlying → Root
- Aligns with common root cause categories: Management Systems, Training, Procedures, Equipment, Human Factors, Environmental

Return ONLY the suggested root cause text (1-3 sentences) without any explanation or formatting.`;

  const whysText = data.five_whys?.map((w, i) => `Why ${i + 1}: ${w.question}\nAnswer: ${w.answer}`).join('\n\n') || 'Not provided';
  
  const userPrompt = `Incident: ${data.incident_title || 'Not specified'}
Description: ${data.incident_description || 'Not provided'}

5-Whys Analysis:
${whysText}

Immediate Cause: ${data.immediate_cause || 'Not identified yet'}
Underlying Cause: ${data.underlying_cause || 'Not identified yet'}
Existing Root Causes: ${data.root_causes?.map(rc => rc.text).join('; ') || 'None identified yet'}

Suggest another potential root cause:`;

  return await callAI(systemPrompt, userPrompt);
}

// Suggest an answer for a specific "Why" level
async function handleSuggestWhy(data: RCAData, whyLevel: number): Promise<string> {
  const systemPrompt = `You are an expert HSSE incident investigator conducting a 5-Whys root cause analysis.

Your task is to suggest an answer to the current "Why" question based on the incident context and previous answers.

Guidelines:
- Each answer should dig deeper into the underlying cause
- Avoid surface-level answers that don't probe the real issue
- Focus on systemic factors: procedures, training, equipment, management systems
- Be specific and factual, avoiding speculation
- Keep the answer concise (1-2 sentences)

Return ONLY the suggested answer without any explanation or preamble.`;

  const previousWhys = data.five_whys?.slice(0, whyLevel - 1)
    .map((w, i) => `Why ${i + 1}: ${w.question}\nAnswer: ${w.answer}`)
    .join('\n\n') || '';

  const currentQuestion = data.five_whys?.[whyLevel - 1]?.question || `Why did this occur? (Level ${whyLevel})`;

  const userPrompt = `Incident: ${data.incident_title || 'Not specified'}
Description: ${data.incident_description || 'Not provided'}

${previousWhys ? `Previous Analysis:\n${previousWhys}\n\n` : ''}Current Question (Why ${whyLevel}): ${currentQuestion}

Suggest an answer for Why ${whyLevel}:`;

  return await callAI(systemPrompt, userPrompt);
}

// Generate comprehensive RCA summary
async function handleGenerateSummary(data: RCAData): Promise<string> {
  const systemPrompt = `You are an expert HSSE documentation specialist creating a formal Root Cause Analysis summary.

Create a comprehensive, professionally formatted summary that:
- Follows ISO 45001 and OSHA documentation standards
- Presents findings in a logical, structured format
- Clearly links the 5-Whys analysis to identified causes
- Summarizes root causes and contributing factors
- Is suitable for regulatory review and record-keeping

Format the summary with clear sections:
1. Incident Overview (brief)
2. 5-Whys Analysis Summary
3. Cause Chain (Immediate → Underlying → Root)
4. Contributing Factors
5. Key Findings

Use professional language and maintain objectivity throughout.`;

  const whysText = data.five_whys?.map((w, i) => `Why ${i + 1}: ${w.question}\n   → ${w.answer}`).join('\n') || 'Analysis not completed';
  
  const rootCausesText = data.root_causes?.map((rc, i) => `${i + 1}. ${rc.text}`).join('\n') || 'Not identified';

  const userPrompt = `Generate RCA Summary for:

INCIDENT: ${data.incident_title || 'Untitled Incident'}
DESCRIPTION: ${data.incident_description || 'No description provided'}

5-WHYS ANALYSIS:
${whysText}

IMMEDIATE CAUSE:
${data.immediate_cause || 'Not identified'}

UNDERLYING CAUSE:
${data.underlying_cause || 'Not identified'}

ROOT CAUSES:
${rootCausesText}

CONTRIBUTING FACTORS:
${data.contributing_factors || 'None identified'}

Generate the formal RCA summary:`;

  return await callAI(systemPrompt, userPrompt);
}

// Translate summary to target language
async function handleTranslate(text: string, targetLanguage: string): Promise<string> {
  const languageNames: Record<string, string> = {
    ar: 'Arabic (العربية)',
    en: 'English',
    hi: 'Hindi (हिन्दी)',
    ur: 'Urdu (اردو)',
    fil: 'Filipino (Tagalog)',
  };

  const langName = languageNames[targetLanguage] || targetLanguage;

  const systemPrompt = `You are a professional translator specializing in HSSE (Health, Safety, Security, Environment) documentation.

Translate the provided RCA summary into ${langName}.

Requirements:
- Maintain the same structure and formatting
- Preserve technical terminology accuracy
- Use appropriate formal register for workplace documentation
- Keep any reference IDs, dates, or numbers unchanged
- Ensure cultural appropriateness for the target language

Return ONLY the translated text without any explanation or notes.`;

  const userPrompt = `Translate to ${langName}:\n\n${text}`;

  return await callAI(systemPrompt, userPrompt);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: RequestPayload = await req.json();
    const { action, text, data, target_language, context, why_level } = payload;

    console.log(`[RCA AI] Processing action: ${action}`);

    let result: string;

    switch (action) {
      case 'rewrite':
        if (!text) throw new Error('Text is required for rewrite action');
        result = await handleRewrite(text, context);
        break;

      case 'suggest_cause':
        if (!data) throw new Error('RCA data is required for suggest_cause action');
        result = await handleSuggestCause(data);
        break;

      case 'suggest_why':
        if (!data || !why_level) throw new Error('RCA data and why_level are required for suggest_why action');
        result = await handleSuggestWhy(data, why_level);
        break;

      case 'generate_summary':
        if (!data) throw new Error('RCA data is required for generate_summary action');
        result = await handleGenerateSummary(data);
        break;

      case 'translate':
        if (!text || !target_language) throw new Error('Text and target_language are required for translate action');
        result = await handleTranslate(text, target_language);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`[RCA AI] Action ${action} completed successfully`);

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[RCA AI] Error:', err);
    
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    const status = errorMessage.includes('Rate limit') ? 429 
      : errorMessage.includes('credits') ? 402 
      : 500;

    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
