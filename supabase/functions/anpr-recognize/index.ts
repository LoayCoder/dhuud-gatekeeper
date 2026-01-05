import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ANPRRequest {
  image_base64: string;
}

interface ANPRResponse {
  success: boolean;
  plate?: string;
  confidence?: number;
  vehicle_color?: string;
  vehicle_type?: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { image_base64 }: ANPRRequest = await req.json();

    if (!image_base64) {
      return new Response(
        JSON.stringify({ success: false, error: 'No image provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[ANPR] Processing image for license plate recognition...');

    // Use Lovable AI (Gemini) for license plate recognition
    const LOVABLE_API_URL = Deno.env.get('LOVABLE_API_URL') || 'https://lovable.dev/api/ai';
    
    const prompt = `You are a license plate recognition system. Analyze this image and extract the following information:
1. License plate number (if visible)
2. Confidence level (0-100%)
3. Vehicle color (if visible)
4. Vehicle type (car, truck, motorcycle, bus, van, etc.)

Respond ONLY in this exact JSON format, no other text:
{
  "plate": "ABC-1234",
  "confidence": 95,
  "vehicle_color": "white",
  "vehicle_type": "car"
}

If no license plate is visible, respond with:
{
  "plate": null,
  "confidence": 0,
  "vehicle_color": null,
  "vehicle_type": null
}`;

    // Call Lovable AI with the image
    const aiResponse = await fetch(`${LOVABLE_API_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { 
                type: 'image_url', 
                image_url: { 
                  url: image_base64.startsWith('data:') 
                    ? image_base64 
                    : `data:image/jpeg;base64,${image_base64}` 
                } 
              }
            ]
          }
        ],
        max_tokens: 500,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[ANPR] AI API error:', errorText);
      
      // Fallback: return a simulated response for testing
      return new Response(
        JSON.stringify({
          success: true,
          plate: null,
          confidence: 0,
          vehicle_color: null,
          vehicle_type: null,
          error: 'AI service unavailable, manual entry required'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResult = await aiResponse.json();
    console.log('[ANPR] AI response received');

    // Parse the AI response
    let parsed: { plate: string | null; confidence: number; vehicle_color: string | null; vehicle_type: string | null };
    
    try {
      const content = aiResult.choices?.[0]?.message?.content || aiResult.content || '';
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('[ANPR] Failed to parse AI response:', parseError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to parse license plate data'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response: ANPRResponse = {
      success: true,
      plate: parsed.plate || undefined,
      confidence: parsed.confidence || 0,
      vehicle_color: parsed.vehicle_color || undefined,
      vehicle_type: parsed.vehicle_type || undefined,
    };

    console.log('[ANPR] Recognition result:', response);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ANPR] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
