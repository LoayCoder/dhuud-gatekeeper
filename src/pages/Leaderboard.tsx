import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EnterprisePage } from '@/components/layout/EnterprisePage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Medal, Target, Award, TrendingUp, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAnonymousLeaderboard, type LeaderboardPeriod, type LeaderboardCategory } from '@/hooks/use-leaderboard';

const periodOptions: { value: LeaderboardPeriod; labelKey: string; label: string }[] = [
  { value: 'all_time', labelKey: 'leaderboard.allTime', label: 'All Time' },
  { value: 'year', labelKey: 'leaderboard.thisYear', label: 'This Year' },
  { value: 'month', labelKey: 'leaderboard.thisMonth', label: 'This Month' },
  { value: 'week', labelKey: 'leaderboard.thisWeek', label: 'This Week' },
];

const categoryOptions: { value: LeaderboardCategory; icon: React.ElementType; labelKey: string; label: string }[] = [
  { value: 'overall', icon: Trophy, labelKey: 'leaderboard.overall', label: 'Overall' },
  { value: 'incidents', icon: Target, labelKey: 'leaderboard.incidents', label: 'Incidents' },
  { value: 'observations', icon: Star, labelKey: 'leaderboard.observations', label: 'Observations' },
  { value: 'actions', icon: TrendingUp, labelKey: 'leaderboard.actions', label: 'Actions' },
  { value: 'badges', icon: Award, labelKey: 'leaderboard.badges', label: 'Badges' },
];

function getRankIcon(position: number) {
  if (position === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
  if (position === 2) return <Medal className="h-5 w-5 text-slate-400" />;
  if (position === 3) return <Medal className="h-5 w-5 text-amber-600" />;
  return null;
}

function getRankBadgeColor(position: number) {
  if (position === 1) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  if (position === 2) return 'bg-slate-100 text-slate-700 border-slate-300';
  if (position === 3) return 'bg-amber-100 text-amber-800 border-amber-300';
  return 'bg-muted text-muted-foreground';
}

export default function Leaderboard() {
  const { t, i18n } = useTranslation();
  const [period, setPeriod] = useState<LeaderboardPeriod>('all_time');
  const [category, setCategory] = useState<LeaderboardCategory>('overall');
  const { data, isLoading } = useAnonymousLeaderboard(period, category);
  const isRTL = i18n.language === 'ar';

  return (
    <EnterprisePage title={t('leaderboard.title', 'Safety Leaderboard')}>
      <div className="space-y-6">
        {/* My Position Card */}
        {data?.myEntry && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Trophy className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t('leaderboard.yourPosition', 'Your Position')}
                    </p>
                    <p className="text-2xl font-bold">{data.myEntry.anonymous_id}</p>
                  </div>
                </div>
                <div className="text-end">
                  {data.myPercentile && (
                    <Badge variant="secondary" className="bg-primary/20 text-primary">
                      {t('leaderboard.topPercent', 'Top {{percent}}%', { percent: data.myPercentile })}
                    </Badge>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    {data.myEntry.total_points} {t('leaderboard.points', 'points')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Tabs value={period} onValueChange={(v) => setPeriod(v as LeaderboardPeriod)}>
              <TabsList className="w-full sm:w-auto">
                {periodOptions.map((option) => (
                  <TabsTrigger key={option.value} value={option.value}>
                    {t(option.labelKey, option.label)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categoryOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Button
                key={option.value}
                variant={category === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategory(option.value)}
                className="flex-shrink-0"
              >
                <Icon className="h-4 w-4 me-2" />
                {t(option.labelKey, option.label)}
              </Button>
            );
          })}
        </div>

        {/* Leaderboard Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              {t('leaderboard.rankings', 'Rankings')}
              {data && (
                <Badge variant="secondary">{data.totalParticipants} participants</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : data?.entries && data.entries.length > 0 ? (
              <div className="space-y-2">
                {data.entries.map((entry) => (
                  <div
                    key={entry.anonymous_id}
                    className={cn(
                      'flex items-center justify-between p-4 rounded-lg border transition-colors',
                      entry.is_current_user
                        ? 'bg-primary/10 border-primary/30 ring-2 ring-primary/20'
                        : 'bg-card hover:bg-muted/50'
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10">
                        {getRankIcon(entry.rank_position) || (
                          <span className="text-lg font-bold text-muted-foreground">
                            #{entry.rank_position}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{entry.anonymous_id}</span>
                          {entry.is_current_user && (
                            <Badge variant="outline" className="text-xs">
                              {t('leaderboard.you', 'You')}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span>{entry.total_reports} reports</span>
                          <span>•</span>
                          <span>{entry.badge_count} badges</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-end">
                      <Badge className={getRankBadgeColor(entry.rank_position)} variant="outline">
                        {entry.total_points} pts
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('leaderboard.noData', 'No leaderboard data available')}</p>
                <p className="text-sm mt-2">
                  {t('leaderboard.startReporting', 'Start reporting to appear on the leaderboard!')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </EnterprisePage>
  );
}
