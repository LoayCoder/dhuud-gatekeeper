import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShiftData {
  shift_name: string;
  start_time: string;
  end_time: string;
  security_zones: {
    name: string;
  };
}

interface GuardRoster {
  guard_id: string;
  profiles: {
    id: string;
    full_name: string;
    job_title: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      shift_id, 
      date, 
      tenant_id,
      include_visitors = true,
      include_contractors = true,
      include_patrols = true,
      include_incidents = true,
      include_alerts = true
    } = await req.json();
    
    console.log(`Generating shift report for shift ${shift_id} on ${date}`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get shift details
    const { data: shift } = await supabase
      .from('security_shifts')
      .select('*, security_zones(*)')
      .eq('id', shift_id)
      .single() as { data: ShiftData | null };
    
    if (!shift) {
      throw new Error('Shift not found');
    }
    
    const reportDate = new Date(date);
    const startOfDay = new Date(reportDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(reportDate.setHours(23, 59, 59, 999));
    
    const reportData: Record<string, unknown> = {
      shift: {
        name: shift.shift_name,
        zone: shift.security_zones?.name,
        start_time: shift.start_time,
        end_time: shift.end_time,
        date: date
      },
      generated_at: new Date().toISOString(),
      summary: {
        total_visitors: 0,
        total_contractors: 0,
        total_patrols: 0,
        total_incidents: 0,
        total_alerts: 0
      }
    };
    
    // Get assigned guards for this shift
    const { data: guards } = await supabase
      .from('shift_roster')
      .select(`
        guard_id,
        profiles!shift_roster_guard_id_fkey (
          id, full_name, job_title
        )
      `)
      .eq('shift_id', shift_id)
      .eq('is_active', true)
      .is('deleted_at', null) as { data: GuardRoster[] | null };
    
    reportData.guards = guards?.map(g => ({
      id: g.guard_id,
      name: g.profiles?.full_name,
      title: g.profiles?.job_title
    })) || [];
    
    const summary = reportData.summary as Record<string, number>;
    
    // Visitor logs
    if (include_visitors) {
      const { data: visitors, count: visitorCount } = await supabase
        .from('gate_entry_logs')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenant_id)
        .gte('entry_time', startOfDay.toISOString())
        .lte('entry_time', endOfDay.toISOString())
        .is('deleted_at', null)
        .order('entry_time', { ascending: true });
      
      reportData.visitors = visitors?.map((v: Record<string, unknown>) => ({
        name: v.person_name,
        entry_time: v.entry_time,
        exit_time: v.exit_time,
        destination: v.destination_name,
        car_plate: v.car_plate,
        purpose: v.purpose
      })) || [];
      summary.total_visitors = visitorCount || 0;
    }
    
    // Contractor access logs
    if (include_contractors) {
      const { data: contractors, count: contractorCount } = await supabase
        .from('contractor_access_logs')
        .select(`
          *,
          contractors (
            full_name, company_name
          )
        `, { count: 'exact' })
        .eq('tenant_id', tenant_id)
        .gte('entry_time', startOfDay.toISOString())
        .lte('entry_time', endOfDay.toISOString())
        .is('deleted_at', null)
        .order('entry_time', { ascending: true });
      
      reportData.contractors = contractors?.map((c: Record<string, unknown>) => ({
        name: (c.contractors as Record<string, string>)?.full_name,
        company: (c.contractors as Record<string, string>)?.company_name,
        entry_time: c.entry_time,
        exit_time: c.exit_time,
        validation_status: c.validation_status,
        access_type: c.access_type
      })) || [];
      summary.total_contractors = contractorCount || 0;
    }
    
    // Patrol logs
    if (include_patrols) {
      const { data: patrols, count: patrolCount } = await supabase
        .from('patrol_checkpoint_logs')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenant_id)
        .gte('checked_at', startOfDay.toISOString())
        .lte('checked_at', endOfDay.toISOString())
        .is('deleted_at', null)
        .order('checked_at', { ascending: true });
      
      reportData.patrols = patrols?.map((p: Record<string, unknown>) => ({
        checkpoint_name: p.checkpoint_name,
        checked_at: p.checked_at,
        status: p.status,
        notes: p.notes,
        distance_from_checkpoint: p.distance_from_checkpoint
      })) || [];
      summary.total_patrols = patrolCount || 0;
    }
    
    // Incidents
    if (include_incidents) {
      const { data: incidents, count: incidentCount } = await supabase
        .from('incidents')
        .select('id, reference_id, title, severity, event_type, occurred_at, status')
        .eq('tenant_id', tenant_id)
        .gte('occurred_at', startOfDay.toISOString())
        .lte('occurred_at', endOfDay.toISOString())
        .is('deleted_at', null)
        .order('occurred_at', { ascending: true });
      
      reportData.incidents = incidents || [];
      summary.total_incidents = incidentCount || 0;
    }
    
    // Geofence alerts
    if (include_alerts) {
      const { data: alerts, count: alertCount } = await supabase
        .from('geofence_alerts')
        .select(`
          *,
          profiles!geofence_alerts_guard_id_fkey (
            full_name
          ),
          security_zones (
            name
          )
        `, { count: 'exact' })
        .eq('tenant_id', tenant_id)
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .is('deleted_at', null)
        .order('created_at', { ascending: true });
      
      reportData.alerts = alerts?.map((a: Record<string, unknown>) => ({
        guard_name: (a.profiles as Record<string, string>)?.full_name,
        zone_name: (a.security_zones as Record<string, string>)?.name,
        alert_type: a.alert_type,
        severity: a.severity,
        message: a.alert_message,
        created_at: a.created_at,
        resolved_at: a.resolved_at
      })) || [];
      summary.total_alerts = alertCount || 0;
    }
    
    console.log('Shift report generated:', summary);
    
    return new Response(
      JSON.stringify({
        success: true,
        report: reportData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Shift report generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
