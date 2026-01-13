import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate 12 hours ago
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    console.log(`[AutoAcknowledge] Running at ${now}, checking for shifts assigned before ${twelveHoursAgo}`);

    // Find all unacknowledged shifts that were assigned more than 12 hours ago
    const { data: shiftsToAcknowledge, error: fetchError } = await supabase
      .from('shift_roster')
      .select('id, guard_id, roster_date')
      .is('acknowledged_at', null)
      .lt('assigned_at', twelveHoursAgo)
      .is('deleted_at', null);

    if (fetchError) {
      console.error('[AutoAcknowledge] Error fetching shifts:', fetchError);
      throw fetchError;
    }

    if (!shiftsToAcknowledge || shiftsToAcknowledge.length === 0) {
      console.log('[AutoAcknowledge] No shifts to auto-acknowledge');
      return new Response(
        JSON.stringify({ success: true, updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[AutoAcknowledge] Found ${shiftsToAcknowledge.length} shifts to auto-acknowledge`);

    // Update all matching shifts
    const shiftIds = shiftsToAcknowledge.map(s => s.id);
    const { error: updateError } = await supabase
      .from('shift_roster')
      .update({
        acknowledged_at: now,
        auto_acknowledged: true
      })
      .in('id', shiftIds);

    if (updateError) {
      console.error('[AutoAcknowledge] Error updating shifts:', updateError);
      throw updateError;
    }

    console.log(`[AutoAcknowledge] Successfully auto-acknowledged ${shiftIds.length} shifts`);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        updated: shiftIds.length,
        shift_ids: shiftIds,
        timestamp: now
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[AutoAcknowledge] Error:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
