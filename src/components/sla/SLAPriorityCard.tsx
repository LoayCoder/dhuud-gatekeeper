import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SLAPriorityCardProps {
  config: {
    id: string;
    priority: string;
    warning_days_before: number;
    escalation_days_after: number;
    second_escalation_days_after: number | null;
  };
  stats?: {
    total: number;
    level0: number;
    level1: number;
    level2: number;
  };
  onEdit: () => void;
}

const getPriorityStyle = (priority: string) => {
  switch (priority.toLowerCase()) {
    case 'critical':
      return { dotColor: 'bg-destructive', textColor: 'text-destructive' };
    case 'high':
      return { dotColor: 'bg-orange-500', textColor: 'text-orange-600 dark:text-orange-400' };
    case 'medium':
      return { dotColor: 'bg-yellow-500', textColor: 'text-yellow-600 dark:text-yellow-400' };
    case 'low':
      return { dotColor: 'bg-green-500', textColor: 'text-green-600 dark:text-green-400' };
    default:
      return { dotColor: 'bg-muted-foreground', textColor: 'text-muted-foreground' };
  }
};

export function SLAPriorityCard({ config, stats, onEdit }: SLAPriorityCardProps) {
  const { t } = useTranslation();
  const style = getPriorityStyle(config.priority);

  const timelineItems = [
    {
      label: t('sla.warning', 'Warning'),
      value: config.warning_days_before,
      suffix: t('sla.daysBefore', 'days before'),
    },
    {
      label: t('sla.escalatedL1', 'L1 Escalation'),
      value: config.escalation_days_after,
      suffix: t('sla.daysAfter', 'days after'),
    },
    ...(config.second_escalation_days_after ? [{
      label: t('sla.escalatedL2', 'L2 Escalation'),
      value: config.second_escalation_days_after,
      suffix: t('sla.daysAfter', 'days after'),
    }] : []),
  ];

  return (
    <Card className="border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", style.dotColor)} />
            <span className={cn("font-semibold capitalize", style.textColor)}>
              {t(`priority.${config.priority}`, config.priority)}
            </span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
            <Edit2 className="h-4 w-4" />
          </Button>
        </div>
        {stats && (
          <p className="text-xs text-muted-foreground">
            {t('sla.activeActionsCount', '{{count}} active', { count: stats.total })}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* Timeline Items - Simple List */}
        <div className="space-y-2">
          {timelineItems.map((item, index) => (
            <div 
              key={index}
              className="flex items-center justify-between py-2 border-s-2 border-border ps-3"
            >
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <span className="text-sm font-medium">
                {item.value} <span className="text-muted-foreground font-normal">{item.suffix}</span>
              </span>
            </div>
          ))}
        </div>

        {/* Stats Summary */}
        {stats && stats.total > 0 && (
          <div className="pt-3 border-t border-border">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>On track: <span className="font-medium text-foreground">{stats.level0}</span></span>
              <span>L1: <span className="font-medium text-foreground">{stats.level1}</span></span>
              <span>L2: <span className="font-medium text-foreground">{stats.level2}</span></span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
