import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Clock, ArrowUp, Siren, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FindingSLAConfig } from '@/hooks/use-finding-sla-config';

interface FindingSLACardProps {
  config: FindingSLAConfig;
  onEdit: () => void;
}

const getClassificationStyle = (classification: string) => {
  switch (classification) {
    case 'critical_nc':
      return { 
        dotColor: 'bg-destructive', 
        textColor: 'text-destructive',
        badgeVariant: 'destructive' as const,
        label: 'Critical NC'
      };
    case 'major_nc':
      return { 
        dotColor: 'bg-orange-500', 
        textColor: 'text-orange-600 dark:text-orange-400',
        badgeVariant: 'default' as const,
        label: 'Major NC'
      };
    case 'minor_nc':
      return { 
        dotColor: 'bg-yellow-500', 
        textColor: 'text-yellow-600 dark:text-yellow-400',
        badgeVariant: 'secondary' as const,
        label: 'Minor NC'
      };
    case 'observation':
      return { 
        dotColor: 'bg-blue-500', 
        textColor: 'text-blue-600 dark:text-blue-400',
        badgeVariant: 'outline' as const,
        label: 'Observation'
      };
    default:
      return { 
        dotColor: 'bg-muted-foreground', 
        textColor: 'text-muted-foreground',
        badgeVariant: 'outline' as const,
        label: classification
      };
  }
};

export function FindingSLACard({ config, onEdit }: FindingSLACardProps) {
  const { t } = useTranslation();
  const style = getClassificationStyle(config.classification);

  const timelineItems = [
    {
      icon: Target,
      label: t('sla.targetDays', 'Target'),
      value: config.target_days,
      suffix: t('sla.days', 'days'),
      iconColor: 'text-primary',
    },
    {
      icon: Clock,
      label: t('sla.warning', 'Warning'),
      value: config.warning_days_before,
      suffix: t('sla.daysBefore', 'before'),
      iconColor: 'text-yellow-500',
    },
    {
      icon: ArrowUp,
      label: t('sla.escalatedL1', 'L1 Escalation'),
      value: config.escalation_days_after,
      suffix: t('sla.daysAfter', 'after'),
      iconColor: 'text-orange-500',
    },
    ...(config.second_escalation_days_after ? [{
      icon: Siren,
      label: t('sla.escalatedL2', 'L2 Escalation'),
      value: config.second_escalation_days_after,
      suffix: t('sla.daysAfter', 'after'),
      iconColor: 'text-destructive',
    }] : []),
  ];

  return (
    <Card className="border bg-card hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded-full", style.dotColor)} />
            <span className={cn("font-semibold", style.textColor)}>
              {t(`findings.classification.${config.classification}`, style.label)}
            </span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
            <Edit2 className="h-4 w-4" />
          </Button>
        </div>
        <Badge variant={style.badgeVariant} className="w-fit text-xs">
          {config.target_days} {t('sla.days', 'days')} {t('sla.targetLabel', 'target')}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-2 pt-0">
        {timelineItems.map((item, index) => (
          <div 
            key={index}
            className="flex items-center justify-between py-1.5 border-s-2 border-border ps-3"
          >
            <div className="flex items-center gap-2">
              <item.icon className={cn("h-3.5 w-3.5", item.iconColor)} />
              <span className="text-sm text-muted-foreground">{item.label}</span>
            </div>
            <span className="text-sm font-medium">
              {item.value} <span className="text-muted-foreground font-normal text-xs">{item.suffix}</span>
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
