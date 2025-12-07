import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SuggestionRequest {
  finding_classification: string;
  finding_risk_level: string;
  checklist_item_question: string;
  failure_notes?: string;
  area_type?: string;
  finding_description?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: SuggestionRequest = await req.json();
    const {
      finding_classification,
      finding_risk_level,
      checklist_item_question,
      failure_notes,
      area_type,
      finding_description,
    } = body;

    console.log('Generating action suggestion for:', { finding_classification, finding_risk_level, checklist_item_question });

    // Build context-aware prompt
    const classificationContext = {
      critical_nc: 'Critical Non-Conformance requiring immediate corrective action with highest priority',
      major_nc: 'Major Non-Conformance requiring urgent corrective action',
      minor_nc: 'Minor Non-Conformance requiring corrective action within standard timeline',
      observation: 'Observation that should be addressed to improve safety standards',
      ofi: 'Opportunity for Improvement to enhance safety practices',
    };

    const riskContext = {
      critical: 'immediate threat to life or major equipment damage',
      high: 'significant safety risk requiring prompt attention',
      medium: 'moderate risk that should be addressed in a timely manner',
      low: 'minor risk that should be addressed during routine maintenance',
    };

    const prompt = `You are an HSSE (Health, Safety, Security, Environment) expert. Generate a corrective action recommendation for the following inspection finding.

**Finding Details:**
- Classification: ${finding_classification} - ${classificationContext[finding_classification as keyof typeof classificationContext] || 'Standard finding'}
- Risk Level: ${finding_risk_level} - ${riskContext[finding_risk_level as keyof typeof riskContext] || 'Standard risk'}
- Failed Checklist Item: "${checklist_item_question}"
${area_type ? `- Area Type: ${area_type}` : ''}
${failure_notes ? `- Inspector Notes: "${failure_notes}"` : ''}
${finding_description ? `- Finding Description: "${finding_description}"` : ''}

Generate a JSON response with the following structure:
{
  "suggested_title": "Brief action title (max 80 chars)",
  "suggested_description": "Detailed description of the corrective action required (2-3 sentences)",
  "suggested_category": "one of: operations, maintenance, training, procedural, equipment",
  "suggested_priority": "one of: low, medium, high, critical",
  "suggested_action_type": "one of: corrective, preventive"
}

Ensure the action is specific, actionable, and aligned with HSSA/ISO 45001 best practices.`;

    // Call Lovable AI Gateway
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://api.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an HSSE expert generating corrective action recommendations. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI service error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    
    console.log('AI response:', content);

    // Parse JSON from response
    let suggestion;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, content];
      const jsonStr = jsonMatch[1] || content;
      suggestion = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Provide fallback suggestion
      suggestion = {
        suggested_title: `Address ${finding_classification.replace('_', ' ')} - ${checklist_item_question.substring(0, 40)}`,
        suggested_description: `Investigate and resolve the ${finding_classification.replace('_', ' ')} finding related to: ${checklist_item_question}. Implement corrective measures to prevent recurrence.`,
        suggested_category: 'operations',
        suggested_priority: finding_risk_level === 'critical' ? 'critical' : finding_risk_level === 'high' ? 'high' : 'medium',
        suggested_action_type: 'corrective',
      };
    }

    return new Response(JSON.stringify(suggestion), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in suggest-inspection-action:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
