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
    
    const systemPrompt = `You are an expert HSSE (Health, Safety, Security, Environment) Risk Analyst AI with deep expertise in predictive safety analytics. 
Your role is to analyze incident and event data to identify patterns, anomalies, emerging hazards, and provide proactive risk predictions.
You must respond in ${language === 'ar' ? 'Arabic' : language === 'ur' ? 'Urdu' : language === 'hi' ? 'Hindi' : language === 'fil' ? 'Filipino' : 'English'}.

IMPORTANT: Provide actionable, specific analysis based on the data patterns. Focus on:
1. Risk patterns by location, time, or event type
2. Anomalies that need immediate attention
3. Emerging hazards before they become incidents
4. Predictive risk forecasting based on trends
5. Branch and department risk scoring
6. Behavioral safety trends from observations
7. Proactive measures to prevent incidents

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
  "emerging_hazards": [
    {
      "category": "Hazard category (e.g., Electrical, Chemical, Ergonomic, Behavioral)",
      "trend": "Description of the emerging trend",
      "risk_level": "low" | "medium" | "high" | "critical",
      "early_indicators": "What data points suggest this hazard"
    }
  ],
  "predictive_risks": [
    {
      "description": "What might happen if current trends continue",
      "probability": "low" | "medium" | "high",
      "timeframe": "Expected timeframe (e.g., 'Next 30 days', 'Q1 2025')",
      "prevention_action": "What to do now to prevent this"
    }
  ],
  "branch_risk_scores": [
    {
      "branch_name": "Name of the branch/location",
      "risk_level": "low" | "medium" | "high" | "critical",
      "score": 0-100,
      "top_issue": "Primary risk driver for this branch"
    }
  ],
  "department_risk_scores": [
    {
      "department_name": "Name of the department",
      "risk_level": "low" | "medium" | "high" | "critical",
      "score": 0-100,
      "top_issue": "Primary risk driver for this department"
    }
  ],
  "behavioral_insights": [
    {
      "observation_type": "Type of behavior observed (e.g., PPE compliance, Safe lifting, Housekeeping)",
      "trend": "improving" | "declining" | "stable",
      "percentage_change": "+15%" or "-10%" format,
      "recommendation": "Specific intervention to improve behavior"
    }
  ],
  "summary": "A 2-3 sentence executive summary of the key findings and most critical actions needed."
}

IMPORTANT: Generate at least 2-3 items for each category based on the data provided. If data is limited, make reasonable inferences based on industry patterns.`;

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
          { role: "user", content: `Analyze this HSSE dashboard data and provide comprehensive risk insights including emerging hazards, predictive risks, and behavioral analysis:\n\n${context}` }
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
        emerging_hazards: [],
        predictive_risks: [],
        branch_risk_scores: [],
        department_risk_scores: [],
        behavioral_insights: [],
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
      emerging_hazards: [],
      predictive_risks: [],
      branch_risk_scores: [],
      department_risk_scores: [],
      behavioral_insights: [],
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
- Average Closure Days: ${data.summary.avg_closure_days || 0}
- Year-over-Year Change: ${data.summary.yoy_change || 'N/A'}`);
  }

  if (data?.by_status) {
    parts.push(`\n## Status Distribution
