import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Shield, 
  Heart, 
  HelpCircle,
  Camera,
  MapPin,
  Send,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { VoiceMemoRecorder } from './VoiceMemoRecorder';
import { VisitorPhotoCapture } from './VisitorPhotoCapture';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

type IncidentType = 'hazard' | 'security' | 'medical' | 'other';

interface QuickIncidentReportProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

const incidentTypes: { type: IncidentType; icon: typeof AlertTriangle; labelKey: string; color: string }[] = [
  { type: 'hazard', icon: AlertTriangle, labelKey: 'security.incident.hazard', color: 'bg-yellow-500' },
  { type: 'security', icon: Shield, labelKey: 'security.incident.security', color: 'bg-destructive' },
  { type: 'medical', icon: Heart, labelKey: 'security.incident.medical', color: 'bg-blue-500' },
  { type: 'other', icon: HelpCircle, labelKey: 'security.incident.other', color: 'bg-muted-foreground' },
];

export function QuickIncidentReport({ onSuccess, onCancel, className }: QuickIncidentReportProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedType, setSelectedType] = useState<IncidentType | null>(null);
  const [notes, setNotes] = useState('');
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Get GPS location on mount
  const captureLocation = useCallback(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        },
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const handleTypeSelect = (type: IncidentType) => {
    setSelectedType(type);
    captureLocation();
    setStep(2);
  };

  const handlePhotoCapture = (blob: Blob) => {
    setPhotoBlob(blob);
  };

  const handleVoiceMemo = (blob: Blob | null) => {
    setVoiceBlob(blob);
  };

  const handleSubmit = async () => {
    if (!selectedType) return;

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) throw new Error('No tenant found');

      // Upload photo if exists
      let photoPath: string | null = null;
      if (photoBlob) {
        const fileName = `quick-incident/${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('incident-photos')
          .upload(fileName, photoBlob);
        
        if (!uploadError) {
          photoPath = fileName;
        }
      }

      // Upload voice memo if exists
      let voicePath: string | null = null;
      if (voiceBlob) {
        const fileName = `quick-incident/${Date.now()}.webm`;
        const { error: uploadError } = await supabase.storage
          .from('incident-audio')
          .upload(fileName, voiceBlob);
        
        if (!uploadError) {
          voicePath = fileName;
        }
      }

      // Create incident record
      const { error: insertError } = await supabase
        .from('incidents')
        .insert([{
          tenant_id: profile.tenant_id,
          reporter_id: user.id,
          title: `Quick Report: ${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Incident`,
          description: notes || `Quick incident report - ${selectedType}`,
          incident_type: selectedType === 'hazard' ? 'near_miss' : 
                        selectedType === 'medical' ? 'injury' : 
                        selectedType === 'security' ? 'property_damage' : 'other',
          severity: selectedType === 'medical' ? 'high' : 'medium',
          status: 'submitted',
          incident_date: new Date().toISOString(),
          gps_lat: location?.lat,
          gps_lng: location?.lng,
        }]);

      if (insertError) throw insertError;

      setIsSuccess(true);
      toast.success(t('security.incident.submitted', 'Incident reported successfully'));
      
      setTimeout(() => {
        onSuccess?.();
      }, 1500);
      
    } catch (error) {
      console.error('Error submitting incident:', error);
      toast.error(t('security.incident.submitError', 'Failed to submit incident'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <Card className={cn('border-green-500', className)}>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <p className="text-lg font-medium text-green-600">
            {t('security.incident.submittedSuccess', 'Incident Reported!')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {t('security.incident.quickReport', 'Quick Incident Report')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <span className="text-xs">{t('security.incident.step', 'Step')} {step}/3</span>
            </Badge>
            {location && (
              <Badge variant="secondary" className="gap-1">
                <MapPin className="h-3 w-3" />
                <span className="text-xs">{t('security.incident.gpsLocked', 'GPS')}</span>
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step 1: Select Type */}
        {step === 1 && (
          <div className="grid grid-cols-2 gap-3">
            {incidentTypes.map(({ type, icon: Icon, labelKey, color }) => (
              <Button
                key={type}
                variant="outline"
                className={cn(
                  'h-24 flex-col gap-2 text-start',
                  selectedType === type && 'ring-2 ring-primary'
                )}
                onClick={() => handleTypeSelect(type)}
              >
                <div className={cn('h-10 w-10 rounded-full flex items-center justify-center text-white', color)}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium">
                  {t(labelKey, type.charAt(0).toUpperCase() + type.slice(1))}
                </span>
              </Button>
            ))}
          </div>
        )}

        {/* Step 2: Add Evidence */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <VisitorPhotoCapture onCapture={handlePhotoCapture} />
              {photoBlob && (
                <Badge variant="secondary">
                  <Camera className="h-3 w-3 me-1" />
                  {t('security.incident.photoAdded', 'Photo Added')}
                </Badge>
              )}
            </div>
            
            <div>
              <p className="text-sm font-medium mb-2">
                {t('security.incident.voiceNote', 'Voice Note (Optional)')}
              </p>
              <VoiceMemoRecorder 
                compact 
                onRecordingComplete={handleVoiceMemo}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                {t('common.back', 'Back')}
              </Button>
              <Button onClick={() => setStep(3)} className="flex-1">
                {t('common.next', 'Next')}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Notes & Submit */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">
                {t('security.incident.additionalNotes', 'Additional Notes')}
              </p>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('security.incident.notesPlaceholder', 'Describe what happened...')}
                rows={4}
                className="resize-none"
              />
            </div>

            {/* Summary */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <p className="text-sm font-medium">{t('security.incident.summary', 'Summary')}</p>
              <div className="flex flex-wrap gap-2">
                <Badge>{selectedType}</Badge>
                {photoBlob && <Badge variant="outline"><Camera className="h-3 w-3 me-1" /> Photo</Badge>}
                {voiceBlob && <Badge variant="outline">🎤 Voice</Badge>}
                {location && <Badge variant="outline"><MapPin className="h-3 w-3 me-1" /> Located</Badge>}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                {t('common.back', 'Back')}
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting}
                className="flex-1 gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {t('security.incident.submit', 'Submit')}
              </Button>
            </div>
          </div>
        )}

        {onCancel && (
          <Button variant="ghost" onClick={onCancel} className="w-full mt-2">
            {t('common.cancel', 'Cancel')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
