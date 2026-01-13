import { useTranslation } from 'react-i18next';
import { useMyReportingStats } from '@/hooks/use-my-reporting-stats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Building2, Users, TrendingUp, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MyRankCard() {
  const { t } = useTranslation();
  const { data: stats, isLoading } = useMyReportingStats();

  if (isLoading) {
    return <Skeleton className="h-48 rounded-xl" />;
  }

  const companyRank = stats?.company_rank;
  const deptRank = stats?.department_rank;
  const percentile = stats?.percentile || 0;
  const totalReporters = stats?.total_reporters || 0;
  const deptReporters = stats?.dept_reporters || 0;

  // Calculate motivational message
  const getMotivation = () => {
    if (!companyRank) {
      return t('dashboard.rank.startReporting', 'Start reporting to join the leaderboard!');
    }
    if (percentile >= 90) {
      return t('dashboard.rank.topPerformer', 'You\'re a top safety champion!');
    }
    if (percentile >= 75) {
      return t('dashboard.rank.excellent', 'Excellent work! Keep leading by example.');
    }
    if (percentile >= 50) {
      return t('dashboard.rank.goodProgress', 'Great progress! A few more reports to reach the top.');
    }
    return t('dashboard.rank.keepGoing', 'Every report counts. Keep contributing!');
  };

  // Get rank tier styling
  const getRankTier = () => {
    if (percentile >= 90) return { label: t('dashboard.rank.topTen', 'Top 10%'), color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' };
    if (percentile >= 75) return { label: t('dashboard.rank.topQuarter', 'Top 25%'), color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400' };
    if (percentile >= 50) return { label: t('dashboard.rank.topHalf', 'Top 50%'), color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400' };
    return null;
  };

  const rankTier = getRankTier();

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/30">
              <Trophy className="h-4 w-4 text-amber-600 dark:text-amber-400" strokeWidth={1.75} />
            </div>
            {t('dashboard.rank.title', 'Your Safety Ranking')}
          </CardTitle>
          {rankTier && (
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-md font-medium',
              rankTier.color
            )}>
              {rankTier.label}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rank cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Company Rank */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl border">
            <div className="p-2 rounded-lg bg-background">
              <Building2 className="h-4 w-4 text-primary" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums">
                {companyRank ? `#${companyRank}` : '—'}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('dashboard.rank.company', 'Company')}
                {totalReporters > 0 && (
                  <span className="text-muted-foreground/70"> / {totalReporters}</span>
                )}
              </p>
            </div>
          </div>

          {/* Department Rank */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl border">
            <div className="p-2 rounded-lg bg-background">
              <Users className="h-4 w-4 text-info" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums">
                {deptRank ? `#${deptRank}` : '—'}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('dashboard.rank.department', 'Department')}
                {deptReporters > 0 && (
                  <span className="text-muted-foreground/70"> / {deptReporters}</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Percentile progress */}
        {companyRank && (
          <div className="space-y-2 p-3 bg-muted/30 rounded-xl">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                {t('dashboard.rank.percentileLabel', 'Your Position')}
              </span>
              <span className={cn(
                'font-semibold tabular-nums',
                percentile >= 75 && 'text-success',
                percentile >= 50 && percentile < 75 && 'text-info',
                percentile < 50 && 'text-muted-foreground'
              )}>
                {t('dashboard.rank.percentileValue', 'Top {{percent}}%', { percent: Math.round(100 - percentile) })}
              </span>
            </div>
            <Progress 
              value={percentile} 
              className="h-2"
            />
          </div>
        )}

        {/* Motivation message */}
        <div className="flex items-start gap-2 pt-1">
          <Award className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            {getMotivation()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
