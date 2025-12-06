import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import {
  Camera,
  Video,
  Upload,
  Loader2,
  Sparkles,
  MapPin,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Navigation,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useCreateIncident, type IncidentFormData } from '@/hooks/use-incidents';
import { useTenantSites, useTenantBranches, useTenantDepartments } from '@/hooks/use-org-hierarchy';
import { useIncidentMedia, type MediaAttachment } from '@/hooks/use-incident-media';
import { analyzeIncidentImage, type AIVisionResult } from '@/lib/ai-vision-mock';
import { findNearestSite, type NearestSiteResult } from '@/lib/geo-utils';

// Form schema for the 3-tab stepper
const incidentFormSchema = z.object({
  // Tab 1: Capture & AI
  title: z.string().min(5, 'Title must be at least 5 characters').max(120),
  description: z.string().min(20, 'Description must be at least 20 characters').max(5000),

  // Tab 2: Categorize
  event_type: z.enum(['observation', 'incident'], { required_error: 'Event type is required' }),
  subtype: z.string().min(1, 'Subtype is required'),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  department_id: z.string().optional(),

  // Tab 3: Location & Submit
  site_id: z.string().optional(),
  branch_id: z.string().optional(),
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  occurred_at: z.string().min(1, 'Date/time is required'),
});

type FormValues = z.infer<typeof incidentFormSchema>;

const EVENT_CATEGORIES = [
  { value: 'observation', labelKey: 'incidents.eventCategories.observation' },
  { value: 'incident', labelKey: 'incidents.eventCategories.incident' },
];

const OBSERVATION_TYPES = [
  { value: 'unsafe_act', labelKey: 'incidents.observationTypes.unsafeAct' },
  { value: 'unsafe_condition', labelKey: 'incidents.observationTypes.unsafeCondition' },
];

const INCIDENT_TYPES = [
  { value: 'near_miss', labelKey: 'incidents.incidentTypes.nearMiss' },
  { value: 'property_damage', labelKey: 'incidents.incidentTypes.propertyDamage' },
  { value: 'environmental', labelKey: 'incidents.incidentTypes.environmental' },
  { value: 'first_aid', labelKey: 'incidents.incidentTypes.firstAid' },
  { value: 'medical_treatment', labelKey: 'incidents.incidentTypes.medicalTreatment' },
  { value: 'fire', labelKey: 'incidents.incidentTypes.fire' },
  { value: 'security', labelKey: 'incidents.incidentTypes.security' },
];

const SEVERITY_LEVELS = [
  { value: 'low', labelKey: 'incidents.severityLevels.low', color: 'bg-green-500' },
  { value: 'medium', labelKey: 'incidents.severityLevels.medium', color: 'bg-yellow-500' },
  { value: 'high', labelKey: 'incidents.severityLevels.high', color: 'bg-orange-500' },
  { value: 'critical', labelKey: 'incidents.severityLevels.critical', color: 'bg-red-500' },
];

