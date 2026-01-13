import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EnterprisePage } from '@/components/layout/EnterprisePage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Check, Circle, icons } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMyBadges } from '@/hooks/use-my-badges';
import { BadgeCard } from '@/components/dashboard/personal/badges/BadgeCard';

// Professional tier labels (no colors)
const tierLabels = {
  platinum: 'Level 4',
  gold: 'Level 3',
  silver: 'Level 2',
  bronze: 'Level 1',
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
      <EnterprisePage title={t('profile.badges.title', 'Credentials')}>
        <div className="space-y-6">
          <Skeleton className="h-24 w-full" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </EnterprisePage>
    );
  }

  return (
    <EnterprisePage title={t('profile.badges.title', 'Credentials')}>
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-semibold">{earnedBadges.length}</div>
              <p className="text-sm text-muted-foreground">
                {t('profile.badges.credentialsEarned', 'Credentials Earned')}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-semibold">{totalPoints}</div>
              <p className="text-sm text-muted-foreground">
                {t('profile.badges.totalPoints', 'Total Points')}
              </p>
            </CardContent>
          </Card>
          {stats && (
            <>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-semibold">{stats.total_reports}</div>
                  <p className="text-sm text-muted-foreground">
                    {t('profile.badges.reports', 'Reports Submitted')}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-semibold">{stats.completed_actions}</div>
                  <p className="text-sm text-muted-foreground">
                    {t('profile.badges.actions', 'Actions Completed')}
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="earned">
              {t('profile.badges.earned', 'Earned')} ({earnedBadges.length})
            </TabsTrigger>
            <TabsTrigger value="available">
              {t('profile.badges.available', 'Available')} ({availableBadges.length})
            </TabsTrigger>
          </TabsList>

          {/* Earned Credentials Tab */}
          <TabsContent value="earned" className="mt-6">
            {earnedBadges.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Circle className="h-10 w-10 mx-auto text-muted-foreground/50 mb-4" strokeWidth={1} />
                  <h3 className="font-medium mb-2">{t('profile.badges.noCredentialsYet', 'No credentials yet')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('profile.badges.startReporting', 'Complete activities to earn credentials.')}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {(['platinum', 'gold', 'silver', 'bronze'] as const).map((tier) => {
                  const tierBadges = badgesByTier[tier];
                  if (!tierBadges || tierBadges.length === 0) return null;

                  return (
                    <Card key={tier}>
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base font-medium">
                          {tierLabels[tier]} ({tierBadges.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

          {/* Available Credentials Tab */}
          <TabsContent value="available" className="mt-6">
            {availableBadges.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Check className="h-10 w-10 mx-auto text-muted-foreground/50 mb-4" strokeWidth={1} />
                  <h3 className="font-medium mb-2">{t('profile.badges.allEarned', 'All credentials earned')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('profile.badges.congratulations', 'You have earned all available credentials.')}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {Object.entries(availableByCategory).map(([category, badges]) => (
                  <Card key={category}>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base font-medium capitalize">
                        {t(`profile.badges.category.${category}`, category)} ({badges.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {badges.map((badge) => {
                          const IconComponent = icons[badge.icon_name as keyof typeof icons] || Circle;

                          return (
                            <div
                              key={badge.id}
                              className="flex flex-col gap-3 p-4 rounded-lg border bg-muted/30"
                            >
                              {/* Header */}
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center justify-center h-9 w-9 rounded-md border bg-background">
                                    <IconComponent className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {isRTL && badge.name_ar ? badge.name_ar : badge.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground capitalize">
                                      {badge.tier}
                                    </p>
                                  </div>
                                </div>
                                <span className="text-xs text-muted-foreground tabular-nums">
                                  {badge.points} pts
                                </span>
                              </div>

                              {/* Description */}
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {isRTL && badge.description_ar ? badge.description_ar : badge.description}
                              </p>

                              {/* Progress */}
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>{t('common.progress', 'Progress')}</span>
                                  <span className="tabular-nums">{badge.current}/{badge.threshold}</span>
                                </div>
                                <Progress value={badge.progress} className="h-1" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </EnterprisePage>
  );
}
