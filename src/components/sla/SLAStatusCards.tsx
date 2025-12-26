import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
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
      dotColor: 'bg-green-500',
      percentage: stats.total > 0 ? Math.round((stats.onTrack / stats.total) * 100) : 0,
    },
    {
      title: t('sla.dueSoon', 'Due Soon'),
      value: stats.warning,
      dotColor: 'bg-yellow-500',
      percentage: stats.total > 0 ? Math.round((stats.warning / stats.total) * 100) : 0,
    },
    {
      title: t('sla.overdue', 'Overdue'),
      value: stats.overdue,
      dotColor: 'bg-orange-500',
      percentage: stats.total > 0 ? Math.round((stats.overdue / stats.total) * 100) : 0,
    },
    {
      title: t('sla.escalatedL1', 'Escalated L1'),
      value: stats.escalatedLevel1,
      dotColor: 'bg-destructive',
      percentage: stats.total > 0 ? Math.round((stats.escalatedLevel1 / stats.total) * 100) : 0,
    },
    {
      title: t('sla.escalatedL2', 'Escalated L2'),
      value: stats.escalatedLevel2,
      dotColor: 'bg-destructive',
      percentage: stats.total > 0 ? Math.round((stats.escalatedLevel2 / stats.total) * 100) : 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" dir={direction}>
      {cards.map((card) => {
        const hasValue = card.value > 0;
        
        return (
          <Card key={card.title} className="border bg-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", card.dotColor)} />
                    <p className="text-xs font-medium text-muted-foreground">
                      {card.title}
                    </p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={cn(
                      "text-2xl font-semibold",
                      hasValue ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {card.value}
                    </span>
                    {hasValue && card.percentage > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {card.percentage}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
