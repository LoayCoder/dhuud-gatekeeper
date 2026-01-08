import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Camera, MapPin, Loader2, CheckCircle2, AlertTriangle, Send, X, Trophy, User, Building2, HardHat, Sparkles, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { useCreateIncident, type IncidentFormData, type ClosedOnSpotPayload } from '@/hooks/use-incidents';
import { useTenantSites, useTenantDepartments } from '@/hooks/use-org-hierarchy';
import { useTenantUsers } from '@/hooks/use-department-users';
import { useContractorWorkers } from '@/hooks/contractor-management/use-contractor-workers';
import { useContractorCompanies } from '@/hooks/contractor-management/use-contractor-companies';
import { useActiveEvent } from '@/hooks/use-special-events';
import { findNearestSite, type NearestSiteResult } from '@/lib/geo-utils';
import { uploadFilesParallel } from '@/lib/upload-utils';
import { UploadProgressOverlay } from '@/components/ui/upload-progress';
import { HSSE_SEVERITY_LEVELS, canCloseOnSpot, type SeverityLevelV2 } from '@/lib/hsse-severity-levels';
import { useObservationAIValidator } from '@/hooks/use-observation-ai-validator';
import { AIAnalysisPanel } from '@/components/observations/AIAnalysisPanel';
import { useAITags } from '@/hooks/use-ai-tags';
import { AITagsSelector } from '@/components/ai/AITagsSelector';
import { Tags } from 'lucide-react';

const OBSERVATION_TYPES = [
  { value: 'unsafe_act', labelKey: 'incidents.observationTypes.unsafeAct', isPositive: false },
  { value: 'unsafe_condition', labelKey: 'incidents.observationTypes.unsafeCondition', isPositive: false },
  { value: 'safe_act', labelKey: 'incidents.observationTypes.safeAct', isPositive: true },
  { value: 'safe_condition', labelKey: 'incidents.observationTypes.safeCondition', isPositive: true },
];

const RECOGNITION_TYPES = [
  { value: 'individual', labelKey: 'positiveObservation.individual' },
  { value: 'department', labelKey: 'positiveObservation.department' },
  { value: 'contractor', labelKey: 'positiveObservation.contractor' },
];

// Use the 5-level severity system
const SEVERITY_OPTIONS = HSSE_SEVERITY_LEVELS.map(level => ({
  value: level.value,
  color: `${level.bgColor} hover:opacity-90`,
  textColor: level.bgColor.replace('bg-', 'text-'),
}));

