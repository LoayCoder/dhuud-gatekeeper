import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { 
  Clock, 
  User, 
  MapPin, 
  CheckCircle, 
  AlertCircle,
  FileText,
  Loader2,
  PenTool
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { SignaturePad, SignaturePadRef } from '@/components/ui/signature-pad';
import {
  useTodaysHandovers,
  usePendingHandovers,
  useAcknowledgeHandover,
  useCompleteHandover,
  parseOutstandingIssues,
  parseEquipmentChecklist,
  ShiftHandover,
} from '@/hooks/use-shift-handovers';
import { cn } from '@/lib/utils';

interface ShiftHandoversListProps {
  showPendingOnly?: boolean;
  limit?: number;
}

export function ShiftHandoversList({ showPendingOnly = false, limit }: ShiftHandoversListProps) {
  const { t } = useTranslation();
  const { data: todaysHandovers, isLoading: loadingToday } = useTodaysHandovers();
  const { data: pendingHandovers, isLoading: loadingPending } = usePendingHandovers();

  const isLoading = loadingToday || loadingPending;
  const handovers = showPendingOnly ? pendingHandovers : todaysHandovers;
  const displayedHandovers = limit ? handovers?.slice(0, limit) : handovers;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {showPendingOnly 
            ? t('security.pendingHandovers', 'Pending Handovers')
            : t('security.shiftHandovers', 'Shift Handovers')}
        </CardTitle>
        <CardDescription>
          {showPendingOnly
            ? t('security.pendingHandoversDesc', 'Handovers waiting for acknowledgment')
            : t('security.todaysHandovers', "Today's shift handovers")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!displayedHandovers?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{t('security.noHandovers', 'No handovers')}</p>
          </div>
        ) : (
          <Accordion type="single" collapsible className="space-y-2">
            {displayedHandovers.map((handover) => (
              <HandoverCard key={handover.id} handover={handover} />
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}

function HandoverCard({ handover }: { handover: ShiftHandover }) {
  const { t } = useTranslation();
  const acknowledge = useAcknowledgeHandover();
  const complete = useCompleteHandover();
  const signaturePadRef = useRef<SignaturePadRef>(null);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [signatureError, setSignatureError] = useState(false);

  const getStatusBadge = () => {
    switch (handover.status) {
      case 'pending':
        return <Badge variant="secondary">{t('security.pending', 'Pending')}</Badge>;
      case 'acknowledged':
        return <Badge variant="default">{t('security.acknowledged', 'Acknowledged')}</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-green-600">{t('security.completed', 'Completed')}</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">{t('security.cancelled', 'Cancelled')}</Badge>;
      default:
        return null;
    }
  };

  const handleAcknowledge = () => {
    const signature = signaturePadRef.current?.getSignatureDataUrl();
    if (!signature) {
      setSignatureError(true);
      return;
    }
    setSignatureError(false);
    acknowledge.mutate(
      { handoverId: handover.id, incoming_signature: signature },
      {
        onSuccess: () => setShowSignatureDialog(false),
      }
    );
  };

  const issues = parseOutstandingIssues(handover.outstanding_issues);
  const equipment = parseEquipmentChecklist(handover.equipment_checklist);
  const issueCount = issues.length;
  const damagedEquipment = equipment.filter(e => e.status !== 'ok').length;

  return (
    <>
      <AccordionItem value={handover.id} className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center justify-between w-full pe-4">
            <div className="flex items-center gap-3">
              <div className="space-y-1 text-start">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {handover.outgoing_guard?.full_name || t('common.unknown', 'Unknown')}
                  </span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-medium">
                    {handover.incoming_guard?.full_name || t('security.awaitingGuard', 'Awaiting...')}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(handover.handover_time), 'HH:mm')}
                  </span>
                  {handover.zone?.zone_name && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {handover.zone.zone_name}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {issueCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {issueCount}
                </Badge>
              )}
              {damagedEquipment > 0 && (
                <Badge variant="secondary" className="gap-1">
                  {damagedEquipment} {t('security.equipmentIssues', 'issues')}
                </Badge>
              )}
              {getStatusBadge()}
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pt-4 pb-4 space-y-4">
          {/* Outstanding Issues */}
          {issueCount > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">{t('security.outstandingIssues', 'Outstanding Issues')}</h4>
              <div className="space-y-1">
                {issues.map((issue) => (
                  <div key={issue.id} className="flex items-center gap-2 text-sm">
                    <Badge variant={
                      issue.priority === 'high' ? 'destructive' :
                      issue.priority === 'medium' ? 'secondary' : 'outline'
                    } className="text-xs">
                      {issue.priority}
                    </Badge>
                    <span>{issue.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Equipment Status */}
          {equipment.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">{t('security.equipmentStatus', 'Equipment Status')}</h4>
              <div className="grid grid-cols-2 gap-2">
                {equipment.map((item, i) => (
                  <div key={i} className={cn(
                    'flex items-center gap-2 text-sm p-2 rounded',
                    item.status === 'ok' && 'bg-green-500/10',
                    item.status === 'damaged' && 'bg-amber-500/10',
                    item.status === 'missing' && 'bg-destructive/10'
                  )}>
                    {item.status === 'ok' ? (
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    ) : (
                      <AlertCircle className={cn(
                        'h-3 w-3',
                        item.status === 'damaged' ? 'text-amber-600' : 'text-destructive'
                      )} />
                    )}
                    <span>{item.item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Observations */}
          {handover.key_observations && (
            <div className="space-y-1">
              <h4 className="text-sm font-medium">{t('security.keyObservations', 'Key Observations')}</h4>
              <p className="text-sm text-muted-foreground">{handover.key_observations}</p>
            </div>
          )}

          {/* Visitor Info */}
          {handover.visitor_info && (
            <div className="space-y-1">
              <h4 className="text-sm font-medium">{t('security.visitorInfo', 'Visitor Information')}</h4>
              <p className="text-sm text-muted-foreground">{handover.visitor_info}</p>
            </div>
          )}

          {/* Next Shift Priorities */}
          {handover.next_shift_priorities && (
            <div className="space-y-1">
              <h4 className="text-sm font-medium">{t('security.nextShiftPriorities', 'Next Shift Priorities')}</h4>
              <p className="text-sm text-muted-foreground">{handover.next_shift_priorities}</p>
            </div>
          )}

          {/* Notes */}
          {handover.notes && (
            <div className="space-y-1">
              <h4 className="text-sm font-medium">{t('common.notes', 'Notes')}</h4>
              <p className="text-sm text-muted-foreground">{handover.notes}</p>
            </div>
          )}

          {/* Signatures Display */}
          {(handover.outgoing_signature || handover.incoming_signature) && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <PenTool className="h-4 w-4" />
                {t('security.signatures', 'Signatures')}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                {handover.outgoing_signature && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('security.outgoingGuard', 'Outgoing Guard')}</p>
                    <div className="border rounded-lg p-2 bg-muted/30">
                      <img 
                        src={handover.outgoing_signature} 
                        alt="Outgoing guard signature" 
                        className="max-h-16 w-auto mx-auto"
                      />
                    </div>
                  </div>
                )}
                {handover.incoming_signature && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('security.incomingGuard', 'Incoming Guard')}</p>
                    <div className="border rounded-lg p-2 bg-muted/30">
                      <img 
                        src={handover.incoming_signature} 
                        alt="Incoming guard signature" 
                        className="max-h-16 w-auto mx-auto"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {handover.status === 'pending' && (
              <Button
                size="sm"
                onClick={() => setShowSignatureDialog(true)}
              >
                <PenTool className="h-4 w-4 me-2" />
                {t('security.acknowledgeHandover', 'Acknowledge')}
              </Button>
            )}
            {handover.status === 'acknowledged' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => complete.mutate(handover.id)}
                disabled={complete.isPending}
              >
                {complete.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin me-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 me-2" />
                )}
                {t('security.completeHandover', 'Complete')}
              </Button>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Signature Dialog for Acknowledgment */}
      <Dialog open={showSignatureDialog} onOpenChange={setShowSignatureDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('security.acknowledgeHandover', 'Acknowledge Handover')}</DialogTitle>
            <DialogDescription>
              {t('security.signToAcknowledge', 'Please sign below to acknowledge receipt of this shift handover.')}
            </DialogDescription>
          </DialogHeader>
          
          <div className={cn('py-4', signatureError && 'border-destructive rounded-lg border p-2')}>
            <SignaturePad
              ref={signaturePadRef}
              label={t('security.incomingSignature', 'Incoming Guard Signature')}
              onSignatureChange={(isEmpty) => {
                if (!isEmpty) setSignatureError(false);
              }}
            />
            {signatureError && (
              <p className="text-sm text-destructive mt-2">
                {t('security.signatureRequired', 'Signature is required')}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSignatureDialog(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleAcknowledge} disabled={acknowledge.isPending}>
              {acknowledge.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin me-2" />
              ) : (
                <CheckCircle className="h-4 w-4 me-2" />
              )}
              {t('security.confirmAcknowledge', 'Confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
