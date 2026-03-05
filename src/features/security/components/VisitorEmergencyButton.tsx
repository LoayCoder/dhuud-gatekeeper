import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { 
  AlertTriangle, 
  MapPin, 
  Camera, 
  Phone, 
  Loader2,
  CheckCircle2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VisitorEmergencyButtonProps {
  visitorToken: string;
  visitorName: string;
  emergencyContact?: string;
  className?: string;
}

export function VisitorEmergencyButton({
  visitorToken,
  visitorName,
  emergencyContact,
  className,
}: VisitorEmergencyButtonProps) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenDialog = () => {
    setDialogOpen(true);
    captureLocation();
  };

  const captureLocation = async () => {
    if (!navigator.geolocation) return;
    
    setIsCapturingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });
      setLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    } catch (error) {
      console.error('Location error:', error);
    } finally {
      setIsCapturingLocation(false);
    }
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Upload photo if provided
      let photoPath: string | null = null;
      if (photoFile) {
        const fileName = `emergency/${visitorToken}/${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('visitor-emergency')
          .upload(fileName, photoFile);
        
        if (!uploadError) {
          photoPath = fileName;
        }
      }

      // Call edge function to trigger emergency
      const { data, error } = await supabase.functions.invoke('trigger-visitor-emergency', {
        body: {
          token: visitorToken,
          alert_type: 'panic',
          latitude: location?.lat,
          longitude: location?.lng,
          notes,
          photo_path: photoPath,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to send alert');

      setSubmitted(true);
      toast.success(isRTL ? 'تم إرسال تنبيه الطوارئ' : 'Emergency alert sent');
    } catch (error) {
      console.error('Emergency submit error:', error);
      toast.error(isRTL ? 'فشل في إرسال التنبيه' : 'Failed to send alert');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setDialogOpen(false);
    // Reset state after dialog animation
    setTimeout(() => {
      setNotes('');
      setLocation(null);
      setPhotoFile(null);
      setPhotoPreview(null);
      setSubmitted(false);
    }, 300);
  };

  return (
    <>
      <Button
        variant="destructive"
        size="lg"
        onClick={handleOpenDialog}
        className={cn(
          'gap-2 animate-pulse hover:animate-none shadow-lg shadow-destructive/30',
          className
        )}
      >
        <AlertTriangle className="h-5 w-5" />
        {isRTL ? 'طوارئ' : 'Emergency'}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          {!submitted ? (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-destructive/10">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <DialogTitle className="text-destructive">
                      {isRTL ? 'تنبيه طوارئ' : 'Emergency Alert'}
                    </DialogTitle>
                    <DialogDescription>
                      {isRTL 
                        ? 'سيتم إخطار فريق الأمن فوراً'
                        : 'Security team will be notified immediately'}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Location Status */}
                <Card className="border-muted">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'p-2 rounded-full',
                        location ? 'bg-green-500/10' : 'bg-muted'
                      )}>
                        {isCapturingLocation ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <MapPin className={cn(
                            'h-4 w-4',
                            location ? 'text-green-500' : 'text-muted-foreground'
                          )} />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {isRTL ? 'الموقع الحالي' : 'Current Location'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isCapturingLocation 
                            ? (isRTL ? 'جاري تحديد الموقع...' : 'Capturing location...')
                            : location
                              ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
                              : (isRTL ? 'غير متاح' : 'Not available')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Photo Capture */}
                <div className="space-y-2">
                  <Label>{isRTL ? 'صورة الموقف (اختياري)' : 'Photo Evidence (Optional)'}</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoCapture}
                    className="hidden"
                  />
                  {photoPreview ? (
                    <div className="relative">
                      <img 
                        src={photoPreview} 
                        alt="Evidence" 
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 end-2 h-6 w-6"
                        onClick={() => {
                          setPhotoFile(null);
                          setPhotoPreview(null);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full gap-2"
                    >
                      <Camera className="h-4 w-4" />
                      {isRTL ? 'التقاط صورة' : 'Capture Photo'}
                    </Button>
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>{isRTL ? 'وصف الموقف (اختياري)' : 'Describe Situation (Optional)'}</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={isRTL ? 'ماذا يحدث؟' : 'What is happening?'}
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={handleClose}>
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  {isRTL ? 'إرسال تنبيه الطوارئ' : 'Send Emergency Alert'}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="py-8 text-center">
              <div className="p-4 rounded-full bg-green-500/10 w-fit mx-auto mb-4">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {isRTL ? 'تم إرسال التنبيه' : 'Alert Sent'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {isRTL 
                  ? 'فريق الأمن في الطريق إليك'
                  : 'Security team is on their way'}
              </p>
              {emergencyContact && (
                <a 
                  href={`tel:${emergencyContact}`}
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  <Phone className="h-4 w-4" />
                  {emergencyContact}
                </a>
              )}
              <div className="mt-6">
                <Button onClick={handleClose}>
                  {isRTL ? 'إغلاق' : 'Close'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
