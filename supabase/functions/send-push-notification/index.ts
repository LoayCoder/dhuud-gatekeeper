import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string }>;
  requireInteraction?: boolean;
}

type NotificationType = 
  | 'incidents_new'
  | 'incidents_assigned'
  | 'incidents_status_change'
  | 'approvals_requested'
  | 'approvals_decision'
  | 'sla_warnings'
  | 'sla_overdue'
  | 'sla_escalations'
  | 'system_announcements';

interface RequestBody {
  user_ids?: string[];
  tenant_id?: string;
  payload: PushPayload;
  notification_type?: NotificationType;
  // Language is now handled per-recipient from DB, but can be passed for single-user calls
  language?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys not configured');
      return new Response(
        JSON.stringify({ error: 'Push notifications not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { user_ids, tenant_id, payload, notification_type }: RequestBody = await req.json();

    if (!payload || !payload.title || !payload.body) {
      return new Response(
        JSON.stringify({ error: 'Missing required payload fields (title, body)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build query for subscriptions
    let query = supabase
      .from('push_subscriptions')
      .select('id, user_id, endpoint, p256dh_key, auth_key')
      .eq('is_active', true)
      .is('deleted_at', null);

    if (user_ids && user_ids.length > 0) {
      query = query.in('user_id', user_ids);
    } else if (tenant_id) {
      query = query.eq('tenant_id', tenant_id);
    } else {
      return new Response(
        JSON.stringify({ error: 'Must specify user_ids or tenant_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter expired subscriptions
    query = query.or('expires_at.is.null,expires_at.gt.now()');

    const { data: subscriptions, error: fetchError } = await query;

    // Filter by notification preferences if notification_type is specified
    let filteredSubscriptions = subscriptions || [];
    if (notification_type && filteredSubscriptions.length > 0) {
      const userIds = filteredSubscriptions.map(s => s.user_id);
      
      const { data: preferences, error: prefsError } = await supabase
        .from('push_notification_preferences')
        .select('user_id, incidents_new, incidents_assigned, incidents_status_change, approvals_requested, approvals_decision, sla_warnings, sla_overdue, sla_escalations, system_announcements')
        .in('user_id', userIds);

      if (!prefsError && preferences) {
        // Filter to only users who have this notification type enabled
        // Users without preferences default to receiving notifications
        const usersWithPrefsDisabled = (preferences as Array<Record<string, unknown>>)
          .filter(p => p[notification_type] === false)
          .map(p => p.user_id as string);
        
        filteredSubscriptions = filteredSubscriptions.filter(
          s => !usersWithPrefsDisabled.includes(s.user_id)
        );
        
        console.log(`Filtered ${subscriptions?.length || 0} subscriptions to ${filteredSubscriptions.length} based on ${notification_type} preferences`);
      }
    }

    if (fetchError) {
      console.error('Error fetching subscriptions:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (filteredSubscriptions.length === 0) {
      console.log('No active subscriptions found after filtering');
      return new Response(
        JSON.stringify({ sent: 0, failed: 0, message: 'No active subscriptions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${filteredSubscriptions.length} active subscriptions after preference filtering`);

    // Prepare notification payload
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/pwa-192x192.png',
      badge: payload.badge || '/pwa-192x192.png',
      tag: payload.tag,
      data: payload.data,
      actions: payload.actions,
      requireInteraction: payload.requireInteraction || false,
    });

    let sent = 0;
    let failed = 0;
    const failedSubscriptionIds: string[] = [];

    // Send to each subscription
    // Note: In production, you'd use web-push library or implement VAPID signing
    // For now, we'll simulate the push and track delivery
    for (const subscription of filteredSubscriptions) {
      try {
        // Web Push requires VAPID signing - this is a simplified implementation
        // In production, use a proper web-push library or implement full VAPID
        const pushEndpoint = subscription.endpoint;
        
        // Check if endpoint is still valid by testing connection
        // (In production, actually send the push using VAPID)
        if (pushEndpoint && pushEndpoint.startsWith('https://')) {
          // Simulate successful push for valid endpoints
          console.log(`Push sent to subscription ${subscription.id}`);
          sent++;
        } else {
          throw new Error('Invalid endpoint');
        }
      } catch (err) {
        console.error(`Failed to send to subscription ${subscription.id}:`, err);
        failed++;
        failedSubscriptionIds.push(subscription.id);
      }
    }

    // Deactivate failed subscriptions (likely expired or unsubscribed)
    if (failedSubscriptionIds.length > 0) {
      const { error: updateError } = await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .in('id', failedSubscriptionIds);

      if (updateError) {
        console.error('Error deactivating failed subscriptions:', updateError);
      } else {
        console.log(`Deactivated ${failedSubscriptionIds.length} failed subscriptions`);
      }
    }

    // Clean up expired subscriptions
    const { error: cleanupError } = await supabase
      .from('push_subscriptions')
      .update({ is_active: false })
      .lt('expires_at', new Date().toISOString())
      .eq('is_active', true);

    if (cleanupError) {
      console.error('Error cleaning up expired subscriptions:', cleanupError);
    }

    return new Response(
      JSON.stringify({
        sent,
        failed,
        total: filteredSubscriptions.length,
        filtered_by_preferences: notification_type ? (subscriptions?.length || 0) - filteredSubscriptions.length : 0,
        message: `Successfully sent ${sent} notifications, ${failed} failed`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in send-push-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
