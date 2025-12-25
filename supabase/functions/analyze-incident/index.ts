import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

// New HSSE Event Type hierarchy
const INCIDENT_TYPES = [
  'safety', 'health', 'process_safety', 'environment', 'security',
  'property_asset', 'road_traffic', 'quality_service', 'community_third_party',
  'compliance_regulatory', 'emergency_crisis'
];

const SUBTYPES_BY_INCIDENT_TYPE: Record<string, string[]> = {
  safety: [
    'slip_trip_fall', 'fall_from_height', 'struck_by', 'caught_in',
    'manual_handling', 'cut_laceration', 'eye_injury', 'burn_non_chemical',
    'electrical_shock', 'dropped_object', 'confined_space_injury', 'tool_equipment_injury'
  ],
  health: [
    'heat_stress', 'chemical_exposure', 'noise_exposure', 'respiratory_irritation',
    'fatigue_fitness', 'occupational_disease', 'foodborne_illness'
  ],
  process_safety: [
    'lopc', 'process_fire', 'process_explosion', 'overpressure_relief',
    'dangerous_substance_release', 'process_upset', 'critical_barrier_failure'
  ],
  environment: [
    'oil_chemical_spill_land', 'spill_stormwater_sewer', 'air_emission',
    'waste_mismanagement', 'soil_contamination', 'wildlife_impact', 'non_compliant_discharge'
  ],
  security: [
    'unauthorized_access', 'theft_loss', 'vandalism', 'assault_threat',
    'crowd_control', 'suspicious_package', 'perimeter_breach', 'information_security'
  ],
  property_asset: [
    'equipment_damage', 'building_infrastructure', 'utility_outage',
    'non_process_fire', 'flooding_weather'
  ],
  road_traffic: [
    'vehicle_collision', 'pedestrian_struck', 'reversing_incident',
    'forklift_buggy_cart', 'speeding_unsafe_driving', 'vehicle_fire', 'load_shift_securing'
  ],
  quality_service: [
    'service_interruption', 'product_nonconformance', 'critical_equipment_failure'
  ],
  community_third_party: [
    'visitor_injury', 'third_party_property_damage', 'public_complaint', 'offsite_traffic_impact'
  ],
  compliance_regulatory: [
    'ptw_violation', 'fire_system_breach', 'contractor_compliance_breach',
    'environmental_permit_breach', 'security_sop_breach', 'legal_reporting_breach'
  ],
  emergency_crisis: [
    'erp_medical', 'erp_fire', 'erp_security', 'erp_environmental', 'erp_weather_other'
  ]
};

