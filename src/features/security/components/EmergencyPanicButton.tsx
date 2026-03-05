import { useState, useEffect } from 'react';
import { AlertTriangle, Phone, MapPin, Loader2, X, Shield, Flame, Heart, AlertOctagon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useTriggerEmergencyAlert } from '@/hooks/use-emergency-alerts';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface EmergencyPanicButtonProps {
  variant?: 'large' | 'compact' | 'floating';
  className?: string;
}

type AlertType = 'panic' | 'duress' | 'medical' | 'fire' | 'security_breach';

const alertTypes: { type: AlertType; icon: React.ReactNode; label: string; color: string }[] = [
  { type: 'panic', icon: <AlertOctagon className="h-6 w-6" />, label: 'Panic', color: 'bg-destructive' },
  { type: 'security_breach', icon: <Shield className="h-6 w-6" />, label: 'Security Breach', color: 'bg-orange-500' },
  { type: 'medical', icon: <Heart className="h-6 w-6" />, label: 'Medical', color: 'bg-blue-500' },
  { type: 'fire', icon: <Flame className="h-6 w-6" />, label: 'Fire', color: 'bg-amber-500' },
];

export function EmergencyPanicButton({ variant = 'large', className }: EmergencyPanicButtonProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<AlertType>('panic');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const triggerAlert = useTriggerEmergencyAlert();

  // Get location when dialog opens
  useEffect(() => {
    if (isOpen && navigator.geolocation) {
      setIsGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
          setIsGettingLocation(false);
        },
        () => {
          setIsGettingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, [isOpen]);

  // Countdown timer for confirmation
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      handleTriggerAlert();
    }
  }, [countdown]);

  const handleTriggerAlert = async () => {
    await triggerAlert.mutateAsync({
      alert_type: selectedType,
      priority: 'critical',
      latitude: location?.lat,
      longitude: location?.lng,
      accuracy: location?.accuracy,
      notes: notes || undefined,
    });
    setIsOpen(false);
    setCountdown(null);
    setNotes('');
  };

  const handleCancel = () => {
    setCountdown(null);
  };

  const handleStartCountdown = () => {
    setCountdown(5);
  };

  if (variant === 'floating') {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            'fixed bottom-6 end-6 z-50 h-16 w-16 rounded-full bg-destructive text-destructive-foreground shadow-lg',
            'flex items-center justify-center animate-pulse hover:animate-none hover:scale-110 transition-transform',
            'focus:outline-none focus:ring-4 focus:ring-destructive/50',
            className
          )}
          aria-label={t('security.panicButton', 'Panic Button')}
        >
          <AlertTriangle className="h-8 w-8" />
        </button>
        <EmergencyDialog
          isOpen={isOpen}
          onClose={() => { setIsOpen(false); setCountdown(null); }}
          selectedType={selectedType}
          setSelectedType={setSelectedType}
          notes={notes}
          setNotes={setNotes}
          location={location}
          isGettingLocation={isGettingLocation}
          countdown={countdown}
          onStartCountdown={handleStartCountdown}
          onCancel={handleCancel}
          isTriggering={triggerAlert.isPending}
        />
      </>
    );
  }

  if (variant === 'compact') {
    return (
      <>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setIsOpen(true)}
          className={cn('gap-2', className)}
        >
          <AlertTriangle className="h-4 w-4" />
          {t('security.emergency', 'Emergency')}
        </Button>
        <EmergencyDialog
          isOpen={isOpen}
          onClose={() => { setIsOpen(false); setCountdown(null); }}
          selectedType={selectedType}
          setSelectedType={setSelectedType}
          notes={notes}
          setNotes={setNotes}
          location={location}
          isGettingLocation={isGettingLocation}
          countdown={countdown}
          onStartCountdown={handleStartCountdown}
          onCancel={handleCancel}
          isTriggering={triggerAlert.isPending}
        />
      </>
    );
  }

  // Large variant (default)
  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'relative w-full max-w-xs aspect-square rounded-full bg-destructive text-destructive-foreground',
          'flex flex-col items-center justify-center gap-2 shadow-2xl',
          'hover:scale-105 transition-transform cursor-pointer',
          'focus:outline-none focus:ring-4 focus:ring-destructive/50',
          'animate-pulse hover:animate-none',
          className
        )}
      >
        <AlertTriangle className="h-16 w-16" />
        <span className="text-xl font-bold uppercase tracking-wide">
          {t('security.panicButton', 'Panic Button')}
        </span>
        <span className="text-sm opacity-80">
          {t('security.tapForHelp', 'Tap for Help')}
        </span>
      </button>
      <EmergencyDialog
        isOpen={isOpen}
        onClose={() => { setIsOpen(false); setCountdown(null); }}
        selectedType={selectedType}
        setSelectedType={setSelectedType}
        notes={notes}
        setNotes={setNotes}
        location={location}
        isGettingLocation={isGettingLocation}
        countdown={countdown}
        onStartCountdown={handleStartCountdown}
        onCancel={handleCancel}
        isTriggering={triggerAlert.isPending}
      />
    </>
  );
}

