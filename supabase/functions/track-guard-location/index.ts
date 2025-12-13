import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Check if point is inside polygon using ray casting algorithm
function isPointInPolygon(lat: number, lng: number, polygon: number[][]): boolean {
  let inside = false;
  const n = polygon.length;
  
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    
    if (((yi > lng) !== (yj > lng)) && 
        (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
}

interface RosterData {
  id: string;
  zone_id: string;
  security_zones: {
    id: string;
    name: string;
    zone_polygon: { coordinates: number[][][] } | null;
    zone_type: string;
  };
  security_shifts: {
    id: string;
    shift_name: string;
    start_time: string;
    end_time: string;
    days_of_week: string[];
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      guard_id, 
      latitude, 
      longitude, 
      accuracy,
      battery_level,
      tenant_id 
    } = await req.json();
    
    console.log(`Tracking guard ${guard_id}: ${latitude}, ${longitude}`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const now = new Date();
    
    // Store tracking history
    const { error: insertError } = await supabase
      .from('guard_tracking_history')
      .insert({
        guard_id,
        tenant_id,
        latitude,
        longitude,
        accuracy,
        battery_level,
        recorded_at: now.toISOString()
      });
    
    if (insertError) {
      console.error('Error inserting tracking data:', insertError);
    }
    
    // Check if guard has active shift assignment
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentTime = now.toTimeString().substring(0, 5); // HH:MM format
    
    const { data: activeRoster } = await supabase
      .from('shift_roster')
      .select(`
        id,
        zone_id,
        security_zones!inner (
          id, name, zone_polygon, zone_type
        ),
        security_shifts!inner (
          id, shift_name, start_time, end_time, days_of_week
        )
      `)
      .eq('guard_id', guard_id)
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .is('deleted_at', null);
    
    let isCompliant = true;
    let zoneViolation = null;
    
    // Check each active assignment
    for (const roster of (activeRoster || []) as unknown as RosterData[]) {
      const shift = roster.security_shifts;
      const zone = roster.security_zones;
      
      // Check if current time is within shift
      if (!shift?.days_of_week?.includes(currentDay)) continue;
      
      const shiftStart = shift.start_time;
      const shiftEnd = shift.end_time;
      
      // Handle overnight shifts
      let isInShift = false;
      if (shiftStart > shiftEnd) {
        isInShift = currentTime >= shiftStart || currentTime <= shiftEnd;
      } else {
        isInShift = currentTime >= shiftStart && currentTime <= shiftEnd;
      }
      
      if (!isInShift) continue;
      
      // Check if guard is within assigned zone
      if (zone.zone_polygon?.coordinates) {
        const polygon = zone.zone_polygon.coordinates[0]; // First ring of polygon
        const inZone = isPointInPolygon(latitude, longitude, polygon);
        
        if (!inZone) {
          isCompliant = false;
          zoneViolation = {
            roster_id: roster.id,
            zone_id: zone.id,
            zone_name: zone.name,
            zone_type: zone.zone_type
          };
          
          // Create geofence alert
          await supabase
            .from('geofence_alerts')
            .insert({
              guard_id,
              tenant_id,
              roster_id: roster.id,
              zone_id: zone.id,
              alert_type: 'zone_exit',
              severity: 'high',
              guard_lat: latitude,
              guard_lng: longitude,
              alert_message: `Guard left assigned zone: ${zone.name}`
            });
          
          console.log(`ALERT: Guard ${guard_id} outside zone ${zone.name}`);
        }
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        guard_id,
        is_compliant: isCompliant,
        zone_violation: zoneViolation,
        recorded_at: now.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Guard tracking error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
