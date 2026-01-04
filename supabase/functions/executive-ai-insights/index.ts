import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExecutiveInsightsRequest {
  currentMonth: {
    incidents: {
      total: number;
      observations_count: number;
      by_severity: Record<string, number>;
      by_status: Record<string, number>;
      avg_closure_days: number;
    };
    inspections: {
      sessions_completed: number;
      avg_compliance_percentage: number;
      by_type: Record<string, number>;
      findings_raised: number;
      findings_closed: number;
    };
    actions: {
      total_created: number;
      completed: number;
      verified: number;
      overdue: number;
      sla_breach_count: number;
      sla_breach_rate: number;
      avg_resolution_days: number;
    };
  };
  previousMonth?: {
    incidents: {
      total: number;
      observations_count: number;
      by_severity: Record<string, number>;
      avg_closure_days: number;
    };
    inspections: {
      sessions_completed: number;
      avg_compliance_percentage: number;
      findings_raised: number;
    };
    actions: {
      total_created: number;
      completed: number;
      overdue: number;
      sla_breach_rate: number;
    };
  };
  kpiTargets?: Array<{
    kpi_code: string;
    kpi_name: string;
    target_value: number;
    current_value: number;
  }>;
  language?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: ExecutiveInsightsRequest = await req.json();
    const { currentMonth, previousMonth, kpiTargets, language = 'en' } = requestData;
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build comprehensive context for AI analysis
    const context = buildExecutiveContext(currentMonth, previousMonth, kpiTargets);
    
    console.log("Executive AI Context:", context.substring(0, 800) + "...");
    
    const systemPrompt = `You are an expert HSSE (Health, Safety, Security, Environment) Executive Analyst AI.
Your role is to analyze monthly HSSE data and provide board-level executive insights.
You must respond in ${language === 'ar' ? 'Arabic' : 'English'}.

CRITICAL: Provide strategic, actionable insights suitable for executive leadership and board presentations.

Return your analysis in this EXACT JSON structure:
{
  "hsse_maturity_score": {
    "score": <number 0-100>,
    "grade": "A" | "B" | "C" | "D" | "F",
    "components": {
      "incident_prevention": <number 0-100>,
      "action_effectiveness": <number 0-100>,
      "kpi_performance": <number 0-100>,
      "inspection_rigor": <number 0-100>,
      "observation_culture": <number 0-100>
    },
    "narrative": "<2-3 sentence explanation of the score>"
  },
  "risk_posture": {
    "current": "critical" | "high" | "moderate" | "low",
    "trend": "improving" | "stable" | "declining",
    "change_description": "<Brief explanation of risk posture change>"
  },
  "kpi_health": [
    {
      "kpi_name": "<KPI name>",
      "status": "red" | "yellow" | "green",
      "current_value": <number>,
      "target_value": <number>,
      "gap": <number - positive means below target>
    }
  ],
  "top_priorities": [
    {
      "rank": <1-5>,
      "severity": "critical" | "high" | "medium" | "low",
      "title": "<Short title>",
      "description": "<What is the issue>",
      "recommended_actions": ["<Action 1>", "<Action 2>"],
      "expected_impact": "<Expected outcome if addressed>"
    }
  ],
  "narratives": {
    "what_happened": "<3-4 sentences: Key events and metrics this month>",
    "why_it_happened": "<3-4 sentences: Root cause synthesis>",
    "what_improved": "<2-3 sentences: Positive trends and achievements>",
    "what_needs_action": "<2-3 sentences: Outstanding issues requiring attention>"
  },
  "systemic_issues": [
    {
      "pattern": "<Description of systemic issue>",
      "affected_areas": ["<Area 1>", "<Area 2>"],
      "recommendation": "<How to address systemically>"
    }
  ],
  "month_comparison": {
    "incidents_change": <percentage change>,
    "observations_change": <percentage change>,
    "actions_closure_change": <percentage change>,
    "compliance_change": <percentage change>,
    "overall_trend": "improving" | "stable" | "declining"
  }
}

SCORING GUIDELINES:
1. HSSE Maturity Score:
   - 90-100 (A): World-class, minimal incidents, proactive culture
   - 80-89 (B): Strong performance, minor gaps
   - 70-79 (C): Acceptable, needs improvement in key areas
   - 60-69 (D): Below expectations, significant issues
   - <60 (F): Critical, requires immediate intervention

2. Component Scoring:
   - incident_prevention: Based on incident rate, severity distribution, near-miss ratio
   - action_effectiveness: Closure rate, on-time completion, verification rate
   - kpi_performance: How many KPIs meet targets
   - inspection_rigor: Completion rate, compliance %, findings ratio
   - observation_culture: Observation count, positive/negative ratio

3. Risk Posture:
   - Critical: Multiple critical incidents, high overdue rate (>30%), declining trend
   - High: Significant incidents, moderate overdue (15-30%), mixed performance
   - Moderate: Some concerns, overdue <15%, stable trend
   - Low: Few incidents, strong closure rate, improving trend

4. Top 5 Priorities: Rank by business impact and urgency. Be specific.

5. Narratives: Write for executive audience - clear, concise, actionable.`;

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
          { role: "user", content: `Analyze this monthly HSSE executive data and generate comprehensive board-level insights:\n\n${context}` }
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
      // Return a default structure on parse failure
      insights = getDefaultInsights();
    }

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Executive AI Insights error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      ...getDefaultInsights()
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildExecutiveContext(
  current: ExecutiveInsightsRequest['currentMonth'], 
  previous: ExecutiveInsightsRequest['previousMonth'],
  kpis?: ExecutiveInsightsRequest['kpiTargets']
): string {
  const parts: string[] = [];

  // Current Month Summary
  parts.push(`## CURRENT MONTH SUMMARY

### Incidents & Events
- Total Incidents: ${current.incidents.total}
- Observations: ${current.incidents.observations_count}
- By Severity:
  - Critical: ${current.incidents.by_severity?.critical || 0}
  - High: ${current.incidents.by_severity?.high || 0}
  - Medium: ${current.incidents.by_severity?.medium || 0}
  - Low: ${current.incidents.by_severity?.low || 0}
- By Status:
  - Submitted: ${current.incidents.by_status?.submitted || 0}
  - Under Investigation: ${current.incidents.by_status?.investigation_in_progress || 0}
  - Closed: ${current.incidents.by_status?.closed || 0}
- Average Closure Time: ${current.incidents.avg_closure_days} days

### Inspections
- Sessions Completed: ${current.inspections.sessions_completed}
- Average Compliance: ${current.inspections.avg_compliance_percentage}%
- By Type:
  - Asset Inspections: ${current.inspections.by_type?.asset || 0}
  - Area Inspections: ${current.inspections.by_type?.area || 0}
  - Audits: ${current.inspections.by_type?.audit || 0}
- Findings Raised: ${current.inspections.findings_raised}
- Findings Closed: ${current.inspections.findings_closed}

### Corrective Actions
- Total Created: ${current.actions.total_created}
- Completed: ${current.actions.completed}
- Verified: ${current.actions.verified}
- Overdue: ${current.actions.overdue}
- SLA Breaches: ${current.actions.sla_breach_count} (${current.actions.sla_breach_rate}%)
- Average Resolution Time: ${current.actions.avg_resolution_days} days`);

  // Previous Month Comparison
  if (previous) {
    const incidentChange = previous.incidents.total > 0 
      ? Math.round(((current.incidents.total - previous.incidents.total) / previous.incidents.total) * 100)
      : 0;
    const observationChange = previous.incidents.observations_count > 0
      ? Math.round(((current.incidents.observations_count - previous.incidents.observations_count) / previous.incidents.observations_count) * 100)
      : 0;
    const completedChange = previous.actions.completed > 0
      ? Math.round(((current.actions.completed - previous.actions.completed) / previous.actions.completed) * 100)
      : 0;

    parts.push(`

## PREVIOUS MONTH COMPARISON
- Incidents: ${previous.incidents.total} → ${current.incidents.total} (${incidentChange >= 0 ? '+' : ''}${incidentChange}%)
- Observations: ${previous.incidents.observations_count} → ${current.incidents.observations_count} (${observationChange >= 0 ? '+' : ''}${observationChange}%)
- Actions Completed: ${previous.actions.completed} → ${current.actions.completed} (${completedChange >= 0 ? '+' : ''}${completedChange}%)
- Compliance: ${previous.inspections.avg_compliance_percentage}% → ${current.inspections.avg_compliance_percentage}%
- SLA Breach Rate: ${previous.actions.sla_breach_rate}% → ${current.actions.sla_breach_rate}%
- Average Closure Days: ${previous.incidents.avg_closure_days} → ${current.incidents.avg_closure_days}`);
  }

  // KPI Performance
  if (kpis && kpis.length > 0) {
    parts.push(`

## KPI PERFORMANCE vs TARGETS`);
    kpis.forEach(kpi => {
      const gap = kpi.target_value - kpi.current_value;
      const status = gap <= 0 ? '✓ ON TARGET' : gap > (kpi.target_value * 0.2) ? '✗ CRITICAL' : '⚠ AT RISK';
      parts.push(`- ${kpi.kpi_name}: Current=${kpi.current_value}, Target=${kpi.target_value} [${status}]`);
    });
  }

  // Key Metrics for AI
  const overdueRate = current.actions.total_created > 0 
    ? Math.round((current.actions.overdue / current.actions.total_created) * 100) 
    : 0;
  const closureRate = current.actions.total_created > 0
    ? Math.round((current.actions.completed / current.actions.total_created) * 100)
    : 0;
  const criticalIncidentRate = current.incidents.total > 0
    ? Math.round(((current.incidents.by_severity?.critical || 0) / current.incidents.total) * 100)
    : 0;

  parts.push(`

## KEY DERIVED METRICS
- Overdue Action Rate: ${overdueRate}%
- Action Closure Rate: ${closureRate}%
- Critical Incident Rate: ${criticalIncidentRate}%
- Observation to Incident Ratio: ${current.incidents.total > 0 ? (current.incidents.observations_count / current.incidents.total).toFixed(2) : 'N/A'}`);

  return parts.join('\n');
}

function getDefaultInsights() {
  return {
    hsse_maturity_score: {
      score: 0,
      grade: 'C' as const,
      components: {
        incident_prevention: 0,
        action_effectiveness: 0,
        kpi_performance: 0,
        inspection_rigor: 0,
        observation_culture: 0
      },
      narrative: "Unable to generate insights. Please try again."
    },
    risk_posture: {
      current: 'moderate' as const,
      trend: 'stable' as const,
      change_description: "Unable to assess risk posture."
    },
    kpi_health: [],
    top_priorities: [],
    narratives: {
      what_happened: "Data analysis unavailable.",
      why_it_happened: "Data analysis unavailable.",
      what_improved: "Data analysis unavailable.",
      what_needs_action: "Data analysis unavailable."
    },
    systemic_issues: [],
    month_comparison: {
      incidents_change: 0,
      observations_change: 0,
      actions_closure_change: 0,
      compliance_change: 0,
      overall_trend: 'stable' as const
    }
  };
}
