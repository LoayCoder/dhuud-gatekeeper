import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsPrelight, sanitizeInput, sanitizeObject } from "../_shared/cors.ts";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

interface RCAData {
  five_whys?: Array<{ question: string; answer: string }>;
  immediate_cause?: string;
  underlying_cause?: string;
  root_causes?: Array<{ id: string; text: string }>;
  contributing_factors?: string;
  contributing_factors_list?: Array<{ id: string; text: string }>;
  incident_description?: string;
  incident_title?: string;
  witness_statements?: Array<{ name: string; statement: string }>;
  evidence_descriptions?: string[];
  severity?: string;
  event_type?: string;
  event_subtype?: string;
  selected_cause_type?: 'root_cause' | 'contributing_factor';
  selected_cause_text?: string;
}

type ActionType = 'rewrite' | 'suggest_cause' | 'suggest_why' | 'generate_summary' | 'translate' | 'translate_and_rewrite' | 'generate_whys' | 'generate_immediate_cause' | 'generate_underlying_cause' | 'generate_root_cause' | 'generate_contributing_factor' | 'suggest_corrective_action';

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

// Suggest a root cause based on complete RCA analysis (legacy - kept for backward compatibility)
async function handleSuggestCause(data: RCAData): Promise<string> {
  return handleGenerateRootCause(data);
}

// Generate Root Cause with full progressive data flow
async function handleGenerateRootCause(data: RCAData): Promise<string> {
  const systemPrompt = `You are an expert HSSE incident investigator specializing in root cause analysis.

Based on the complete RCA analysis (5-Whys, Immediate Cause, Underlying Cause), witness statements, and evidence, suggest a ROOT CAUSE.

Root Causes are:
- The fundamental systemic reason WHY the underlying conditions existed
- Actionable - can be addressed through corrective measures
- Categories: Management Systems, Training, Procedures, Equipment, Human Factors, Environmental

Guidelines:
- Base your analysis ONLY on the data provided (no assumptions)
- Write 1-3 clear, factual sentences
- Do NOT repeat existing root causes - suggest a NEW one
- Focus on systemic, fundamental issues that if addressed would prevent recurrence
- Use professional HSSE language aligned with ISO 45001/OSHA

Return ONLY the root cause text without any explanation or formatting.`;

  const whysText = data.five_whys?.length 
    ? data.five_whys.map((w, i) => `Why ${i + 1}: ${w.question}\nAnswer: ${w.answer}`).join('\n\n') 
    : 'Not yet analyzed';
  
  const witnessText = data.witness_statements?.length 
    ? data.witness_statements.map(w => `Witness ${w.name}: ${w.statement}`).join('\n\n')
    : 'No witness statements';
  
  const evidenceText = data.evidence_descriptions?.length 
    ? data.evidence_descriptions.join('\n')
    : 'No evidence descriptions';
  
  const existingRootCauses = data.root_causes?.filter(rc => rc.text?.trim()).map(rc => rc.text).join('; ') || 'None identified yet';
  
  const userPrompt = `INCIDENT: ${data.incident_title || 'Untitled'}
DESCRIPTION: ${data.incident_description || 'No description'}
SEVERITY: ${data.severity || 'Not specified'}
EVENT TYPE: ${data.event_type || 'Not specified'}${data.event_subtype ? ` (${data.event_subtype})` : ''}

5-WHYS ANALYSIS:
${whysText}

IMMEDIATE CAUSE:
${data.immediate_cause || 'Not yet identified'}

UNDERLYING CAUSE:
${data.underlying_cause || 'Not yet identified'}

EXISTING ROOT CAUSES (do not repeat these):
${existingRootCauses}

WITNESS STATEMENTS:
${witnessText}

EVIDENCE:
${evidenceText}

Based on the above, suggest a NEW root cause (1-3 sentences):`;

  return await callAI(systemPrompt, userPrompt);
}

