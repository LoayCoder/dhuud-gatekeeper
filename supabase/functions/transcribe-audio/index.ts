import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audio, mimeType } = await req.json();
    
    if (!audio) {
      throw new Error("No audio data provided");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Transcribing audio with Lovable AI Gateway...");
    console.log("Audio MIME type:", mimeType || "audio/webm");

    // Use Lovable AI Gateway for transcription via chat completions
    // Send audio as base64 in a multimodal message
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a professional transcription assistant. Your task is to transcribe audio recordings accurately.
            
Instructions:
1. Transcribe the audio content word-for-word
2. Include proper punctuation and paragraph breaks
3. Note any unclear sections with [unclear]
4. If there are multiple speakers, indicate with Speaker 1:, Speaker 2:, etc.
5. Return ONLY the transcription text, no additional commentary

If you cannot process the audio, return: {"error": "Unable to transcribe audio"}`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please transcribe this audio recording of a witness statement. Focus on accuracy and include all details mentioned."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType || 'audio/webm'};base64,${audio}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${errorText}`);
    }

    const data = await response.json();
    const transcription = data.choices?.[0]?.message?.content || "";

    console.log("Transcription completed successfully");

    return new Response(
      JSON.stringify({ 
        transcription,
        confidence: 0.95 // Placeholder confidence score
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Transcription error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
