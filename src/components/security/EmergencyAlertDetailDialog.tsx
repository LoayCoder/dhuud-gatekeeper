import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
  AlertTriangle,
  MapPin,
  Clock,
  Navigation,
  Share2,
  MessageCircle,
  Copy,
  Phone,
  CheckCircle2,
  Circle,
  Loader2,
  User,
  Image as ImageIcon,
  ExternalLink,
  AlertOctagon,
  Shield,
  Heart,
  Flame,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  shareViaWhatsApp,
  shareViaSMS,
  copyAlertDetails,
  formatAlertMessage,
  getNavigationUrl,
  getMapViewUrl,
  getPhotoUrl,
  getAlertTypeArabic,
} from '@/lib/share-emergency-alert';
import type { EmergencyAlert } from '@/hooks/use-emergency-alerts';

interface EmergencyAlertDetailDialogProps {
  alert: EmergencyAlert | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAcknowledge?: (alertId: string) => void;
  onResolve?: (alertId: string) => void;
  isAcknowledging?: boolean;
}

interface ResponseStep {
  id: string;
  titleEn: string;
  titleAr: string;
  completed: boolean;
}

const DEFAULT_RESPONSE_STEPS: Omit<ResponseStep, 'completed'>[] = [
  { id: '1', titleEn: 'Locate the person in distress', titleAr: 'تحديد موقع الشخص المحتاج للمساعدة' },
  { id: '2', titleEn: 'Assess immediate danger level', titleAr: 'تقييم مستوى الخطر الفوري' },
  { id: '3', titleEn: 'Provide assistance or call backup', titleAr: 'تقديم المساعدة أو طلب الدعم' },
  { id: '4', titleEn: 'Secure the area', titleAr: 'تأمين المنطقة' },
  { id: '5', titleEn: 'Document and notify supervisor', titleAr: 'التوثيق وإخطار المشرف' },
];

