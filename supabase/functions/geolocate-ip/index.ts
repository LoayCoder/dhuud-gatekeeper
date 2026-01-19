import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeoResult {
  ip: string;
  country: string | null;
  country_code: string | null;
  city: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  org: string | null;
  error?: string;
}

async function geolocateIP(ip: string): Promise<GeoResult> {
  try {
    // Use ipapi.co free tier (no API key required, 1000/day limit)
    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: { 'User-Agent': 'DhuudGuard/1.0' }
    });

    if (!response.ok) {
      // Try fallback: ip-api.com (no key, 45/min limit)
      const fallbackResponse = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,regionName,city,lat,lon,org`);
      
      if (fallbackResponse.ok) {
        const data = await fallbackResponse.json();
        if (data.status === 'success') {
          return {
            ip,
            country: data.country,
            country_code: data.countryCode,
            city: data.city,
            region: data.regionName,
            latitude: data.lat,
            longitude: data.lon,
            org: data.org
          };
        }
      }
      
      return { ip, country: null, country_code: null, city: null, region: null, latitude: null, longitude: null, org: null, error: 'Geolocation failed' };
    }

    const data = await response.json();
    
    if (data.error) {
      return { ip, country: null, country_code: null, city: null, region: null, latitude: null, longitude: null, org: null, error: data.reason };
    }

    return {
      ip,
      country: data.country_name || data.country,
      country_code: data.country_code,
      city: data.city,
      region: data.region,
      latitude: data.latitude,
      longitude: data.longitude,
      org: data.org
    };
  } catch (error) {
    console.error(`Error geolocating IP ${ip}:`, error);
    return { ip, country: null, country_code: null, city: null, region: null, latitude: null, longitude: null, org: null, error: String(error) };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { ip_address, ip_addresses } = await req.json();
    
    // Handle single IP or array
    const ipsToProcess: string[] = ip_addresses || (ip_address ? [ip_address] : []);
    
    if (ipsToProcess.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No IP address provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limit batch size
    const limitedIps = ipsToProcess.slice(0, 20);
    
    // Check cache first
    const { data: cached } = await supabase
      .from('ip_geo_cache')
      .select('*')
      .in('ip_address', limitedIps)
      .gt('expires_at', new Date().toISOString());
    
    const cachedMap = new Map(cached?.map(c => [c.ip_address, c]) || []);
    const results: GeoResult[] = [];
    
    // Process IPs not in cache
    for (const ip of limitedIps) {
      if (cachedMap.has(ip)) {
        const c = cachedMap.get(ip)!;
        results.push({
          ip: c.ip_address,
          country: c.country,
          country_code: c.country_code,
          city: c.city,
          region: c.region,
          latitude: c.latitude,
          longitude: c.longitude,
          org: c.org
        });
      } else {
        // Rate limit: small delay between requests
        await new Promise(r => setTimeout(r, 100));
        
        const geoResult = await geolocateIP(ip);
        results.push(geoResult);
        
        // Cache the result if successful
        if (!geoResult.error && geoResult.latitude !== null) {
          await supabase.rpc('cache_ip_geolocation', {
            p_ip_address: ip,
            p_country: geoResult.country,
            p_country_code: geoResult.country_code,
            p_city: geoResult.city,
            p_region: geoResult.region,
            p_latitude: geoResult.latitude,
            p_longitude: geoResult.longitude,
            p_org: geoResult.org
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        results,
        cached_count: cached?.length || 0,
        resolved_count: results.filter(r => r.latitude !== null).length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Geolocate IP error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
