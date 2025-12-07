import { useTranslation } from 'react-i18next';
import { Clock, AlertTriangle, ArrowUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { differenceInDays, parseISO } from 'date-fns';
import { useActionSLAConfig } from '@/hooks/use-action-sla-config';
import { cn } from '@/lib/utils';

interface ActionSLABadgeProps {
  dueDate: string | null;
  priority: string | null;
  status: string | null;
  escalationLevel?: number;
}

type SLAStatus = 'on_track' | 'warning' | 'overdue' | 'escalated' | 'completed';

export function ActionSLABadge({ dueDate, priority, status, escalationLevel = 0 }: ActionSLABadgeProps) {
  const { t } = useTranslation();
  const { getConfigByPriority } = useActionSLAConfig();

  // Completed/verified actions don't need SLA badge
  if (status === 'completed' || status === 'verified' || status === 'closed') {
    return null;
  }

  // No due date means we can't calculate SLA
  if (!dueDate) {
    return null;
  }

  const config = getConfigByPriority(priority);
  const today = new Date();
  const dueDateParsed = parseISO(dueDate);
  const daysUntilDue = differenceInDays(dueDateParsed, today);
  const daysOverdue = -daysUntilDue;

  let slaStatus: SLAStatus = 'on_track';
  let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
  let label = t('actions.slaOnTrack', 'On Track');

  if (escalationLevel >= 2) {
    slaStatus = 'escalated';
    variant = 'destructive';
    label = t('actions.slaEscalated', 'Escalated L2');
  } else if (escalationLevel === 1) {
    slaStatus = 'escalated';
    variant = 'destructive';
    label = t('actions.slaEscalated', 'Escalated L1');
  } else if (daysOverdue > 0) {
    slaStatus = 'overdue';
    variant = 'destructive';
    label = t('actions.slaOverdue', 'Overdue');
  } else if (config && daysUntilDue <= config.warning_days_before) {
    slaStatus = 'warning';
    variant = 'secondary';
    label = t('actions.slaWarning', 'Due Soon');
  }

  const tooltipContent = () => {
    if (slaStatus === 'overdue') {
      return t('actions.daysOverdue', '{{days}} days overdue', { days: daysOverdue });
    }
    if (slaStatus === 'warning') {
      return t('actions.daysUntilDue', '{{days}} days until due', { days: daysUntilDue });
    }
    if (slaStatus === 'escalated') {
      return t('actions.escalationLevel', 'Escalation Level {{level}}', { level: escalationLevel });
    }
    return t('actions.onTrackTooltip', 'Action is on track');
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={variant}
          className={cn(
            'gap-1 text-xs',
            slaStatus === 'warning' && 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
            slaStatus === 'on_track' && 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800'
          )}
        >
          {slaStatus === 'overdue' || slaStatus === 'escalated' ? (
            <AlertTriangle className="h-3 w-3" />
          ) : (
            <Clock className="h-3 w-3" />
          )}
          {label}
          {escalationLevel > 0 && (
            <span className="flex">
              {Array.from({ length: Math.min(escalationLevel, 2) }).map((_, i) => (
                <ArrowUp key={i} className="h-3 w-3 -ms-1" />
              ))}
            </span>
          )}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltipContent()}</p>
      </TooltipContent>
    </Tooltip>
  );
}