// Generate Contributing Factor with full progressive data flow
async function handleGenerateContributingFactor(data: RCAData): Promise<string> {
  const systemPrompt = `You are an expert HSSE incident investigator conducting root cause analysis.

Based on the complete RCA analysis, suggest a CONTRIBUTING FACTOR.

Contributing Factors are:
- Secondary conditions that amplified the incident but didn't directly cause it
- Environmental, organizational, or behavioral elements
- Often harder to detect but important for comprehensive prevention

Categories to consider:
- Work environment conditions (lighting, noise, temperature, space constraints)
- Organizational factors (workload, staffing, time pressure, resource limitations)
- Communication gaps (unclear instructions, language barriers, handover issues)
- Fatigue, distraction, or stress
- Equipment wear or degradation (not the primary cause but a contributor)
- Weather or external conditions
- Supervision gaps

Guidelines:
- Base your analysis ONLY on the data provided (no assumptions beyond evidence)
- Write 1-2 clear, factual sentences
- Do NOT repeat existing contributing factors - suggest a NEW one
- Focus on factors that made the incident more likely or severe
- Use professional HSSE language aligned with ISO 45001/OSHA

Return ONLY the contributing factor text without any explanation or formatting.`;

  const whysText = data.five_whys?.length 
    ? data.five_whys.map((w, i) => `Why ${i + 1}: ${w.question}\nAnswer: ${w.answer}`).join('\n\n') 
    : 'Not yet analyzed';
  
  const witnessText = data.witness_statements?.length 
    ? data.witness_statements.map(w => `Witness ${w.name}: ${w.statement}`).join('\n\n')
    : 'No witness statements';
  
  const evidenceText = data.evidence_descriptions?.length 
    ? data.evidence_descriptions.join('\n')
    : 'No evidence descriptions';
  
  const rootCausesText = data.root_causes?.filter(rc => rc.text?.trim()).map(rc => rc.text).join('; ') || 'Not identified';
  
  const existingFactors = data.contributing_factors_list?.filter(cf => cf.text?.trim()).map(cf => cf.text).join('; ') || 'None identified yet';
  
  const userPrompt = `INCIDENT: ${data.incident_title || 'Untitled'}
DESCRIPTION: ${data.incident_description || 'No description'}
SEVERITY: ${data.severity || 'Not specified'}
EVENT TYPE: ${data.event_type || 'Not specified'}${data.event_subtype ? ` (${data.event_subtype})` : ''}

5-WHYS ANALYSIS:
${whysText}

IMMEDIATE CAUSE:
${data.immediate_cause || 'Not yet identified'}

UNDERLYING CAUSE:
${data.underlying_cause || 'Not yet identified'}

ROOT CAUSES:
${rootCausesText}

EXISTING CONTRIBUTING FACTORS (do not repeat these):
${existingFactors}

WITNESS STATEMENTS:
${witnessText}

EVIDENCE:
${evidenceText}

Based on the above, suggest a NEW contributing factor (1-2 sentences):`;

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

// Translate any language to English and rewrite in professional HSSE style
async function handleTranslateAndRewrite(text: string, fieldType: string): Promise<string> {
  const fieldGuidelines = fieldType === 'title' 
    ? `- Keep the result under 100 characters
- Be concise but descriptive
- Start with action verb or clear subject`
    : `- Be comprehensive but clear
- Include relevant safety context
- Describe what happened, contributing factors, and immediate context
- Aim for 2-4 sentences`;

  const systemPrompt = `You are an expert HSSE (Health, Safety, Security, Environment) professional and technical writer.

Your task:
1. If the input text is NOT in English, translate it to English first
2. Then rewrite it in clear, professional HSSE documentation style

Guidelines:
- Use professional ISO 45001 / OSHA-aligned terminology
- Be concise and factual
- Use active voice
- Remove ambiguity and vague language
- Focus on objective observations
${fieldGuidelines}

Return ONLY the final English text without any explanation, preamble, or quotes.`;

  return await callAI(systemPrompt, text);
}

// Generate 3-5 Why questions based on incident context
async function handleGenerateWhys(data: RCAData): Promise<string> {
  const systemPrompt = `You are an expert HSSE incident investigator conducting 5-Whys root cause analysis.

Based on the incident details, severity level, event classification, witness statements, and evidence provided, generate 3-5 "Why" questions with answers that progressively dig deeper into the root cause.

Guidelines:
- Start with the immediate "Why did this happen?" and dig deeper with each subsequent why
- Each answer should lead logically to the next why question
- Focus on systemic factors: procedures, training, equipment, management systems
- Be specific and factual based on the provided context
- Aim for 3-5 whys (minimum 3, maximum 5)
- Make sure each "why" question naturally follows from the previous answer

Return ONLY a JSON array in this exact format (no markdown, no code blocks):
[{"why": "Why did [specific event] occur?", "answer": "Because [factual answer based on evidence]..."}, ...]`;

  const witnessText = data.witness_statements?.length 
    ? data.witness_statements.map(w => `Witness: ${w.name}\nStatement: ${w.statement}`).join('\n\n') 
    : 'No witness statements available';
  
  const evidenceText = data.evidence_descriptions?.length 
    ? data.evidence_descriptions.join('\n') 
    : 'No evidence descriptions available';

  const userPrompt = `INCIDENT: ${data.incident_title || 'Untitled'}
DESCRIPTION: ${data.incident_description || 'No description'}
SEVERITY: ${data.severity || 'Not specified'}
EVENT TYPE: ${data.event_type || 'Not specified'}${data.event_subtype ? ` (${data.event_subtype})` : ''}

WITNESS STATEMENTS:
${witnessText}

EVIDENCE:
${evidenceText}

Generate 3-5 Why questions with answers in JSON format:`;

  return await callAI(systemPrompt, userPrompt);
}

// Generate Immediate Cause based on 5-Whys analysis
async function handleGenerateImmediateCause(data: RCAData): Promise<string> {
  const systemPrompt = `You are an expert HSSE incident investigator conducting root cause analysis.

Based on the 5-Whys analysis and incident context provided, identify the IMMEDIATE CAUSE.

The Immediate Cause is:
- The direct action, condition, or event that triggered the incident
- What happened immediately before the incident
- NOT the underlying systemic issue, but the direct cause

Guidelines:
- Base your analysis ONLY on the data provided (no assumptions)
- Write 1-2 clear, factual sentences
- Use professional HSSE language aligned with ISO 45001/OSHA
- Focus on the direct trigger, not root causes

Return ONLY the immediate cause text without any explanation or formatting.`;

  const whysText = data.five_whys?.length 
    ? data.five_whys.map((w, i) => `Why ${i + 1}: ${w.question}\nAnswer: ${w.answer}`).join('\n\n')
    : 'Not yet analyzed';
  
  const witnessText = data.witness_statements?.length 
    ? data.witness_statements.map(w => `Witness ${w.name}: ${w.statement}`).join('\n\n')
    : 'No witness statements';
  
  const evidenceText = data.evidence_descriptions?.length 
    ? data.evidence_descriptions.join('\n')
    : 'No evidence descriptions';

  const userPrompt = `INCIDENT: ${data.incident_title || 'Untitled'}
DESCRIPTION: ${data.incident_description || 'No description'}
SEVERITY: ${data.severity || 'Not specified'}
EVENT TYPE: ${data.event_type || 'Not specified'}${data.event_subtype ? ` (${data.event_subtype})` : ''}

5-WHYS ANALYSIS:
${whysText}

WITNESS STATEMENTS:
${witnessText}

EVIDENCE:
${evidenceText}

Based on the above, identify the IMMEDIATE CAUSE (1-2 sentences):`;

  return await callAI(systemPrompt, userPrompt);
}

// Generate Underlying Cause based on 5-Whys and Immediate Cause
async function handleGenerateUnderlyingCause(data: RCAData): Promise<string> {
  const systemPrompt = `You are an expert HSSE incident investigator conducting root cause analysis.

Based on the 5-Whys analysis, Immediate Cause, and incident context, identify the UNDERLYING CAUSE.

The Underlying Cause is:
- The systemic condition or factor that allowed the immediate cause to occur
- WHY the immediate cause existed or was possible
- Deeper than the immediate trigger but not yet the root cause

Guidelines:
- Base your analysis ONLY on the data provided (no assumptions)
- Write 1-2 clear, factual sentences
- Use professional HSSE language aligned with ISO 45001/OSHA
- Focus on the systemic condition, not the immediate trigger

Return ONLY the underlying cause text without any explanation or formatting.`;

  const whysText = data.five_whys?.length 
    ? data.five_whys.map((w, i) => `Why ${i + 1}: ${w.question}\nAnswer: ${w.answer}`).join('\n\n')
    : 'Not yet analyzed';
  
  const witnessText = data.witness_statements?.length 
    ? data.witness_statements.map(w => `Witness ${w.name}: ${w.statement}`).join('\n\n')
    : 'No witness statements';
  
  const evidenceText = data.evidence_descriptions?.length 
    ? data.evidence_descriptions.join('\n')
    : 'No evidence descriptions';

  const userPrompt = `INCIDENT: ${data.incident_title || 'Untitled'}
DESCRIPTION: ${data.incident_description || 'No description'}
SEVERITY: ${data.severity || 'Not specified'}
EVENT TYPE: ${data.event_type || 'Not specified'}${data.event_subtype ? ` (${data.event_subtype})` : ''}

5-WHYS ANALYSIS:
${whysText}

IMMEDIATE CAUSE:
${data.immediate_cause || 'Not yet identified'}

WITNESS STATEMENTS:
${witnessText}

EVIDENCE:
${evidenceText}

Based on the above, identify the UNDERLYING CAUSE (1-2 sentences):`;

  return await callAI(systemPrompt, userPrompt);
}

// Generate Corrective Action suggestion based on a selected cause
async function handleSuggestCorrectiveAction(data: RCAData): Promise<string> {
  const causeTypeLabel = data.selected_cause_type === 'root_cause' ? 'ROOT CAUSE' : 'CONTRIBUTING FACTOR';
  
  const systemPrompt = `You are an expert HSSE professional specializing in corrective and preventive actions (CAPA).

Based on the ${causeTypeLabel} provided from an RCA, suggest a corrective action that:
- Directly addresses the identified cause
- Is actionable and measurable
- Follows the hierarchy of controls (Elimination > Substitution > Engineering > Administrative > PPE)
- Is aligned with ISO 45001 standards

Return ONLY a JSON object with this structure (no markdown, no code blocks):
{
  "title": "Short, action-oriented title (max 100 chars)",
  "description": "Detailed description of the corrective action (2-4 sentences)",
  "category": "engineering_controls|administrative_controls|training|ppe|procedure_update|inspection|maintenance|other",
  "action_type": "immediate|corrective|preventive",
  "priority": "low|medium|high|critical"
}`;

  const whysText = data.five_whys?.length 
    ? data.five_whys.map((w, i) => `Why ${i + 1}: ${w.question} → ${w.answer}`).join('\n')
    : 'Not analyzed';

  const userPrompt = `INCIDENT: ${data.incident_title || 'Untitled'}
DESCRIPTION: ${data.incident_description || 'No description'}
SEVERITY: ${data.severity || 'Not specified'}

RCA SUMMARY:
- 5 Whys: ${whysText}
- Immediate Cause: ${data.immediate_cause || 'Not identified'}
- Underlying Cause: ${data.underlying_cause || 'Not identified'}

${causeTypeLabel} TO ADDRESS:
"${data.selected_cause_text || 'No cause selected'}"

Suggest a corrective action with title, description, category, type, and priority. Return JSON only:`;

  return await callAI(systemPrompt, userPrompt);
}

serve(async (req) => {
  // Handle CORS preflight
  const preflightResponse = handleCorsPrelight(req);
  if (preflightResponse) return preflightResponse;
  
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  try {
    const rawPayload = await req.json();
    
    // Sanitize the entire payload to prevent XSS
    const payload: RequestPayload = sanitizeObject(rawPayload);
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

      case 'translate_and_rewrite':
        if (!text) throw new Error('Text is required for translate_and_rewrite action');
        result = await handleTranslateAndRewrite(text, context || 'description');
        break;

      case 'generate_whys':
        if (!data) throw new Error('RCA data is required for generate_whys action');
        result = await handleGenerateWhys(data);
        break;

      case 'generate_immediate_cause':
        if (!data) throw new Error('RCA data is required for generate_immediate_cause action');
        result = await handleGenerateImmediateCause(data);
        break;

      case 'generate_underlying_cause':
        if (!data) throw new Error('RCA data is required for generate_underlying_cause action');
        result = await handleGenerateUnderlyingCause(data);
        break;

      case 'generate_root_cause':
        if (!data) throw new Error('RCA data is required for generate_root_cause action');
        result = await handleGenerateRootCause(data);
        break;

      case 'generate_contributing_factor':
        if (!data) throw new Error('RCA data is required for generate_contributing_factor action');
        result = await handleGenerateContributingFactor(data);
        break;

      case 'suggest_corrective_action':
        if (!data) throw new Error('RCA data is required for suggest_corrective_action action');
        result = await handleSuggestCorrectiveAction(data);
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
