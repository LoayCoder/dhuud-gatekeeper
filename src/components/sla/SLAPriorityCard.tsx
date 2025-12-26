import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  ArrowUp, 
  Siren, 
  Edit2, 
  CheckCircle,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
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
      return {
        gradient: 'from-red-500/20 via-red-500/10 to-transparent',
        border: 'border-red-300 dark:border-red-800',
        badge: 'destructive' as const,
        icon: '🔴',
        accentColor: 'text-red-600 dark:text-red-400',
      };
    case 'high':
      return {
        gradient: 'from-orange-500/20 via-orange-500/10 to-transparent',
        border: 'border-orange-300 dark:border-orange-800',
        badge: 'destructive' as const,
        icon: '🟠',
        accentColor: 'text-orange-600 dark:text-orange-400',
      };
    case 'medium':
      return {
        gradient: 'from-yellow-500/20 via-yellow-500/10 to-transparent',
        border: 'border-yellow-300 dark:border-yellow-800',
        badge: 'secondary' as const,
        icon: '🟡',
        accentColor: 'text-yellow-600 dark:text-yellow-400',
      };
    case 'low':
      return {
        gradient: 'from-green-500/20 via-green-500/10 to-transparent',
        border: 'border-green-300 dark:border-green-800',
        badge: 'outline' as const,
        icon: '🟢',
        accentColor: 'text-green-600 dark:text-green-400',
      };
    default:
      return {
        gradient: 'from-muted/20 to-transparent',
        border: 'border-border',
        badge: 'outline' as const,
        icon: '⚪',
        accentColor: 'text-muted-foreground',
      };
  }
};

export function SLAPriorityCard({ config, stats, onEdit }: SLAPriorityCardProps) {
  const { t } = useTranslation();
  const style = getPriorityStyle(config.priority);

  const timelineItems = [
    {
      icon: Clock,
      label: t('sla.warning', 'Warning'),
      value: config.warning_days_before,
      suffix: t('sla.daysBefore', 'days before'),
      color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
    },
    {
      icon: ArrowUp,
      label: t('sla.escalatedL1', 'Escalated L1'),
      value: config.escalation_days_after,
      suffix: t('sla.daysAfter', 'days after'),
      color: 'text-red-500 bg-red-100 dark:bg-red-900/30',
    },
    ...(config.second_escalation_days_after ? [{
      icon: Siren,
      label: t('sla.escalatedL2', 'Escalated L2'),
      value: config.second_escalation_days_after,
      suffix: t('sla.daysAfter', 'days after'),
      color: 'text-red-700 bg-red-200 dark:bg-red-900/50',
    }] : []),
  ];

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-200 hover:shadow-lg",
      style.border
    )}>
      {/* Gradient Background */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br pointer-events-none",
        style.gradient
      )} />

      <CardHeader className="relative pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{style.icon}</span>
            <div>
              <Badge variant={style.badge} className="text-sm font-semibold">
                {t(`priority.${config.priority}`, config.priority)}
              </Badge>
              {stats && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t('sla.activeActionsCount', '{{count}} active actions', { count: stats.total })}
                </p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Edit2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-4">
        {/* Timeline Items */}
        <div className="grid gap-2">
          {timelineItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div 
                key={index}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg",
                  item.color
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold">{item.value}</span>
                  <span className="text-xs opacity-70">{item.suffix}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats Preview */}
        {stats && stats.total > 0 && (
          <div className="pt-3 border-t border-border/50">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span className="text-muted-foreground">{stats.level0}</span>
                </span>
                <span className="flex items-center gap-1">
                  <ArrowUp className="h-3 w-3 text-red-500" />
                  <span className="text-muted-foreground">{stats.level1}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Siren className="h-3 w-3 text-red-700" />
                  <span className="text-muted-foreground">{stats.level2}</span>
                </span>
              </div>
              {stats.level1 + stats.level2 > 0 && (
                <Badge variant="destructive" className="text-xs gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {t('sla.needsAttention', 'Needs Attention')}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Mini Timeline Visual */}
        <div className="pt-2">
          <div className="flex items-center h-2 rounded-full overflow-hidden bg-muted">
            <div className="h-full bg-green-500 flex-1" />
            <div className="h-full bg-yellow-500 flex-1" />
            <div className="h-full bg-orange-500 flex-1" />
            <div className="h-full bg-red-500 flex-1" />
            {config.second_escalation_days_after && (
              <div className="h-full bg-red-700 flex-1" />
            )}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
            <span>{t('sla.normal', 'Normal')}</span>
            <span>{t('sla.warning', 'Warning')}</span>
            <span>{t('sla.overdue', 'Overdue')}</span>
            <span>L1</span>
            {config.second_escalation_days_after && <span>L2</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
