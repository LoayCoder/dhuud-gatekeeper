import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description } = await req.json();
    
    if (!description || description.length < 20) {
      return new Response(
        JSON.stringify({ error: 'Description must be at least 20 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Analyzing incident description:", description.substring(0, 100));

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an HSSE (Health, Safety, Security, Environment) expert analyzing incident reports.
Classify the incident and assess severity based on industry standards (ISO 45001, OSHA).
Be precise and consistent in your classifications.`
          },
          {
            role: "user",
            content: `Analyze this HSSE event description and classify it:

"${description}"

Determine:
1. Event type (observation or incident)
2. Specific subtype
3. Severity level
4. Key risks identified`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_incident",
              description: "Classify an HSSE event with type, severity, and risk assessment",
              parameters: {
                type: "object",
                properties: {
                  eventType: {
                    type: "string",
                    enum: ["observation", "incident"],
                    description: "Primary event category. Use 'observation' for unsafe acts/conditions without actual harm. Use 'incident' for near misses, injuries, damage, or actual events."
                  },
                  subtype: {
                    type: "string",
                    enum: [
                      "unsafe_act", "unsafe_condition",
                      "near_miss", "property_damage", "environmental",
                      "first_aid", "medical_treatment", "fire", "security"
                    ],
                    description: "Specific subtype. For observations: unsafe_act or unsafe_condition. For incidents: near_miss, property_damage, environmental, first_aid, medical_treatment, fire, or security."
                  },
                  severity: {
                    type: "string",
                    enum: ["low", "medium", "high", "critical"],
                    description: "Severity level. low=no injury/minor hazard, medium=minor injury/property damage, high=serious injury/hospitalization, critical=fatality/major disaster"
                  },
                  keyRisks: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of 2-4 key risk factors or safety concerns identified"
                  },
                  confidence: {
                    type: "number",
                    description: "Confidence score between 0.0 and 1.0"
                  },
                  reasoning: {
                    type: "string",
                    description: "Brief explanation of the classification decision"
                  }
                },
                required: ["eventType", "subtype", "severity", "keyRisks", "confidence"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "classify_incident" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add credits." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response received:", JSON.stringify(data).substring(0, 200));

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "classify_incident") {
      throw new Error("Unexpected AI response format");
    }

    const result = JSON.parse(toolCall.function.arguments);
    console.log("Classification result:", result);

    return new Response(
      JSON.stringify({
        eventType: result.eventType,
        subtype: result.subtype,
        severity: result.severity,
        keyRisks: result.keyRisks || [],
        confidence: result.confidence || 0.8,
        reasoning: result.reasoning
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("analyze-incident error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Analysis failed" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
