import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Clock, FileCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePendingClosureRequests } from '@/hooks/use-incident-closure';
import { useUserRoles } from '@/hooks/use-user-roles';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export function PendingClosureRequestsWidget() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasRole } = useUserRoles();
  const { data: pendingRequests, isLoading } = usePendingClosureRequests();

  // Only show widget for HSSE Managers and Admins
  const canViewClosures = hasRole('admin') || hasRole('hsse_manager');
  if (!canViewClosures) return null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const hasPendingRequests = pendingRequests && pendingRequests.length > 0;

  return (
    <Card className={cn(
      hasPendingRequests && "border-amber-500/50 bg-amber-500/5"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasPendingRequests ? (
              <FileCheck className="h-5 w-5 text-amber-500" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            )}
            <CardTitle className="text-lg">
              {t('dashboard.pendingClosures', 'Pending Closure Requests')}
            </CardTitle>
          </div>
          {hasPendingRequests && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
              {pendingRequests.length}
            </Badge>
          )}
        </div>
        <CardDescription>
          {hasPendingRequests
            ? t('dashboard.pendingClosuresDescription', 'Incidents awaiting your approval')
            : t('dashboard.noPendingClosures', 'No pending closure requests')
          }
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {hasPendingRequests ? (
          <>
            {pendingRequests.slice(0, 3).map((request) => {
              const isFinalClosure = request.status === 'pending_final_closure';
              return (
                <div
                  key={request.id}
                  className="flex items-start justify-between gap-3 rounded-lg border bg-background p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-sm">{request.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {request.reference_id}
                      </Badge>
                      <Badge 
                        variant={isFinalClosure ? 'default' : 'secondary'} 
                        className={cn(
                          'text-xs',
                          isFinalClosure && 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        )}
                      >
                        {isFinalClosure 
                          ? t('dashboard.finalClosure', 'Final Closure')
                          : t('dashboard.investigationApproval', 'Investigation Approval')
                        }
                      </Badge>
                      {request.requester_name && (
                        <span>{request.requester_name}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {request.closure_requested_at && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(request.closure_requested_at), { addSuffix: true })}
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => navigate(`/incidents/${request.id}`)}
                    >
                      {t('dashboard.reviewNow', 'Review')}
                      <ArrowRight className="ms-1 h-3 w-3 rtl:rotate-180" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {pendingRequests.length > 3 && (
              <Button
                variant="ghost"
                className="w-full mt-2"
                onClick={() => navigate('/incidents/my-actions')}
              >
                {t('dashboard.viewAllClosures', 'View All Requests')} ({pendingRequests.length})
                <ArrowRight className="ms-2 h-4 w-4 rtl:rotate-180" />
              </Button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 text-green-600 mb-2" />
            <p className="text-sm">{t('dashboard.noClosuresPending', 'No closures pending approval')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
