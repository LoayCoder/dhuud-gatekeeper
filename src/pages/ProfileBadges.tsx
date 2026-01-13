import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EnterprisePage } from '@/components/layout/EnterprisePage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Award, Star, Trophy, Target, TrendingUp, Sparkles, icons } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMyBadges } from '@/hooks/use-my-badges';
import { BadgeCard } from '@/components/dashboard/personal/badges/BadgeCard';

const tierColors = {
  bronze: 'from-amber-600 to-amber-800',
  silver: 'from-slate-400 to-slate-600',
  gold: 'from-yellow-400 to-yellow-600',
  platinum: 'from-purple-400 to-purple-600',
};

const categoryIcons: Record<string, React.ElementType> = {
  reporting: Target,
  safety: Award,
  engagement: TrendingUp,
  leadership: Trophy,
};

export default function ProfileBadges() {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useMyBadges();
  const [activeTab, setActiveTab] = useState('earned');
  const isRTL = i18n.language === 'ar';

  const earnedBadges = data?.earned_badges || [];
  const availableBadges = data?.available_badges || [];
  const totalPoints = data?.total_points || 0;
  const stats = data?.stats;

  // Group earned badges by tier
  const badgesByTier = earnedBadges.reduce((acc, badge) => {
    if (!acc[badge.tier]) acc[badge.tier] = [];
    acc[badge.tier].push(badge);
    return acc;
  }, {} as Record<string, typeof earnedBadges>);

  // Group available badges by category
  const availableByCategory = availableBadges.reduce((acc, badge) => {
    if (!acc[badge.category]) acc[badge.category] = [];
    acc[badge.category].push(badge);
    return acc;
  }, {} as Record<string, typeof availableBadges>);

  if (isLoading) {
    return (
      <EnterprisePage title={t('profile.badges.title', 'My Badges')}>
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </EnterprisePage>
    );
  }

  return (
    <EnterprisePage title={t('profile.badges.title', 'My Badges')}>
      <div className="space-y-6">
        {/* Stats Overview */}
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
          <CardContent className="py-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-full bg-primary/20">
                  <Trophy className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">
                    {earnedBadges.length} {t('profile.badges.badgesEarned', 'Badges Earned')}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                    <span className="font-semibold text-amber-600">{totalPoints}</span>
                    <span className="text-muted-foreground">{t('profile.badges.totalPoints', 'total points')}</span>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              {stats && (
                <div className="flex gap-6 flex-wrap">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{stats.total_reports}</p>
                    <p className="text-xs text-muted-foreground">{t('profile.badges.reports', 'Reports')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{stats.completed_actions}</p>
                    <p className="text-xs text-muted-foreground">{t('profile.badges.actions', 'Actions')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{stats.streak_weeks}</p>
                    <p className="text-xs text-muted-foreground">{t('profile.badges.weekStreak', 'Week Streak')}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Earned vs Available */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="earned" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              {t('profile.badges.earned', 'Earned')} ({earnedBadges.length})
            </TabsTrigger>
            <TabsTrigger value="available" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              {t('profile.badges.available', 'Available')} ({availableBadges.length})
            </TabsTrigger>
          </TabsList>

          {/* Earned Badges Tab */}
          <TabsContent value="earned" className="mt-6">
            {earnedBadges.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">{t('profile.badges.noBadgesYet', 'No badges yet')}</h3>
                  <p className="text-muted-foreground text-sm">
                    {t('profile.badges.startReporting', 'Start reporting incidents and observations to earn your first badge!')}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Badges by Tier */}
                {(['platinum', 'gold', 'silver', 'bronze'] as const).map((tier) => {
                  const tierBadges = badgesByTier[tier];
                  if (!tierBadges || tierBadges.length === 0) return null;

                  return (
                    <Card key={tier}>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg capitalize">
                          <div className={cn('w-3 h-3 rounded-full bg-gradient-to-r', tierColors[tier])} />
                          {t(`profile.badges.tier.${tier}`, tier)} ({tierBadges.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                          {tierBadges.map((badge) => (
                            <BadgeCard
                              key={badge.id}
                              badge={badge}
                              earned
                              size="md"
                              showProgress={false}
                              showDetails={true}
                            />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Available Badges Tab */}
          <TabsContent value="available" className="mt-6">
            {availableBadges.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">{t('profile.badges.allEarned', 'All badges earned!')}</h3>
                  <p className="text-muted-foreground text-sm">
                    {t('profile.badges.congratulations', 'Congratulations! You have earned all available badges.')}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Badges by Category */}
                {Object.entries(availableByCategory).map(([category, badges]) => {
                  const CategoryIcon = categoryIcons[category] || Award;

                  return (
                    <Card key={category}>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg capitalize">
                          <CategoryIcon className="h-5 w-5 text-primary" />
                          {t(`profile.badges.category.${category}`, category)} ({badges.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                          {badges.map((badge) => {
                            const BadgeIcon = icons[badge.icon_name as keyof typeof icons] || Award;

                            return (
                              <div
                                key={badge.id}
                                className={cn(
                                  'relative p-4 rounded-xl border bg-card',
                                  'hover:shadow-md transition-shadow'
                                )}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={cn(
                                    'p-2 rounded-lg bg-muted/50',
                                    'border-2 border-dashed border-muted-foreground/30'
                                  )}>
                                    <BadgeIcon className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-sm truncate">
                                      {isRTL && badge.name_ar ? badge.name_ar : badge.name}
                                    </h4>
                                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                      {isRTL && badge.description_ar ? badge.description_ar : badge.description}
                                    </p>
                                  </div>
                                </div>

                                {/* Progress */}
                                <div className="mt-3 space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">
                                      {badge.current} / {badge.threshold}
                                    </span>
                                    <span className="font-medium text-primary">{badge.progress}%</span>
                                  </div>
                                  <Progress value={badge.progress} className="h-1.5" />
                                </div>

                                {/* Tier & Points */}
                                <div className="flex items-center justify-between mt-3">
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {badge.tier}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Star className="h-3 w-3 text-amber-500" />
                                    {badge.points} pts
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </EnterprisePage>
  );
}
