import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowRightLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User,
  Calendar,
  MapPin
} from 'lucide-react';
import { 
  useShiftSwapRequests, 
  useMyPendingSwapRequests,
  useSupervisorApproveSwap,
  ShiftSwapRequest 
} from '@/hooks/use-shift-swap-requests';
import { ShiftSwapResponseDialog } from './ShiftSwapResponseDialog';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface ShiftSwapRequestsListProps {
  showSupervisorView?: boolean;
  showSupervisorActions?: boolean;
}

export function ShiftSwapRequestsList({ showSupervisorView, showSupervisorActions }: ShiftSwapRequestsListProps) {
  const { t } = useTranslation();
  const [selectedRequest, setSelectedRequest] = useState<ShiftSwapRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['current-user-id'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: pendingRequests, isLoading: loadingPending } = useMyPendingSwapRequests();
  const { data: allRequests, isLoading: loadingAll } = useShiftSwapRequests({ myRequests: true });
  const { data: awaitingApproval, isLoading: loadingApproval } = useShiftSwapRequests({ status: 'accepted' });
  const supervisorApprove = useSupervisorApproveSwap();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />{t('security.swapRequest.statusPending', 'Pending')}</Badge>;
      case 'accepted':
        return <Badge className="bg-blue-500 gap-1"><Clock className="h-3 w-3" />{t('security.swapRequest.statusAccepted', 'Awaiting Approval')}</Badge>;
      case 'approved':
        return <Badge className="bg-green-500 gap-1"><CheckCircle className="h-3 w-3" />{t('security.swapRequest.statusApproved', 'Approved')}</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />{t('security.swapRequest.statusRejected', 'Rejected')}</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">{t('security.swapRequest.statusCancelled', 'Cancelled')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderRequestCard = (request: ShiftSwapRequest, showActions: boolean, isSupervisor?: boolean) => (
    <Card key={request.id} className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  {request.requesting_guard?.full_name || 'Unknown'} 
                  <span className="text-muted-foreground mx-2">→</span>
                  {request.target_guard?.full_name || 'Unknown'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('security.swapRequest.requestedAt', 'Requested')}: {format(new Date(request.requested_at), 'PPp')}
                </p>
              </div>
            </div>
            {getStatusBadge(request.status)}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">{t('security.swapRequest.originalShift', 'Original Shift')}</p>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{request.original_roster?.roster_date ? format(new Date(request.original_roster.roster_date), 'EEE, MMM d') : 'N/A'}</span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" />
                <span>{request.original_roster?.security_zones?.zone_name || 'N/A'}</span>
              </div>
            </div>

            {request.swap_roster && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">{t('security.swapRequest.exchangeShift', 'Exchange Shift')}</p>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{format(new Date(request.swap_roster.roster_date), 'EEE, MMM d')}</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" />
                  <span>{request.swap_roster.security_zones?.zone_name || 'N/A'}</span>
                </div>
              </div>
            )}
          </div>

          <div className="text-sm">
            <p className="text-muted-foreground">{t('security.swapRequest.reason', 'Reason')}:</p>
            <p className="mt-1">{request.reason}</p>
          </div>

          {request.notes && (
            <div className="text-sm p-2 bg-muted rounded">
              <p className="text-muted-foreground">{t('security.swapRequest.notes', 'Notes')}: {request.notes}</p>
            </div>
          )}

          {showActions && request.status === 'pending' && request.target_guard_id === currentUser?.id && (
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSelectedRequest(request);
                  setDialogOpen(true);
                }}
              >
                {t('common.respond', 'Respond')}
              </Button>
            </div>
          )}

          {isSupervisor && request.status === 'accepted' && (
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => supervisorApprove.mutate({ requestId: request.id, approve: false })}
                disabled={supervisorApprove.isPending}
              >
                <XCircle className="h-4 w-4 me-1" />
                {t('common.reject', 'Reject')}
              </Button>
              <Button 
                size="sm"
                onClick={() => supervisorApprove.mutate({ requestId: request.id, approve: true })}
                disabled={supervisorApprove.isPending}
              >
                <CheckCircle className="h-4 w-4 me-1" />
                {t('common.approve', 'Approve')}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderEmptyState = (message: string) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <ArrowRightLeft className="h-12 w-12 text-muted-foreground mb-4" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );

  if (showSupervisorView || showSupervisorActions) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            {t('security.swapRequest.awaitingApproval', 'Swap Requests Awaiting Approval')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingApproval ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />)}
            </div>
          ) : awaitingApproval?.length ? (
            <div className="space-y-3">
              {awaitingApproval.map(r => renderRequestCard(r, false, true))}
            </div>
          ) : (
            renderEmptyState(t('security.swapRequest.noAwaitingApproval', 'No swap requests awaiting approval'))
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            {t('security.swapRequest.pendingTab', 'Pending')}
            {pendingRequests?.length ? (
              <Badge variant="secondary" className="ms-1">{pendingRequests.length}</Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            {t('security.swapRequest.allTab', 'My Requests')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {loadingPending ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />)}
            </div>
          ) : pendingRequests?.length ? (
            <div className="space-y-3">
              {pendingRequests.map(r => renderRequestCard(r, true))}
            </div>
          ) : (
            renderEmptyState(t('security.swapRequest.noPending', 'No pending swap requests'))
          )}
        </TabsContent>

        <TabsContent value="all">
          {loadingAll ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />)}
            </div>
          ) : allRequests?.length ? (
            <div className="space-y-3">
              {allRequests.map(r => renderRequestCard(r, true))}
            </div>
          ) : (
            renderEmptyState(t('security.swapRequest.noRequests', 'No swap requests'))
          )}
        </TabsContent>
      </Tabs>

      <ShiftSwapResponseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        request={selectedRequest}
      />
    </>
  );
}
