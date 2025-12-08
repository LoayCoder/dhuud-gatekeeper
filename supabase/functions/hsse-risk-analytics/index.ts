import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dashboardData, language = 'en' } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context from dashboard data (no PII, only aggregated stats)
    const context = buildAnalysisContext(dashboardData);
    
    const systemPrompt = `You are an expert HSSE (Health, Safety, Security, Environment) Risk Analyst AI. 
Your role is to analyze incident and event data to identify patterns, anomalies, and provide proactive recommendations.
You must respond in ${language === 'ar' ? 'Arabic' : language === 'ur' ? 'Urdu' : language === 'hi' ? 'Hindi' : language === 'fil' ? 'Filipino' : 'English'}.

IMPORTANT: Provide actionable, specific recommendations based on the data patterns. Focus on:
1. Risk patterns by location, time, or event type
2. Anomalies that need immediate attention
3. Proactive measures to prevent incidents
4. Trends that suggest systemic issues

Return your analysis in the following JSON structure:
{
  "patterns": [
    {
      "pattern_type": "location" | "time" | "type" | "severity",
      "description": "Brief description of the pattern",
      "confidence": 0.0-1.0,
      "affected_areas": ["area1", "area2"],
      "recommendation": "Specific action to address this pattern"
    }
  ],
  "anomalies": [
    {
      "type": "spike" | "drop" | "new_pattern",
      "description": "Description of the anomaly",
      "severity": "info" | "warning" | "critical",
      "date_range": "When this occurred"
    }
  ],
  "recommendations": [
    {
      "priority": "high" | "medium" | "low",
      "area": "Affected area or department",
      "action": "Specific action to take",
      "expected_impact": "Expected outcome if implemented"
    }
  ],
  "summary": "A 2-3 sentence executive summary of the key findings and most critical actions needed."
}`;

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
          { role: "user", content: `Analyze this HSSE dashboard data and provide risk insights:\n\n${context}` }
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content in AI response");
    }

    let insights;
    try {
      insights = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      insights = {
        patterns: [],
        anomalies: [],
        recommendations: [],
        summary: content
      };
    }

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("HSSE Risk Analytics error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      patterns: [],
      anomalies: [],
      recommendations: [],
      summary: ""
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildAnalysisContext(data: any): string {
  const parts: string[] = [];

  if (data?.summary) {
    parts.push(`## Event Summary (Last 12 Months)
- Total Events: ${data.summary.total_events || 0}
- Incidents: ${data.summary.total_incidents || 0}
- Observations: ${data.summary.total_observations || 0}
- Open Investigations: ${data.summary.open_investigations || 0}
- Pending Closure: ${data.summary.pending_closure || 0}
- Closed This Month: ${data.summary.closed_this_month || 0}
- Average Closure Days: ${data.summary.avg_closure_days || 0}`);
  }

  if (data?.by_status) {
    parts.push(`\n## Status Distribution
- Submitted: ${data.by_status.submitted || 0}
- Investigation In Progress: ${data.by_status.investigation_in_progress || 0}
- Pending Closure: ${data.by_status.pending_closure || 0}
- Closed: ${data.by_status.closed || 0}`);
  }

  if (data?.by_severity) {
    parts.push(`\n## Severity Distribution
- Critical: ${data.by_severity.critical || 0}
- High: ${data.by_severity.high || 0}
- Medium: ${data.by_severity.medium || 0}
- Low: ${data.by_severity.low || 0}`);
  }

  if (data?.by_event_type) {
    parts.push(`\n## Event Type Distribution
- Observations: ${data.by_event_type.observation || 0}
- Incidents: ${data.by_event_type.incident || 0}
- Near Misses: ${data.by_event_type.near_miss || 0}
- Security Events: ${data.by_event_type.security_event || 0}
- Environmental Events: ${data.by_event_type.environmental_event || 0}`);
  }

  if (data?.monthly_trend?.length > 0) {
    parts.push(`\n## Monthly Trend (Last 12 Months)`);
    data.monthly_trend.forEach((m: any) => {
      parts.push(`- ${m.month}: Total=${m.total}, Incidents=${m.incidents}, Observations=${m.observations}`);
    });
  }

  if (data?.actions) {
    parts.push(`\n## Corrective Actions Status
- Open Actions: ${data.actions.open_actions || 0}
- Overdue Actions: ${data.actions.overdue_actions || 0}
- Critical Priority Actions: ${data.actions.critical_actions || 0}
- High Priority Actions: ${data.actions.high_priority_actions || 0}`);
  }

  if (data?.locationData?.by_branch?.length > 0) {
    parts.push(`\n## Events by Branch`);
    data.locationData.by_branch.slice(0, 10).forEach((b: any) => {
      parts.push(`- ${b.branch_name}: Total=${b.total_events}, Incidents=${b.incidents}, Observations=${b.observations}`);
    });
  }

  if (data?.locationData?.by_department?.length > 0) {
    parts.push(`\n## Events by Department`);
    data.locationData.by_department.slice(0, 10).forEach((d: any) => {
      parts.push(`- ${d.department_name}: Total=${d.total_events}, Incidents=${d.incidents}, Open Investigations=${d.open_investigations}`);
    });
  }

  return parts.join('\n');
}
