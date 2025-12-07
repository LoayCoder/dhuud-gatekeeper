import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpcomingSchedule {
  id: string;
  reference_id: string;
  name: string;
  schedule_type: string;
  next_due: string;
  days_until: number;
  assigned_inspector_id: string | null;
  template_id: string;
  tenant_id: string;
  reminder_days_before: number;
  last_reminder_sent: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[inspection-reminders] Starting reminder check...');

    // Get all active schedules that need reminders
    // A schedule needs a reminder if:
    // - It's active
    // - next_due is within reminder_days_before
    // - last_reminder_sent is null or more than 24 hours ago
    const { data: schedules, error: schedulesError } = await supabase
      .from('inspection_schedules')
      .select(`
        id, reference_id, name, schedule_type, next_due, 
        assigned_inspector_id, template_id, tenant_id,
        reminder_days_before, last_reminder_sent
      `)
      .eq('is_active', true)
      .is('deleted_at', null)
      .not('next_due', 'is', null);

    if (schedulesError) {
      console.error('[inspection-reminders] Error fetching schedules:', schedulesError);
      throw schedulesError;
    }

    console.log(`[inspection-reminders] Found ${schedules?.length || 0} active schedules`);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const remindersToSend: UpcomingSchedule[] = [];

    for (const schedule of schedules || []) {
      const nextDue = new Date(schedule.next_due);
      const daysUntil = Math.ceil((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      // Check if within reminder window
      if (daysUntil <= schedule.reminder_days_before && daysUntil >= 0) {
        // Check if reminder was already sent today
        const lastSent = schedule.last_reminder_sent ? new Date(schedule.last_reminder_sent) : null;
        const lastSentToday = lastSent && 
          lastSent.getFullYear() === today.getFullYear() &&
          lastSent.getMonth() === today.getMonth() &&
          lastSent.getDate() === today.getDate();

        if (!lastSentToday) {
          remindersToSend.push({
            ...schedule,
            days_until: daysUntil,
          });
        }
      }
    }

    console.log(`[inspection-reminders] ${remindersToSend.length} reminders to send`);

    const results = {
      processed: 0,
      emailsSent: 0,
      errors: [] as string[],
    };

    for (const schedule of remindersToSend) {
      try {
        // Get inspector email if assigned
        let inspectorEmail: string | null = null;
        let inspectorName: string | null = null;

        if (schedule.assigned_inspector_id) {
          const { data: inspector } = await supabase
            .from('profiles')
            .select('full_name, user_id')
            .eq('id', schedule.assigned_inspector_id)
            .single();

          if (inspector?.user_id) {
            const { data: authUser } = await supabase.auth.admin.getUserById(inspector.user_id);
            inspectorEmail = authUser?.user?.email || null;
            inspectorName = inspector.full_name;
          }
        }

        // Get tenant info for branding
        const { data: tenant } = await supabase
          .from('tenants')
          .select('name')
          .eq('id', schedule.tenant_id)
          .single();

        // Send email if we have an email and API key
        if (inspectorEmail && resendApiKey) {
          const dueText = schedule.days_until === 0 
            ? 'today' 
            : schedule.days_until === 1 
              ? 'tomorrow' 
              : `in ${schedule.days_until} days`;

          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1a1a1a;">Inspection Reminder</h2>
              <p>Hello ${inspectorName || 'Inspector'},</p>
              <p>This is a reminder that you have an inspection scheduled ${dueText}:</p>
              <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <p style="margin: 0;"><strong>Schedule:</strong> ${schedule.name}</p>
                <p style="margin: 8px 0 0;"><strong>Reference:</strong> ${schedule.reference_id}</p>
                <p style="margin: 8px 0 0;"><strong>Type:</strong> ${schedule.schedule_type}</p>
                <p style="margin: 8px 0 0;"><strong>Due Date:</strong> ${new Date(schedule.next_due).toLocaleDateString()}</p>
              </div>
              <p>Please ensure you complete this inspection on time.</p>
              <p style="color: #666; font-size: 12px; margin-top: 24px;">
                This is an automated reminder from ${tenant?.name || 'DHUUD Platform'}.
              </p>
            </div>
          `;

          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'DHUUD Platform <noreply@dhuud.com>',
              to: inspectorEmail,
              subject: `Inspection Reminder: ${schedule.name} due ${dueText}`,
              html: emailHtml,
            }),
          });

          if (emailResponse.ok) {
            results.emailsSent++;
            console.log(`[inspection-reminders] Email sent to ${inspectorEmail} for schedule ${schedule.reference_id}`);
          } else {
            const errorText = await emailResponse.text();
            console.error(`[inspection-reminders] Email failed: ${errorText}`);
          }
        }

        // Update last_reminder_sent
        await supabase
          .from('inspection_schedules')
          .update({ last_reminder_sent: new Date().toISOString() })
          .eq('id', schedule.id);

        results.processed++;
      } catch (err) {
        const errorMsg = `Error processing schedule ${schedule.reference_id}: ${err}`;
        console.error(`[inspection-reminders] ${errorMsg}`);
        results.errors.push(errorMsg);
      }
    }

    console.log(`[inspection-reminders] Complete. Processed: ${results.processed}, Emails: ${results.emailsSent}`);

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[inspection-reminders] Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
