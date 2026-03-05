import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clock, 
  User, 
  Building2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Phone,
  Calendar,
  MapPin
} from 'lucide-react';
import { usePendingSecurityRequests } from '@/hooks/use-visit-requests';
import { VisitApprovalDialog } from '@/components/visitors/VisitApprovalDialog';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export function VisitorApprovalQueue() {
  const { t } = useTranslation();
  const { data: pendingRequests = [], isLoading } = usePendingSecurityRequests();
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);

  const handleOpenApproval = (requestId: string) => {
    setSelectedRequestId(requestId);
    setApprovalDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t('security.approvalQueue.title', 'Pending Approvals')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingRequests.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t('security.approvalQueue.title', 'Pending Approvals')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500/50" />
            <p className="font-medium">{t('security.approvalQueue.allClear', 'All Clear')}</p>
            <p className="text-sm">{t('security.approvalQueue.noPending', 'No pending visitor approvals')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t('security.approvalQueue.title', 'Pending Approvals')}
            <Badge variant="secondary" className="ms-auto">
              {pendingRequests.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <div className="p-4 space-y-3">
              {pendingRequests.map((request) => {
                const waitTime = formatDistanceToNow(new Date(request.created_at), { addSuffix: false });
                const isUrgent = new Date(request.valid_from) <= new Date();

                return (
                  <div
                    key={request.id}
                    className={cn(
                      'p-4 rounded-lg border bg-card transition-colors hover:bg-muted/50 cursor-pointer',
                      isUrgent && 'border-warning bg-warning/5'
                    )}
                    onClick={() => handleOpenApproval(request.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {request.visitor?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'VT'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className="font-medium truncate">{request.visitor?.full_name}</h4>
                          {isUrgent && (
                            <Badge variant="outline" className="text-warning border-warning shrink-0">
                              <AlertTriangle className="h-3 w-3 me-1" />
                              {t('security.approvalQueue.urgent', 'Urgent')}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          {request.visitor?.company_name && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {request.visitor.company_name}
                            </span>
                          )}
                          {request.site?.name && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {request.site.name}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(request.valid_from), 'PPp')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {t('security.approvalQueue.waiting', 'Waiting')} {waitTime}
                          </span>
                        </div>

                        {request.visitor?.host_name && (
                          <div className="mt-2 text-xs">
                            <span className="text-muted-foreground">{t('visitors.fields.host', 'Host')}: </span>
                            <span className="font-medium">{request.visitor.host_name}</span>
                            {request.visitor.host_phone && (
                              <span className="ms-2 text-muted-foreground">
                                <Phone className="h-3 w-3 inline me-1" />
                                {request.visitor.host_phone}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenApproval(request.id);
                        }}
                      >
                        <XCircle className="h-4 w-4 me-1" />
                        {t('visitors.actions.reject', 'Reject')}
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenApproval(request.id);
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4 me-1" />
                        {t('visitors.actions.approve', 'Approve')}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <VisitApprovalDialog
        requestId={selectedRequestId}
        open={approvalDialogOpen}
        onOpenChange={setApprovalDialogOpen}
      />
    </>
  );
}
