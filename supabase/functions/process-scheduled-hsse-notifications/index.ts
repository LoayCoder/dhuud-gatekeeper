import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Processing scheduled HSSE notifications...');

    // Find all due schedules
    const { data: dueSchedules, error: fetchError } = await supabase
      .from('hsse_scheduled_notifications')
      .select('*')
      .eq('is_active', true)
      .is('deleted_at', null)
      .lte('next_scheduled_at', new Date().toISOString())
      .not('next_scheduled_at', 'is', null);

    if (fetchError) {
      throw new Error(`Failed to fetch schedules: ${fetchError.message}`);
    }

    console.log(`Found ${dueSchedules?.length || 0} due schedules`);

    const results = {
      processed: 0,
      notifications_created: 0,
      errors: [] as string[],
    };

    for (const schedule of dueSchedules || []) {
      try {
        console.log(`Processing schedule ${schedule.id}: ${schedule.title_en}`);

        // Check if end_date has passed
        if (schedule.end_date && new Date(schedule.end_date) < new Date()) {
          console.log(`Schedule ${schedule.id} has ended, deactivating`);
          await supabase
            .from('hsse_scheduled_notifications')
            .update({ is_active: false })
            .eq('id', schedule.id);
          continue;
        }

        // Create the actual notification
        const { data: newNotification, error: createError } = await supabase
          .from('hsse_notifications')
          .insert({
            tenant_id: schedule.tenant_id,
            title_en: schedule.title_en,
            title_ar: schedule.title_ar,
            body_en: schedule.body_en,
            body_ar: schedule.body_ar,
            category: schedule.category,
            priority: schedule.priority,
            notification_type: schedule.notification_type,
            target_audience: schedule.target_audience,
            target_role_ids: schedule.target_role_ids || [],
            target_branch_ids: schedule.target_branch_ids || [],
            target_site_ids: schedule.target_site_ids || [],
            send_push_notification: schedule.send_push_notification,
            send_email_notification: schedule.send_email_notification,
            published_at: new Date().toISOString(),
            created_by: schedule.created_by,
          })
          .select()
          .single();

        if (createError) {
          throw new Error(`Failed to create notification: ${createError.message}`);
        }

        results.notifications_created++;
        console.log(`Created notification ${newNotification.id} from schedule ${schedule.id}`);

        // Update the schedule
        const { error: updateError } = await supabase
          .from('hsse_scheduled_notifications')
          .update({
            last_sent_at: new Date().toISOString(),
            total_sent_count: (schedule.total_sent_count || 0) + 1,
          })
          .eq('id', schedule.id);

        if (updateError) {
          console.error(`Failed to update schedule ${schedule.id}:`, updateError);
        }

        // Trigger send-hsse-notification function if email is enabled
        if (schedule.send_email_notification || schedule.send_push_notification) {
          try {
            const sendResult = await supabase.functions.invoke('send-hsse-notification', {
              body: { notification_id: newNotification.id },
            });
            console.log(`Triggered send-hsse-notification for ${newNotification.id}:`, sendResult);
          } catch (sendError) {
            console.error(`Failed to trigger send-hsse-notification:`, sendError);
          }
        }

        results.processed++;

      } catch (scheduleError) {
        const errorMsg = `Schedule ${schedule.id}: ${scheduleError instanceof Error ? scheduleError.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    console.log(`Processed ${results.processed} schedules, created ${results.notifications_created} notifications`);

    return new Response(JSON.stringify({
      success: true,
      ...results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-scheduled-hsse-notifications:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
