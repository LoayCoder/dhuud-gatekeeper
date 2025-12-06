import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AnalysisType = "rewrite" | "summarize" | "detect_missing" | "full_analysis";

interface AnalysisRequest {
  statement: string;
  analysisType: AnalysisType;
  context?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { statement, analysisType, context } = await req.json() as AnalysisRequest;
    
    if (!statement) {
      throw new Error("No statement provided");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Analyzing witness statement with type: ${analysisType}`);

    let systemPrompt = "";
    let userPrompt = "";

    switch (analysisType) {
      case "rewrite":
        systemPrompt = `You are an expert legal/investigation document editor. Your task is to rewrite witness statements for clarity while preserving all factual content.

Instructions:
1. Improve grammar and sentence structure
2. Ensure chronological flow
3. Maintain the witness's voice and perspective
4. Keep all factual details intact
5. Use professional, clear language
6. Do not add or remove any information

Return ONLY the rewritten statement, no additional commentary.`;
        userPrompt = `Please rewrite this witness statement for clarity:\n\n${statement}`;
        break;

      case "summarize":
        systemPrompt = `You are an expert investigation report writer. Your task is to create concise summaries of witness statements for inclusion in investigation reports.

Instructions:
1. Extract key facts and observations
2. Note the sequence of events
3. Highlight critical details
4. Keep the summary under 150 words
5. Use bullet points for clarity
6. Include any specific times, locations, or people mentioned

Return ONLY the summary, formatted with bullet points.`;
        userPrompt = `Please summarize this witness statement for an investigation report:\n\n${statement}`;
        break;

      case "detect_missing":
        systemPrompt = `You are an expert investigation interviewer. Your task is to identify missing information in witness statements that would be valuable for a thorough investigation.

Instructions:
1. Identify gaps in the timeline
2. Note missing sensory details (what they saw, heard, smelled)
3. Flag unclear references to people or locations
4. Suggest follow-up questions
5. Note any inconsistencies or vague statements
6. Consider physical evidence that should be mentioned

Return a structured list of:
- Missing Details: [list specific missing information]
- Suggested Follow-up Questions: [list questions to ask]
- Clarifications Needed: [list areas that need more detail]`;
        userPrompt = `Please analyze this witness statement for missing details:\n\n${statement}${context ? `\n\nIncident Context: ${context}` : ''}`;
        break;

      case "full_analysis":
        systemPrompt = `You are an expert behavioral analyst and investigation specialist. Your task is to perform a comprehensive analysis of witness statements.

Return a JSON object with the following structure:
{
  "emotionalCues": {
    "detected": ["list of emotional indicators found in the text"],
    "confidence": "low|medium|high",
    "notes": "brief explanation of emotional state indicators"
  },
  "credibilityIndicators": {
    "strengths": ["specific details", "consistent timeline", etc.],
    "concerns": ["vague statements", "inconsistencies", etc.],
    "score": 1-10
  },
  "keyFacts": ["list of key factual claims"],
  "timeline": ["chronological events mentioned"],
  "improvementSuggestions": ["list of ways to improve the statement"],
  "summary": "2-3 sentence summary"
}

Analyze for:
1. Emotional cues (stress, hesitation, uncertainty, confidence)
2. Credibility indicators
3. Key facts and claims
4. Timeline of events
5. Areas needing improvement`;
        userPrompt = `Please perform a full analysis of this witness statement:\n\n${statement}`;
        break;

      default:
        throw new Error(`Unknown analysis type: ${analysisType}`);
    }

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
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    console.log("Analysis completed successfully");

    // For full_analysis, try to parse as JSON
    if (analysisType === "full_analysis") {
      try {
        // Extract JSON from the response (handle markdown code blocks)
        const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
        const analysis = JSON.parse(jsonStr);
        return new Response(
          JSON.stringify({ analysis, raw: content }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch {
        // Return raw content if JSON parsing fails
        return new Response(
          JSON.stringify({ result: content, parseError: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ result: content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Analysis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
