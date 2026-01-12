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
    const { stats, language = 'en' } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ insights: generateFallbackInsights(stats, language) }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isArabic = language === 'ar';
    
    const systemPrompt = isArabic 
      ? `أنت مدرب سلامة ذكي يقدم نصائح شخصية للموظفين. بناءً على إحصائيات الإبلاغ الخاصة بهم، قدم 2-3 نصائح قصيرة وتحفيزية. كن إيجابياً وداعماً. أجب بالعربية فقط.`
      : `You are an AI safety coach providing personalized tips to employees. Based on their reporting statistics, provide 2-3 short, motivational insights. Be positive and encouraging. Focus on actionable improvements.`;

    const userPrompt = isArabic
      ? `إحصائيات الموظف:
- إجمالي الحوادث المبلغ عنها: ${stats.my_incidents}
- إجمالي الملاحظات: ${stats.my_observations}
- حوادث هذا الشهر: ${stats.my_incidents_this_month}
- ملاحظات هذا الشهر: ${stats.my_observations_this_month}
- الإجراءات المكتملة: ${stats.completed_actions}
- الترتيب في الشركة: ${stats.company_rank || 'غير مصنف'}
- النسبة المئوية: أعلى ${Math.round(100 - (stats.percentile || 0))}%
- اتجاه الحوادث: ${stats.trend_incidents > 0 ? 'زيادة' : stats.trend_incidents < 0 ? 'نقصان' : 'ثابت'}
- اتجاه الملاحظات: ${stats.trend_observations > 0 ? 'زيادة' : stats.trend_observations < 0 ? 'نقصان' : 'ثابت'}

قدم 2-3 نصائح شخصية.`
      : `Employee statistics:
- Total incidents reported: ${stats.my_incidents}
- Total observations: ${stats.my_observations}
- Incidents this month: ${stats.my_incidents_this_month}
- Observations this month: ${stats.my_observations_this_month}
- Completed actions: ${stats.completed_actions}
- Company rank: ${stats.company_rank || 'Not ranked'}
- Percentile: Top ${Math.round(100 - (stats.percentile || 0))}%
- Incident trend: ${stats.trend_incidents > 0 ? 'increasing' : stats.trend_incidents < 0 ? 'decreasing' : 'stable'}
- Observation trend: ${stats.trend_observations > 0 ? 'increasing' : stats.trend_observations < 0 ? 'decreasing' : 'stable'}

Provide 2-3 personalized insights.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_insights",
              description: "Return personalized safety insights for the employee",
              parameters: {
                type: "object",
                properties: {
                  insights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", description: "Unique identifier for the insight" },
                        title: { type: "string", description: "Short title for the insight" },
                        description: { type: "string", description: "Detailed description of the insight" },
                        type: { type: "string", enum: ["tip", "achievement", "suggestion"] },
                        icon: { type: "string", enum: ["Lightbulb", "Trophy", "TrendingUp", "CheckCircle", "Eye", "Target"] },
                      },
                      required: ["id", "title", "description", "type", "icon"],
                      additionalProperties: false,
                    },
                    minItems: 2,
                    maxItems: 3,
                  },
                },
                required: ["insights"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "provide_insights" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn("Rate limited, returning fallback insights");
        return new Response(
          JSON.stringify({ insights: generateFallbackInsights(stats, language) }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        console.warn("Payment required, returning fallback insights");
        return new Response(
          JSON.stringify({ insights: generateFallbackInsights(stats, language) }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    
    // Extract tool call response
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(
        JSON.stringify({ insights: parsed.insights }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback if no tool call
    return new Response(
      JSON.stringify({ insights: generateFallbackInsights(stats, language) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error generating AI insights:", error);
    return new Response(
      JSON.stringify({ 
        insights: generateFallbackInsights({}, 'en'),
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 200, // Return 200 with fallback insights
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function generateFallbackInsights(stats: any, language: string) {
  const isArabic = language === 'ar';
  const insights = [];

  if (stats?.my_observations > stats?.my_incidents * 2) {
    insights.push({
      id: 'observation-focused',
      title: isArabic ? 'مراقب ممتاز!' : 'Great Observer!',
      description: isArabic 
        ? 'ملاحظاتك تساعد في منع الحوادث قبل وقوعها. استمر!' 
        : 'Your observations help prevent incidents before they happen. Keep it up!',
      type: 'achievement',
      icon: 'Eye',
    });
  }

  if (stats?.percentile >= 75) {
    insights.push({
      id: 'top-performer',
      title: isArabic ? 'أداء متميز' : 'Top Performer',
      description: isArabic
        ? `أنت في أعلى ${Math.round(100 - stats.percentile)}% من المبلغين`
        : `You're in the top ${Math.round(100 - stats.percentile)}% of reporters`,
      type: 'achievement',
      icon: 'Trophy',
    });
  }

  if (stats?.trend_observations > 0) {
    insights.push({
      id: 'trend-up',
      title: isArabic ? 'تحسن ملحوظ' : 'Improvement Trend',
      description: isArabic
        ? `زيادة ${stats.trend_observations} ملاحظات مقارنة بالشهر الماضي`
        : `${stats.trend_observations} more observations than last month`,
      type: 'tip',
      icon: 'TrendingUp',
    });
  }

  // Always include a tip
  if (insights.length < 2) {
    insights.push({
      id: 'near-miss-tip',
      title: isArabic ? 'نصيحة السلامة' : 'Safety Tip',
      description: isArabic
        ? 'الإبلاغ عن الحوادث الوشيكة يساعد في منع الحوادث الكبيرة'
        : 'Reporting near-misses helps prevent major incidents',
      type: 'tip',
      icon: 'Lightbulb',
    });
  }

  return insights.slice(0, 3);
}