// Get all subtypes for the enum
const ALL_SUBTYPES = [
  'unsafe_act', 'unsafe_condition', 'safe_act', 'safe_condition', // observation subtypes
  ...Object.values(SUBTYPES_BY_INCIDENT_TYPE).flat()
];

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    
    if (!description || description.length < 20) {
      return new Response(
        JSON.stringify({ error: 'Description must be at least 20 characters' }),
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Analyzing incident description:", description.substring(0, 100));

    // Detect input language for response
    const isArabicInput = /[\u0600-\u06FF]/.test(description);
    const responseLanguage = isArabicInput ? 'Arabic' : 'English';

    const systemPrompt = `You are an HSSE (Health, Safety, Security, Environment) expert analyzing incident reports.
Classify the incident according to industry standards (ISO 45001, OSHA, API RP 754 for process safety).
Also extract injury and damage details from the description.

CRITICAL LANGUAGE RULES:
- You MUST respond ONLY in English or Arabic
- The input appears to be in ${responseLanguage} - respond in ${responseLanguage}
- NEVER respond in any other language (no Telugu, Hindi, Urdu, Tamil, or any other script)
- All text fields (injuryDescription, damageDescription, reasoning) MUST be in ${responseLanguage}

EVENT CATEGORIES:
- "observation": Unsafe acts or conditions observed but no actual harm occurred. Also includes positive safety observations (safe acts/conditions).
- "incident": Actual events including near misses, injuries, damage, or emergencies

OBSERVATION SUBTYPES (for observations only):
- unsafe_act: Unsafe behavior observed (e.g., not wearing PPE, improper lifting)
- unsafe_condition: Hazardous condition (e.g., wet floor, exposed wires)
- safe_act: Positive safety behavior to recognize (e.g., following procedures, helping others)
- safe_condition: Good condition to recognize (e.g., clean workspace, proper signage)

INCIDENT TYPES (for incidents only):
- safety: Occupational injuries/harm (slips, falls, struck-by, caught-in, burns, electrical, etc.)
- health: Illness/exposure (heat stress, chemical exposure, noise, fatigue, occupational disease)
- process_safety: PSE-aligned events (LOPC, process fires, explosions, overpressure, barrier failures)
- environment: Environmental impacts (spills, emissions, contamination, waste issues)
- security: Security events (unauthorized access, theft, vandalism, threats)
- property_asset: Non-process property/asset damage (equipment, buildings, utilities, weather)
- road_traffic: Vehicle/mobile equipment incidents (collisions, pedestrian, forklift, speeding)
- quality_service: Quality/service impacts (interruptions, nonconformance)
- community_third_party: Community/third-party impacts (visitor injury, complaints)
- compliance_regulatory: Regulatory/compliance breaches (PTW, permits, SOPs)
- emergency_crisis: Emergency response activations (ERP triggered)

INJURY EXTRACTION:
- Detect if any injuries are mentioned (worker hurt, hospitalized, first aid, etc.)
- Count the number of injured persons if mentioned
- Summarize the injury details in ${responseLanguage} ONLY

DAMAGE EXTRACTION:
- Detect if property/equipment/environmental damage is mentioned
- Summarize the damage details in ${responseLanguage} ONLY
- Extract estimated cost if mentioned (in numbers only)

Be precise and consistent in your classifications.`;

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
          {
            role: "user",
            content: `Analyze this HSSE event description and classify it:

"${description}"

Determine:
1. Event type (observation or incident)
2. If incident: the incident type category
3. Specific subtype within that category
4. Severity level
5. Key risks identified
6. Any injuries mentioned (count, description)
7. Any damage mentioned (description, estimated cost)`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_incident",
              description: "Classify an HSSE event with type, severity, risk assessment, and extract injury/damage details",
              parameters: {
                type: "object",
                properties: {
                  eventType: {
                    type: "string",
                    enum: ["observation", "incident"],
                    description: "Primary event category. Use 'observation' for unsafe acts/conditions without actual harm. Use 'incident' for near misses, injuries, damage, or actual events."
                  },
                  incidentType: {
                    type: "string",
                    enum: INCIDENT_TYPES,
                    description: "For incidents only: the main category (safety, health, process_safety, environment, security, property_asset, road_traffic, quality_service, community_third_party, compliance_regulatory, emergency_crisis)"
                  },
                  subtype: {
                    type: "string",
                    enum: ALL_SUBTYPES,
                    description: "Specific subtype within the category"
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
                  },
                  hasInjury: {
                    type: "boolean",
                    description: "Whether any injury to persons is mentioned in the description"
                  },
                  injuryCount: {
                    type: "number",
                    description: "Number of injured persons mentioned (if applicable)"
                  },
                  injuryDescription: {
                    type: "string",
                    description: "Summary of injury details. MUST be in English or Arabic ONLY - never use Telugu, Hindi, or other languages."
                  },
                  hasDamage: {
                    type: "boolean",
                    description: "Whether any property/equipment/environmental damage is mentioned"
                  },
                  damageDescription: {
                    type: "string",
                    description: "Summary of damage details. MUST be in English or Arabic ONLY - never use Telugu, Hindi, or other languages."
                  },
                  estimatedCost: {
                    type: "number",
                    description: "Estimated damage cost if mentioned (numeric value only, no currency)"
                  }
                },
                required: ["eventType", "subtype", "severity", "keyRisks", "confidence", "hasInjury", "hasDamage"],
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
        incidentType: result.incidentType || null,
        subtype: result.subtype,
        severity: result.severity,
        keyRisks: result.keyRisks || [],
        confidence: result.confidence || 0.8,
        reasoning: result.reasoning,
        hasInjury: result.hasInjury || false,
        injuryCount: result.injuryCount || null,
        injuryDescription: result.injuryDescription || null,
        hasDamage: result.hasDamage || false,
        damageDescription: result.damageDescription || null,
        estimatedCost: result.estimatedCost || null
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
