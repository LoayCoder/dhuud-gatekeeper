/**
 * Visitor Induction Status Badge
 * 
 * Badge component showing induction status with appropriate styling.
 */
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Clock, Check, Eye, Send, AlertTriangle, X 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type InductionStatus = 'pending' | 'sent' | 'viewed' | 'completed' | 'expired';

interface VisitorInductionStatusBadgeProps {
  status: InductionStatus;
  sentAt?: string | null;
  viewedAt?: string | null;
  acknowledgedAt?: string | null;
  expiresAt?: string | null;
  className?: string;
}

export function VisitorInductionStatusBadge({
  status,
  sentAt,
  viewedAt,
  acknowledgedAt,
  expiresAt,
  className,
}: VisitorInductionStatusBadgeProps) {
  const { t } = useTranslation();

  const statusConfig: Record<InductionStatus, {
    label: string;
    icon: React.ReactNode;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    className?: string;
  }> = {
    pending: {
      label: t('visitors.induction.status.pending', 'Pending'),
      icon: <Clock className="w-3 h-3" />,
      variant: 'secondary',
      className: 'bg-muted text-muted-foreground',
    },
    sent: {
      label: t('visitors.induction.status.sent', 'Sent'),
      icon: <Send className="w-3 h-3" />,
      variant: 'outline',
      className: 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    },
    viewed: {
      label: t('visitors.induction.status.viewed', 'Viewed'),
      icon: <Eye className="w-3 h-3" />,
      variant: 'outline',
      className: 'border-yellow-500 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20',
    },
    completed: {
      label: t('visitors.induction.status.completed', 'Completed'),
      icon: <Check className="w-3 h-3" />,
      variant: 'default',
      className: 'bg-green-500 hover:bg-green-600',
    },
    expired: {
      label: t('visitors.induction.status.expired', 'Expired'),
      icon: <X className="w-3 h-3" />,
      variant: 'destructive',
    },
  };

  const config = statusConfig[status];

  const tooltipContent = (
    <div className="space-y-1 text-xs">
      <p className="font-medium">{config.label}</p>
      {sentAt && (
        <p>{t('visitors.induction.sentAt', 'Sent')}: {format(new Date(sentAt), 'PPp')}</p>
      )}
      {viewedAt && (
        <p>{t('visitors.induction.viewedAt', 'Viewed')}: {format(new Date(viewedAt), 'PPp')}</p>
      )}
      {acknowledgedAt && (
        <p>{t('visitors.induction.completedAt', 'Completed')}: {format(new Date(acknowledgedAt), 'PPp')}</p>
      )}
      {expiresAt && status !== 'completed' && (
        <p className={cn(
          new Date(expiresAt) < new Date() ? 'text-destructive' : ''
        )}>
          {t('visitors.induction.expiresAt', 'Expires')}: {format(new Date(expiresAt), 'PPp')}
        </p>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={config.variant}
            className={cn("flex items-center gap-1", config.className, className)}
          >
            {config.icon}
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
