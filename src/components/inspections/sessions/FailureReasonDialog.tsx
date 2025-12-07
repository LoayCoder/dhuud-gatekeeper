import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, MapPin, Camera } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FailureReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    failure_reason: string;
    notes: string;
    gps_lat?: number;
    gps_lng?: number;
    photo_paths?: string[];
  }) => void;
  isLoading: boolean;
  assetCode: string;
}

const FAILURE_REASONS = [
  'pressure_low',
  'expired',
  'obstructed',
  'damaged',
  'missing',
  'leaking',
  'corrosion',
  'label_unreadable',
  'seal_broken',
  'other',
];

export function FailureReasonDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  assetCode,
}: FailureReasonDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [gpsLat, setGpsLat] = useState<number | undefined>();
  const [gpsLng, setGpsLng] = useState<number | undefined>();
  const [capturingGps, setCapturingGps] = useState(false);
  
  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setReason('');
      setNotes('');
      setGpsLat(undefined);
      setGpsLng(undefined);
    }
  }, [open]);
  
  const handleCaptureGps = () => {
    if (!navigator.geolocation) return;
    
    setCapturingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLat(position.coords.latitude);
        setGpsLng(position.coords.longitude);
        setCapturingGps(false);
      },
      (error) => {
        console.error('GPS error:', error);
        setCapturingGps(false);
      }
    );
  };
  
  const handleSubmit = () => {
    if (!reason) return;
    
    onSubmit({
      failure_reason: reason,
      notes,
      gps_lat: gpsLat,
      gps_lng: gpsLng,
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" dir={direction}>
        <DialogHeader>
          <DialogTitle>{t('inspectionSessions.reportFailure')}</DialogTitle>
          <p className="text-sm text-muted-foreground">{assetCode}</p>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Failure Reason */}
          <div className="space-y-2">
            <Label>{t('inspectionSessions.failureReason')} *</Label>
            <Select value={reason} onValueChange={setReason} dir={direction}>
              <SelectTrigger>
                <SelectValue placeholder={t('inspectionSessions.selectReason')} />
              </SelectTrigger>
              <SelectContent>
                {FAILURE_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {t(`inspectionSessions.reasons.${r}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Notes */}
          <div className="space-y-2">
            <Label>{t('common.notes')} ({t('common.optional')})</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('inspectionSessions.additionalNotes')}
              rows={3}
            />
          </div>
          
          {/* GPS Location */}
          <div className="space-y-2">
            <Label>{t('common.location')} ({t('common.optional')})</Label>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleCaptureGps}
              disabled={capturingGps}
            >
              {capturingGps ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="me-2 h-4 w-4" />
              )}
              {gpsLat && gpsLng 
                ? `${gpsLat.toFixed(6)}, ${gpsLng.toFixed(6)}`
                : t('orgStructure.useCurrentLocation')
              }
            </Button>
          </div>
          
          {/* Photo placeholder - will be implemented in Phase 11C.4 */}
          <div className="space-y-2">
            <Label>{t('inspectionSessions.photos')} ({t('common.optional')})</Label>
            <Button type="button" variant="outline" className="w-full" disabled>
              <Camera className="me-2 h-4 w-4" />
              {t('inspectionSessions.capturePhoto')}
            </Button>
            <p className="text-xs text-muted-foreground">{t('common.comingSoon')}</p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !reason} variant="destructive">
            {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t('inspectionSessions.reportFailure')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
