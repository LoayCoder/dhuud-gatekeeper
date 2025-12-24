import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReverseGeocodeRequest {
  latitude: number;
  longitude: number;
  language?: string; // 'ar' or 'en'
}

interface LocationDetails {
  country: string | null;
  city: string | null;
  district: string | null;
  street: string | null;
  formatted_address: string | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, language = 'ar' }: ReverseGeocodeRequest = await req.json();

    if (!latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: 'latitude and longitude are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Reverse geocoding: ${latitude}, ${longitude} (language: ${language})`);

    // Call OpenStreetMap Nominatim API (free, no API key required)
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=${language}&addressdetails=1`;

    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'HSSE-SafetyApp/1.0', // Required by Nominatim usage policy
      },
    });

    if (!response.ok) {
      console.error('Nominatim API error:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch location details' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Nominatim response:', JSON.stringify(data.address || {}));

    // Extract address components from Nominatim response
    const address = data.address || {};
    
    // Build location details from Nominatim's address components
    const locationDetails: LocationDetails = {
      country: address.country || null,
      city: address.city || address.town || address.village || address.municipality || address.state || null,
      district: address.suburb || address.neighbourhood || address.district || address.quarter || null,
      street: address.road || address.street || address.pedestrian || null,
      formatted_address: data.display_name || null,
    };

    console.log('Extracted location details:', JSON.stringify(locationDetails));

    return new Response(
      JSON.stringify(locationDetails),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Reverse geocode error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
