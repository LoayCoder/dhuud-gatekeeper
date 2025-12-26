import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Clock, AlertTriangle, ArrowUp, Siren, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SLAStatusCardsProps {
  stats: {
    total: number;
    onTrack: number;
    warning: number;
    overdue: number;
    escalatedLevel1: number;
    escalatedLevel2: number;
  };
}

export function SLAStatusCards({ stats }: SLAStatusCardsProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();

  const cards = [
    {
      title: t('sla.onTrack', 'On Track'),
      value: stats.onTrack,
      icon: CheckCircle,
      gradient: 'from-green-500 to-emerald-600',
      bgLight: 'bg-green-50 dark:bg-green-900/20',
      textColor: 'text-green-700 dark:text-green-400',
      iconBg: 'bg-green-100 dark:bg-green-800/50',
      percentage: stats.total > 0 ? Math.round((stats.onTrack / stats.total) * 100) : 0,
    },
    {
      title: t('sla.dueSoon', 'Due Soon'),
      value: stats.warning,
      icon: Clock,
      gradient: 'from-yellow-500 to-amber-600',
      bgLight: 'bg-yellow-50 dark:bg-yellow-900/20',
      textColor: 'text-yellow-700 dark:text-yellow-400',
      iconBg: 'bg-yellow-100 dark:bg-yellow-800/50',
      percentage: stats.total > 0 ? Math.round((stats.warning / stats.total) * 100) : 0,
    },
    {
      title: t('sla.overdue', 'Overdue'),
      value: stats.overdue,
      icon: AlertTriangle,
      gradient: 'from-orange-500 to-amber-600',
      bgLight: 'bg-orange-50 dark:bg-orange-900/20',
      textColor: 'text-orange-700 dark:text-orange-400',
      iconBg: 'bg-orange-100 dark:bg-orange-800/50',
      percentage: stats.total > 0 ? Math.round((stats.overdue / stats.total) * 100) : 0,
    },
    {
      title: t('sla.escalatedL1', 'Escalated L1'),
      value: stats.escalatedLevel1,
      icon: ArrowUp,
      gradient: 'from-red-500 to-rose-600',
      bgLight: 'bg-red-50 dark:bg-red-900/20',
      textColor: 'text-red-600 dark:text-red-400',
      iconBg: 'bg-red-100 dark:bg-red-800/50',
      percentage: stats.total > 0 ? Math.round((stats.escalatedLevel1 / stats.total) * 100) : 0,
    },
    {
      title: t('sla.escalatedL2', 'Escalated L2'),
      value: stats.escalatedLevel2,
      icon: Siren,
      gradient: 'from-red-600 to-red-800',
      bgLight: 'bg-red-100 dark:bg-red-900/40',
      textColor: 'text-red-700 dark:text-red-300',
      iconBg: 'bg-red-200 dark:bg-red-800/70',
      percentage: stats.total > 0 ? Math.round((stats.escalatedLevel2 / stats.total) * 100) : 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4" dir={direction}>
      {cards.map((card) => {
        const Icon = card.icon;
        const hasValue = card.value > 0;
        
        return (
          <Card 
            key={card.title} 
            className={cn(
              "relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02]",
              "border",
              hasValue ? card.bgLight : "bg-muted/30"
            )}
          >
            {/* Gradient accent at top */}
            {hasValue && (
              <div className={cn(
                "absolute inset-x-0 top-0 h-1 bg-gradient-to-r",
                card.gradient
              )} />
            )}

            <CardContent className="p-4 pt-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className={cn(
                    "text-xs font-medium uppercase tracking-wide",
                    hasValue ? card.textColor : "text-muted-foreground"
                  )}>
                    {card.title}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className={cn(
                      "text-2xl sm:text-3xl font-bold",
                      hasValue ? card.textColor : "text-muted-foreground"
                    )}>
                      {card.value}
                    </span>
                    {hasValue && card.percentage > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ({card.percentage}%)
                      </span>
                    )}
                  </div>
                </div>
                
                <div className={cn(
                  "p-2 rounded-lg",
                  hasValue ? card.iconBg : "bg-muted"
                )}>
                  <Icon className={cn(
                    "h-5 w-5",
                    hasValue ? card.textColor : "text-muted-foreground"
                  )} />
                </div>
              </div>

              {/* Mini progress bar */}
              {hasValue && (
                <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full bg-gradient-to-r transition-all duration-500", card.gradient)}
                    style={{ width: `${card.percentage}%` }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
