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
    const { camera_id, gate_id } = await req.json();
    
    console.log(`ANPR scan requested for camera: ${camera_id}, gate: ${gate_id}`);
    
    // TODO: Replace with actual CCTV/ANPR API integration
    // const cctvApiUrl = Deno.env.get('CCTV_API_URL');
    // const cctvApiKey = Deno.env.get('CCTV_API_KEY');
    
    // Mock ANPR response - simulates OCR result from camera
    const mockPlates = [
      'ABC 1234',
      'XYZ 5678',
      'KSA 9012',
      'UAE 3456',
      'BHR 7890',
    ];
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Random success/failure for testing (90% success rate)
    const success = Math.random() > 0.1;
    
    if (!success) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'plate_not_readable',
          message: 'Could not read license plate. Please try again or enter manually.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const detectedPlate = mockPlates[Math.floor(Math.random() * mockPlates.length)];
    
    return new Response(
      JSON.stringify({
        success: true,
        plate_number: detectedPlate,
        confidence: 0.95,
        timestamp: new Date().toISOString(),
        camera_id,
        // Mock image path - would be actual snapshot URL from CCTV
        image_path: `anpr/${gate_id}/${Date.now()}.jpg`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('ANPR scan error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
