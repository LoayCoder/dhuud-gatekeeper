import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KPITarget {
  kpi_code: string;
  kpi_name: string;
  target_value: number;
  warning_threshold: number;
  critical_threshold: number;
  current_value?: number;
}

interface KPIEvaluation {
  kpi_code: string;
  kpi_name: string;
  current_value: number;
  target_value: number;
  performance_percentage: number;
  status: 'exceeding' | 'on-track' | 'at-risk' | 'failing';
  gap_analysis: {
    gap_value: number;
    gap_percentage: number;
    primary_causes: string[];
    contributing_factors: string[];
  };
  ai_insights: {
    root_causes: string[];
    recommendations: string[];
    estimated_impact: string;
    target_suggestion?: number;
  };
  trend_forecast: {
    projected_value: number;
    timeframe: string;
    confidence: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { kpiTargets, currentValues, language = 'en' } = await req.json();

    console.log("KPI AI Evaluation request:", { 
      targetsCount: kpiTargets?.length,
      language 
    });

    const systemPrompt = language === 'ar' 
      ? `أنت خبير تحليل أداء HSSE. قم بتقييم مؤشرات الأداء الرئيسية وتقديم تحليل الفجوات والتوصيات.`
      : `You are an HSSE performance analytics expert. Evaluate KPIs and provide gap analysis with actionable recommendations.`;

    const userPrompt = `Analyze these KPI performance metrics and provide detailed evaluation:

KPI Targets and Current Values:
${JSON.stringify(kpiTargets, null, 2)}

Current Performance Data:
${JSON.stringify(currentValues, null, 2)}

For each KPI, provide:
1. Performance percentage (current/target * 100)
2. Status: exceeding (>110%), on-track (90-110%), at-risk (70-90%), failing (<70%)
3. Gap analysis with root causes
4. Specific improvement recommendations
5. Trend forecast for next period

Return a JSON object with this structure:
{
  "evaluations": [
    {
      "kpi_code": "string",
      "kpi_name": "string",
      "current_value": number,
      "target_value": number,
      "performance_percentage": number,
      "status": "exceeding|on-track|at-risk|failing",
      "gap_analysis": {
        "gap_value": number,
        "gap_percentage": number,
        "primary_causes": ["cause1", "cause2"],
        "contributing_factors": ["factor1", "factor2"]
      },
      "ai_insights": {
        "root_causes": ["root cause analysis"],
        "recommendations": ["specific action items"],
        "estimated_impact": "Expected improvement description",
        "target_suggestion": number or null
      },
      "trend_forecast": {
        "projected_value": number,
        "timeframe": "next month/quarter",
        "confidence": number (0-100)
      }
    }
  ],
  "overall_summary": {
    "total_kpis": number,
    "exceeding_count": number,
    "on_track_count": number,
    "at_risk_count": number,
    "failing_count": number,
    "top_priority_actions": ["action1", "action2", "action3"],
    "performance_narrative": "Overall performance summary"
  }
}

${language === 'ar' ? 'Respond in Arabic.' : 'Respond in English.'}`;

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
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const errorText = await response.text();
      console.error("AI Gateway error:", status, errorText);
      
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI Gateway error: ${status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse AI response as JSON");
    }

    const evaluation = JSON.parse(jsonMatch[0]);

    console.log("KPI AI Evaluation completed:", {
      evaluationsCount: evaluation.evaluations?.length,
      summary: evaluation.overall_summary
    });

    return new Response(JSON.stringify(evaluation), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("KPI AI Evaluation error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