interface EmergencyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedType: AlertType;
  setSelectedType: (type: AlertType) => void;
  notes: string;
  setNotes: (notes: string) => void;
  location: { lat: number; lng: number; accuracy: number } | null;
  isGettingLocation: boolean;
  countdown: number | null;
  onStartCountdown: () => void;
  onCancel: () => void;
  isTriggering: boolean;
}

function EmergencyDialog({
  isOpen,
  onClose,
  selectedType,
  setSelectedType,
  notes,
  setNotes,
  location,
  isGettingLocation,
  countdown,
  onStartCountdown,
  onCancel,
  isTriggering,
}: EmergencyDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {t('security.emergencyAlert', 'Emergency Alert')}
          </DialogTitle>
          <DialogDescription>
            {t('security.emergencyDescription', 'Select the type of emergency and trigger an alert. Help will be dispatched immediately.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Alert Type Selection */}
          <div className="grid grid-cols-2 gap-2">
            {alertTypes.map((alert) => (
              <button
                key={alert.type}
                onClick={() => setSelectedType(alert.type)}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                  selectedType === alert.type
                    ? 'border-destructive bg-destructive/10'
                    : 'border-border hover:border-muted-foreground'
                )}
              >
                <div className={cn('p-2 rounded-full text-white', alert.color)}>
                  {alert.icon}
                </div>
                <span className="text-sm font-medium">{alert.label}</span>
              </button>
            ))}
          </div>

          {/* Location Status */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {isGettingLocation ? (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t('security.gettingLocation', 'Getting location...')}
              </span>
            ) : location ? (
              <span className="text-green-600">
                {t('security.locationCaptured', 'Location captured')} (±{Math.round(location.accuracy)}m)
              </span>
            ) : (
              <span className="text-amber-600">
                {t('security.locationUnavailable', 'Location unavailable')}
              </span>
            )}
          </div>

          {/* Optional Notes */}
          <Textarea
            placeholder={t('security.additionalDetails', 'Additional details (optional)...')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />

          {/* Emergency Contact */}
          <a
            href="tel:999"
            className="flex items-center justify-center gap-2 p-2 rounded-lg bg-muted text-muted-foreground hover:bg-accent"
          >
            <Phone className="h-4 w-4" />
            {t('security.callEmergency', 'Call Emergency Services (999)')}
          </a>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {countdown !== null ? (
            <>
              <Button variant="outline" onClick={onCancel} className="gap-2">
                <X className="h-4 w-4" />
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                variant="destructive"
                disabled
                className="min-w-[140px]"
              >
                {t('security.sendingIn', 'Sending in')} {countdown}s...
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={onStartCountdown}
                disabled={isTriggering}
                className="gap-2"
              >
                {isTriggering ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                {t('security.triggerAlert', 'Trigger Alert')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
