import { useTranslation } from 'react-i18next';
import { CheckCircle, AlertTriangle, Clock, ArrowUp, Siren } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SLATimelineVisualProps {
  warningDays: number;
  escalationL1Days: number;
  escalationL2Days: number | null;
}

export function SLATimelineVisual({ warningDays, escalationL1Days, escalationL2Days }: SLATimelineVisualProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  const phases = [
    {
      id: 'normal',
      label: t('sla.normal', 'Normal'),
      icon: CheckCircle,
      color: 'bg-green-500',
      textColor: 'text-green-600 dark:text-green-400',
      bgLight: 'bg-green-100 dark:bg-green-900/30',
      ringColor: 'ring-green-200 dark:ring-green-800',
      timing: t('sla.beforeWarning', 'Before warning'),
      tooltip: t('sla.normalTooltip', 'Action is within normal timeframe. No alerts sent.'),
    },
    {
      id: 'warning',
      label: t('sla.warning', 'Warning'),
      icon: Clock,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600 dark:text-yellow-400',
      bgLight: 'bg-yellow-100 dark:bg-yellow-900/30',
      ringColor: 'ring-yellow-200 dark:ring-yellow-800',
      timing: t('sla.daysBeforeDue', '{{days}} days before due', { days: warningDays }),
      tooltip: t('sla.warningTooltip', 'Assignee receives email reminder about approaching deadline.'),
    },
    {
      id: 'overdue',
      label: t('sla.overdue', 'Overdue'),
      icon: AlertTriangle,
      color: 'bg-orange-500',
      textColor: 'text-orange-600 dark:text-orange-400',
      bgLight: 'bg-orange-100 dark:bg-orange-900/30',
      ringColor: 'ring-orange-200 dark:ring-orange-800',
      timing: t('sla.atDueDate', 'At due date'),
      tooltip: t('sla.overdueTooltip', 'Action has passed its due date but not yet escalated.'),
    },
    {
      id: 'escalated1',
      label: t('sla.escalatedL1', 'Escalated L1'),
      icon: ArrowUp,
      color: 'bg-red-500',
      textColor: 'text-red-600 dark:text-red-400',
      bgLight: 'bg-red-100 dark:bg-red-900/30',
      ringColor: 'ring-red-200 dark:ring-red-800',
      timing: t('sla.daysAfterDue', '+{{days}} days after due', { days: escalationL1Days }),
      tooltip: t('sla.escalatedL1Tooltip', 'Manager is notified. Requires immediate attention.'),
    },
    ...(escalationL2Days ? [{
      id: 'escalated2',
      label: t('sla.escalatedL2', 'Escalated L2'),
      icon: Siren,
      color: 'bg-red-700',
      textColor: 'text-red-700 dark:text-red-300',
      bgLight: 'bg-red-200 dark:bg-red-900/50',
      ringColor: 'ring-red-300 dark:ring-red-700',
      timing: t('sla.daysAfterDue', '+{{days}} days after due', { days: escalationL2Days }),
      tooltip: t('sla.escalatedL2Tooltip', 'HSSE Manager notified. Critical priority issue.'),
    }] : []),
  ];

  return (
    <TooltipProvider>
      <div className="relative py-8 px-4">
        {/* Timeline line with gradient */}
        <div className="absolute top-1/2 start-8 end-8 h-2 bg-muted -translate-y-1/2 rounded-full overflow-hidden">
          <div 
            className={cn(
              "absolute inset-0 bg-gradient-to-r from-green-500 via-yellow-500 via-orange-500 to-red-700",
              isRTL && "bg-gradient-to-l"
            )}
            style={{ opacity: 0.8 }}
          />
        </div>

        {/* Phase markers */}
        <div className="relative flex justify-between items-center">
          {phases.map((phase, index) => {
            const Icon = phase.icon;
            return (
              <Tooltip key={phase.id}>
                <TooltipTrigger asChild>
                  <div 
                    className="flex flex-col items-center gap-3 z-10 cursor-help group"
                    style={{ width: `${100 / phases.length}%` }}
                  >
                    {/* Icon circle with animation */}
                    <div className={cn(
                      "w-14 h-14 rounded-full flex items-center justify-center",
                      phase.color,
                      "text-white shadow-lg ring-4",
                      phase.ringColor,
                      "transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl"
                    )}>
                      <Icon className="h-7 w-7" />
                    </div>
                    
                    {/* Label badge */}
                    <div className={cn(
                      "px-3 py-1.5 rounded-full text-sm font-semibold",
                      phase.bgLight,
                      phase.textColor,
                      "transition-all duration-200 group-hover:shadow-md"
                    )}>
                      {phase.label}
                    </div>
                    
                    {/* Timing */}
                    <span className="text-xs text-muted-foreground text-center font-medium">
                      {phase.timing}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[200px]">
                  <p className="text-sm">{phase.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Connecting arrows */}
        <div className="absolute top-1/2 start-[15%] end-[15%] flex justify-around -translate-y-1/2 pointer-events-none">
          {phases.slice(0, -1).map((_, index) => (
            <div 
              key={index}
              className={cn(
                "text-xl text-muted-foreground font-bold opacity-50",
                isRTL && "rotate-180"
              )}
            >
              →
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
