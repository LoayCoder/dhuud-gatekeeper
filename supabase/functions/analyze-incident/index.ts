import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsPrelight, validateEdgeSecret, sanitizeInput, getClientIP } from "../_shared/cors.ts";
import { 
  fetchAISettings, 
  fetchAITags, 
  matchTagsByKeywords,
  getTenantFromAuth,
  DEFAULT_INCIDENT_SETTINGS,
  type IncidentAISettings,
  type AITag
} from "../_shared/ai-settings.ts";

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
  const preflightResponse = handleCorsPrelight(req);
  if (preflightResponse) return preflightResponse;
  
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Validate Authorization header instead of edge secret for browser requests
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.warn('[analyze-incident] Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting check
    const clientIP = getClientIP(req);
    if (isRateLimited(clientIP)) {
      console.warn(`[analyze-incident] Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    
    // Sanitize input to prevent XSS
    const description = sanitizeInput(body.description || '');
    const providedTenantId = body.tenantId;
    
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

    // Get tenant ID from auth or use provided one
    let tenantId: string | undefined = providedTenantId;
    if (!tenantId) {
      tenantId = (await getTenantFromAuth(req)) ?? undefined;
    }

    // Fetch dynamic settings and tags
    let settings: IncidentAISettings = DEFAULT_INCIDENT_SETTINGS;
    let availableTags: AITag[] = [];
    
    if (tenantId) {
      console.log('[analyze-incident] Fetching settings for tenant:', tenantId);
      settings = await fetchAISettings<IncidentAISettings>(tenantId, 'incident', DEFAULT_INCIDENT_SETTINGS);
      availableTags = await fetchAITags(tenantId, 'incident');
      console.log('[analyze-incident] Loaded', availableTags.length, 'tags');
    }

    console.log("[analyze-incident] Analyzing incident description:", description.substring(0, 100));

    // Detect input language for response
    const isArabicInput = /[\u0600-\u06FF]/.test(description);
    const responseLanguage = isArabicInput ? 'Arabic' : 
      (settings.rewrite_rules.target_language === 'ar' ? 'Arabic' : 'English');

    // Build tag list for AI prompt
    const tagListForPrompt = availableTags.length > 0
      ? `\n\nAVAILABLE TAGS FOR AUTO-TAGGING:\n${availableTags.map(t => `- "${t.name}": keywords=[${t.keywords.join(', ')}]`).join('\n')}\n\nSelect tags from this list that match the incident content.`
      : '';

    // Build injury/damage extraction instructions based on settings
    const injuryInstructions = settings.injury_extraction.enabled
      ? `\n\nINJURY EXTRACTION:
- Detect if any injuries are mentioned (worker hurt, hospitalized, first aid, etc.)
${settings.injury_extraction.auto_fill_count ? '- Count the number of injured persons if mentioned' : ''}
${settings.injury_extraction.auto_fill_type ? '- Determine injury type (minor, medical_treatment, lost_time, fatality)' : ''}
- Summarize the injury details in ${responseLanguage} ONLY`
      : '';

    const damageInstructions = settings.damage_extraction.enabled
      ? `\n\nDAMAGE EXTRACTION:
- Detect if property/equipment/environmental damage is mentioned
${settings.damage_extraction.auto_fill_category ? '- Categorize the damage type' : ''}
- Summarize the damage details in ${responseLanguage} ONLY
- Extract estimated cost if mentioned (in numbers only)`
      : '';

const systemPrompt = `You are an HSSE (Health, Safety, Security, Environment) expert analyzing incident reports.
Your tasks:
1. Translate non-English input to English if needed
2. Professionally rewrite the title and description for clarity
3. Classify the incident according to industry standards (ISO 45001, OSHA, API RP 754 for process safety)
4. Extract injury and damage details from the description
5. Assess the clarity/quality of the description

CRITICAL LANGUAGE RULES:
- You MUST respond ONLY in English or Arabic
- The input appears to be in ${responseLanguage} - respond in ${responseLanguage}
- NEVER respond in any other language (no Telugu, Hindi, Urdu, Tamil, or any other script)
- All text fields (injuryDescription, damageDescription, reasoning, rewrittenDescription) MUST be in ${responseLanguage}

REWRITING GUIDELINES:
- Keep the original meaning intact
- Use professional HSSE terminology
- Make the description clear and actionable
- Remove grammatical errors and improve readability

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
- emergency_crisis: Emergency response activations (ERP triggered)${injuryInstructions}${damageInstructions}${tagListForPrompt}

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
            content: `Analyze this HSSE event and provide a professionally rewritten version plus classification:

TITLE: "${body.title || ''}"
DESCRIPTION: "${description}"

Tasks:
1. Rewrite the title professionally (keep it concise, under 120 chars)
2. Rewrite the description professionally (improve clarity, grammar, use HSSE terminology)
3. Assess clarity quality (0-100 score)
4. Event type (observation or incident)
5. If incident: the incident type category
6. Specific subtype within that category
7. Severity level
8. Key risks identified
9. Any injuries mentioned (count, description, type)
10. Any damage mentioned (description, estimated cost)
11. Suggest 1-5 immediate corrective actions that should/could have been taken
12. Suggested tags from the available list`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_incident",
              description: "Rewrite and classify an HSSE event with type, severity, risk assessment, extract injury/damage details, and assess quality",
              parameters: {
                type: "object",
                properties: {
                  rewrittenTitle: {
                    type: "string",
                    description: "Professionally rewritten title (concise, under 120 chars, proper HSSE terminology). MUST be in English or Arabic ONLY."
                  },
                  rewrittenDescription: {
                    type: "string",
                    description: "Professionally rewritten description with improved clarity, grammar, and HSSE terminology. MUST be in English or Arabic ONLY."
                  },
                  clarityScore: {
                    type: "number",
                    description: "Quality/clarity score of the original description (0-100). 0-40=poor, 40-70=fair, 70-85=good, 85-100=excellent"
                  },
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
                    enum: settings.classification.severity_levels,
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
                  injuryType: {
                    type: "string",
                    enum: ["minor", "medical_treatment", "lost_time", "fatality"],
                    description: "Type/severity of injury if detected"
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
                  },
                  immediateActions: {
                    type: "array",
                    items: { type: "string" },
                    description: "1-5 immediate corrective actions that should be taken based on the incident. Each action should be concise (1 sentence). Examples: 'Cordoned off the area', 'Provided first aid to injured worker', 'Stopped equipment operation', 'Placed warning signs'. MUST be in English or Arabic ONLY.",
                    minItems: 1,
                    maxItems: 5
                  },
                  suggestedTags: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of tag names from the available tags that match this incident"
                  }
                },
                required: ["rewrittenTitle", "rewrittenDescription", "clarityScore", "eventType", "subtype", "severity", "keyRisks", "confidence", "hasInjury", "hasDamage"],
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
      console.error("[analyze-incident] AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("[analyze-incident] AI response received:", JSON.stringify(data).substring(0, 200));

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "classify_incident") {
      throw new Error("Unexpected AI response format");
    }

    const result = JSON.parse(toolCall.function.arguments);
    
    // Enhance with keyword-based tag matching if AI didn't provide tags
    if (settings.tagging.enabled && availableTags.length > 0) {
      const keywordMatchedTags = matchTagsByKeywords(description, availableTags);
      
      // Merge AI-suggested tags with keyword-matched tags
      const aiTags = result.suggestedTags || [];
      const allTags = [...new Set([...aiTags, ...keywordMatchedTags])];
      result.suggestedTags = allTags;
    }
    
    console.log("[analyze-incident] Classification result:", {
      ...result,
      suggestedTags: result.suggestedTags
    });

    return new Response(
      JSON.stringify({
        // Rewritten content
        rewrittenTitle: result.rewrittenTitle || null,
        rewrittenDescription: result.rewrittenDescription || null,
        clarityScore: result.clarityScore || 75,
        // Classification
        eventType: result.eventType,
        incidentType: result.incidentType || null,
        subtype: result.subtype,
        severity: result.severity,
        keyRisks: result.keyRisks || [],
        confidence: result.confidence || 0.8,
        reasoning: result.reasoning,
        // Injury/Damage
        hasInjury: result.hasInjury || false,
        injuryCount: result.injuryCount || null,
        injuryType: result.injuryType || null,
        injuryDescription: result.injuryDescription || null,
        hasDamage: result.hasDamage || false,
        damageDescription: result.damageDescription || null,
        estimatedCost: result.estimatedCost || null,
        // Actions & Tags
        immediateActions: result.immediateActions || [],
        suggestedTags: result.suggestedTags || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("[analyze-incident] error:", error);
    const origin = req.headers.get('Origin');
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Analysis failed" }),
      { status: 500, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } }
    );
  }
});
