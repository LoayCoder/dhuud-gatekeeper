import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShiftToRemind {
  id: string;
  guard_id: string;
  roster_date: string;
  zone_name: string;
  shift_name: string;
  shift_start: string;
  reminder_minutes_before: number;
  guard_name: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting shift reminder check...');

    // Find shifts that need reminders (shift_start within reminder window and not yet sent)
    const now = new Date();
    const maxReminderMinutes = 60; // Check up to 60 minutes ahead
    const futureTime = new Date(now.getTime() + maxReminderMinutes * 60 * 1000);

    // Get today's roster entries with pending reminders
    const today = now.toISOString().split('T')[0];
    
    const { data: shifts, error: shiftsError } = await supabase
      .from('shift_roster')
      .select(`
        id,
        guard_id,
        roster_date,
        reminder_minutes_before,
        reminder_sent_at,
        zone:security_zones(zone_name),
        shift:security_shifts(name, start_time),
        guard:profiles!shift_roster_guard_id_fkey(full_name)
      `)
      .eq('roster_date', today)
      .is('reminder_sent_at', null)
      .is('deleted_at', null);

    if (shiftsError) {
      console.error('Error fetching shifts:', shiftsError);
      throw shiftsError;
    }

    console.log(`Found ${shifts?.length || 0} shifts to check for reminders`);

    const remindersToSend: ShiftToRemind[] = [];

    for (const shift of shifts || []) {
      const reminderMinutes = shift.reminder_minutes_before || 30;
      const shiftStartTime = (shift.shift as any)?.start_time;
      
      if (!shiftStartTime) continue;

      // Combine roster_date with shift start_time
      const shiftDateTime = new Date(`${shift.roster_date}T${shiftStartTime}`);
      const reminderTime = new Date(shiftDateTime.getTime() - reminderMinutes * 60 * 1000);

      // Check if we're within the reminder window
      if (now >= reminderTime && now < shiftDateTime) {
        remindersToSend.push({
          id: shift.id,
          guard_id: shift.guard_id,
          roster_date: shift.roster_date,
          zone_name: (shift.zone as any)?.zone_name || 'Unassigned',
          shift_name: (shift.shift as any)?.name || 'Shift',
          shift_start: shiftStartTime,
          reminder_minutes_before: reminderMinutes,
          guard_name: (shift.guard as any)?.full_name || 'Guard',
        });
      }
    }

    console.log(`Sending ${remindersToSend.length} shift reminders`);

    let sentCount = 0;
    let failedCount = 0;

    for (const shift of remindersToSend) {
      try {
        // Send push notification
        const { error: pushError } = await supabase.functions.invoke('send-push-notification', {
          body: {
            user_ids: [shift.guard_id],
            payload: {
              title: 'Shift Reminder',
              body: `Your ${shift.shift_name} shift at ${shift.zone_name} starts at ${shift.shift_start}`,
              tag: `shift-reminder-${shift.id}`,
              data: {
                type: 'shift_reminder',
                shift_id: shift.id,
                roster_date: shift.roster_date,
              },
              actions: [
                { action: 'acknowledge', title: 'Got it' },
                { action: 'view', title: 'View Details' },
              ],
            },
          },
        });

        if (pushError) {
          console.error(`Failed to send push for shift ${shift.id}:`, pushError);
        }

        // Mark reminder as sent
        const { error: updateError } = await supabase
          .from('shift_roster')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id', shift.id);

        if (updateError) {
          console.error(`Failed to update reminder status for ${shift.id}:`, updateError);
          failedCount++;
        } else {
          sentCount++;
        }
      } catch (err) {
        console.error(`Error processing reminder for shift ${shift.id}:`, err);
        failedCount++;
      }
    }

    console.log(`Shift reminders complete: ${sentCount} sent, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        failed: failedCount,
        checked: shifts?.length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Shift reminder error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
