import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Loader2, CheckCircle2, AlertTriangle, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface GPSCoordinates {
  lat: number;
  lng: number;
  accuracy: number;
}

interface AssetLocationCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (coords: GPSCoordinates) => Promise<void>;
  currentLocation?: { lat: number; lng: number } | null;
  assetName?: string;
}

export function AssetLocationCapture({
  open,
  onOpenChange,
  onCapture,
  currentLocation,
  assetName,
}: AssetLocationCaptureProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();

  const [isCapturing, setIsCapturing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [capturedCoords, setCapturedCoords] = useState<GPSCoordinates | null>(null);
  const [error, setError] = useState<string | null>(null);

  const captureLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError(t('assets.gps.notSupported'));
      return;
    }

    setIsCapturing(true);
    setError(null);
    setCapturedCoords(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCapturedCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setIsCapturing(false);
      },
      (err) => {
        setIsCapturing(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError(t('assets.gps.permissionDenied'));
            break;
          case err.POSITION_UNAVAILABLE:
            setError(t('assets.gps.positionUnavailable'));
            break;
          case err.TIMEOUT:
            setError(t('assets.gps.timeout'));
            break;
          default:
            setError(t('assets.gps.unknownError'));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [t]);

  const handleSave = async () => {
    if (!capturedCoords) return;

    setIsSaving(true);
    try {
      await onCapture(capturedCoords);
      toast.success(t('assets.gps.locationSaved'));
      onOpenChange(false);
      setCapturedCoords(null);
    } catch (err) {
      toast.error(t('assets.gps.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setCapturedCoords(null);
    setError(null);
  };

  const getAccuracyLevel = (accuracy: number) => {
    if (accuracy <= 10) return { level: 'excellent', color: 'text-green-600' };
    if (accuracy <= 20) return { level: 'good', color: 'text-blue-600' };
    if (accuracy <= 50) return { level: 'fair', color: 'text-yellow-600' };
    return { level: 'poor', color: 'text-red-600' };
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent dir={direction} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {t('assets.gps.captureLocation')}
          </DialogTitle>
          <DialogDescription>
            {assetName && (
              <span className="font-medium text-foreground">{assetName}</span>
            )}
            {assetName && ' - '}
            {t('assets.gps.captureDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Location */}
          {currentLocation && !capturedCoords && (
            <div className="rounded-lg border p-3 bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">{t('assets.gps.currentLocation')}</p>
              <p className="font-mono text-sm">
                {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
              </p>
            </div>
          )}

          {/* Capture Button */}
          {!capturedCoords && !isCapturing && (
            <Button
              onClick={captureLocation}
              className="w-full gap-2"
              size="lg"
            >
              <Navigation className="h-5 w-5" />
              {t('assets.gps.captureNow')}
            </Button>
          )}

          {/* Loading State */}
          {isCapturing && (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">{t('assets.gps.capturing')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('assets.gps.pleaseWait')}
              </p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">{t('assets.gps.error')}</p>
                  <p className="text-sm text-muted-foreground mt-1">{error}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={captureLocation}
                className="mt-3"
              >
                {t('common.tryAgain')}
              </Button>
            </div>
          )}

          {/* Captured Coordinates */}
          {capturedCoords && (
            <div className="rounded-lg border p-4 bg-green-500/5 border-green-500/20">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-green-700 dark:text-green-400">
                    {t('assets.gps.locationCaptured')}
                  </p>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('assets.gps.latitude')}:</span>
                      <span className="font-mono">{capturedCoords.lat.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('assets.gps.longitude')}:</span>
                      <span className="font-mono">{capturedCoords.lng.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-muted-foreground">{t('assets.gps.accuracy')}:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{capturedCoords.accuracy.toFixed(1)}m</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            getAccuracyLevel(capturedCoords.accuracy).color
                          )}
                        >
                          {t(`assets.gps.${getAccuracyLevel(capturedCoords.accuracy).level}`)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {capturedCoords.accuracy > 20 && (
                    <div className="mt-3 flex items-start gap-2 text-xs text-yellow-600 dark:text-yellow-400">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>{t('assets.gps.lowAccuracyWarning')}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={captureLocation}
                  className="flex-1"
                >
                  {t('assets.gps.recapture')}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!capturedCoords || isSaving}
          >
            {isSaving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