- Submitted: ${data.by_status.submitted || 0}
- Expert Screening: ${data.by_status.expert_screening || 0}
- Pending Manager Approval: ${data.by_status.pending_manager_approval || 0}
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

  if (data?.by_subtype) {
    parts.push(`\n## Event Subtype Distribution`);
    Object.entries(data.by_subtype).forEach(([subtype, count]) => {
      parts.push(`- ${subtype}: ${count}`);
    });
  }

  if (data?.monthly_trend?.length > 0) {
    parts.push(`\n## Monthly Trend (Last 12 Months)`);
    data.monthly_trend.forEach((m: any) => {
      parts.push(`- ${m.month}: Total=${m.total}, Incidents=${m.incidents}, Observations=${m.observations}`);
    });
    
    // Calculate month-over-month changes for AI
    if (data.monthly_trend.length >= 2) {
      const current = data.monthly_trend[data.monthly_trend.length - 1];
      const previous = data.monthly_trend[data.monthly_trend.length - 2];
      const change = current.total - previous.total;
      const percentChange = previous.total > 0 ? ((change / previous.total) * 100).toFixed(1) : 'N/A';
      parts.push(`- Month-over-Month Change: ${change > 0 ? '+' : ''}${change} (${percentChange}%)`);
    }
  }

  if (data?.actions) {
    parts.push(`\n## Corrective Actions Status
- Total Actions: ${data.actions.total_actions || 0}
- Open Actions: ${data.actions.open_actions || 0}
- In Progress: ${data.actions.in_progress || 0}
- Pending Verification: ${data.actions.pending_verification || 0}
- Overdue Actions: ${data.actions.overdue_actions || 0}
- Overdue Rate: ${data.actions.overdue_rate || 'N/A'}
- Critical Priority Actions: ${data.actions.critical_actions || 0}
- High Priority Actions: ${data.actions.high_priority_actions || 0}
- Average Completion Days: ${data.actions.avg_completion_days || 'N/A'}`);
  }

  if (data?.rca_data) {
    parts.push(`\n## Root Cause Analysis Insights
- Total RCAs Completed: ${data.rca_data.total_rcas || 0}
- Top Root Cause Categories: ${data.rca_data.top_categories?.join(', ') || 'N/A'}
- Common Contributing Factors: ${data.rca_data.common_factors?.join(', ') || 'N/A'}
- Systemic Issues Identified: ${data.rca_data.systemic_issues || 0}`);
  }

  if (data?.observation_behaviors) {
    parts.push(`\n## Behavioral Observation Trends`);
    if (data.observation_behaviors.positive) {
      parts.push(`Positive Behaviors: ${data.observation_behaviors.positive}`);
    }
    if (data.observation_behaviors.negative) {
      parts.push(`Unsafe Behaviors: ${data.observation_behaviors.negative}`);
    }
    if (data.observation_behaviors.ratio) {
      parts.push(`Positive/Negative Ratio: ${data.observation_behaviors.ratio}`);
    }
  }

  if (data?.locationData?.by_branch?.length > 0) {
    parts.push(`\n## Events by Branch (Location Risk Analysis)`);
    data.locationData.by_branch.slice(0, 10).forEach((b: any) => {
      const overdueRate = b.overdue_actions > 0 && b.total_actions > 0 
        ? `(${Math.round((b.overdue_actions / b.total_actions) * 100)}% overdue)` 
        : '';
      parts.push(`- ${b.branch_name}: Total=${b.total_events}, Incidents=${b.incidents}, Observations=${b.observations}, Open Investigations=${b.open_investigations || 0} ${overdueRate}`);
    });
  }

  if (data?.locationData?.by_department?.length > 0) {
    parts.push(`\n## Events by Department (Departmental Risk Analysis)`);
    data.locationData.by_department.slice(0, 10).forEach((d: any) => {
      const overdueRate = d.overdue_actions > 0 && d.total_actions > 0 
        ? `(${Math.round((d.overdue_actions / d.total_actions) * 100)}% overdue)` 
        : '';
      parts.push(`- ${d.department_name}: Total=${d.total_events}, Incidents=${d.incidents}, Open Investigations=${d.open_investigations || 0} ${overdueRate}`);
    });
  }

  if (data?.near_miss_data) {
    parts.push(`\n## Near Miss Analysis
- Total Near Misses: ${data.near_miss_data.total || 0}
- Near Miss Rate: ${data.near_miss_data.rate || 'N/A'}
- Potential Severity if Realized: ${data.near_miss_data.potential_severity || 'N/A'}
- Top Near Miss Categories: ${data.near_miss_data.top_categories?.join(', ') || 'N/A'}`);
  }

  return parts.join('\n');
}
