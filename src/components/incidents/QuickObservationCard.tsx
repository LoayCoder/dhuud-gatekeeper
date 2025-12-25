import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Camera, MapPin, Loader2, CheckCircle2, AlertTriangle, Send, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCreateIncident, type IncidentFormData, type ClosedOnSpotPayload } from '@/hooks/use-incidents';
import { useTenantSites } from '@/hooks/use-org-hierarchy';
import { findNearestSite, type NearestSiteResult } from '@/lib/geo-utils';
import { uploadFilesParallel } from '@/lib/upload-utils';
import { UploadProgressOverlay } from '@/components/ui/upload-progress';

const OBSERVATION_TYPES = [
  { value: 'unsafe_act', labelKey: 'incidents.observationTypes.unsafeAct' },
  { value: 'unsafe_condition', labelKey: 'incidents.observationTypes.unsafeCondition' },
];

const RISK_LEVELS = [
  { value: 'low', color: 'bg-green-500 hover:bg-green-600', textColor: 'text-green-500' },
  { value: 'medium', color: 'bg-yellow-500 hover:bg-yellow-600', textColor: 'text-yellow-500' },
  { value: 'high', color: 'bg-red-500 hover:bg-red-600', textColor: 'text-red-500' },
];

const createQuickObservationSchema = (t: (key: string) => string) => z.object({
  description: z.string().min(20, t('incidents.validation.descriptionMinLength')).max(2000),
  subtype: z.string().min(1, t('incidents.validation.subtypeRequired')),
  risk_rating: z.enum(['low', 'medium', 'high']),
  site_id: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  closed_on_spot: z.boolean().default(false),
});

type FormValues = z.infer<ReturnType<typeof createQuickObservationSchema>>;

interface QuickObservationCardProps {
  onCancel: () => void;
}

