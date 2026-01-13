import { useTranslation } from 'react-i18next';
import { differenceInDays, differenceInHours } from 'date-fns';
import { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Target, Clock, Award, ChevronRight } from 'lucide-react';
import { useActiveChallenges, useJoinChallenge } from '@/hooks/use-challenges';
import { useCelebration } from '@/hooks/use-celebration';
import { Link } from 'react-router-dom';

export function ActiveChallengeCard() {
  const { t, i18n } = useTranslation();
  const { data: challenges, isLoading } = useActiveChallenges();
  const { mutate: joinChallenge, isPending } = useJoinChallenge();
  const { celebrateChallenge } = useCelebration();
  const isRTL = i18n.language === 'ar';
  const celebratedChallenges = useRef<Set<string>>(new Set());

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-4">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const activeChallenge = challenges?.[0];
  
  if (!activeChallenge) {
    return null;
  }

  const endDate = new Date(activeChallenge.end_date);
  const daysRemaining = differenceInDays(endDate, new Date());
  const hoursRemaining = differenceInHours(endDate, new Date());
  const progressPercent = activeChallenge.is_joined
    ? Math.min(100, (activeChallenge.user_progress / activeChallenge.target_count) * 100)
    : 0;

  // Trigger celebration when challenge is completed
  useEffect(() => {
    if (
      activeChallenge.is_completed && 
      !celebratedChallenges.current.has(activeChallenge.challenge_id)
    ) {
      celebratedChallenges.current.add(activeChallenge.challenge_id);
      celebrateChallenge({ intensity: 'high' });
    }
  }, [activeChallenge.is_completed, activeChallenge.challenge_id, celebrateChallenge]);

  const getTimeRemaining = () => {
    if (daysRemaining > 0) {
      return t('challenges.daysRemaining', '{{days}} days left', { days: daysRemaining });
    }
    return t('challenges.hoursRemaining', '{{hours}} hours left', { hours: hoursRemaining });
  };

  return (
    <Card className="border-primary/20 overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold truncate">
                  {isRTL && activeChallenge.title_ar ? activeChallenge.title_ar : activeChallenge.title}
                </span>
                <Badge variant="secondary" className="flex-shrink-0">
                  {activeChallenge.challenge_type}
                </Badge>
              </div>

              {activeChallenge.is_joined ? (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {activeChallenge.user_progress} / {activeChallenge.target_count}
                    </span>
                    <span className="font-medium">{Math.round(progressPercent)}%</span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {getTimeRemaining()}
                    </span>
                    {activeChallenge.badge_name && (
                      <span className="flex items-center gap-1">
                        <Award className="h-3 w-3" />
                        {activeChallenge.badge_name}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-2">
                  <p className="text-sm text-muted-foreground mb-2">
                    {t('challenges.targetDescription', 'Complete {{count}} {{type}}', {
                      count: activeChallenge.target_count,
                      type: activeChallenge.metric_type,
                    })}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => joinChallenge(activeChallenge.challenge_id)}
                      disabled={isPending}
                    >
                      {t('challenges.join', 'Join Challenge')}
                    </Button>
                    <Badge variant="outline">
                      +{activeChallenge.points_reward} pts
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </div>

          {activeChallenge.is_completed && (
            <Badge className="bg-green-100 text-green-700 border-green-200">
              ✓ {t('challenges.completed', 'Completed')}
            </Badge>
          )}
        </div>

        {challenges && challenges.length > 1 && (
          <Link
            to="/leaderboard"
            className="flex items-center justify-center gap-1 text-sm text-primary hover:underline mt-4 pt-3 border-t"
          >
            {t('challenges.viewAll', 'View all challenges')}
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
