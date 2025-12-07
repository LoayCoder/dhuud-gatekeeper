import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, AlertTriangle, ArrowUp } from 'lucide-react';
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
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
    },
    {
      title: t('sla.dueSoon', 'Due Soon'),
      value: stats.warning,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
    },
    {
      title: t('sla.overdue', 'Overdue'),
      value: stats.overdue,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20',
    },
    {
      title: t('sla.escalatedL1', 'Escalated L1'),
      value: stats.escalatedLevel1,
      icon: ArrowUp,
      color: 'text-red-500',
      bgColor: 'bg-red-100 dark:bg-red-900/20',
    },
    {
      title: t('sla.escalatedL2', 'Escalated L2'),
      value: stats.escalatedLevel2,
      icon: ArrowUp,
      color: 'text-red-700',
      bgColor: 'bg-red-200 dark:bg-red-900/40',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4" dir={direction}>
      {cards.map((card) => (
        <Card key={card.title} className={cn("border", card.value > 0 && card.bgColor)}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              {card.title}
            </CardTitle>
            <card.icon className={cn("h-4 w-4", card.color)} />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", card.value > 0 && card.color)}>
              {card.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
