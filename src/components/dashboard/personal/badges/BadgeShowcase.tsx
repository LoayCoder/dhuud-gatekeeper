import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Award, ChevronLeft, ChevronRight, Star, Target, icons } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMyBadges } from '@/hooks/use-my-badges';
import { BadgeCard } from './BadgeCard';

export function BadgeShowcase() {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useMyBadges();
  const isRTL = i18n.language === 'ar';

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 justify-center">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="w-14 h-20 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-12 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const earnedBadges = data?.earned_badges || [];
  const nextBadge = data?.next_badge;
  const totalPoints = data?.total_points || 0;

  const NextBadgeIcon = nextBadge 
    ? icons[nextBadge.icon_name as keyof typeof icons] || Award
    : Target;

  // Show top 4 earned badges (most recent or by tier)
  const featuredBadges = earnedBadges.slice(0, 4);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/30">
              <Award className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            {t('dashboard.badges.sectionTitle', 'My Achievements')}
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
            <Link to="/profile/badges" className="text-primary">
              {t('dashboard.badges.viewAll', 'View All')}
              {isRTL ? <ChevronLeft className="ms-1 h-3.5 w-3.5" /> : <ChevronRight className="ms-1 h-3.5 w-3.5" />}
            </Link>
          </Button>
        </div>
        {/* Points summary - clean design */}
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/80">
            <Star className="h-3 w-3 text-amber-500" />
            <span className="text-xs font-semibold tabular-nums">
              {totalPoints}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {earnedBadges.length} {t('dashboard.badges.badgesEarned', 'badges earned')}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* Featured Badges - Clean Grid */}
        {featuredBadges.length > 0 ? (
          <div className="flex items-center justify-center gap-0.5 py-2">
            {featuredBadges.map((badge) => (
              <BadgeCard
                key={badge.id}
                badge={badge}
                earned
                size="sm"
                showProgress={false}
                showDetails={true}
              />
            ))}
            {/* Show more indicator if more badges */}
            {earnedBadges.length > 4 && (
              <Link
                to="/profile/badges"
                className={cn(
                  'flex flex-col items-center justify-center p-2 rounded-xl',
                  'bg-muted/50 hover:bg-muted transition-colors',
                  'w-14 h-20'
                )}
              >
                <span className="text-lg font-bold text-muted-foreground">
                  +{earnedBadges.length - 4}
                </span>
                <span className="text-[9px] text-muted-foreground">
                  {t('common.more', 'more')}
                </span>
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <div className="p-3 rounded-xl bg-muted/50 mb-2">
              <Award className="h-6 w-6 text-muted-foreground/60" />
            </div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.badges.noBadges', 'No badges earned yet')}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {t('dashboard.badges.startReporting', 'Start reporting to earn your first badge!')}
            </p>
          </div>
        )}

        {/* Next Badge Progress - Professional */}
        {nextBadge && (
          <div className={cn(
            'flex items-center gap-3 p-3 rounded-lg',
            'bg-muted/50 border border-border/50'
          )}>
            {/* Mini locked badge preview */}
            <div className={cn(
              'relative flex-shrink-0 w-10 h-10 rounded-lg',
              'bg-background border border-dashed border-primary/40',
              'flex items-center justify-center'
            )}>
              <NextBadgeIcon className="h-4 w-4 text-primary/70" strokeWidth={1.75} />
              {/* Mini progress ring */}
              <svg
                className="absolute inset-0 -rotate-90"
                viewBox="0 0 40 40"
              >
                <circle
                  cx="20"
                  cy="20"
                  r="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-muted"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray={`${nextBadge.progress * 1.13} 113`}
                  strokeLinecap="round"
                  className="text-primary"
                />
              </svg>
            </div>

            {/* Progress info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium truncate">
                  {isRTL && nextBadge.name_ar ? nextBadge.name_ar : nextBadge.name}
                </p>
                <span className="text-xs font-semibold text-primary tabular-nums">
                  {nextBadge.progress}%
                </span>
              </div>
              <Progress value={nextBadge.progress} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">
                {nextBadge.remaining} {t('dashboard.badges.toGo', 'to go')}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
