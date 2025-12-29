import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
  AlertTriangle,
  Info,
  AlertCircle,
  CheckCircle,
  Eye,
  Video,
  Link2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useCCTVEvents, useReviewEvent, CCTVEvent } from '@/hooks/use-cctv-cameras';
import { cn } from '@/lib/utils';

export function CCTVEventsList({ cameraId }: { cameraId?: string }) {
  const { t } = useTranslation();
  const { data: events, isLoading } = useCCTVEvents(cameraId);
  const reviewMutation = useReviewEvent();

  const [reviewingEvent, setReviewingEvent] = useState<CCTVEvent | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isFalsePositive, setIsFalsePositive] = useState(false);

  const getSeverityIcon = (severity: CCTVEvent['severity']) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'info':
        return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSeverityBadge = (severity: CCTVEvent['severity']) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">{t('common.critical', 'Critical')}</Badge>;
      case 'warning':
        return <Badge className="bg-warning text-warning-foreground">{t('common.warning', 'Warning')}</Badge>;
      case 'info':
        return <Badge variant="secondary">{t('common.info', 'Info')}</Badge>;
    }
  };

  const handleReview = async () => {
    if (!reviewingEvent) return;
    await reviewMutation.mutateAsync({
      eventId: reviewingEvent.id,
      notes: reviewNotes || undefined,
      isFalsePositive,
    });
    setReviewingEvent(null);
    setReviewNotes('');
    setIsFalsePositive(false);
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('security.severity', 'Severity')}</TableHead>
              <TableHead>{t('security.eventType', 'Event Type')}</TableHead>
              <TableHead>{t('security.camera', 'Camera')}</TableHead>
              <TableHead>{t('security.triggeredAt', 'Triggered At')}</TableHead>
              <TableHead>{t('security.confidence', 'Confidence')}</TableHead>
              <TableHead>{t('common.status', 'Status')}</TableHead>
              <TableHead className="text-end">{t('common.actions', 'Actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : events?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {t('security.noEvents', 'No events recorded')}
                </TableCell>
              </TableRow>
            ) : (
              events?.map((event) => (
                <TableRow key={event.id} className={cn(event.severity === 'critical' && !event.reviewed_at && 'bg-destructive/5')}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getSeverityIcon(event.severity)}
                      {getSeverityBadge(event.severity)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium capitalize">
                      {event.event_type.replace(/_/g, ' ')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{event.camera?.name}</p>
                        <p className="text-xs text-muted-foreground">{event.camera?.camera_code}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {format(new Date(event.triggered_at), 'MMM dd, HH:mm:ss')}
                    </span>
                  </TableCell>
                  <TableCell>
                    {event.detection_confidence !== null ? (
                      <Badge variant="outline" className="text-xs">
                        {Math.round(event.detection_confidence)}%
                      </Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {event.reviewed_at ? (
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span className="text-sm text-success">{t('security.reviewed', 'Reviewed')}</span>
                        {event.is_false_positive && (
                          <Badge variant="outline" className="text-xs ms-1">
                            {t('security.falsePositive', 'False Positive')}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <Badge variant="secondary">{t('security.pending', 'Pending')}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex justify-end gap-1">
                      {event.clip_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(event.clip_url!, '_blank')}
                        >
                          <Video className="h-4 w-4" />
                        </Button>
                      )}
                      {event.linked_incident_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.location.href = `/incidents/${event.linked_incident_id}`}
                        >
                          <Link2 className="h-4 w-4" />
                        </Button>
                      )}
                      {!event.reviewed_at && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setReviewingEvent(event);
                            setReviewNotes('');
                            setIsFalsePositive(false);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Review Dialog */}
      <Dialog open={!!reviewingEvent} onOpenChange={(open) => !open && setReviewingEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('security.reviewEvent', 'Review Event')}</DialogTitle>
            <DialogDescription>
              {t('security.reviewEventDesc', 'Mark this event as reviewed and add any notes')}
            </DialogDescription>
          </DialogHeader>
          {reviewingEvent && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  {getSeverityBadge(reviewingEvent.severity)}
                  <span className="font-medium capitalize">
                    {reviewingEvent.event_type.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {reviewingEvent.camera?.name} - {format(new Date(reviewingEvent.triggered_at), 'PPpp')}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="false_positive">{t('security.markAsFalsePositive', 'Mark as False Positive')}</Label>
                <Switch
                  id="false_positive"
                  checked={isFalsePositive}
                  onCheckedChange={setIsFalsePositive}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">{t('common.notes', 'Notes')}</Label>
                <Textarea
                  id="notes"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={t('security.reviewNotesPlaceholder', 'Add review notes...')}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewingEvent(null)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleReview} disabled={reviewMutation.isPending}>
              {t('security.markAsReviewed', 'Mark as Reviewed')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