export function QuickObservationCard({ onCancel }: QuickObservationCardProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const direction = i18n.dir();
  const { profile } = useAuth();
  
  const schema = createQuickObservationSchema(t);
  
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [gpsDetectedSite, setGpsDetectedSite] = useState<NearestSiteResult | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [closedOnSpotPhotos, setClosedOnSpotPhotos] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const createIncident = useCreateIncident();
  const { data: sites = [] } = useTenantSites();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: '',
      subtype: '',
      risk_rating: 'medium',
      site_id: profile?.assigned_site_id || '',
      latitude: undefined,
      longitude: undefined,
      closed_on_spot: false,
    },
  });
  
  const closedOnSpot = form.watch('closed_on_spot');
  const selectedRisk = form.watch('risk_rating');
  
  // Auto-detect GPS on mount
  useEffect(() => {
    handleGetLocation();
  }, []);
  
  const handleGetLocation = () => {
    if (!navigator.geolocation) return;
    
    setIsGettingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        form.setValue('latitude', latitude);
        form.setValue('longitude', longitude);
        
        // Find nearest site within 500m
        const nearestResult = findNearestSite(latitude, longitude, sites, 500);
        if (nearestResult) {
          form.setValue('site_id', nearestResult.site.id);
          setGpsDetectedSite(nearestResult);
        }
        
        setIsGettingLocation(false);
      },
      () => {
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };
  
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>, isClosedOnSpot: boolean = false) => {
    const files = Array.from(e.target.files || []);
    if (isClosedOnSpot) {
      setClosedOnSpotPhotos(prev => [...prev, ...files].slice(0, 3));
    } else {
      setPhotos(prev => [...prev, ...files].slice(0, 5));
    }
    e.target.value = '';
  };
  
  const removePhoto = (index: number, isClosedOnSpot: boolean = false) => {
    if (isClosedOnSpot) {
      setClosedOnSpotPhotos(prev => prev.filter((_, i) => i !== index));
    } else {
      setPhotos(prev => prev.filter((_, i) => i !== index));
    }
  };
  
  const onSubmit = async (values: FormValues) => {
    // Build closed_on_spot_data
    let closedOnSpotData: ClosedOnSpotPayload | undefined;
    if (values.closed_on_spot) {
      closedOnSpotData = {
        closed_on_spot: true,
        photo_paths: [],
      };
    }
    
    const formData: IncidentFormData = {
      title: values.description.slice(0, 80) + (values.description.length > 80 ? '...' : ''),
      description: values.description,
      event_type: 'observation',
      subtype: values.subtype,
      occurred_at: new Date().toISOString(),
      risk_rating: values.risk_rating,
      site_id: values.site_id || undefined,
      latitude: values.latitude,
      longitude: values.longitude,
      closed_on_spot_data: closedOnSpotData,
      has_injury: false,
      has_damage: false,
    };
    
    createIncident.mutate(formData, {
      onSuccess: async (data) => {
        // Upload photos
        if ((photos.length > 0 || closedOnSpotPhotos.length > 0) && profile?.tenant_id && data?.id) {
          setIsUploading(true);
          const uploadedPaths: string[] = [];
          
          try {
            // Upload main photos
            if (photos.length > 0) {
              await uploadFilesParallel(
                photos,
                async (file, index) => {
                  const fileName = `${Date.now()}-${index}-${file.name}`;
                  const uploadPath = `${profile.tenant_id}/${data.id}/photos/${fileName}`;
                  const { error } = await supabase.storage
                    .from('incident-attachments')
                    .upload(uploadPath, file);
                  if (error) throw error;
                  setUploadProgress(((index + 1) / photos.length) * 50);
                },
                { compressImages: true, maxWidth: 1920, quality: 0.85 }
              );
            }
            
            // Upload closed-on-spot photos
            if (closedOnSpotPhotos.length > 0) {
              const paths = await uploadFilesParallel(
                closedOnSpotPhotos,
                async (file, index) => {
                  const fileName = `${Date.now()}-${index}-${file.name}`;
                  const photoPath = `${profile.tenant_id}/${data.id}/closed-on-spot/${fileName}`;
                  const { error } = await supabase.storage
                    .from('incident-attachments')
                    .upload(photoPath, file);
                  if (error) throw error;
                  setUploadProgress(50 + ((index + 1) / closedOnSpotPhotos.length) * 50);
                  return photoPath;
                },
                { compressImages: true, maxWidth: 1920, quality: 0.85 }
              );
              uploadedPaths.push(...paths);
            }
            
            // Update incident with photo paths
            if (uploadedPaths.length > 0 && closedOnSpotData) {
              await supabase
                .from('incidents')
                .update({
                  immediate_actions_data: {
                    closed_on_spot: true,
                    photo_paths: uploadedPaths,
                  }
                })
                .eq('id', data.id);
            }
          } catch (error) {
            console.error('Upload error:', error);
            toast.error(t('incidents.mediaUploadFailed', 'Failed to upload photos'));
          } finally {
            setIsUploading(false);
            setUploadProgress(0);
          }
        }
        
        navigate('/incidents');
      },
    });
  };
  
  return (
    <div className="container max-w-lg py-6" dir={direction}>
      {isUploading && <UploadProgressOverlay isUploading={isUploading} current={Math.round(uploadProgress / 10)} total={10} />}
      
      <Card className="shadow-lg border-2">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              {t('quickObservation.title')}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {t('quickObservation.subtitle')}
          </p>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Photo Capture */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('quickObservation.addPhoto')}</label>
                <div className="flex flex-wrap gap-2">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 end-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {photos.length < 5 && (
                    <label className="w-20 h-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                      <Camera className="h-6 w-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground mt-1">{t('quickObservation.tapToCapture')}</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => handlePhotoCapture(e)}
                      />
                    </label>
                  )}
                </div>
              </div>
              
              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('quickObservation.whatDidYouObserve')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('quickObservation.descriptionPlaceholder')}
                        className="min-h-[100px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Observation Type */}
              <FormField
                control={form.control}
                name="subtype"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('quickObservation.observationType')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('quickObservation.selectType')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {OBSERVATION_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {t(type.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Risk Rating */}
              <FormField
                control={form.control}
                name="risk_rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('quickObservation.selectRisk')}</FormLabel>
                    <div className="flex gap-2">
                      {RISK_LEVELS.map((level) => (
                        <Button
                          key={level.value}
                          type="button"
                          variant={field.value === level.value ? 'default' : 'outline'}
                          className={cn(
                            "flex-1 transition-all",
                            field.value === level.value && level.color
                          )}
                          onClick={() => field.onChange(level.value)}
                        >
                          {t(`incidents.riskRating.${level.value}`)}
                        </Button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* GPS Location */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <MapPin className={cn(
                  "h-5 w-5",
                  gpsDetectedSite ? "text-green-500" : "text-muted-foreground"
                )} />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {gpsDetectedSite 
                      ? gpsDetectedSite.site.name 
                      : isGettingLocation 
                        ? t('quickObservation.detectingLocation')
                        : t('quickObservation.locationNotDetected')
                    }
                  </p>
                  {gpsDetectedSite && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {t('incidents.withinMeters', { distance: Math.round(gpsDetectedSite.distanceMeters) })}
                    </Badge>
                  )}
                </div>
                {isGettingLocation && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              
              {/* Closed on Spot Toggle */}
              <FormField
                control={form.control}
                name="closed_on_spot"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <FormLabel className="flex items-center gap-2">
                        <CheckCircle2 className={cn(
                          "h-4 w-4",
                          field.value ? "text-green-500" : "text-muted-foreground"
                        )} />
                        {t('quickObservation.closedOnSpot')}
                      </FormLabel>
                      <p className="text-xs text-muted-foreground">
                        {t('quickObservation.closedOnSpotDescription')}
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              {/* Closed on Spot Photos */}
              {closedOnSpot && (
                <div className="space-y-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <label className="text-sm font-medium text-green-700 dark:text-green-400">
                    {t('quickObservation.addCorrectiveActionPhoto')}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {closedOnSpotPhotos.map((photo, index) => (
                      <div key={index} className="relative w-16 h-16 rounded-lg overflow-hidden border">
                        <img
                          src={URL.createObjectURL(photo)}
                          alt={`Evidence ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index, true)}
                          className="absolute top-0.5 end-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {closedOnSpotPhotos.length < 3 && (
                      <label className="w-16 h-16 border-2 border-dashed border-green-500/30 rounded-lg flex items-center justify-center cursor-pointer hover:border-green-500 transition-colors">
                        <Camera className="h-5 w-5 text-green-600" />
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => handlePhotoCapture(e, true)}
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}
              
              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={createIncident.isPending || isUploading}
              >
                {createIncident.isPending || isUploading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin me-2" />
                    {t('quickObservation.submitting')}
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 me-2" />
                    {t('quickObservation.submitObservation')}
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
