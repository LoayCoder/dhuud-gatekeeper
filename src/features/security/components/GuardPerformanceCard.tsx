import { useTranslation } from 'react-i18next';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Award,
  Target,
  Clock,
  MapPin,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useGuardPerformanceSummary, useGuardLeaderboard } from '@/hooks/use-guard-performance';
import { cn } from '@/lib/utils';

interface GuardPerformanceCardProps {
  showLeaderboard?: boolean;
  period?: 'week' | 'month' | 'all';
}

export function GuardPerformanceCard({ showLeaderboard = false, period = 'month' }: GuardPerformanceCardProps) {
  const { t } = useTranslation();
  const { data: summaries, isLoading } = useGuardPerformanceSummary(period);
  const { data: leaderboard } = useGuardLeaderboard();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-destructive" />;
      default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-amber-500';
    return 'text-destructive';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { label: t('security.excellent', 'Excellent'), variant: 'default' as const };
    if (score >= 80) return { label: t('security.good', 'Good'), variant: 'secondary' as const };
    if (score >= 70) return { label: t('security.average', 'Average'), variant: 'outline' as const };
    return { label: t('security.needsImprovement', 'Needs Improvement'), variant: 'destructive' as const };
  };

  if (showLeaderboard && leaderboard) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            {t('security.topPerformers', 'Top Performers')}
          </CardTitle>
          <CardDescription>
            {t('security.last30Days', 'Last 30 days')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {leaderboard.slice(0, 5).map((guard, index) => (
              <div
                key={guard.guard_id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <span className={cn(
                    'w-6 h-6 flex items-center justify-center rounded-full text-sm font-bold',
                    index === 0 && 'bg-amber-500 text-white',
                    index === 1 && 'bg-slate-400 text-white',
                    index === 2 && 'bg-amber-700 text-white',
                    index > 2 && 'bg-muted text-muted-foreground'
                  )}>
                    {index + 1}
                  </span>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={guard.avatar_url || undefined} />
                    <AvatarFallback>
                      {guard.guard_name?.split(' ').map(n => n[0]).join('') || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{guard.guard_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('text-lg font-bold', getScoreColor(guard.average_score))}>
                    {guard.average_score}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          {t('security.guardPerformance', 'Guard Performance')}
        </CardTitle>
        <CardDescription>
          {period === 'week' && t('security.thisWeek', 'This week')}
          {period === 'month' && t('security.thisMonth', 'This month')}
          {period === 'all' && t('security.allTime', 'All time')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!summaries?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{t('security.noPerformanceData', 'No performance data available')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {summaries.slice(0, 5).map((guard) => {
              const badge = getScoreBadge(guard.overall_score);
              return (
                <div
                  key={guard.guard_id}
                  className="p-4 rounded-lg border space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={guard.avatar_url || undefined} />
                        <AvatarFallback>
                          {guard.guard_name?.split(' ').map(n => n[0]).join('') || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{guard.guard_name}</div>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getTrendIcon(guard.trend)}
                      <span className={cn('text-2xl font-bold', getScoreColor(guard.overall_score))}>
                        {guard.overall_score}%
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          {t('security.patrolCompletion', 'Patrol Completion')}
                        </span>
                        <span>{guard.patrol_completion_rate}%</span>
                      </div>
                      <Progress value={guard.patrol_completion_rate} className="h-1.5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {t('security.checkpointAccuracy', 'Checkpoint Accuracy')}
                        </span>
                        <span>{guard.checkpoint_accuracy}%</span>
                      </div>
                      <Progress value={guard.checkpoint_accuracy} className="h-1.5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {t('security.punctuality', 'Punctuality')}
                        </span>
                        <span>{guard.punctuality_score}%</span>
                      </div>
                      <Progress value={guard.punctuality_score} className="h-1.5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {t('security.geofenceCompliance', 'Geofence Compliance')}
                        </span>
                        <span>{guard.geofence_compliance}%</span>
                      </div>
                      <Progress value={guard.geofence_compliance} className="h-1.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
