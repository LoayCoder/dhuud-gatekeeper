import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  Shield,
  ShieldAlert,
  ShieldCheck,
  Ban,
  AlertTriangle,
  Eye,
} from 'lucide-react';
import { 
  useSuspiciousActivity, 
  maskIPAddress,
  type SuspiciousActivity,
} from '@/hooks/admin/use-rate-limit-stats';

function getSeverityBadge(severity: SuspiciousActivity['severity']) {
  const config = {
    low: { variant: 'secondary' as const, label: 'Low' },
    medium: { variant: 'outline' as const, label: 'Medium' },
    high: { variant: 'default' as const, label: 'High' },
    critical: { variant: 'destructive' as const, label: 'Critical' },
  };
  return config[severity] || config.low;
}

function getActivityIcon(activityType: string) {
  switch (activityType) {
    case 'auto_blocked':
      return <ShieldAlert className="h-4 w-4 text-destructive" />;
    case 'manual_block':
      return <Ban className="h-4 w-4 text-destructive" />;
    case 'whitelisted':
      return <ShieldCheck className="h-4 w-4 text-green-500" />;
    case 'unblocked':
      return <Shield className="h-4 w-4 text-muted-foreground" />;
    default:
      return <Activity className="h-4 w-4 text-muted-foreground" />;
  }
}

function getActivityLabel(activityType: string, t: (key: string, fallback: string) => string) {
  const labels: Record<string, string> = {
    auto_blocked: t('admin.autoBlocked', 'Auto Blocked'),
    manual_block: t('admin.manualBlock', 'Manual Block'),
    whitelisted: t('admin.whitelisted', 'Whitelisted'),
    unblocked: t('admin.unblocked', 'Unblocked'),
    rate_limit_exceeded: t('admin.rateLimitExceeded', 'Rate Limit Exceeded'),
  };
  return labels[activityType] || activityType;
}

export function SuspiciousActivityPanel() {
  const { t } = useTranslation();
  const { data: activities, isLoading } = useSuspiciousActivity(50);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!activities?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Eye className="h-12 w-12 mb-2" />
        <p>{t('admin.noSuspiciousActivity', 'No suspicious activity')}</p>
        <p className="text-sm">{t('admin.noSuspiciousActivityDesc', 'All quiet on the security front.')}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-3 pe-4">
        {activities.map((activity) => {
          const severityConfig = getSeverityBadge(activity.severity);
          const details = activity.details as Record<string, unknown>;
          
          return (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="mt-0.5">
                {getActivityIcon(activity.activity_type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">
                    {getActivityLabel(activity.activity_type, t)}
                  </span>
                  <Badge variant={severityConfig.variant} className="text-xs">
                    {severityConfig.label}
                  </Badge>
                  {activity.action_taken && (
                    <Badge variant="outline" className="text-xs">
                      {activity.action_taken}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <span className="font-mono">{maskIPAddress(activity.ip_address)}</span>
                  <span>•</span>
                  <span>{formatDistanceToNow(new Date(activity.detected_at), { addSuffix: true })}</span>
                </div>
                {details?.reason && (
                  <p className="text-sm text-muted-foreground mt-1 truncate">
                    {String(details.reason)}
                  </p>
                )}
                {details?.failed_attempts !== undefined && (
                  <div className="flex items-center gap-1 mt-1">
                    <AlertTriangle className="h-3 w-3 text-warning" />
                    <span className="text-xs text-muted-foreground">
                      {Number(details.failed_attempts)} {t('admin.failedAttempts', 'failed attempts')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
