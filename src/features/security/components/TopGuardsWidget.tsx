import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useGuardLeaderboard } from '@/hooks/use-guard-performance';
import { cn } from '@/lib/utils';

interface TopGuardsWidgetProps {
  limit?: number;
  className?: string;
}

export function TopGuardsWidget({ limit = 5, className }: TopGuardsWidgetProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: leaderboard, isLoading } = useGuardLeaderboard();

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-destructive" />;
      default:
        return <Minus className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-500/10';
    if (score >= 70) return 'text-primary bg-primary/10';
    if (score >= 50) return 'text-yellow-600 bg-yellow-500/10';
    return 'text-destructive bg-destructive/10';
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-500" />;
    if (rank === 2) return <span className="text-xs font-bold text-muted-foreground">2nd</span>;
    if (rank === 3) return <span className="text-xs font-bold text-muted-foreground">3rd</span>;
    return <span className="text-xs text-muted-foreground">{rank}th</span>;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">
            {t('security.dashboard.topGuards', 'Top Guards')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-6 w-12" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const topGuards = leaderboard?.slice(0, limit) ?? [];

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">
          {t('security.dashboard.topGuards', 'Top Guards This Week')}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/security/performance')}>
          {t('common.viewAll', 'View All')}
          <ArrowRight className="h-4 w-4 ms-1 rtl:rotate-180" />
        </Button>
      </CardHeader>
      <CardContent>
        {topGuards.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('security.dashboard.noGuardData', 'No guard performance data available')}
          </p>
        ) : (
          <div className="space-y-3">
            {topGuards.map((guard, index) => (
              <div 
                key={guard.guard_id} 
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="w-6 flex justify-center">
                  {getRankBadge(index + 1)}
                </div>
                
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {guard.guard_name?.slice(0, 2).toUpperCase() || '??'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{guard.guard_name || 'Unknown'}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>{t('security.dashboard.guard', 'Guard')}</span>
                    {getTrendIcon('stable')}
                  </div>
                </div>
                
                <Badge 
                  variant="secondary" 
                  className={cn('font-mono', getScoreColor(guard.average_score ?? 0))}
                >
                  {guard.average_score ?? 0}%
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
