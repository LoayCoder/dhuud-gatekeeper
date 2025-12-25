import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Processing confidentiality expiry checks...');

    // Call the database function to process expirations
    const { data: results, error } = await supabase.rpc('process_confidentiality_expiry');

    if (error) {
      console.error('Error processing expiry:', error);
      throw error;
    }

    const processed = results || [];
    const autoDeclassified = processed.filter((r: { action_taken: string }) => r.action_taken === 'auto_declassified');
    const remindersNeeded = processed.filter((r: { action_taken: string }) => r.action_taken === 'reminder_needed');

    console.log(`Processed ${processed.length} incidents: ${autoDeclassified.length} auto-declassified, ${remindersNeeded.length} reminders needed`);

    // Send reminders for incidents that need manual review
    for (const reminder of remindersNeeded) {
      // Get HSSE managers for the tenant
      const { data: incident } = await supabase
        .from('incidents')
        .select('tenant_id, reference_id, title')
        .eq('id', reminder.incident_id)
        .single();

      if (incident) {
        const { data: managers } = await supabase
          .from('user_role_assignments')
          .select('user_id, profiles!inner(full_name, email)')
          .eq('tenant_id', incident.tenant_id)
          .eq('roles.code', 'hsse_manager');

        // Create in-app notifications for HSSE managers
        for (const manager of managers || []) {
          await supabase.from('notifications').insert({
            tenant_id: incident.tenant_id,
            user_id: manager.user_id,
            type: 'confidentiality_expiry_reminder',
            title: 'Confidentiality Review Required',
            message: `Incident ${incident.reference_id} confidentiality has expired and requires review.`,
            data: { incident_id: reminder.incident_id },
            is_read: false
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: processed.length,
        autoDeclassified: autoDeclassified.length,
        remindersNeeded: remindersNeeded.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Confidentiality expiry check failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
