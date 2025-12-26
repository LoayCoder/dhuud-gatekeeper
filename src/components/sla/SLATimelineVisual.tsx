import { useTranslation } from 'react-i18next';
import { CheckCircle, AlertTriangle, Clock, ArrowUp, Siren } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      textColor: 'text-green-600',
      bgLight: 'bg-green-100 dark:bg-green-900/30',
      timing: t('sla.beforeWarning', 'Before warning'),
    },
    {
      id: 'warning',
      label: t('sla.warning', 'Warning'),
      icon: Clock,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600',
      bgLight: 'bg-yellow-100 dark:bg-yellow-900/30',
      timing: t('sla.daysBeforeDue', '{{days}} days before due', { days: warningDays }),
    },
    {
      id: 'overdue',
      label: t('sla.overdue', 'Overdue'),
      icon: AlertTriangle,
      color: 'bg-orange-500',
      textColor: 'text-orange-600',
      bgLight: 'bg-orange-100 dark:bg-orange-900/30',
      timing: t('sla.atDueDate', 'At due date'),
    },
    {
      id: 'escalated1',
      label: t('sla.escalatedL1', 'Escalated L1'),
      icon: ArrowUp,
      color: 'bg-red-500',
      textColor: 'text-red-600',
      bgLight: 'bg-red-100 dark:bg-red-900/30',
      timing: t('sla.daysAfterDue', '+{{days}} days after due', { days: escalationL1Days }),
    },
    ...(escalationL2Days ? [{
      id: 'escalated2',
      label: t('sla.escalatedL2', 'Escalated L2'),
      icon: Siren,
      color: 'bg-red-700',
      textColor: 'text-red-700',
      bgLight: 'bg-red-200 dark:bg-red-900/50',
      timing: t('sla.daysAfterDue', '+{{days}} days after due', { days: escalationL2Days }),
    }] : []),
  ];

  return (
    <div className="relative py-6">
      {/* Timeline line */}
      <div className="absolute top-1/2 start-0 end-0 h-1 bg-muted -translate-y-1/2 rounded-full" />
      
      {/* Gradient overlay */}
      <div 
        className={cn(
          "absolute top-1/2 h-1 -translate-y-1/2 rounded-full",
          "bg-gradient-to-r from-green-500 via-yellow-500 via-orange-500 to-red-700",
          isRTL && "bg-gradient-to-l"
        )}
        style={{ width: '100%', opacity: 0.3 }}
      />

      {/* Phase markers */}
      <div className="relative flex justify-between items-center">
        {phases.map((phase, index) => {
          const Icon = phase.icon;
          return (
            <div 
              key={phase.id} 
              className="flex flex-col items-center gap-2 z-10"
              style={{ width: `${100 / phases.length}%` }}
            >
              {/* Icon circle */}
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center",
                phase.color,
                "text-white shadow-lg"
              )}>
                <Icon className="h-6 w-6" />
              </div>
              
              {/* Label */}
              <div className={cn(
                "px-3 py-1 rounded-full text-sm font-medium",
                phase.bgLight,
                phase.textColor
              )}>
                {phase.label}
              </div>
              
              {/* Timing */}
              <span className="text-xs text-muted-foreground text-center">
                {phase.timing}
              </span>
            </div>
          );
        })}
      </div>

      {/* Arrows between phases */}
      <div className="absolute top-1/2 start-0 end-0 flex justify-between px-[10%] -translate-y-1/2 pointer-events-none">
        {phases.slice(0, -1).map((_, index) => (
          <div 
            key={index}
            className={cn(
              "text-muted-foreground",
              isRTL && "rotate-180"
            )}
          >
            →
          </div>
        ))}
      </div>
    </div>
  );
}
