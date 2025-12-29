import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RiskAssessmentRequest {
  action: 'analyze_activity' | 'suggest_hazards' | 'suggest_controls' | 'calculate_risk_score' | 'validate_assessment' | 'generate_team_recommendations';
  activityName?: string;
  activityDescription?: string;
  activityCategory?: string;
  location?: string;
  hazards?: Array<{
    description: string;
    category: string;
    likelihood: number;
    severity: number;
  }>;
  controls?: Array<{
    description: string;
    type: string;
  }>;
  teamSize?: number;
  industry?: string;
  language?: 'en' | 'ar';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const payload: RiskAssessmentRequest = await req.json();
    const { action, language = 'en' } = payload;
    
    console.log(`[risk-ai-assistant] Action: ${action}, Language: ${language}`);

    let systemPrompt = '';
    let userPrompt = '';

    // Build prompts based on action type
    switch (action) {
      case 'analyze_activity':
        systemPrompt = getAnalyzeActivitySystemPrompt(language);
        userPrompt = buildAnalyzeActivityPrompt(payload, language);
        break;
      
      case 'suggest_hazards':
        systemPrompt = getSuggestHazardsSystemPrompt(language);
        userPrompt = buildSuggestHazardsPrompt(payload, language);
        break;
      
      case 'suggest_controls':
        systemPrompt = getSuggestControlsSystemPrompt(language);
        userPrompt = buildSuggestControlsPrompt(payload, language);
        break;
      
      case 'calculate_risk_score':
        systemPrompt = getCalculateRiskSystemPrompt(language);
        userPrompt = buildCalculateRiskPrompt(payload, language);
        break;
      
      case 'validate_assessment':
        systemPrompt = getValidateAssessmentSystemPrompt(language);
        userPrompt = buildValidateAssessmentPrompt(payload, language);
        break;
      
      case 'generate_team_recommendations':
        systemPrompt = getTeamRecommendationsSystemPrompt(language);
        userPrompt = buildTeamRecommendationsPrompt(payload, language);
        break;
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

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
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[risk-ai-assistant] AI gateway error: ${response.status}`, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse JSON response from AI
    let result;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      result = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error(`[risk-ai-assistant] JSON parse error:`, parseError);
      result = { rawResponse: content };
    }

    console.log(`[risk-ai-assistant] Success for action: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[risk-ai-assistant] Error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// System Prompts
function getAnalyzeActivitySystemPrompt(lang: string): string {
  return lang === 'ar' 
    ? `أنت خبير تقييم مخاطر السلامة والصحة المهنية. قم بتحليل النشاط المقدم وتحديد المخاطر المحتملة بناءً على معايير ISO 45001 وOSHA.
       أجب بصيغة JSON فقط بالعربية.`
    : `You are an expert HSSE (Health, Safety, Security, Environment) risk assessment specialist. Analyze the provided work activity and identify potential hazards based on ISO 45001 and OSHA standards.
       Respond in JSON format only.`;
}

function getSuggestHazardsSystemPrompt(lang: string): string {
  return lang === 'ar'
    ? `أنت خبير تحديد المخاطر في مجال السلامة الصناعية. قدم قائمة شاملة بالمخاطر المحتملة مع تصنيفاتها.
       استخدم الفئات: Physical, Chemical, Biological, Ergonomic, Psychosocial, Environmental.
       أجب بصيغة JSON فقط.`
    : `You are an expert in industrial safety hazard identification. Provide a comprehensive list of potential hazards with their categories.
       Use categories: Physical, Chemical, Biological, Ergonomic, Psychosocial, Environmental.
       Respond in JSON format only.`;
}

function getSuggestControlsSystemPrompt(lang: string): string {
  return lang === 'ar'
    ? `أنت خبير تدابير السيطرة على المخاطر. اقترح تدابير وقائية وفقاً لتسلسل السيطرة:
       1. الإلغاء 2. الاستبدال 3. الضوابط الهندسية 4. الضوابط الإدارية 5. معدات الحماية الشخصية
       أجب بصيغة JSON فقط.`
    : `You are an expert in risk control measures. Suggest preventive measures following the Hierarchy of Controls:
       1. Elimination 2. Substitution 3. Engineering Controls 4. Administrative Controls 5. PPE
       Respond in JSON format only.`;
}

function getCalculateRiskSystemPrompt(lang: string): string {
  return lang === 'ar'
    ? `أنت خبير تحليل المخاطر الكمي. قيّم المخاطر المقدمة وحدد درجة المخاطر الإجمالية ومستوى الثقة.
       أجب بصيغة JSON فقط.`
    : `You are an expert in quantitative risk analysis. Evaluate the provided hazards and determine the overall risk score and confidence level.
       Respond in JSON format only.`;
}

function getValidateAssessmentSystemPrompt(lang: string): string {
  return lang === 'ar'
    ? `أنت مراجع تقييم مخاطر خبير. تحقق من اكتمال وجودة التقييم المقدم.
       أجب بصيغة JSON فقط.`
    : `You are an expert risk assessment reviewer. Verify the completeness and quality of the provided assessment.
       Respond in JSON format only.`;
}

function getTeamRecommendationsSystemPrompt(lang: string): string {
  return lang === 'ar'
    ? `أنت خبير تشكيل فرق تقييم المخاطر. اقترح التشكيل الأمثل لفريق التقييم بناءً على نوع النشاط ومستوى المخاطر.
       أجب بصيغة JSON فقط.`
    : `You are an expert in risk assessment team formation. Suggest the optimal team composition based on activity type and risk level.
       Respond in JSON format only.`;
}

// User Prompts
function buildAnalyzeActivityPrompt(payload: RiskAssessmentRequest, lang: string): string {
  const { activityName, activityDescription, location, industry } = payload;
  
  return lang === 'ar'
    ? `حلل النشاط التالي وقدم تقييماً أولياً:
       
       اسم النشاط: ${activityName}
       الوصف: ${activityDescription}
       الموقع: ${location || 'غير محدد'}
       القطاع: ${industry || 'عام'}
       
       أجب بصيغة JSON التالية:
       {
         "riskScore": number (1-5),
         "confidenceLevel": number (0-1),
         "riskRating": "low" | "medium" | "high" | "critical",
         "primaryHazards": [{ "description": string, "category": string, "likelihood": number, "severity": number }],
         "recommendations": [string],
         "warnings": [string],
         "historicalContext": string
       }`
    : `Analyze the following work activity and provide an initial assessment:
       
       Activity Name: ${activityName}
       Description: ${activityDescription}
       Location: ${location || 'Not specified'}
       Industry: ${industry || 'General'}
       
       Respond in the following JSON format:
       {
         "riskScore": number (1-5),
         "confidenceLevel": number (0-1),
         "riskRating": "low" | "medium" | "high" | "critical",
         "primaryHazards": [{ "description": string, "category": string, "likelihood": number, "severity": number }],
         "recommendations": [string],
         "warnings": [string],
         "historicalContext": string
       }`;
}

function buildSuggestHazardsPrompt(payload: RiskAssessmentRequest, lang: string): string {
  const { activityName, activityDescription, activityCategory, location } = payload;
  
  return lang === 'ar'
    ? `اقترح المخاطر المحتملة للنشاط التالي:
       
       اسم النشاط: ${activityName}
       الفئة: ${activityCategory || 'عام'}
       الوصف: ${activityDescription}
       الموقع: ${location || 'غير محدد'}
       
       أجب بصيغة JSON:
       {
         "hazards": [{
           "description": string,
           "descriptionAr": string,
           "category": "Physical" | "Chemical" | "Biological" | "Ergonomic" | "Psychosocial" | "Environmental",
           "likelihood": number (1-5),
           "severity": number (1-5),
           "confidence": number (0-1),
           "source": string
         }]
       }`
    : `Suggest potential hazards for the following activity:
       
       Activity Name: ${activityName}
       Category: ${activityCategory || 'General'}
       Description: ${activityDescription}
       Location: ${location || 'Not specified'}
       
       Respond in JSON format:
       {
         "hazards": [{
           "description": string,
           "descriptionAr": string,
           "category": "Physical" | "Chemical" | "Biological" | "Ergonomic" | "Psychosocial" | "Environmental",
           "likelihood": number (1-5),
           "severity": number (1-5),
           "confidence": number (0-1),
           "source": string
         }]
       }`;
}

function buildSuggestControlsPrompt(payload: RiskAssessmentRequest, lang: string): string {
  const { hazards } = payload;
  
  const hazardList = hazards?.map(h => `- ${h.description} (${h.category})`).join('\n') || 'No hazards provided';
  
  return lang === 'ar'
    ? `اقترح تدابير السيطرة للمخاطر التالية:
       
       ${hazardList}
       
       أجب بصيغة JSON:
       {
         "controls": [{
           "hazardDescription": string,
           "controlType": "elimination" | "substitution" | "engineering" | "administrative" | "ppe",
           "description": string,
           "descriptionAr": string,
           "effectiveness": number (1-5),
           "implementationDifficulty": "low" | "medium" | "high",
           "estimatedCost": "low" | "medium" | "high",
           "priority": number (1-5)
         }]
       }`
    : `Suggest control measures for the following hazards:
       
       ${hazardList}
       
       Respond in JSON format:
       {
         "controls": [{
           "hazardDescription": string,
           "controlType": "elimination" | "substitution" | "engineering" | "administrative" | "ppe",
           "description": string,
           "descriptionAr": string,
           "effectiveness": number (1-5),
           "implementationDifficulty": "low" | "medium" | "high",
           "estimatedCost": "low" | "medium" | "high",
           "priority": number (1-5)
         }]
       }`;
}

function buildCalculateRiskPrompt(payload: RiskAssessmentRequest, lang: string): string {
  const { hazards, controls } = payload;
  
  return lang === 'ar'
    ? `احسب درجة المخاطر الإجمالية بناءً على:
       
       المخاطر: ${JSON.stringify(hazards || [])}
       الضوابط: ${JSON.stringify(controls || [])}
       
       أجب بصيغة JSON:
       {
         "overallRiskScore": number (1-5),
         "riskRating": "low" | "medium" | "high" | "critical",
         "confidenceLevel": number (0-1),
         "residualRiskScore": number (1-5),
         "riskReduction": number (percentage),
         "factors": [{ "factor": string, "weight": number, "contribution": number }]
       }`
    : `Calculate the overall risk score based on:
       
       Hazards: ${JSON.stringify(hazards || [])}
       Controls: ${JSON.stringify(controls || [])}
       
       Respond in JSON format:
       {
         "overallRiskScore": number (1-5),
         "riskRating": "low" | "medium" | "high" | "critical",
         "confidenceLevel": number (0-1),
         "residualRiskScore": number (1-5),
         "riskReduction": number (percentage),
         "factors": [{ "factor": string, "weight": number, "contribution": number }]
       }`;
}

function buildValidateAssessmentPrompt(payload: RiskAssessmentRequest, lang: string): string {
  const { activityName, hazards, controls, teamSize } = payload;
  
  return lang === 'ar'
    ? `تحقق من اكتمال التقييم:
       
       النشاط: ${activityName}
       عدد المخاطر: ${hazards?.length || 0}
       عدد الضوابط: ${controls?.length || 0}
       حجم الفريق: ${teamSize || 0}
       
       أجب بصيغة JSON:
       {
         "isComplete": boolean,
         "completenessScore": number (0-100),
         "missingElements": [string],
         "warnings": [string],
         "recommendations": [string],
         "approvalRecommendation": "approve" | "needs_revision" | "reject"
       }`
    : `Validate the assessment completeness:
       
       Activity: ${activityName}
       Hazard Count: ${hazards?.length || 0}
       Control Count: ${controls?.length || 0}
       Team Size: ${teamSize || 0}
       
       Respond in JSON format:
       {
         "isComplete": boolean,
         "completenessScore": number (0-100),
         "missingElements": [string],
         "warnings": [string],
         "recommendations": [string],
         "approvalRecommendation": "approve" | "needs_revision" | "reject"
       }`;
}

function buildTeamRecommendationsPrompt(payload: RiskAssessmentRequest, lang: string): string {
  const { activityName, activityCategory, industry } = payload;
  
  return lang === 'ar'
    ? `اقترح تشكيل فريق التقييم للنشاط:
       
       النشاط: ${activityName}
       الفئة: ${activityCategory || 'عام'}
       القطاع: ${industry || 'عام'}
       
       أجب بصيغة JSON:
       {
         "recommendedRoles": [{
           "role": string,
           "roleAr": string,
           "isRequired": boolean,
           "justification": string,
           "competenciesNeeded": [string]
         }],
         "minimumTeamSize": number,
         "optimalTeamSize": number
       }`
    : `Suggest team composition for the activity:
       
       Activity: ${activityName}
       Category: ${activityCategory || 'General'}
       Industry: ${industry || 'General'}
       
       Respond in JSON format:
       {
         "recommendedRoles": [{
           "role": string,
           "roleAr": string,
           "isRequired": boolean,
           "justification": string,
           "competenciesNeeded": [string]
         }],
         "minimumTeamSize": number,
         "optimalTeamSize": number
       }`;
}
