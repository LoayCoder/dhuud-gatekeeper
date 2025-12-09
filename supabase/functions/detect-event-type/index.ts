import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-edge-secret',
};

// In-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // max 20 AI requests per minute per IP

function isRateLimited(identifier: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);
  
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }
  
  entry.count++;
  return false;
}

function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         req.headers.get('x-real-ip') || 
         'unknown';
}

function validateSecretToken(req: Request): boolean {
  const secret = Deno.env.get('EDGE_FUNCTION_SECRET');
  if (!secret) {
    console.warn('EDGE_FUNCTION_SECRET not configured - allowing request');
    return true; // Allow if secret not yet configured
  }
  
  const providedSecret = req.headers.get('x-edge-secret');
  return providedSecret === secret;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Secret token validation
    if (!validateSecretToken(req)) {
      console.warn('Invalid or missing edge function secret');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting check
    const clientIP = getClientIP(req);
    if (isRateLimited(clientIP)) {
      console.warn(`Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { description } = await req.json();

    if (!description || description.length < 10) {
      return new Response(
        JSON.stringify({ error: 'Description too short for analysis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Input length validation - prevent abuse
    if (description.length > 5000) {
      return new Response(
        JSON.stringify({ error: 'Description too long (max 5000 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Detecting event type for description:', description.substring(0, 100) + '...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an HSSE (Health, Safety, Security, Environment) event classifier. 
Analyze the description and determine if it's an Observation or an Incident.

OBSERVATION: A report of an unsafe condition or unsafe behavior that has NOT yet resulted in harm, injury, or damage. These are proactive reports to prevent incidents.
- unsafe_act: Unsafe behavior by a person (e.g., not wearing PPE, taking shortcuts, ignoring safety rules)
- unsafe_condition: Hazardous physical condition (e.g., broken equipment, slippery floor, missing guard)

INCIDENT: An event that HAS resulted in or NEARLY resulted in harm, injury, damage, or environmental impact.
- near_miss: An event that almost caused injury/damage but was narrowly avoided
- property_damage: Damage to equipment, vehicles, buildings, or property
- environmental: Spills, leaks, contamination, pollution, emissions
- first_aid: Minor injury requiring only first aid treatment
- medical_treatment: Injury requiring medical attention, hospital visit, doctor
- fire: Fire, smoke, flames, or fire-related emergency
- security: Theft, intrusion, unauthorized access, trespassing, breach

Be accurate - if it describes something that already happened with consequences, it's an Incident.
If it's reporting a hazard or unsafe behavior with no consequences yet, it's an Observation.`
          },
          {
            role: 'user',
            content: `Classify this HSSE event:\n\n${description}`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'classify_event',
              description: 'Classify an HSSE event into event type and subtype',
              parameters: {
                type: 'object',
                properties: {
                  event_type: {
                    type: 'string',
                    enum: ['observation', 'incident'],
                    description: 'The main category: observation (proactive hazard report) or incident (event with consequences)'
                  },
                  subtype: {
                    type: 'string',
                    enum: ['unsafe_act', 'unsafe_condition', 'near_miss', 'property_damage', 'environmental', 'first_aid', 'medical_treatment', 'fire', 'security'],
                    description: 'The specific subtype within the event category'
                  },
                  confidence: {
                    type: 'number',
                    description: 'Confidence score from 0 to 1'
                  },
                  reasoning: {
                    type: 'string',
                    description: 'Brief explanation of the classification'
                  }
                },
                required: ['event_type', 'subtype', 'confidence'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'classify_event' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded, please try again later' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI classification failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('AI Response:', JSON.stringify(data));

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'classify_event') {
      console.error('No valid tool call in response');
      return new Response(
        JSON.stringify({ error: 'Invalid AI response format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const classification = JSON.parse(toolCall.function.arguments);
    console.log('Classification result:', classification);

    // Validate the classification
    const validObservationSubtypes = ['unsafe_act', 'unsafe_condition'];
    const validIncidentSubtypes = ['near_miss', 'property_damage', 'environmental', 'first_aid', 'medical_treatment', 'fire', 'security'];

    // Ensure subtype matches event_type
    if (classification.event_type === 'observation' && !validObservationSubtypes.includes(classification.subtype)) {
      classification.subtype = 'unsafe_condition'; // Default for observation
    } else if (classification.event_type === 'incident' && !validIncidentSubtypes.includes(classification.subtype)) {
      classification.subtype = 'near_miss'; // Default for incident
    }

    return new Response(
      JSON.stringify({
        eventType: classification.event_type,
        subtype: classification.subtype,
        confidence: classification.confidence || 0.8,
        reasoning: classification.reasoning
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in detect-event-type:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
