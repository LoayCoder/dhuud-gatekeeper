import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Calendar, MapPin, User } from 'lucide-react';
import { useRespondToSwapRequest, ShiftSwapRequest } from '@/hooks/use-shift-swap-requests';

interface ShiftSwapResponseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: ShiftSwapRequest | null;
}

export function ShiftSwapResponseDialog({ open, onOpenChange, request }: ShiftSwapResponseDialogProps) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState('');
  const respond = useRespondToSwapRequest();

  const handleResponse = async (accept: boolean) => {
    if (!request) return;
    await respond.mutateAsync({
      requestId: request.id,
      accept,
      notes: notes.trim() || undefined,
    });
    setNotes('');
    onOpenChange(false);
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('security.swapRequest.respondTitle', 'Respond to Swap Request')}</DialogTitle>
          <DialogDescription>
            {t('security.swapRequest.respondDescription', 'Review and respond to this shift swap request')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Requesting Guard */}
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">{t('security.swapRequest.from', 'From')}</p>
              <p className="font-medium">{request.requesting_guard?.full_name || 'Unknown'}</p>
            </div>
          </div>

          {/* Original Shift Details */}
          <div className="p-3 border rounded-lg">
            <p className="text-sm font-medium mb-2">{t('security.swapRequest.theyWantToGive', 'They want to give you')}</p>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {request.original_roster?.roster_date 
                    ? format(new Date(request.original_roster.roster_date), 'EEEE, MMMM d, yyyy')
                    : 'N/A'
                  }
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{request.original_roster?.security_zones?.zone_name || 'N/A'}</span>
              </div>
              {request.original_roster?.security_shifts && (
                <Badge variant="outline" className="mt-1">
                  {request.original_roster.security_shifts.shift_name} ({request.original_roster.security_shifts.start_time} - {request.original_roster.security_shifts.end_time})
                </Badge>
              )}
            </div>
          </div>

          {/* Exchange Shift if exists */}
          {request.swap_roster && (
            <div className="p-3 border rounded-lg border-primary/50 bg-primary/5">
              <p className="text-sm font-medium mb-2">{t('security.swapRequest.inExchangeFor', 'In exchange for your shift')}</p>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{format(new Date(request.swap_roster.roster_date), 'EEEE, MMMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{request.swap_roster.security_zones?.zone_name || 'N/A'}</span>
                </div>
                {request.swap_roster.security_shifts && (
                  <Badge variant="outline" className="mt-1">
                    {request.swap_roster.security_shifts.shift_name} ({request.swap_roster.security_shifts.start_time} - {request.swap_roster.security_shifts.end_time})
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <p className="text-sm font-medium mb-1">{t('security.swapRequest.reason', 'Reason')}</p>
            <p className="text-sm text-muted-foreground">{request.reason}</p>
          </div>

          {/* Response Notes */}
          <div>
            <Label>{t('security.swapRequest.responseNotes', 'Your Notes (Optional)')}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('security.swapRequest.notesPlaceholder', 'Add any notes about your response...')}
              rows={2}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleResponse(false)}
            disabled={respond.isPending}
            className="text-destructive border-destructive/50 hover:bg-destructive/10"
          >
            <XCircle className="h-4 w-4 me-2" />
            {t('common.decline', 'Decline')}
          </Button>
          <Button
            onClick={() => handleResponse(true)}
            disabled={respond.isPending}
          >
            <CheckCircle className="h-4 w-4 me-2" />
            {t('common.accept', 'Accept')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