export function EmergencyAlertDetailDialog({
  alert,
  open,
  onOpenChange,
  onAcknowledge,
  onResolve,
  isAcknowledging,
}: EmergencyAlertDetailDialogProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const isRTL = i18n.dir() === 'rtl';
  
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [responseSteps, setResponseSteps] = useState<ResponseStep[]>(
    DEFAULT_RESPONSE_STEPS.map(step => ({ ...step, completed: false }))
  );

  // Load photo when dialog opens
  useEffect(() => {
    if (open && alert?.photo_evidence_path) {
      setPhotoLoading(true);
      getPhotoUrl(alert.photo_evidence_path)
        .then(url => setPhotoUrl(url))
        .finally(() => setPhotoLoading(false));
    } else {
      setPhotoUrl(null);
    }
    // Reset steps when alert changes
    setResponseSteps(DEFAULT_RESPONSE_STEPS.map(step => ({ ...step, completed: false })));
  }, [open, alert?.photo_evidence_path, alert?.id]);

  if (!alert) return null;

  const isActive = !alert.acknowledged_at && !alert.resolved_at;
  const hasLocation = alert.latitude && alert.longitude;

  const getAlertIcon = () => {
    switch (alert.alert_type) {
      case 'panic': return <AlertOctagon className="h-6 w-6" />;
      case 'security_breach': return <Shield className="h-6 w-6" />;
      case 'medical': return <Heart className="h-6 w-6" />;
      case 'fire': return <Flame className="h-6 w-6" />;
      default: return <AlertTriangle className="h-6 w-6" />;
    }
  };

  const handleNavigate = () => {
    if (hasLocation) {
      window.open(getNavigationUrl(alert.latitude!, alert.longitude!), '_blank');
    }
  };

  const handleViewMap = () => {
    if (hasLocation) {
      window.open(getMapViewUrl(alert.latitude!, alert.longitude!), '_blank');
    }
  };

  const handleShareWhatsApp = async () => {
    const message = formatAlertMessage(
      { ...alert, source_name: alert.guard?.full_name || alert.source_name },
      photoUrl
    );
    shareViaWhatsApp(message);
    toast({ title: t('common.shared', 'Shared via WhatsApp') });
  };

  const handleShareSMS = () => {
    const message = formatAlertMessage(
      { ...alert, source_name: alert.guard?.full_name || alert.source_name },
      photoUrl
    );
    shareViaSMS(message);
  };

  const handleCopy = async () => {
    const message = formatAlertMessage(
      { ...alert, source_name: alert.guard?.full_name || alert.source_name },
      photoUrl
    );
    const success = await copyAlertDetails(message);
    if (success) {
      toast({ title: t('common.copied', 'Copied to clipboard') });
    }
  };

  const toggleStep = (stepId: string) => {
    setResponseSteps(prev =>
      prev.map(step =>
        step.id === stepId ? { ...step, completed: !step.completed } : step
      )
    );
  };

  const completedStepsCount = responseSteps.filter(s => s.completed).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-destructive/20 text-destructive">
              {getAlertIcon()}
            </div>
            <div>
              <span className="capitalize">{alert.alert_type.replace('_', ' ')}</span>
              <span className="text-muted-foreground mx-2">|</span>
              <span>{getAlertTypeArabic(alert.alert_type)}</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <Badge variant={isActive ? 'destructive' : 'secondary'}>
              {isActive ? t('security.active', 'Active') : t('security.acknowledged', 'Acknowledged')}
            </Badge>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(alert.triggered_at), 'dd/MM/yyyy HH:mm')}
            </span>
          </div>

          {/* Photo Evidence Section */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              {t('security.photoEvidence', 'Photo Evidence')}
            </Label>
            <div className="rounded-lg border bg-muted/50 aspect-video flex items-center justify-center overflow-hidden">
              {photoLoading ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : photoUrl ? (
                <img 
                  src={photoUrl} 
                  alt="Emergency evidence" 
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => window.open(photoUrl, '_blank')}
                />
              ) : (
                <div className="text-center text-muted-foreground p-4">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t('security.noPhoto', 'No photo available')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Location & Navigation */}
          {hasLocation && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {t('security.location', 'Location')}
              </Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleNavigate}
                >
                  <Navigation className="h-4 w-4 me-2" />
                  {t('security.navigate', 'Navigate')}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleViewMap}
                >
                  <ExternalLink className="h-4 w-4 me-2" />
                  {t('security.viewMap', 'View Map')}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {alert.latitude?.toFixed(6)}, {alert.longitude?.toFixed(6)}
              </p>
            </div>
          )}

          {/* Quick Share */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              {t('security.quickShare', 'Quick Share')}
            </Label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleShareWhatsApp}
              >
                <MessageCircle className="h-4 w-4 me-2 text-green-600" />
                WhatsApp
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleShareSMS}
              >
                <Phone className="h-4 w-4 me-2" />
                SMS
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleCopy}
              >
                <Copy className="h-4 w-4 me-2" />
                {t('common.copy', 'Copy')}
              </Button>
            </div>
          </div>

          {/* Source Info */}
          {(alert.guard?.full_name || alert.source_name) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{alert.guard?.full_name || alert.source_name}</span>
            </div>
          )}

          {alert.notes && (
            <div className="text-sm bg-muted/50 p-3 rounded-lg">
              {alert.notes}
            </div>
          )}

          {/* Emergency Response Steps */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">
                {t('security.responseSteps', 'Response Steps')}
              </Label>
              <Badge variant="outline">
                {completedStepsCount}/{responseSteps.length}
              </Badge>
            </div>
            
            <div className="space-y-2">
              {responseSteps.map((step, index) => (
                <div
                  key={step.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                    step.completed ? "bg-green-500/10 border-green-500/30" : "bg-muted/30 hover:bg-muted/50"
                  )}
                  onClick={() => toggleStep(step.id)}
                >
                  <Checkbox
                    checked={step.completed}
                    onCheckedChange={() => toggleStep(step.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground">
                        {index + 1}
                      </span>
                      {step.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <p className={cn(
                      "text-sm mt-1",
                      step.completed && "line-through text-muted-foreground"
                    )}>
                      {isRTL ? step.titleAr : step.titleEn}
                    </p>
                    <p className={cn(
                      "text-xs text-muted-foreground",
                      step.completed && "line-through"
                    )}>
                      {isRTL ? step.titleEn : step.titleAr}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          {isActive && onAcknowledge && (
            <Button
              className="w-full"
              variant="destructive"
              size="lg"
              onClick={() => onAcknowledge(alert.id)}
              disabled={isAcknowledging}
            >
              {isAcknowledging ? (
                <Loader2 className="h-4 w-4 animate-spin me-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 me-2" />
              )}
              {t('security.acknowledge', 'Acknowledge Alert')}
            </Button>
          )}

          {!isActive && alert.acknowledged_at && !alert.resolved_at && onResolve && (
            <Button
              className="w-full"
              size="lg"
              onClick={() => onResolve(alert.id)}
            >
              <CheckCircle2 className="h-4 w-4 me-2" />
              {t('security.resolve', 'Resolve Alert')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
