import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, UserCheck, ArrowRight, CalendarClock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePersonalDashboard } from '@/hooks/use-personal-dashboard';
import { useMyHostedVisits } from '@/hooks/use-visit-requests';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useTranslation as useI18n } from 'react-i18next';

export function MyVisitorsWidget() {
  const { t } = useTranslation();
  const { i18n } = useI18n();
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = usePersonalDashboard();
  const { data: recentVisits, isLoading: visitsLoading } = useMyHostedVisits();

  const isLoading = statsLoading || visitsLoading;
  const locale = i18n.language === 'ar' ? ar : enUS;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const visitorStats = stats.visitors;
  const hasPending = visitorStats.pending_approval > 0;
  const hasOnSite = visitorStats.on_site > 0;
  const hasArriving = visitorStats.arriving_today > 0;

  // Get recent visits (limit to 3)
  const displayVisits = (recentVisits || []).slice(0, 3);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">
              {t('dashboard.personal.myVisitors', 'My Visitors')}
            </CardTitle>
          </div>
          {(hasPending || hasOnSite) && (
            <div className="flex gap-1">
              {hasPending && (
                <Badge variant="secondary">{visitorStats.pending_approval} {t('common.pending', 'pending')}</Badge>
              )}
              {hasOnSite && (
                <Badge variant="default">{visitorStats.on_site} {t('dashboard.personal.onSite', 'on site')}</Badge>
              )}
            </div>
          )}
        </div>
        <CardDescription>
          {t('dashboard.personal.visitorsHosting', 'Visitors you are hosting')}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className={cn(
            'rounded-lg border p-2',
            hasPending && 'border-primary/50 bg-primary/5'
          )}>
            <p className="text-lg font-bold tabular-nums">{visitorStats.pending_approval}</p>
            <p className="text-xs text-muted-foreground">{t('dashboard.personal.awaitingApproval', 'Awaiting')}</p>
          </div>
          <div className={cn(
            'rounded-lg border p-2',
            hasArriving && 'border-blue-500/50 bg-blue-50 dark:bg-blue-950/30'
          )}>
            <p className="text-lg font-bold tabular-nums">{visitorStats.arriving_today}</p>
            <p className="text-xs text-muted-foreground">{t('dashboard.personal.arrivingToday', 'Today')}</p>
          </div>
          <div className={cn(
            'rounded-lg border p-2',
            hasOnSite && 'border-success/50 bg-success/10'
          )}>
            <p className="text-lg font-bold tabular-nums">{visitorStats.on_site}</p>
            <p className="text-xs text-muted-foreground">{t('dashboard.personal.currentlyOnSite', 'On Site')}</p>
          </div>
        </div>

        {/* Recent Visits */}
        {displayVisits.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t('dashboard.personal.recentVisits', 'Recent Visits')}</p>
            {displayVisits.map((visit) => (
              <div 
                key={visit.id}
                className="flex items-center justify-between rounded-lg border bg-background p-2 text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {visit.status === 'checked_in' ? (
                    <UserCheck className="h-4 w-4 text-success shrink-0" />
                  ) : visit.status === 'approved' ? (
                    <CalendarClock className="h-4 w-4 text-blue-500 shrink-0" />
                  ) : (
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="truncate">{visit.visitor?.full_name || 'Visitor'}</span>
                </div>
                <Badge variant={
                  visit.status === 'checked_in' ? 'default' :
                  visit.status === 'approved' ? 'secondary' :
                  visit.status === 'pending_security' ? 'outline' : 'outline'
                } className="text-xs shrink-0">
                  {visit.status === 'checked_in' ? t('security.onSite', 'On Site') :
                   visit.status === 'approved' ? t('common.approved', 'Approved') :
                   visit.status === 'pending_security' ? t('common.pending', 'Pending') :
                   visit.status}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {displayVisits.length === 0 && visitorStats.total_hosted === 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
            <Users className="h-10 w-10 text-muted-foreground/50 mb-2" />
            <p className="text-sm">{t('dashboard.personal.noVisitors', 'No visitors yet')}</p>
          </div>
        )}
        
        <Button 
          variant="ghost" 
          className="w-full"
          onClick={() => navigate('/security/visitors')}
        >
          {t('dashboard.personal.viewAllVisitors', 'View All Visitors')}
          <ArrowRight className="ms-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
