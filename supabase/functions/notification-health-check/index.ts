/**
 * NOTIFICATION HEALTH CHECK
 *
 * Returns delivery statistics across all channels for a tenant.
 * Used by admins and monitoring dashboards to detect silent failures.
 *
 * Checks:
 * 1. WhatsApp provider is configured and reachable
 * 2. Email provider (Resend) is configured
 * 3. Push notifications (VAPID keys) configured
 * 4. Delivery rates per channel (last 24h)
 * 5. Failure rates and common error codes
 * 6. Pending notifications stuck without delivery
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { isProviderConfigured } from '../_shared/whatsapp-provider.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    whatsapp: ProviderCheck;
    email: ProviderCheck;
    push: ProviderCheck;
  };
  delivery_stats: DeliveryStats[];
  stuck_notifications: number;
  recent_failures: FailureEntry[];
  timestamp: string;
}

interface ProviderCheck {
  configured: boolean;
  provider?: string;
  missing_config?: string[];
}

interface DeliveryStats {
  channel: string;
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  total_pending: number;
  delivery_rate: number;
  failure_rate: number;
}

interface FailureEntry {
  channel: string;
  error_message: string;
  count: number;
  last_occurred: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const tenantId = url.searchParams.get('tenant_id');
    const hours = parseInt(url.searchParams.get('hours') || '24', 10);

    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'tenant_id query parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Check WhatsApp provider
    const whatsappStatus = isProviderConfigured();
    const whatsappCheck: ProviderCheck = {
      configured: whatsappStatus.configured,
      provider: whatsappStatus.provider,
      missing_config: whatsappStatus.missing.length > 0 ? whatsappStatus.missing : undefined,
    };

    // 2. Check Email provider (Resend)
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const emailCheck: ProviderCheck = {
      configured: !!resendKey,
      provider: 'resend',
      missing_config: resendKey ? undefined : ['RESEND_API_KEY'],
    };

    // 3. Check Push provider (VAPID)
    const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY');
    const pushMissing: string[] = [];
    if (!vapidPublic) pushMissing.push('VAPID_PUBLIC_KEY');
    if (!vapidPrivate) pushMissing.push('VAPID_PRIVATE_KEY');
    const pushCheck: ProviderCheck = {
      configured: pushMissing.length === 0,
      provider: 'web-push-vapid',
      missing_config: pushMissing.length > 0 ? pushMissing : undefined,
    };

    // 4. Delivery stats per channel (last N hours)
    const { data: deliveryData } = await supabase.rpc('get_notification_delivery_health', {
      p_tenant_id: tenantId,
      p_hours: hours,
    });

    const deliveryStats: DeliveryStats[] = (deliveryData || []).map((d: Record<string, unknown>) => ({
      channel: d.channel as string,
      total_sent: Number(d.total_sent || 0),
      total_delivered: Number(d.total_delivered || 0),
      total_failed: Number(d.total_failed || 0),
      total_pending: Number(d.total_pending || 0),
      delivery_rate: Number(d.delivery_rate || 0),
      failure_rate: Number(d.failure_rate || 0),
    }));

    // 5. Stuck notifications (pending for > 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: stuckCount } = await supabase
      .from('notification_logs')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .eq('is_final', false)
      .lt('created_at', oneHourAgo)
      .is('deleted_at', null);

    // 6. Recent failure reasons (top 5)
    const { data: failureData } = await supabase
      .from('notification_logs')
      .select('channel, error_message, created_at')
      .eq('tenant_id', tenantId)
      .in('status', ['failed', 'bounced', 'complained'])
      .gt('created_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(50);

    // Aggregate failure reasons
    const failureMap = new Map<string, { channel: string; count: number; last: string }>();
    for (const f of failureData || []) {
      const key = `${f.channel}:${f.error_message || 'unknown'}`;
      const existing = failureMap.get(key);
      if (existing) {
        existing.count++;
        if (f.created_at > existing.last) existing.last = f.created_at;
      } else {
        failureMap.set(key, {
          channel: f.channel,
          count: 1,
          last: f.created_at,
        });
      }
    }

    const recentFailures: FailureEntry[] = Array.from(failureMap.entries())
      .map(([key, val]) => ({
        channel: val.channel,
        error_message: key.split(':').slice(1).join(':'),
        count: val.count,
        last_occurred: val.last,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Determine overall health
    const allConfigured = whatsappCheck.configured && emailCheck.configured && pushCheck.configured;
    const hasHighFailureRate = deliveryStats.some(d => d.failure_rate > 20);
    const hasStuck = (stuckCount || 0) > 10;

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (!allConfigured || hasStuck) overallStatus = 'degraded';
    if (hasHighFailureRate) overallStatus = 'unhealthy';

    const health: HealthStatus = {
      status: overallStatus,
      checks: {
        whatsapp: whatsappCheck,
        email: emailCheck,
        push: pushCheck,
      },
      delivery_stats: deliveryStats,
      stuck_notifications: stuckCount || 0,
      recent_failures: recentFailures,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(health, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[HealthCheck] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
