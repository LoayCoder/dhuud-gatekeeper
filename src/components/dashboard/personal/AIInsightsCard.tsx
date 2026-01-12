import { useTranslation } from 'react-i18next';
import { useAIDashboardInsights } from '@/hooks/use-ai-dashboard-insights';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Lightbulb, 
  Trophy, 
  TrendingUp, 
  CheckCircle, 
  Eye,
  Sparkles,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Lightbulb,
  Trophy,
  TrendingUp,
  CheckCircle,
  Eye,
  Target,
  Sparkles,
};

const typeStyles = {
  tip: {
    bg: 'bg-info/10',
    border: 'border-info/30',
    icon: 'text-info',
  },
  achievement: {
    bg: 'bg-success/10',
    border: 'border-success/30',
    icon: 'text-success',
  },
  suggestion: {
    bg: 'bg-warning/10',
    border: 'border-warning/30',
    icon: 'text-warning',
  },
};

export function AIInsightsCard() {
  const { t } = useTranslation();
  const { data: insights, isLoading } = useAIDashboardInsights();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!insights?.length) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          {t('dashboard.aiInsights.title', 'AI Coach Tips')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight) => {
          const Icon = iconMap[insight.icon] || Lightbulb;
          const styles = typeStyles[insight.type] || typeStyles.tip;

          return (
            <div 
              key={insight.id}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border',
                styles.bg,
                styles.border
              )}
            >
              <div className={cn('p-1.5 rounded-lg shrink-0', styles.bg)}>
                <Icon className={cn('h-4 w-4', styles.icon)} />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm">{insight.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {insight.description}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
