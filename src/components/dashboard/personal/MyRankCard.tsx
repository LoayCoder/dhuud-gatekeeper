import { useTranslation } from 'react-i18next';
import { useMyReportingStats } from '@/hooks/use-my-reporting-stats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Medal, Building2, Users } from 'lucide-react';
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

  // Trophy/medal based on percentile
  const getRankIcon = () => {
    if (percentile >= 90) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (percentile >= 75) return <Medal className="h-5 w-5 text-amber-500" />;
    return <Medal className="h-5 w-5 text-muted-foreground" />;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            {getRankIcon()}
            {t('dashboard.rank.title', 'Your Safety Ranking')}
          </CardTitle>
          {percentile >= 75 && (
            <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full font-medium">
              {t('dashboard.rank.topPercentile', 'Top {{percent}}%', { percent: Math.round(100 - percentile) })}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rank badges */}
        <div className="grid grid-cols-2 gap-3">
          {/* Company Rank */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold">
                {companyRank ? `#${companyRank}` : '-'}
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
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="p-2 rounded-lg bg-info/10">
              <Users className="h-4 w-4 text-info" />
            </div>
            <div>
              <p className="text-lg font-bold">
                {deptRank ? `#${deptRank}` : '-'}
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
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t('dashboard.rank.percentileLabel', 'Your Position')}
              </span>
              <span className={cn(
                'font-medium',
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
        <p className="text-sm text-muted-foreground italic text-center pt-1">
          "{getMotivation()}"
        </p>
      </CardContent>
    </Card>
  );
}
