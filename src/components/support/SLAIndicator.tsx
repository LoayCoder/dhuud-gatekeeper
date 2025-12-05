import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { formatDistanceToNow, isPast, differenceInHours } from 'date-fns';

interface SLAIndicatorProps {
  firstResponseDue: string | null;
  resolutionDue: string | null;
  firstResponseAt: string | null;
  firstResponseBreached: boolean;
  resolutionBreached: boolean;
  status: string;
}

export function SLAIndicator({
  firstResponseDue,
  resolutionDue,
  firstResponseAt,
  firstResponseBreached,
  resolutionBreached,
  status,
}: SLAIndicatorProps) {
  const { t } = useTranslation();

  // Don't show SLA for resolved/closed tickets
  if (status === 'resolved' || status === 'closed') {
    return (
      <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-500">
        <CheckCircle className="h-3 w-3" />
        {t('adminSupport.slaCompleted')}
      </Badge>
    );
  }

  // Check first response SLA
  const showFirstResponse = !firstResponseAt && firstResponseDue;
  const firstResponseOverdue = showFirstResponse && isPast(new Date(firstResponseDue));

  // Check resolution SLA
  const resolutionOverdue = resolutionDue && isPast(new Date(resolutionDue));

  // Determine overall SLA status
  const isBreached = firstResponseBreached || resolutionBreached;
  const isAtRisk = !isBreached && (
    (showFirstResponse && firstResponseDue && differenceInHours(new Date(firstResponseDue), new Date()) <= 2) ||
    (resolutionDue && differenceInHours(new Date(resolutionDue), new Date()) <= 4)
  );

  if (isBreached || firstResponseOverdue || resolutionOverdue) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="destructive" className="gap-1">
              <XCircle className="h-3 w-3" />
              {t('adminSupport.slaBreached')}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1 text-sm">
              {firstResponseBreached && <p>{t('adminSupport.firstResponseBreached')}</p>}
              {resolutionBreached && <p>{t('adminSupport.resolutionBreached')}</p>}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (isAtRisk) {
    const nearestDue = showFirstResponse ? firstResponseDue : resolutionDue;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1 bg-orange-500/10 text-orange-500 border-orange-500/20">
              <AlertTriangle className="h-3 w-3" />
              {t('adminSupport.slaAtRisk')}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-sm">
              {t('adminSupport.dueIn')} {nearestDue && formatDistanceToNow(new Date(nearestDue))}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // SLA on track
  const nearestDue = showFirstResponse ? firstResponseDue : resolutionDue;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-500 border-green-500/20">
            <Clock className="h-3 w-3" />
            {t('adminSupport.slaOnTrack')}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">
            {nearestDue && `${t('adminSupport.dueIn')} ${formatDistanceToNow(new Date(nearestDue))}`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
