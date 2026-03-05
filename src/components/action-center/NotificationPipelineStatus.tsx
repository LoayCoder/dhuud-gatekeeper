/**
 * NOTIFICATION PIPELINE STATUS
 *
 * Displays the delivery status and audit trail for notifications
 * triggered from the Action Center. Shows real-time delivery progress
 * and allows administrators to view the notification lifecycle.
 */

import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Bell, CheckCircle2, AlertTriangle, Clock, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface DeliveryStatusSummary {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
}

export function NotificationPipelineStatus() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  const { data: stats, isLoading } = useQuery({
    queryKey: ['notification-pipeline-status', tenantId],
    queryFn: async (): Promise<DeliveryStatusSummary> => {
      if (!tenantId) return { total: 0, sent: 0, delivered: 0, failed: 0, pending: 0 };

      // Server-side aggregation via RPC — returns a single JSON summary
      // instead of fetching all rows and counting client-side
      const { data, error } = await (supabase.rpc as unknown as (
        fn: string,
        args: { p_tenant_id: string }
      ) => Promise<{ data: unknown; error: unknown }>)('get_notification_summary', {
        p_tenant_id: tenantId,
      });

      if (error || !data) return { total: 0, sent: 0, delivered: 0, failed: 0, pending: 0 };

      // Cast to expected shape since RPC returns JSON
      const summary = data as { total: number; sent: number; delivered: number; failed: number; pending: number };

      return {
        total: Number(summary.total) || 0,
        sent: Number(summary.sent) || 0,
        delivered: Number(summary.delivered) || 0,
        failed: Number(summary.failed) || 0,
        pending: Number(summary.pending) || 0,
      };
    },
    enabled: !!tenantId,
    refetchInterval: 30000,
    staleTime: 15000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.total === 0) return null;

  const items = [
    {
      label: t('actionCenter.pipeline.sent', 'Sent'),
      value: stats.sent + stats.delivered,
      icon: CheckCircle2,
      colorClass: 'text-success',
    },
    {
      label: t('actionCenter.pipeline.pending', 'Pending'),
      value: stats.pending,
      icon: Clock,
      colorClass: 'text-warning',
    },
    {
      label: t('actionCenter.pipeline.failed', 'Failed'),
      value: stats.failed,
      icon: XCircle,
      colorClass: 'text-destructive',
    },
    {
      label: t('actionCenter.pipeline.total', 'Total (24h)'),
      value: stats.total,
      icon: Bell,
      colorClass: 'text-muted-foreground',
    },
  ];

  const successRate = stats.total > 0
    ? Math.round(((stats.sent + stats.delivered) / stats.total) * 100)
    : 100;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">
              {t('actionCenter.pipeline.title', 'Notification Delivery (24h)')}
            </CardTitle>
          </div>
          <Badge variant={successRate >= 95 ? 'secondary' : successRate >= 80 ? 'outline' : 'destructive'}>
            {successRate}% {t('actionCenter.pipeline.successRate', 'success')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-4 gap-2">
          {items.map(item => (
            <div key={item.label} className="text-center rounded-md border bg-muted/30 p-2">
              <item.icon className={cn('h-4 w-4 mx-auto mb-1', item.colorClass)} />
              <div className={cn('text-lg font-bold tabular-nums', item.value > 0 ? item.colorClass : 'text-muted-foreground')}>
                {item.value}
              </div>
              <div className="text-[10px] text-muted-foreground font-medium uppercase">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
