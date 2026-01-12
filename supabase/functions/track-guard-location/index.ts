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

// Calculate Haversine distance between two points in meters
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate distance from point to line segment
function distanceToLineSegment(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number
): number {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) param = dot / lenSq;

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  return calculateDistance(px, py, xx, yy);
}

// Calculate minimum distance to polygon boundary
function calculateDistanceToBoundary(lat: number, lng: number, polygon: number[][]): number {
  if (!polygon || polygon.length < 3) return Infinity;

  let minDistance = Infinity;

  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    const [lat1, lng1] = polygon[i];
    const [lat2, lng2] = polygon[j];
    
    const distance = distanceToLineSegment(lat, lng, lat1, lng1, lat2, lng2);
    if (distance < minDistance) {
      minDistance = distance;
    }
  }

  return minDistance;
}

// Check boundary proximity level
function checkBoundaryProximity(
  lat: number, lng: number, polygon: number[][],
  warningThreshold = 50, dangerThreshold = 20
): { level: 'safe' | 'warning' | 'danger' | 'outside'; distance: number } {
  const isInside = isPointInPolygon(lat, lng, polygon);
  const distanceToEdge = calculateDistanceToBoundary(lat, lng, polygon);

  if (!isInside) {
    return { level: 'outside', distance: -distanceToEdge };
  }

  if (distanceToEdge <= dangerThreshold) {
    return { level: 'danger', distance: distanceToEdge };
  } else if (distanceToEdge <= warningThreshold) {
    return { level: 'warning', distance: distanceToEdge };
  }

  return { level: 'safe', distance: distanceToEdge };
}

interface RosterData {
  id: string;
  zone_id: string;
  roster_date: string;
  security_zones: {
    id: string;
    zone_name: string;
    polygon_coords: number[][] | null;
    zone_type: string;
  };
  security_shifts: {
    id: string;
    shift_name: string;
    start_time: string;
    end_time: string;
    is_overnight: boolean | null;
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
    
    // Store tracking history using SECURITY DEFINER function
    const { error: insertError } = await supabase.rpc('insert_guard_tracking', {
      p_guard_id: guard_id,
      p_tenant_id: tenant_id,
      p_latitude: latitude,
      p_longitude: longitude,
      p_accuracy: accuracy,
      p_battery_level: battery_level
    });
    
    if (insertError) {
      console.error('Error inserting tracking data:', insertError);
    }
    
    // Check if guard has active shift assignment
    const { data: activeRoster } = await supabase
      .from('shift_roster')
      .select(`
        id,
        zone_id,
        roster_date,
        security_zones!inner (
          id, zone_name, polygon_coords, zone_type
        ),
        security_shifts!inner (
          id, shift_name, start_time, end_time, is_overnight
        )
      `)
      .eq('guard_id', guard_id)
      .eq('tenant_id', tenant_id)
      .eq('status', 'checked_in')
      .is('deleted_at', null);
    
    let isCompliant = true;
    let zoneViolation = null;
    let boundaryWarningLevel: 'safe' | 'warning' | 'danger' | 'outside' = 'safe';
    let boundaryDistanceMeters: number | null = null;
    
    // Check each active assignment
    console.log(`Found ${(activeRoster || []).length} active roster entries for guard ${guard_id}`);
    
    for (const roster of (activeRoster || []) as unknown as RosterData[]) {
      const shift = roster.security_shifts;
      const zone = roster.security_zones;
      
      console.log(`Checking roster ${roster.id}: zone=${zone.zone_name}, shift=${shift.shift_name}`);
      
      // Build shift start and end as full Date objects using roster_date
      const rosterDate = roster.roster_date;
      const startDateTime = new Date(`${rosterDate}T${shift.start_time}`);
      let endDateTime = new Date(`${rosterDate}T${shift.end_time}`);
      
      // Handle overnight shifts (end time is next day)
      if (shift.is_overnight || endDateTime < startDateTime) {
        endDateTime.setDate(endDateTime.getDate() + 1);
      }
      
      // Check if we're currently within the shift window
      // Allow 30 min buffer before/after for check-in/out
      const bufferMs = 30 * 60 * 1000;
      const isInShiftWindow = now >= new Date(startDateTime.getTime() - bufferMs) 
                           && now <= new Date(endDateTime.getTime() + bufferMs);
      
      console.log(`Shift window: ${startDateTime.toISOString()} - ${endDateTime.toISOString()}, now=${now.toISOString()}, inWindow=${isInShiftWindow}`);
      
      if (!isInShiftWindow) {
        console.log(`Guard ${guard_id} not in shift window, skipping zone check`);
        continue;
      }
      
      // Check if guard is within assigned zone
      if (zone.polygon_coords && Array.isArray(zone.polygon_coords) && zone.polygon_coords.length > 0) {
        const polygon = zone.polygon_coords as number[][];
        
        // Check boundary proximity (for warning system)
        const proximityResult = checkBoundaryProximity(latitude, longitude, polygon);
        boundaryWarningLevel = proximityResult.level;
        boundaryDistanceMeters = Math.abs(proximityResult.distance);
        
        console.log(`Boundary check: Guard at (${latitude}, ${longitude}), Zone: ${zone.zone_name}, Level: ${boundaryWarningLevel}, Distance: ${boundaryDistanceMeters.toFixed(1)}m`);
        
        // Create boundary warning alert if approaching edge
        if (boundaryWarningLevel === 'warning' || boundaryWarningLevel === 'danger') {
          // Check if we already have a recent boundary warning (within 5 minutes)
          const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
          const { data: recentAlert } = await supabase
            .from('geofence_alerts')
            .select('id')
            .eq('guard_id', guard_id)
            .eq('alert_type', 'boundary_warning')
            .gte('created_at', fiveMinutesAgo)
            .limit(1);
          
          if (!recentAlert || recentAlert.length === 0) {
            await supabase
              .from('geofence_alerts')
              .insert({
                guard_id,
                tenant_id,
                roster_id: roster.id,
                zone_id: zone.id,
                alert_type: 'boundary_warning',
                severity: boundaryWarningLevel === 'danger' ? 'high' : 'medium',
                guard_lat: latitude,
                guard_lng: longitude,
                alert_message: `Guard approaching zone boundary: ${zone.zone_name} (${boundaryDistanceMeters.toFixed(0)}m from edge)`
              });
            
            console.log(`BOUNDARY WARNING: Guard ${guard_id} at ${boundaryDistanceMeters.toFixed(0)}m from edge of ${zone.zone_name}`);
          }
        }
        
        // Check if outside zone completely
        if (boundaryWarningLevel === 'outside') {
          isCompliant = false;
          zoneViolation = {
            roster_id: roster.id,
            zone_id: zone.id,
            zone_name: zone.zone_name,
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
              alert_message: `Guard left assigned zone: ${zone.zone_name}`
            });
          
          console.log(`ALERT: Guard ${guard_id} outside zone ${zone.zone_name}`);
        }
      } else {
        console.log(`Zone ${zone.zone_name} has no polygon defined (coords: ${JSON.stringify(zone.polygon_coords)}), skipping compliance check`);
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        guard_id,
        is_compliant: isCompliant,
        zone_violation: zoneViolation,
        boundary_warning_level: boundaryWarningLevel,
        boundary_distance_meters: boundaryDistanceMeters,
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
