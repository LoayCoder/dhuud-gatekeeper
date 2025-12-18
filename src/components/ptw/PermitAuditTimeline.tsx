import { useTranslation } from 'react-i18next';
import { format, formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  Pause,
  Archive,
  ArrowRight,
  User,
} from 'lucide-react';
import { usePTWAuditLogs, PTWAuditLog } from '@/hooks/ptw/use-ptw-audit-logs';
import { cn } from '@/lib/utils';

interface PermitAuditTimelineProps {
  permitId: string;
  className?: string;
  maxHeight?: string;
}

const actionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  permit_created: FileText,
  status_change: ArrowRight,
  activated: Play,
  suspended: Pause,
  closed: Archive,
  approved: CheckCircle2,
  rejected: XCircle,
  endorsed: CheckCircle2,
  issued: CheckCircle2,
};

const statusColors: Record<string, string> = {
  requested: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  endorsed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  issued: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  suspended: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  closed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
};

export function PermitAuditTimeline({ permitId, className, maxHeight = '400px' }: PermitAuditTimelineProps) {
  const { t, i18n } = useTranslation();
  const { data: auditLogs, isLoading } = usePTWAuditLogs(permitId);
  const isRTL = i18n.dir() === 'rtl';
  const dateLocale = i18n.language === 'ar' ? ar : enUS;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!auditLogs || auditLogs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">{t('ptw.audit.noHistory', 'No audit history available')}</p>
      </div>
    );
  }

  return (
    <ScrollArea className={className} style={{ maxHeight }}>
      <div className="relative pe-4">
        {/* Timeline line */}
        <div 
          className={cn(
            "absolute top-0 bottom-0 w-0.5 bg-border",
            isRTL ? "end-4" : "start-4"
          )} 
        />

        <div className="space-y-4">
          {auditLogs.map((log, index) => (
            <AuditLogItem
              key={log.id}
              log={log}
              isFirst={index === 0}
              isLast={index === auditLogs.length - 1}
              dateLocale={dateLocale}
            />
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

interface AuditLogItemProps {
  log: PTWAuditLog;
  isFirst: boolean;
  isLast: boolean;
  dateLocale: typeof ar | typeof enUS;
}

function AuditLogItem({ log, isFirst, dateLocale }: AuditLogItemProps) {
  const { t } = useTranslation();

  const getActionIcon = () => {
    if (log.action === 'status_change' && log.new_value?.status) {
      const status = log.new_value.status as string;
      if (status === 'active') return Play;
      if (status === 'suspended') return Pause;
      if (status === 'closed') return Archive;
      if (status === 'endorsed' || status === 'issued') return CheckCircle2;
      if (status === 'cancelled') return XCircle;
    }
    return actionIcons[log.action] || Clock;
  };

  const IconComponent = getActionIcon();

  const getActionLabel = () => {
    if (log.action === 'permit_created') {
      return t('ptw.audit.actions.created', 'Permit Created');
    }
    if (log.action === 'status_change') {
      const oldStatus = log.old_value?.status as string;
      const newStatus = log.new_value?.status as string;
      return t('ptw.audit.actions.statusChanged', 'Status changed from {{from}} to {{to}}', {
        from: t(`ptw.status.${oldStatus}`, oldStatus),
        to: t(`ptw.status.${newStatus}`, newStatus),
      });
    }
    return t(`ptw.audit.actions.${log.action}`, log.action);
  };

  const getStatusBadge = () => {
    if (log.action === 'status_change' && log.new_value?.status) {
      const status = log.new_value.status as string;
      return (
        <Badge className={cn('text-xs', statusColors[status] || 'bg-gray-100')}>
          {t(`ptw.status.${status}`, status)}
        </Badge>
      );
    }
    return null;
  };

  const actorName = log.actor?.full_name || t('ptw.audit.system', 'System');
  const actorInitials = actorName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex gap-3 relative">
      {/* Icon */}
      <div 
        className={cn(
          "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background",
          isFirst && "ring-2 ring-primary ring-offset-2 ring-offset-background"
        )}
      >
        <IconComponent className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{getActionLabel()}</p>
          {getStatusBadge()}
        </div>

        <div className="flex items-center gap-2 mt-1">
          <Avatar className="h-5 w-5">
            <AvatarImage src={log.actor?.avatar_url || undefined} />
            <AvatarFallback className="text-[10px]">
              {log.actor ? actorInitials : <User className="h-3 w-3" />}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground">{actorName}</span>
        </div>

        <p className="text-xs text-muted-foreground mt-1">
          {format(new Date(log.created_at), 'PPp', { locale: dateLocale })}
          <span className="mx-1">•</span>
          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: dateLocale })}
        </p>

        {log.ip_address && (
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            IP: {log.ip_address}
          </p>
        )}
      </div>
    </div>
  );
}
