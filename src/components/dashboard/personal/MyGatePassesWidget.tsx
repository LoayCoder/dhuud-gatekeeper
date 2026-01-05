import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FileText, Clock, CheckCircle2, ArrowRight, Truck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePersonalDashboard, useMyGatePasses } from '@/hooks/use-personal-dashboard';
import { cn } from '@/lib/utils';

export function MyGatePassesWidget() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = usePersonalDashboard();
  const { data: recentPasses, isLoading: passesLoading } = useMyGatePasses();

  const isLoading = statsLoading || passesLoading;

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

  const gatePassStats = stats.gate_passes;
  const hasPending = gatePassStats.my_pending > 0;
  const hasApproved = gatePassStats.approved_today > 0;

  // Get recent passes (limit to 3)
  const displayPasses = (recentPasses || []).slice(0, 3);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="text-xs">{t('common.approved', 'Approved')}</Badge>;
      case 'pending_pm_approval':
        return <Badge variant="secondary" className="text-xs">{t('gatePass.pendingPM', 'PM Pending')}</Badge>;
      case 'pending_safety_approval':
        return <Badge variant="secondary" className="text-xs">{t('gatePass.pendingSafety', 'Safety Pending')}</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-xs">{t('common.completed', 'Completed')}</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="text-xs">{t('common.rejected', 'Rejected')}</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">
              {t('dashboard.personal.myGatePasses', 'My Gate Passes')}
            </CardTitle>
          </div>
          {(hasPending || hasApproved) && (
            <div className="flex gap-1">
              {hasPending && (
                <Badge variant="secondary">{gatePassStats.my_pending} {t('common.pending', 'pending')}</Badge>
              )}
            </div>
          )}
        </div>
        <CardDescription>
          {t('dashboard.personal.gatePassesCreated', 'Gate passes you have requested')}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className={cn(
            'rounded-lg border p-2',
            hasPending && 'border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/30'
          )}>
            <p className="text-lg font-bold tabular-nums">{gatePassStats.my_pending}</p>
            <p className="text-xs text-muted-foreground">{t('common.pending', 'Pending')}</p>
          </div>
          <div className={cn(
            'rounded-lg border p-2',
            hasApproved && 'border-success/50 bg-success/10'
          )}>
            <p className="text-lg font-bold tabular-nums">{gatePassStats.approved_today}</p>
            <p className="text-xs text-muted-foreground">{t('dashboard.personal.approvedToday', 'Today')}</p>
          </div>
          <div className="rounded-lg border p-2">
            <p className="text-lg font-bold tabular-nums">{gatePassStats.awaiting_entry}</p>
            <p className="text-xs text-muted-foreground">{t('dashboard.personal.awaitingEntry', 'Awaiting')}</p>
          </div>
        </div>

        {/* Recent Passes */}
        {displayPasses.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t('dashboard.personal.recentPasses', 'Recent Passes')}</p>
            {displayPasses.map((pass) => (
              <div 
                key={pass.id}
                className="flex items-center justify-between rounded-lg border bg-background p-2 text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{pass.reference_number}</p>
                    <p className="truncate text-xs text-muted-foreground">{pass.material_description?.slice(0, 30)}...</p>
                  </div>
                </div>
                {getStatusBadge(pass.status)}
              </div>
            ))}
          </div>
        )}

        {displayPasses.length === 0 && gatePassStats.total === 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
            <FileText className="h-10 w-10 text-muted-foreground/50 mb-2" />
            <p className="text-sm">{t('dashboard.personal.noGatePasses', 'No gate passes yet')}</p>
          </div>
        )}
        
        <Button 
          variant="ghost" 
          className="w-full"
          onClick={() => navigate('/contractors/gate-passes')}
        >
          {t('dashboard.personal.viewAllGatePasses', 'View All Gate Passes')}
          <ArrowRight className="ms-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
