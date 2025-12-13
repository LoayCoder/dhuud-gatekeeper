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
  guard_id: string;
  zone_id: string;
  tenant_id: string;
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
  profiles: {
    full_name: string;
    mobile_number: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Running geofence compliance check...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentTime = now.toTimeString().substring(0, 5);
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    // Get all active shift assignments
    const { data: activeRosters, error: rosterError } = await supabase
      .from('shift_roster')
      .select(`
        id,
        guard_id,
        zone_id,
        tenant_id,
        security_zones (
          id, name, zone_polygon, zone_type
        ),
        security_shifts (
          id, shift_name, start_time, end_time, days_of_week
        ),
        profiles!shift_roster_guard_id_fkey (
          full_name, mobile_number
        )
      `)
      .eq('is_active', true)
      .is('deleted_at', null);
    
    if (rosterError) {
      console.error('Error fetching rosters:', rosterError);
      throw rosterError;
    }
    
    let alertsCreated = 0;
    let guardsChecked = 0;
    
    for (const roster of (activeRosters || []) as unknown as RosterData[]) {
      const shift = roster.security_shifts;
      const zone = roster.security_zones;
      
      if (!shift || !zone) continue;
      
      // Check if current time is within shift
      if (!shift.days_of_week?.includes(currentDay)) continue;
      
      const shiftStart = shift.start_time;
      const shiftEnd = shift.end_time;
      
      let isInShift = false;
      if (shiftStart > shiftEnd) {
        isInShift = currentTime >= shiftStart || currentTime <= shiftEnd;
      } else {
        isInShift = currentTime >= shiftStart && currentTime <= shiftEnd;
      }
      
      if (!isInShift) continue;
      
      guardsChecked++;
      
      // Get latest location for this guard
      const { data: latestLocation } = await supabase
        .from('guard_tracking_history')
        .select('latitude, longitude, recorded_at')
        .eq('guard_id', roster.guard_id)
        .gte('recorded_at', fiveMinutesAgo.toISOString())
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();
      
      if (!latestLocation) {
        // No recent location - guard may be offline
        // Check if we already have an unresolved offline alert
        const { data: existingAlert } = await supabase
          .from('geofence_alerts')
          .select('id')
          .eq('guard_id', roster.guard_id)
          .eq('roster_id', roster.id)
          .eq('alert_type', 'no_signal')
          .is('resolved_at', null)
          .single();
        
        if (!existingAlert) {
          await supabase
            .from('geofence_alerts')
            .insert({
              guard_id: roster.guard_id,
              tenant_id: roster.tenant_id,
              roster_id: roster.id,
              zone_id: zone.id,
              alert_type: 'no_signal',
              severity: 'medium',
              alert_message: `No GPS signal from guard for 5+ minutes`
            });
          alertsCreated++;
        }
        continue;
      }
      
      // Check if guard is within assigned zone
      if (zone.zone_polygon?.coordinates) {
        const polygon = zone.zone_polygon.coordinates[0];
        const inZone = isPointInPolygon(
          latestLocation.latitude, 
          latestLocation.longitude, 
          polygon
        );
        
        if (!inZone) {
          // Check if we already have an unresolved zone_exit alert
          const { data: existingAlert } = await supabase
            .from('geofence_alerts')
            .select('id')
            .eq('guard_id', roster.guard_id)
            .eq('roster_id', roster.id)
            .eq('alert_type', 'zone_exit')
            .is('resolved_at', null)
            .single();
          
          if (!existingAlert) {
            await supabase
              .from('geofence_alerts')
              .insert({
                guard_id: roster.guard_id,
                tenant_id: roster.tenant_id,
                roster_id: roster.id,
                zone_id: zone.id,
                alert_type: 'zone_exit',
                severity: 'high',
                guard_lat: latestLocation.latitude,
                guard_lng: latestLocation.longitude,
                alert_message: `Guard outside assigned zone: ${zone.name}`
              });
            alertsCreated++;
            console.log(`ALERT: Guard ${roster.guard_id} outside zone ${zone.name}`);
          }
        } else {
          // Guard is in zone - resolve any existing zone_exit alerts
          await supabase
            .from('geofence_alerts')
            .update({ 
              resolved_at: now.toISOString(),
              resolution_notes: 'Guard returned to assigned zone'
            })
            .eq('guard_id', roster.guard_id)
            .eq('roster_id', roster.id)
            .eq('alert_type', 'zone_exit')
            .is('resolved_at', null);
        }
      }
    }
    
    console.log(`Geofence check complete: ${guardsChecked} guards checked, ${alertsCreated} alerts created`);
    
    return new Response(
      JSON.stringify({
        success: true,
        guards_checked: guardsChecked,
        alerts_created: alertsCreated,
        checked_at: now.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Geofence compliance check error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