const createQuickObservationSchema = (t: (key: string) => string) => z.object({
  description: z.string().min(1, t('incidents.validation.descriptionRequired')).max(2000),
  subtype: z.string().min(1, t('incidents.validation.subtypeRequired')),
  severity_v2: z.enum(['level_1', 'level_2', 'level_3', 'level_4', 'level_5'] as const),
  site_id: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  closed_on_spot: z.boolean().default(false),
  // Recognition fields for positive observations
  recognition_type: z.enum(['individual', 'department', 'contractor']).optional(),
  recognized_user_id: z.string().optional(),
  recognized_department_id: z.string().optional(),
  recognized_contractor_worker_id: z.string().optional(),
  // Report against contractor fields for negative observations
  is_against_contractor: z.boolean().default(false),
  related_contractor_company_id: z.string().optional(),
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
  const [gpsError, setGpsError] = useState<'none' | 'not_supported' | 'permission_denied' | 'unavailable' | 'timeout' | 'no_nearby_site'>('none');
  const [photos, setPhotos] = useState<File[]>([]);
  const [closedOnSpotPhotos, setClosedOnSpotPhotos] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // AI Validation hook
  const aiValidator = useObservationAIValidator();
  
  // AI Tags for observations
  const { tags: availableObservationTags = [] } = useAITags('observation');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const createIncident = useCreateIncident();
  const { data: sites = [] } = useTenantSites();
  const { data: departments = [] } = useTenantDepartments();
  const { data: tenantUsers = [] } = useTenantUsers();
  const { data: contractorWorkers = [] } = useContractorWorkers();
  const { data: contractorCompanies = [] } = useContractorCompanies();
  const { data: activeEvent } = useActiveEvent();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: '',
      subtype: '',
      severity_v2: 'level_2',
      site_id: profile?.assigned_site_id || '',
      latitude: undefined,
      longitude: undefined,
      closed_on_spot: false,
      recognition_type: undefined,
      recognized_user_id: undefined,
      recognized_department_id: undefined,
      recognized_contractor_worker_id: undefined,
      is_against_contractor: false,
      related_contractor_company_id: undefined,
    },
  });
  
  const closedOnSpot = form.watch('closed_on_spot');
  const selectedSeverity = form.watch('severity_v2');
  const selectedSubtype = form.watch('subtype');
  const recognitionType = form.watch('recognition_type');
  const isAgainstContractor = form.watch('is_against_contractor');
  
  // Check if close-on-spot is allowed for this severity level
  const allowCloseOnSpot = canCloseOnSpot(selectedSeverity as SeverityLevelV2);
  
  // Check if this is a positive observation
  const isPositiveObservation = useMemo(() => {
    const type = OBSERVATION_TYPES.find(t => t.value === selectedSubtype);
    return type?.isPositive ?? false;
  }, [selectedSubtype]);
  
  // Reset recognition fields when switching between positive/negative observations
  useEffect(() => {
    if (!isPositiveObservation) {
      form.setValue('recognition_type', undefined);
      form.setValue('recognized_user_id', undefined);
      form.setValue('recognized_department_id', undefined);
      form.setValue('recognized_contractor_worker_id', undefined);
    }
  }, [isPositiveObservation, form]);
  
  // Auto-detect GPS on mount
  useEffect(() => {
    handleGetLocation();
  }, []);
  
  const handleGetLocation = () => {
    // Reset error state
    setGpsError('none');
    
    if (!navigator.geolocation) {
      setGpsError('not_supported');
      return;
    }
    
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
          setGpsError('none');
        } else {
          // GPS works but no site found nearby
          setGpsError('no_nearby_site');
        }
        
        setIsGettingLocation(false);
      },
      (error) => {
        setIsGettingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGpsError('permission_denied');
            break;
          case error.POSITION_UNAVAILABLE:
            setGpsError('unavailable');
            break;
          case error.TIMEOUT:
            setGpsError('timeout');
            break;
          default:
            setGpsError('unavailable');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };
  
  // Handle translation confirmation - replaces description with translated text
  const handleConfirmTranslation = useCallback(() => {
    const translatedText = aiValidator.confirmTranslation();
    if (translatedText) {
      form.setValue('description', translatedText);
      toast.success(t('observations.ai.descriptionUpdated', 'Description updated with translation'));
    }
  }, [aiValidator, form, t]);

  // Handle analysis confirmation - auto-selects type and severity
  const handleConfirmAnalysis = useCallback(() => {
    if (aiValidator.analysisResult) {
      const result = aiValidator.analysisResult;
      
      // Auto-set subtype
      if (['unsafe_act', 'unsafe_condition', 'safe_act', 'safe_condition'].includes(result.subtype)) {
        form.setValue('subtype', result.subtype);
      }
      
      // Auto-set severity
      if (result.severity.startsWith('level_')) {
        form.setValue('severity_v2', result.severity as SeverityLevelV2);
      }
      
      aiValidator.confirmAnalysis();
      toast.success(t('quickObservation.analysisComplete'));
    }
  }, [aiValidator, form, t]);

  // AI Analysis with validation gating - no longer auto-applies on validated
  const handleAnalyzeDescription = useCallback(async () => {
    const description = form.getValues('description');
    if (description.length < 10) return;
    
    await aiValidator.analyzeDescription(description);
  }, [form, aiValidator]);
  
  // Remove automatic application - user must click "Confirm Analysis"
  // (removed useEffect that auto-applied on validated state)
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
      severity: values.severity_v2 as SeverityLevelV2,
      // Map severity_v2 to risk_rating for backward compatibility
      risk_rating: values.severity_v2 === 'level_1' ? 'low' : values.severity_v2 === 'level_2' ? 'medium' : 'high',
      site_id: values.site_id || undefined,
      latitude: values.latitude,
      longitude: values.longitude,
      closed_on_spot_data: closedOnSpotData,
      has_injury: false,
      has_damage: false,
      // Recognition fields for positive observations
      recognition_type: values.recognition_type,
      recognized_user_id: values.recognition_type === 'individual' ? values.recognized_user_id : undefined,
      recognized_contractor_worker_id: values.recognition_type === 'contractor' ? values.recognized_contractor_worker_id : undefined,
      // Store department_id for department recognition or reporter's department
      department_id: values.recognition_type === 'department' ? values.recognized_department_id : profile?.assigned_department_id,
      // Link to active special event
      special_event_id: activeEvent?.id || undefined,
      // Report against contractor for negative observations
      related_contractor_company_id: values.is_against_contractor ? values.related_contractor_company_id : undefined,
      // AI Tags - linked to contractor or department
      tags: selectedTags.length > 0 ? selectedTags : undefined,
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
        
        {/* Event Mode Active Banner */}
        {activeEvent && (
          <div className="mx-4 mb-4 rounded-lg border-2 border-info bg-info/5 p-3">
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 rounded-full bg-info p-1.5">
                <Trophy className="h-4 w-4 text-info-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">
                  {t('specialEvents.eventBannerTitle')}
                </p>
                <p className="text-sm font-bold text-info truncate">
                  {activeEvent.name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('specialEvents.eventBannerNote')}
                </p>
              </div>
            </div>
          </div>
        )}
        
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
                    <div className="flex items-center justify-between">
                      <FormLabel>{t('quickObservation.whatDidYouObserve')}</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAnalyzeDescription}
                        disabled={aiValidator.validationState === 'analyzing' || field.value.length < 10}
                        className="gap-1.5 h-7 text-xs"
                      >
                        {aiValidator.validationState === 'analyzing' ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        {aiValidator.validationState === 'analyzing' ? t('quickObservation.analyzing') : t('quickObservation.aiAnalyze')}
                      </Button>
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder={t('quickObservation.descriptionPlaceholder')}
                        className="min-h-[100px] resize-none"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          // Reset AI validation when text changes significantly
                          if (aiValidator.validationState !== 'idle') {
                            aiValidator.reset();
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* AI Analysis Panel */}
              <AIAnalysisPanel
                validationState={aiValidator.validationState}
                analysisResult={aiValidator.analysisResult}
                processingTime={aiValidator.processingTime}
                blockingReason={aiValidator.blockingReason}
                onConfirmTranslation={handleConfirmTranslation}
                onConfirmAnalysis={handleConfirmAnalysis}
                availableTags={availableObservationTags}
                selectedTags={selectedTags}
                suggestedTags={aiValidator.analysisResult?.suggestedTags}
                onTagsChange={setSelectedTags}
              />

              {/* Tags Section - Always visible for manual tag management */}
              {availableObservationTags.length > 0 && (
                <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Tags className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{t('admin.ai.observationTags', 'Observation Tags')}</span>
                  </div>
                  <AITagsSelector
                    availableTags={availableObservationTags}
                    selectedTags={selectedTags}
                    suggestedTags={aiValidator.analysisResult?.suggestedTags}
                    onTagsChange={setSelectedTags}
                  />
                </div>
              )}
              
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
              
              {/* Report Against Contractor Toggle - Only for Negative Observations */}
              {!isPositiveObservation && selectedSubtype && (
                <div className="space-y-4 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-amber-600" />
                      <span className="font-medium">{t('quickObservation.reportAgainstContractor')}</span>
                    </div>
                    <Switch
                      checked={isAgainstContractor}
                      onCheckedChange={(checked) => {
                        form.setValue('is_against_contractor', checked);
                        if (!checked) {
                          form.setValue('related_contractor_company_id', undefined);
                        }
                      }}
                    />
                  </div>
                  
                  {isAgainstContractor && (
                    <FormField
                      control={form.control}
                      name="related_contractor_company_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('quickObservation.contractorCompany')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('quickObservation.selectContractorCompany')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {contractorCompanies.filter(c => c.status === 'active').map((company) => (
                                <SelectItem key={company.id} value={company.id}>
                                  {i18n.language === 'ar' && company.company_name_ar 
                                    ? company.company_name_ar 
                                    : company.company_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              )}
              
              {/* Recognition Section - Only for Positive Observations */}
              {isPositiveObservation && (
                <div className="space-y-4 p-4 bg-chart-3/10 border border-chart-3/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-chart-3" />
                    <span className="font-medium text-chart-3">{t('positiveObservation.recognitionType')}</span>
                  </div>
                  
                  {/* Recognition Type */}
                  <FormField
                    control={form.control}
                    name="recognition_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-col gap-2"
                          >
                            {RECOGNITION_TYPES.map((type) => (
                              <div
                                key={type.value}
                                className={cn(
                                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                  field.value === type.value
                                    ? "border-chart-3 bg-chart-3/10"
                                    : "border-border hover:border-chart-3/50"
                                )}
                                onClick={() => field.onChange(type.value)}
                              >
                                <RadioGroupItem value={type.value} id={type.value} />
                                <div className="flex items-center gap-2">
                                  {type.value === 'individual' && <User className="h-4 w-4" />}
                                  {type.value === 'department' && <Building2 className="h-4 w-4" />}
                                  {type.value === 'contractor' && <HardHat className="h-4 w-4" />}
                                  <label htmlFor={type.value} className="text-sm font-medium cursor-pointer">
                                    {t(type.labelKey)}
                                  </label>
                                </div>
                              </div>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Individual Employee Selector */}
                  {recognitionType === 'individual' && (
                    <FormField
                      control={form.control}
                      name="recognized_user_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('positiveObservation.selectEmployee')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('positiveObservation.searchEmployee')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {tenantUsers.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.full_name || user.employee_id || user.id}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  {/* Department Selector */}
                  {recognitionType === 'department' && (
                    <FormField
                      control={form.control}
                      name="recognized_department_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('positiveObservation.selectDepartment')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('positiveObservation.selectDepartment')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {departments.map((dept) => (
                                <SelectItem key={dept.id} value={dept.id}>
                                  {dept.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  {/* Contractor Worker Selector */}
                  {recognitionType === 'contractor' && (
                    <FormField
                      control={form.control}
                      name="recognized_contractor_worker_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('positiveObservation.selectContractor')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('positiveObservation.searchContractor')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {contractorWorkers.map((worker) => (
                                <SelectItem key={worker.id} value={worker.id}>
                                  {worker.full_name} - {worker.national_id}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              )}
              
              {/* Severity Level (5-Level System) */}
              <FormField
                control={form.control}
                name="severity_v2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('severity.ratingLabel')}</FormLabel>
                    <div className="grid grid-cols-1 gap-2">
                      {SEVERITY_OPTIONS.map((level) => (
                        <Button
                          key={level.value}
                          type="button"
                          variant={field.value === level.value ? 'default' : 'outline'}
                          className={cn(
                            "w-full text-start justify-start text-xs sm:text-sm transition-all",
                            field.value === level.value && level.color
                          )}
                          onClick={() => field.onChange(level.value)}
                        >
                          {t(`severity.${level.value}.label`)}
                        </Button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* GPS Location */}
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center gap-3">
                  <MapPin className={cn(
                    "h-5 w-5 shrink-0",
                    gpsDetectedSite ? "text-green-500" : gpsError !== 'none' ? "text-amber-500" : "text-muted-foreground"
                  )} />
                  <div className="flex-1 min-w-0">
                    {isGettingLocation ? (
                      <p className="text-sm font-medium">{t('quickObservation.detectingLocation')}</p>
                    ) : gpsDetectedSite ? (
                      <>
                        <p className="text-sm font-medium truncate">{gpsDetectedSite.site.name}</p>
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {t('incidents.withinMeters', { distance: Math.round(gpsDetectedSite.distanceMeters) })}
                        </Badge>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium">
                          {gpsError === 'permission_denied' && t('incidents.gpsPermissionDenied')}
                          {gpsError === 'not_supported' && t('incidents.gpsNotSupported')}
                          {gpsError === 'unavailable' && t('incidents.gpsUnavailable')}
                          {gpsError === 'timeout' && t('incidents.gpsTimeout')}
                          {gpsError === 'no_nearby_site' && t('quickObservation.noSiteNearby')}
                          {gpsError === 'none' && t('quickObservation.locationNotDetected')}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t('quickObservation.canSubmitWithoutLocation')}
                        </p>
                      </>
                    )}
                  </div>
                  {isGettingLocation ? (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  ) : !gpsDetectedSite && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={handleGetLocation}
                      className="shrink-0 gap-1.5"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{t('common.retry')}</span>
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Closed on Spot Toggle - Only for L1-L2 */}
              {allowCloseOnSpot && (
                <FormField
                  control={form.control}
                  name="closed_on_spot"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-4 border rounded-lg border-emerald-500/30 bg-emerald-500/5">
                      <div className="space-y-0.5">
                        <FormLabel className="flex items-center gap-2">
                          <CheckCircle2 className={cn(
                            "h-4 w-4",
                            field.value ? "text-emerald-500" : "text-muted-foreground"
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
              )}
              
              {/* Closed on Spot Photos - Only visible when close-on-spot is enabled AND allowed */}
              {allowCloseOnSpot && closedOnSpot && (
                <div className="space-y-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <label className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
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
                      <label className="w-16 h-16 border-2 border-dashed border-emerald-500/30 rounded-lg flex items-center justify-center cursor-pointer hover:border-emerald-500 transition-colors">
                        <Camera className="h-5 w-5 text-emerald-600" />
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
              
              {/* Photo Required Warning */}
              {photos.length === 0 && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  <Camera className="h-4 w-4 shrink-0" />
                  {t('incidents.validation.photoRequired')}
                </div>
              )}
              
              {/* Submit Button - Blocked until AI validation passes */}
              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={createIncident.isPending || isUploading || photos.length === 0 || aiValidator.isBlocked || !aiValidator.canSubmit}
              >
                {createIncident.isPending || isUploading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin me-2" />
                    {t('quickObservation.submitting')}
                  </>
                ) : aiValidator.isBlocked ? (
                  <>
                    <AlertTriangle className="h-5 w-5 me-2" />
                    {t('observations.ai.aiGatedSubmit', 'AI analysis required')}
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
