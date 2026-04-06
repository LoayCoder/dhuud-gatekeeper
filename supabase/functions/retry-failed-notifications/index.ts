import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sendEmail, type EmailModule } from "../_shared/email-sender.ts";
import { sendWaSenderTextMessage } from "../_shared/wasender-whatsapp.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Backoff schedule: attempt_count -> minutes to wait before next retry
const BACKOFF_MINUTES: Record<number, number> = {
  1: 2,      // After attempt 1 fails: retry in 2 min
  2: 10,     // After attempt 2 fails: retry in 10 min
  3: 30,     // After attempt 3 fails: retry in 30 min
  4: 120,    // After attempt 4 fails: retry in 2 hours (final)
};

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 20;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    console.log('[RetryNotifications] Starting retry cycle...');

    // Fetch failed notifications eligible for retry
    const { data: failedLogs, error: fetchError } = await supabase
      .from('auto_notification_logs')
      .select('*')
      .eq('status', 'failed')
      .lt('attempt_count', MAX_ATTEMPTS)
      .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .or('retry_at.is.null,retry_at.lte.' + new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) {
      console.error('[RetryNotifications] Fetch error:', fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!failedLogs || failedLogs.length === 0) {
      console.log('[RetryNotifications] No failed notifications to retry');
      return new Response(
        JSON.stringify({ success: true, retried: 0, succeeded: 0, still_failed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[RetryNotifications] Found ${failedLogs.length} notifications to retry`);

    let succeeded = 0;
    let stillFailed = 0;
    let permanentlyFailed = 0;

    for (const log of failedLogs) {
      const newAttemptCount = (log.attempt_count || 1) + 1;
      
      console.log(`[RetryNotifications] Retrying ${log.channel} notification ${log.id} (attempt ${newAttemptCount}/${MAX_ATTEMPTS})`);

      let sendSuccess = false;
      let sendError: string | undefined;
      let providerMessageId: string | undefined;

      try {
        if (log.channel === 'email') {
          // Look up recipient email from profiles
          if (log.recipient_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', log.recipient_id)
              .single();

            if (profile?.email && log.message_content) {
              // Extract subject from message_content if stored as JSON
              let subject = 'Notification Retry';
              let html = log.message_content;
              
              try {
                const parsed = JSON.parse(log.message_content);
                if (parsed.subject) subject = parsed.subject;
                if (parsed.html) html = parsed.html;
              } catch {
                // message_content is raw HTML, use as-is
              }

              const result = await sendEmail({
                to: [profile.email],
                subject,
                html,
                module: 'incident_workflow' as EmailModule,
              });
              sendSuccess = result.success;
              sendError = result.error;
              providerMessageId = result.messageId;
            } else {
              sendError = !profile?.email ? 'No email found for recipient' : 'No message content stored for retry';
            }
          } else {
            sendError = 'No recipient_id for email retry';
          }

          // Throttle between email sends
          await sleep(200);
          
        } else if (log.channel === 'whatsapp') {
          if (log.recipient_phone && log.message_content) {
            const result = await sendWaSenderTextMessage(log.recipient_phone, log.message_content);
            sendSuccess = result.success;
            sendError = result.error;
            providerMessageId = result.messageId;
          } else {
            sendError = !log.recipient_phone ? 'No phone number' : 'No message content stored for retry';
          }

          // Throttle between WhatsApp sends
          await sleep(1000);

        } else if (log.channel === 'push') {
          // Push notifications: re-invoke the push function
          if (log.recipient_id && log.message_content) {
            try {
              const parsed = JSON.parse(log.message_content);
              const pushResponse = await supabase.functions.invoke('send-push-notification', {
                body: {
                  user_ids: [log.recipient_id],
                  payload: parsed,
                  notification_type: 'incidents_new',
                },
              });
              sendSuccess = !pushResponse.error;
              sendError = pushResponse.error?.message;
            } catch (e) {
              sendError = e instanceof Error ? e.message : 'Push retry failed';
            }
          } else {
            sendError = 'No message content for push retry';
          }
        } else {
          sendError = `Unknown channel: ${log.channel}`;
        }
      } catch (error) {
        sendError = error instanceof Error ? error.message : 'Unknown retry error';
      }

      // Update the notification log
      if (sendSuccess) {
        await supabase
          .from('auto_notification_logs')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            attempt_count: newAttemptCount,
            error_message: null,
            provider_message_id: providerMessageId,
            retry_at: null,
          })
          .eq('id', log.id);
        
        succeeded++;
        console.log(`[RetryNotifications] ✓ ${log.channel} ${log.id} succeeded on attempt ${newAttemptCount}`);
      } else {
        // Calculate next retry time or mark permanently failed
        const isFinalAttempt = newAttemptCount >= MAX_ATTEMPTS;
        const backoffMinutes = BACKOFF_MINUTES[newAttemptCount] || 120;
        const nextRetryAt = isFinalAttempt 
          ? null 
          : new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString();

        await supabase
          .from('auto_notification_logs')
          .update({
            status: isFinalAttempt ? 'permanently_failed' : 'failed',
            attempt_count: newAttemptCount,
            error_message: sendError || 'Unknown error',
            retry_at: nextRetryAt,
          })
          .eq('id', log.id);

        if (isFinalAttempt) {
          permanentlyFailed++;
          console.log(`[RetryNotifications] ✗ ${log.channel} ${log.id} permanently failed after ${newAttemptCount} attempts: ${sendError}`);
        } else {
          stillFailed++;
          console.log(`[RetryNotifications] ✗ ${log.channel} ${log.id} failed attempt ${newAttemptCount}, next retry in ${backoffMinutes} min: ${sendError}`);
        }
      }
    }

    const summary = {
      success: true,
      retried: failedLogs.length,
      succeeded,
      still_failed: stillFailed,
      permanently_failed: permanentlyFailed,
    };

    console.log(`[RetryNotifications] Complete:`, summary);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[RetryNotifications] Unhandled error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
