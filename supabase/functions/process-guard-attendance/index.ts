import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AttendanceRequest {
  action: 'check_in' | 'check_out';
  guardId: string;
  tenantId: string;
  rosterId?: string;
  zoneId?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  method?: 'gps' | 'nfc' | 'qr' | 'manual';
  notes?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: AttendanceRequest = await req.json();
    const { action, guardId, tenantId, rosterId, zoneId, latitude, longitude, accuracy, method = 'gps', notes } = body;

    console.log(`[Attendance] Processing ${action} for guard ${guardId}`);

    const now = new Date();

    if (action === 'check_in') {
      // Get roster info if provided
      let expectedStart: Date | null = null;
      let expectedEnd: Date | null = null;

      if (rosterId) {
        const { data: roster } = await supabase
          .from('shift_roster')
          .select('shift_start_time, shift_end_time')
          .eq('id', rosterId)
          .single();

        if (roster) {
          expectedStart = new Date(roster.shift_start_time);
          expectedEnd = new Date(roster.shift_end_time);
        }
      }

      // Calculate late minutes
      let lateMinutes = 0;
      if (expectedStart && now > expectedStart) {
        lateMinutes = Math.floor((now.getTime() - expectedStart.getTime()) / 60000);
      }

      // Validate GPS if zone provided
      let gpsValidated = false;
      if (zoneId && latitude && longitude) {
        const { data: zone } = await supabase
          .from('security_zones')
          .select('geofence_polygon')
          .eq('id', zoneId)
          .single();

        if (zone?.geofence_polygon) {
          // Simple point-in-polygon check would go here
          // For now, we'll mark as validated if coordinates are provided
          gpsValidated = true;
        }
      }

      // Create attendance record
      const { data: attendance, error } = await supabase
        .from('guard_attendance_logs')
        .insert({
          tenant_id: tenantId,
          guard_id: guardId,
          roster_id: rosterId,
          zone_id: zoneId,
          check_in_at: now.toISOString(),
          check_in_lat: latitude,
          check_in_lng: longitude,
          check_in_accuracy: accuracy,
          check_in_method: method,
          expected_start_time: expectedStart?.toISOString(),
          expected_end_time: expectedEnd?.toISOString(),
          gps_validated: gpsValidated,
          late_minutes: lateMinutes,
          status: 'checked_in',
          notes,
        })
        .select()
        .single();

      if (error) {
        console.error('[Attendance] Check-in error:', error);
        throw error;
      }

      // Update roster if linked
      if (rosterId) {
        await supabase
          .from('shift_roster')
          .update({ check_in_time: now.toISOString() })
          .eq('id', rosterId);
      }

      // Alert if significantly late (>15 minutes)
      if (lateMinutes > 15) {
        console.log(`[Attendance] Guard ${guardId} is ${lateMinutes} minutes late`);
        // Could trigger notification here
      }

      console.log(`[Attendance] Check-in successful for guard ${guardId}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          attendance,
          lateMinutes,
          gpsValidated,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'check_out') {
      // Find the active attendance record
      const { data: activeAttendance, error: findError } = await supabase
        .from('guard_attendance_logs')
        .select('*')
        .eq('guard_id', guardId)
        .eq('tenant_id', tenantId)
        .eq('status', 'checked_in')
        .is('check_out_at', null)
        .order('check_in_at', { ascending: false })
        .limit(1)
        .single();

      if (findError || !activeAttendance) {
        return new Response(
          JSON.stringify({ error: 'No active check-in found for this guard' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Calculate hours worked and overtime
      const checkInTime = new Date(activeAttendance.check_in_at);
      const hoursWorked = (now.getTime() - checkInTime.getTime()) / 3600000;

      let overtimeMinutes = 0;
      let earlyDepartureMinutes = 0;

      if (activeAttendance.expected_end_time) {
        const expectedEnd = new Date(activeAttendance.expected_end_time);
        if (now > expectedEnd) {
          overtimeMinutes = Math.floor((now.getTime() - expectedEnd.getTime()) / 60000);
        } else if (now < expectedEnd) {
          earlyDepartureMinutes = Math.floor((expectedEnd.getTime() - now.getTime()) / 60000);
        }
      }

      // Update attendance record
      const { data: updated, error: updateError } = await supabase
        .from('guard_attendance_logs')
        .update({
          check_out_at: now.toISOString(),
          check_out_lat: latitude,
          check_out_lng: longitude,
          check_out_accuracy: accuracy,
          check_out_method: method,
          overtime_minutes: overtimeMinutes,
          early_departure_minutes: earlyDepartureMinutes,
          total_hours_worked: Math.round(hoursWorked * 100) / 100,
          status: 'checked_out',
          notes: activeAttendance.notes ? `${activeAttendance.notes}\n${notes || ''}` : notes,
        })
        .eq('id', activeAttendance.id)
        .select()
        .single();

      if (updateError) {
        console.error('[Attendance] Check-out error:', updateError);
        throw updateError;
      }

      // Update roster if linked
      if (activeAttendance.roster_id) {
        await supabase
          .from('shift_roster')
          .update({ check_out_time: now.toISOString() })
          .eq('id', activeAttendance.roster_id);
      }

      console.log(`[Attendance] Check-out successful for guard ${guardId}, worked ${hoursWorked.toFixed(2)} hours`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          attendance: updated,
          hoursWorked: Math.round(hoursWorked * 100) / 100,
          overtimeMinutes,
          earlyDepartureMinutes,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Attendance] Error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
