import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface SLATimelineVisualProps {
  warningDays: number;
  escalationL1Days: number;
  escalationL2Days: number | null;
}

export function SLATimelineVisual({ warningDays, escalationL1Days, escalationL2Days }: SLATimelineVisualProps) {
  const { t } = useTranslation();

  const phases = [
    {
      id: 'normal',
      label: t('sla.normal', 'Normal'),
      timing: t('sla.beforeWarning', 'Before warning'),
      isActive: true,
    },
    {
      id: 'warning',
      label: t('sla.warning', 'Warning'),
      timing: t('sla.daysBeforeDue', '{{days}}d before', { days: warningDays }),
      isActive: false,
    },
    {
      id: 'overdue',
      label: t('sla.overdue', 'Overdue'),
      timing: t('sla.atDueDate', 'At due date'),
      isActive: false,
    },
    {
      id: 'escalated1',
      label: 'L1',
      timing: `+${escalationL1Days}d`,
      isActive: false,
    },
    ...(escalationL2Days ? [{
      id: 'escalated2',
      label: 'L2',
      timing: `+${escalationL2Days}d`,
      isActive: false,
    }] : []),
  ];

  return (
    <div className="py-4 px-2">
      {/* Timeline Container */}
      <div className="relative flex items-center justify-between">
        {/* Connecting Line */}
        <div className="absolute inset-x-0 top-1/2 h-px bg-border -translate-y-1/2" />

        {/* Phase Markers */}
        {phases.map((phase, index) => (
          <div 
            key={phase.id} 
            className="relative flex flex-col items-center gap-2 z-10"
            style={{ width: `${100 / phases.length}%` }}
          >
            {/* Dot Marker */}
            <div className={cn(
              "w-3 h-3 rounded-full border-2 bg-background",
              index === 0 && "border-primary bg-primary",
              index === 1 && "border-muted-foreground",
              index === 2 && "border-muted-foreground",
              index >= 3 && "border-destructive"
            )} />

            {/* Label */}
            <span className={cn(
              "text-xs font-medium text-center",
              index === 0 ? "text-primary" : "text-muted-foreground"
            )}>
              {phase.label}
            </span>

            {/* Timing */}
            <span className="text-[10px] text-muted-foreground/70 text-center">
              {phase.timing}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
