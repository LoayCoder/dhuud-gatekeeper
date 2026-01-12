import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Trophy, ChevronLeft, ChevronRight, Star, Sparkles, icons } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMyBadges } from '@/hooks/use-my-badges';
import { BadgeCard } from './BadgeCard';
import { BadgeProgressRing } from './BadgeProgressRing';

export function BadgeShowcase() {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useMyBadges();
  const isRTL = i18n.language === 'ar';

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-24" />
          </div>
          <div className="flex gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="w-20 h-28 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const earnedBadges = data?.earned_badges || [];
  const nextBadge = data?.next_badge;
  const totalPoints = data?.total_points || 0;

  const NextBadgeIcon = nextBadge 
    ? icons[nextBadge.icon_name as keyof typeof icons] || icons.Award
    : Star;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-600 shadow-md">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                {t('dashboard.badges.sectionTitle', 'My Achievements')}
              </h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                {totalPoints} {t('dashboard.badges.points', 'points')}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/profile/badges" className="text-primary">
              {t('dashboard.badges.viewAll', 'View All')}
              {isRTL ? <ChevronLeft className="ms-1 h-4 w-4" /> : <ChevronRight className="ms-1 h-4 w-4" />}
            </Link>
          </Button>
        </div>

        {/* Badges Carousel */}
        {earnedBadges.length > 0 ? (
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-2">
              {earnedBadges.slice(0, 8).map((badge) => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  earned
                  size="sm"
                  showProgress={false}
                />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="p-4 rounded-full bg-muted/50 mb-3">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              {t('dashboard.badges.noBadges', 'No badges earned yet')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.badges.startReporting', 'Start reporting to earn your first badge!')}
            </p>
          </div>
        )}

        {/* Next Badge Progress */}
        {nextBadge && (
          <div className={cn(
            'mt-4 pt-4 border-t flex items-center gap-4',
            'bg-gradient-to-r from-primary/5 via-transparent to-transparent -mx-4 px-4 py-3 rounded-b-lg'
          )}>
            <BadgeProgressRing progress={nextBadge.progress} size={56} strokeWidth={4}>
              <NextBadgeIcon className="h-5 w-5 text-primary" />
            </BadgeProgressRing>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">
                {t('dashboard.badges.nextBadge', 'Next badge')}
              </p>
              <p className="font-medium text-sm truncate">
                {isRTL && nextBadge.name_ar ? nextBadge.name_ar : nextBadge.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {nextBadge.progress}% {t('dashboard.badges.complete', 'complete')} • 
                {nextBadge.remaining} {t('dashboard.badges.toGo', 'to go')}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