export default function IncidentReport() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const direction = i18n.dir();
  const { profile } = useAuth();

  // Tab navigation
  const [activeTab, setActiveTab] = useState('capture');
  const [tab1Valid, setTab1Valid] = useState(false);
  const [tab2Valid, setTab2Valid] = useState(false);

  // AI Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIVisionResult | null>(null);

  // GPS state
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [gpsDetectedSite, setGpsDetectedSite] = useState<NearestSiteResult | null>(null);

  // Hooks
  const createIncident = useCreateIncident();
  const { data: sites = [] } = useTenantSites();
  const { data: branches = [] } = useTenantBranches();
  const { data: departments = [] } = useTenantDepartments();
  const {
    mediaFiles,
    addFiles,
    removeFile,
    uploadAllFiles,
    isUploading,
    canAddImage,
    canAddVideo,
    hasMedia,
  } = useIncidentMedia();

  const form = useForm<FormValues>({
    resolver: zodResolver(incidentFormSchema),
    defaultValues: {
      title: '',
      description: '',
      event_type: undefined,
      subtype: '',
      severity: undefined,
      department_id: '',
      site_id: '',
      branch_id: '',
      location: '',
      latitude: undefined,
      longitude: undefined,
      occurred_at: new Date().toISOString().slice(0, 16),
    },
  });

  const title = form.watch('title');
  const description = form.watch('description');
  const eventType = form.watch('event_type');
  const subtype = form.watch('subtype');
  const severity = form.watch('severity');

  // Validate tabs
  useEffect(() => {
    setTab1Valid(title.length >= 5 && description.length >= 20);
  }, [title, description]);

  useEffect(() => {
    setTab2Valid(!!eventType && !!subtype);
  }, [eventType, subtype]);

  // Get subtype options based on event type
  const subtypeOptions = eventType === 'observation' ? OBSERVATION_TYPES : INCIDENT_TYPES;

  // Handle file drop/select
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addFiles(e.target.files);
      }
    },
    [addFiles]
  );

  // Trigger AI analysis when media is added
  const handleAnalyzeMedia = useCallback(async () => {
    if (mediaFiles.length === 0) return;

    const imageFile = mediaFiles.find((f) => f.type === 'image');
    if (!imageFile) return;

    setIsAnalyzing(true);
    try {
      const result = await analyzeIncidentImage(imageFile.file);
      setAiResult(result);

      // Auto-fill form fields
      form.setValue('title', result.suggestedTitle);
      form.setValue('description', result.suggestedDescription);
      form.setValue('severity', result.suggestedSeverity);

      // Auto-select event type based on severity
      if (result.suggestedSeverity === 'critical' || result.suggestedSeverity === 'high') {
        form.setValue('event_type', 'incident');
      } else {
        form.setValue('event_type', 'observation');
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [mediaFiles, form]);

  // Auto-analyze when first image is added
  useEffect(() => {
    if (mediaFiles.length === 1 && !aiResult && !isAnalyzing) {
      handleAnalyzeMedia();
    }
  }, [mediaFiles.length, aiResult, isAnalyzing, handleAnalyzeMedia]);

  // Handle GPS detection
  const handleGetLocation = () => {
    if (!navigator.geolocation) return;

    setIsGettingLocation(true);
    setGpsDetectedSite(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        form.setValue('latitude', latitude);
        form.setValue('longitude', longitude);
        form.setValue('location', `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);

        // Find nearest site within 500m
        const nearestResult = findNearestSite(latitude, longitude, sites, 500);

        if (nearestResult) {
          form.setValue('site_id', nearestResult.site.id);
          setGpsDetectedSite(nearestResult);

          if (nearestResult.site.branch_id) {
            form.setValue('branch_id', nearestResult.site.branch_id);
          }
        }

        setIsGettingLocation(false);
      },
      () => {
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Navigate to next tab
  const goToNextTab = async () => {
    if (activeTab === 'capture') {
      const valid = await form.trigger(['title', 'description']);
      if (valid) setActiveTab('categorize');
    } else if (activeTab === 'categorize') {
      const valid = await form.trigger(['event_type', 'subtype']);
      if (valid) setActiveTab('submit');
    }
  };

  // Navigate to previous tab
  const goToPrevTab = () => {
    if (activeTab === 'categorize') setActiveTab('capture');
    else if (activeTab === 'submit') setActiveTab('categorize');
  };

  // Submit form
  const onSubmit = async (values: FormValues) => {
    // First upload media files
    let attachments: MediaAttachment[] = [];

    if (hasMedia) {
      // We'll upload after getting the incident ID, so we generate a temp ID
      const tempId = `temp-${Date.now()}`;
      attachments = await uploadAllFiles(tempId);
    }

    const formData: IncidentFormData = {
      title: values.title,
      description: values.description,
      event_type: values.event_type,
      subtype: values.subtype,
      occurred_at: values.occurred_at,
      severity: values.severity,
      site_id: values.site_id || undefined,
      branch_id: values.branch_id || undefined,
      department_id: values.department_id || undefined,
      latitude: values.latitude,
      longitude: values.longitude,
      location: values.location,
      has_injury: false,
      has_damage: false,
      media_attachments: attachments,
      ai_analysis_result: aiResult || undefined,
    };

    createIncident.mutate(formData, {
      onSuccess: () => {
        navigate('/incidents');
      },
    });
  };

  const getSeverityColor = (sev: string) => {
    return SEVERITY_LEVELS.find((s) => s.value === sev)?.color || 'bg-muted';
  };

  return (
    <div className="container max-w-2xl py-6" dir={direction}>
      <div className="space-y-2 mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t('incidents.reportIncident')}</h1>
        <p className="text-muted-foreground text-sm">{t('incidents.reportDescription')}</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs value={activeTab} onValueChange={setActiveTab} dir={direction}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="capture" className="gap-2">
                <Camera className="h-4 w-4" />
                <span className="hidden sm:inline">{t('incidents.tabCapture')}</span>
              </TabsTrigger>
              <TabsTrigger value="categorize" disabled={!tab1Valid} className="gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="hidden sm:inline">{t('incidents.tabCategorize')}</span>
              </TabsTrigger>
              <TabsTrigger value="submit" disabled={!tab2Valid} className="gap-2">
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">{t('incidents.tabSubmit')}</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Capture & AI Analysis */}
            <TabsContent value="capture" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    {t('incidents.uploadMedia')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Media Upload Area */}
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      id="media-upload"
                    />
                    <label htmlFor="media-upload" className="cursor-pointer">
                      <div className="flex flex-col items-center gap-3">
                        <div className="flex gap-4">
                          <div className="p-3 rounded-full bg-primary/10">
                            <Camera className="h-6 w-6 text-primary" />
                          </div>
                          <div className="p-3 rounded-full bg-primary/10">
                            <Video className="h-6 w-6 text-primary" />
                          </div>
                        </div>
                        <div>
                          <p className="font-medium">{t('incidents.tapToUpload')}</p>
                          <p className="text-sm text-muted-foreground">
                            {t('incidents.maxPhotos')} • {t('incidents.maxVideo')}
                          </p>
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Media Preview Grid */}
                  {mediaFiles.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {mediaFiles.map((media) => (
                        <div key={media.id} className="relative group aspect-square">
                          {media.type === 'image' ? (
                            <img
                              src={media.preview}
                              alt=""
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <video
                              src={media.preview}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => removeFile(media.id)}
                            className="absolute top-1 end-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          {media.type === 'video' && (
                            <Badge className="absolute bottom-1 start-1" variant="secondary">
                              <Video className="h-3 w-3 me-1" />
                              Video
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* AI Analysis Status */}
                  {isAnalyzing && (
                    <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <div>
                        <p className="font-medium flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          {t('incidents.analyzingHazard')}
                        </p>
                        <Progress value={66} className="h-1 mt-2 w-48" />
                      </div>
                    </div>
                  )}

                  {/* AI Result Badge */}
                  {aiResult && !isAnalyzing && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-400">
                        {t('incidents.aiAnalysisComplete')} ({Math.round(aiResult.confidence * 100)}% {t('incidents.confidence')})
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Title & Description - Auto-filled by AI */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    {t('incidents.aiSuggestedDetails')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('incidents.title')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('incidents.titlePlaceholder')}
                            maxLength={120}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>{field.value.length}/120</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('incidents.description')}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t('incidents.descriptionPlaceholder')}
                            className="min-h-[120px] resize-y"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>{field.value.length}/5000</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Next Button */}
              <div className="flex justify-end">
                <Button type="button" onClick={goToNextTab} disabled={!tab1Valid}>
                  {t('incidents.nextStep')}
                  <ChevronRight className="h-4 w-4 ms-2 rtl:rotate-180" />
                </Button>
              </div>
            </TabsContent>

            {/* Tab 2: Categorize & Severity */}
            <TabsContent value="categorize" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('incidents.categorizeIncident')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="event_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('incidents.eventType')}</FormLabel>
                        <Select
                          dir={direction}
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('incidents.selectEventType')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {EVENT_CATEGORIES.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {t(cat.labelKey)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="subtype"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('incidents.subtype')}</FormLabel>
                        <Select
                          dir={direction}
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!eventType}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  eventType === 'observation'
                                    ? t('incidents.observationType')
                                    : t('incidents.incidentType')
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {subtypeOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {t(opt.labelKey)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Severity with AI suggestion badge */}
                  <FormField
                    control={form.control}
                    name="severity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          {t('incidents.severity')}
                          {aiResult && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Sparkles className="h-3 w-3" />
                              {t('incidents.aiSuggested')}
                            </Badge>
                          )}
                        </FormLabel>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {SEVERITY_LEVELS.map((level) => (
                            <button
                              key={level.value}
                              type="button"
                              onClick={() => field.onChange(level.value)}
                              className={`p-3 rounded-lg border-2 transition-all ${
                                field.value === level.value
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:border-primary/50'
                              }`}
                            >
                              <div
                                className={`w-3 h-3 rounded-full ${level.color} mx-auto mb-2`}
                              />
                              <span className="text-sm font-medium">{t(level.labelKey)}</span>
                            </button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="department_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('incidents.responsibleDepartment')}</FormLabel>
                        <Select
                          dir={direction}
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('incidents.selectDepartment')} />
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
                </CardContent>
              </Card>

              {/* Navigation Buttons */}
              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={goToPrevTab}>
                  <ChevronLeft className="h-4 w-4 me-2 rtl:rotate-180" />
                  {t('incidents.previousStep')}
                </Button>
                <Button type="button" onClick={goToNextTab} disabled={!tab2Valid}>
                  {t('incidents.nextStep')}
                  <ChevronRight className="h-4 w-4 ms-2 rtl:rotate-180" />
                </Button>
              </div>
            </TabsContent>

            {/* Tab 3: Location & Submit */}
            <TabsContent value="submit" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    {t('incidents.locationDetails')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* GPS Detection */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGetLocation}
                    disabled={isGettingLocation}
                    className="w-full"
                  >
                    {isGettingLocation ? (
                      <Loader2 className="h-4 w-4 animate-spin me-2" />
                    ) : (
                      <Navigation className="h-4 w-4 me-2" />
                    )}
                    {t('incidents.detectGPS')}
                  </Button>

                  {/* GPS Result */}
                  {gpsDetectedSite && (
                    <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                      <p className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        {gpsDetectedSite.site.name}
                        <Badge variant="outline" className="text-xs">
                          {t('incidents.withinMeters', { distance: gpsDetectedSite.distanceMeters })}
                        </Badge>
                      </p>
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="site_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('incidents.site')}</FormLabel>
                        <Select
                          dir={direction}
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('incidents.selectSite')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {sites.map((site) => (
                              <SelectItem key={site.id} value={site.id}>
                                {site.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="branch_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('incidents.branch')}</FormLabel>
                        <Select
                          dir={direction}
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('incidents.selectBranch')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {branches.map((branch) => (
                              <SelectItem key={branch.id} value={branch.id}>
                                {branch.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="occurred_at"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('incidents.occurredAt')}</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Review Summary */}
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {t('incidents.reviewSummary')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('incidents.title')}</span>
                    <span className="text-sm font-medium truncate max-w-[200px]">{title}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('incidents.severity')}</span>
                    {severity && (
                      <Badge className={`${getSeverityColor(severity)} text-white`}>
                        {t(`incidents.severityLevels.${severity}`)}
                      </Badge>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('incidents.mediaAttached')}</span>
                    <span className="text-sm font-medium">
                      {mediaFiles.length} {t('common.files')}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Navigation & Submit */}
              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={goToPrevTab}>
                  <ChevronLeft className="h-4 w-4 me-2 rtl:rotate-180" />
                  {t('incidents.previousStep')}
                </Button>
                <Button
                  type="submit"
                  disabled={createIncident.isPending || isUploading}
                >
                  {(createIncident.isPending || isUploading) && (
                    <Loader2 className="h-4 w-4 animate-spin me-2" />
                  )}
                  {t('incidents.submitIncident')}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </form>
      </Form>
    </div>
  );
}
