import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { MapPin, Loader2, Sparkles, AlertTriangle, CheckCircle2, FileText, Wand2, ListFilter, Info, Navigation } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCreateIncident, type IncidentFormData } from '@/hooks/use-incidents';
import { useTenantSites, useTenantBranches, useTenantDepartments } from '@/hooks/use-org-hierarchy';
import { 
  analyzeIncidentDescription, 
  detectEventType,
  rewriteText,
  summarizeText,
  type AISuggestion 
} from '@/lib/incident-ai-assistant';
import { findNearestSite, type NearestSiteResult } from '@/lib/geo-utils';

const incidentFormSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(120),
  description: z.string().min(20, 'Description must be at least 20 characters').max(5000),
  event_type: z.enum(['observation', 'incident'], { required_error: 'Event type is required' }),
  subtype: z.string().min(1, 'Subtype is required'),
  occurred_at: z.string().min(1, 'Date/time is required'),
  site_id: z.string().optional(),
  branch_id: z.string().optional(),
  department_id: z.string().optional(),
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  immediate_actions: z.string().optional(),
  has_injury: z.boolean().default(false),
  injury_count: z.number().optional(),
  injury_description: z.string().optional(),
  has_damage: z.boolean().default(false),
  damage_description: z.string().optional(),
  damage_cost: z.number().optional(),
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
  
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRewritingTitle, setIsRewritingTitle] = useState(false);
  const [isRewritingDesc, setIsRewritingDesc] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isDetectingType, setIsDetectingType] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [autoDetectedBranch, setAutoDetectedBranch] = useState(false);
  const [autoDetectedSite, setAutoDetectedSite] = useState(false);
  const [gpsDetectedSite, setGpsDetectedSite] = useState<NearestSiteResult | null>(null);
  const [gpsDetectedBranch, setGpsDetectedBranch] = useState(false);
  const [noSiteNearby, setNoSiteNearby] = useState(false);
  
  const createIncident = useCreateIncident();
  const { data: sites = [], isLoading: sitesLoading } = useTenantSites();
  const { data: branches = [], isLoading: branchesLoading } = useTenantBranches();
  const { data: departments = [], isLoading: departmentsLoading } = useTenantDepartments();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(incidentFormSchema),
    defaultValues: {
      title: '',
      description: '',
      event_type: undefined,
      subtype: '',
      occurred_at: new Date().toISOString().slice(0, 16),
      site_id: '',
      branch_id: '',
      department_id: '',
      location: '',
      latitude: undefined,
      longitude: undefined,
      severity: undefined,
      immediate_actions: '',
      has_injury: false,
      injury_count: undefined,
      injury_description: '',
      has_damage: false,
      damage_description: '',
      damage_cost: undefined,
    },
  });

  const hasInjury = form.watch('has_injury');
  const hasDamage = form.watch('has_damage');
  const description = form.watch('description');
  const title = form.watch('title');
  const eventType = form.watch('event_type');
  const subtype = form.watch('subtype');

  // Get subtype options based on event type
  const subtypeOptions = eventType === 'observation' ? OBSERVATION_TYPES : INCIDENT_TYPES;

  // Auto-detect branch and site from user profile
  useEffect(() => {
    if (profile?.assigned_branch_id && !form.getValues('branch_id')) {
      form.setValue('branch_id', profile.assigned_branch_id);
      setAutoDetectedBranch(true);
    }
  }, [profile?.assigned_branch_id, form]);

  useEffect(() => {
    if (profile?.assigned_site_id && !form.getValues('site_id')) {
      form.setValue('site_id', profile.assigned_site_id);
      setAutoDetectedSite(true);
    }
  }, [profile?.assigned_site_id, form]);

  // Generate reference preview
  const getReferencePreview = () => {
    if (!eventType || !subtype) {
      return t('incidents.referenceWillBeAssigned');
    }
    const year = new Date().getFullYear();
    return `INC-${year}-XXXX (${t('incidents.preview')})`;
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      return;
    }
    
    setIsGettingLocation(true);
    setNoSiteNearby(false);
    setGpsDetectedSite(null);
    setGpsDetectedBranch(false);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoordinates({ lat: latitude, lng: longitude });
        form.setValue('latitude', latitude);
        form.setValue('longitude', longitude);
        form.setValue('location', `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        
        // Find nearest site within 500m perimeter
        const nearestResult = findNearestSite(latitude, longitude, sites, 500);
        
        if (nearestResult) {
          // Auto-populate site
          form.setValue('site_id', nearestResult.site.id);
          setGpsDetectedSite(nearestResult);
          setAutoDetectedSite(false); // Clear profile detection flag
          
          // Auto-populate branch from site
          if (nearestResult.site.branch_id) {
            form.setValue('branch_id', nearestResult.site.branch_id);
            setGpsDetectedBranch(true);
            setAutoDetectedBranch(false); // Clear profile detection flag
          }
        } else {
          setNoSiteNearby(true);
        }
        
        setIsGettingLocation(false);
      },
      () => {
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAnalyzeDescription = async () => {
    if (description.length < 20) return;
    
    setIsAnalyzing(true);
    try {
      const suggestion = await analyzeIncidentDescription(description);
      setAiSuggestion(suggestion);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRewriteTitle = async () => {
    if (title.length < 5) return;
    
    setIsRewritingTitle(true);
    try {
      const result = await rewriteText(title, 'title');
      form.setValue('title', result.text);
    } finally {
      setIsRewritingTitle(false);
    }
  };

  const handleRewriteDescription = async () => {
    if (description.length < 20) return;
    
    setIsRewritingDesc(true);
    try {
      const result = await rewriteText(description, 'description');
      form.setValue('description', result.text);
    } finally {
      setIsRewritingDesc(false);
    }
  };

  const handleSummarizeDescription = async () => {
    if (description.length < 50) return;
    
    setIsSummarizing(true);
    try {
      const result = await summarizeText(description);
      form.setValue('description', result.text);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleDetectType = async () => {
    if (description.length < 20) return;
    
    setIsDetectingType(true);
    try {
      const result = await detectEventType(description);
      if (result.eventType) {
        form.setValue('event_type', result.eventType);
        if (result.subtype) {
          form.setValue('subtype', result.subtype);
        }
      }
    } finally {
      setIsDetectingType(false);
    }
  };

  const handleApplySuggestions = () => {
    if (!aiSuggestion) return;
    form.setValue('severity', aiSuggestion.suggestedSeverity);
    form.setValue('description', aiSuggestion.refinedDescription);
    if (aiSuggestion.suggestedEventType) {
      form.setValue('event_type', aiSuggestion.suggestedEventType);
    }
    if (aiSuggestion.suggestedSubtype) {
      form.setValue('subtype', aiSuggestion.suggestedSubtype);
    }
    setAiSuggestion(null);
  };

  const onSubmit = (values: FormValues) => {
    const formData: IncidentFormData = {
      title: values.title,
      description: values.description,
      event_type: values.event_type,
      subtype: values.subtype,
      occurred_at: values.occurred_at,
      location: values.location,
      department: values.department_id, // Keep for backward compatibility
      severity: values.severity,
      immediate_actions: values.immediate_actions,
      has_injury: values.has_injury,
      injury_details: values.has_injury ? {
        count: values.injury_count,
        description: values.injury_description,
      } : undefined,
      has_damage: values.has_damage,
      damage_details: values.has_damage ? {
        description: values.damage_description,
        estimated_cost: values.damage_cost,
      } : undefined,
      // New fields
      site_id: values.site_id || undefined,
      branch_id: values.branch_id || undefined,
      department_id: values.department_id || undefined,
      latitude: values.latitude,
      longitude: values.longitude,
    };

    createIncident.mutate(formData, {
      onSuccess: () => {
        navigate('/incidents');
      },
    });
  };

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="container max-w-4xl py-6 space-y-6" dir={direction}>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t('incidents.reportIncident')}</h1>
        <p className="text-muted-foreground">{t('incidents.reportDescription')}</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Reference Number Preview */}
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{t('incidents.referenceNumber')}</p>
                  <p className="text-lg font-mono text-muted-foreground">{getReferencePreview()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t('incidents.basicInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Title with AI Rewrite */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('incidents.title')}</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input 
                          placeholder={t('incidents.titlePlaceholder')} 
                          maxLength={120}
                          {...field} 
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleRewriteTitle}
                        disabled={isRewritingTitle || field.value.length < 5}
                        title={t('incidents.rewriteWithAI')}
                      >
                        {isRewritingTitle ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Wand2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <FormDescription>{field.value.length}/120</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Event Type and Subtype */}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="event_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('incidents.eventType')}</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue('subtype', ''); // Reset subtype when event type changes
                        }} 
                        value={field.value} 
                        dir={direction}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('incidents.selectEventType')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {EVENT_CATEGORIES.map((type) => (
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

                <FormField
                  control={form.control}
                  name="subtype"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {eventType === 'observation' 
                          ? t('incidents.observationType') 
                          : t('incidents.incidentType')}
                      </FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value} 
                        dir={direction}
                        disabled={!eventType}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('common.select')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {subtypeOptions.map((type) => (
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
              </div>

              {/* Date/Time */}
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

              {/* Site with GPS Detection */}
              <FormField
                control={form.control}
                name="site_id"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>{t('incidents.site')}</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleGetLocation}
                        disabled={isGettingLocation}
                        className="gap-2"
                      >
                        {isGettingLocation ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Navigation className="h-4 w-4" />
                        )}
                        {t('incidents.detectGPS')}
                      </Button>
                    </div>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        setAutoDetectedSite(false);
                        setGpsDetectedSite(null);
                      }} 
                      value={field.value} 
                      dir={direction}
                      disabled={sitesLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={sitesLoading ? t('common.loading') : t('incidents.selectSite')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sites.map((site) => (
                          <SelectItem key={site.id} value={site.id}>
                            {site.name}
                            {site.branch_name && ` (${site.branch_name})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {/* GPS Detection Indicators */}
                    {gpsDetectedSite && field.value && (
                      <div className="space-y-1">
                        <FormDescription className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-3 w-3" />
                          {t('incidents.gpsDetectedSite')} — {t('incidents.withinMeters', { distance: gpsDetectedSite.distanceMeters })}
                        </FormDescription>
                        {coordinates && (
                          <FormDescription className="flex items-center gap-1 text-muted-foreground font-mono text-xs">
                            <MapPin className="h-3 w-3" />
                            {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                          </FormDescription>
                        )}
                      </div>
                    )}
                    
                    {autoDetectedSite && !gpsDetectedSite && field.value && (
                      <FormDescription className="flex items-center gap-1 text-blue-600">
                        <Info className="h-3 w-3" />
                        {t('incidents.autoDetectedFromProfile')}
                      </FormDescription>
                    )}
                    
                    {noSiteNearby && coordinates && (
                      <div className="space-y-1">
                        <FormDescription className="flex items-center gap-1 text-amber-600">
                          <AlertTriangle className="h-3 w-3" />
                          {t('incidents.noSiteNearby')}
                        </FormDescription>
                        <FormDescription className="flex items-center gap-1 text-muted-foreground font-mono text-xs">
                          <MapPin className="h-3 w-3" />
                          {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                        </FormDescription>
                      </div>
                    )}
                    
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Branch */}
              <FormField
                control={form.control}
                name="branch_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('incidents.branch')}</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        setAutoDetectedBranch(false);
                        setGpsDetectedBranch(false);
                      }} 
                      value={field.value} 
                      dir={direction}
                      disabled={branchesLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={branchesLoading ? t('common.loading') : t('incidents.selectBranch')} />
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
                    {gpsDetectedBranch && field.value && (
                      <FormDescription className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-3 w-3" />
                        {t('incidents.gpsDetectedFromSite')}
                      </FormDescription>
                    )}
                    {autoDetectedBranch && !gpsDetectedBranch && field.value && (
                      <FormDescription className="flex items-center gap-1 text-blue-600">
                        <Info className="h-3 w-3" />
                        {t('incidents.autoDetectedFromProfile')}
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Additional Location Details */}
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('incidents.locationDetails')}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={t('incidents.locationDetailsPlaceholder')} 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      {t('incidents.locationDetailsDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Responsible Department */}
              <FormField
                control={form.control}
                name="department_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('incidents.responsibleDepartment')}</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value} 
                      dir={direction}
                      disabled={departmentsLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={departmentsLoading ? t('common.loading') : t('incidents.selectDepartment')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                            {dept.division_name && ` (${dept.division_name})`}
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

          {/* Description with AI Assistant */}
          <Card>
            <CardHeader>
              <CardTitle>{t('incidents.description')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder={t('incidents.descriptionPlaceholder')}
                        className="min-h-[150px] resize-y"
                        {...field}
                      />
                    </FormControl>
                    <div className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
                      <span>{field.value.length} / 5000</span>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRewriteDescription}
                          disabled={isRewritingDesc || field.value.length < 20}
                          className="gap-1"
                        >
                          {isRewritingDesc ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                          {t('incidents.rewriteWithAI')}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleSummarizeDescription}
                          disabled={isSummarizing || field.value.length < 50}
                          className="gap-1"
                        >
                          {isSummarizing ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                          {t('incidents.summarizeWithAI')}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleDetectType}
                          disabled={isDetectingType || field.value.length < 20}
                          className="gap-1"
                        >
                          {isDetectingType ? <Loader2 className="h-3 w-3 animate-spin" /> : <ListFilter className="h-3 w-3" />}
                          {t('incidents.detectType')}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleAnalyzeDescription}
                          disabled={isAnalyzing || field.value.length < 20}
                          className="gap-1"
                        >
                          {isAnalyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                          {t('incidents.suggestSeverity')}
                        </Button>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* AI Suggestion Panel */}
              {aiSuggestion && (
                <div className="rounded-lg border bg-muted/50 p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <span className="font-medium">{t('incidents.aiAssistant')}</span>
                    <Badge variant="outline" className="ms-auto">
                      {t('incidents.confidence')}: {Math.round(aiSuggestion.confidence * 100)}%
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{t('incidents.suggestedSeverity')}:</span>
                      <Badge variant={getSeverityBadgeVariant(aiSuggestion.suggestedSeverity)}>
                        {t(`incidents.severityLevels.${aiSuggestion.suggestedSeverity}`)}
                      </Badge>
                    </div>
                    
                    {aiSuggestion.suggestedEventType && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{t('incidents.suggestedType')}:</span>
                        <Badge variant="secondary">
                          {t(`incidents.eventCategories.${aiSuggestion.suggestedEventType}`)}
                          {aiSuggestion.suggestedSubtype && ` → ${aiSuggestion.suggestedSubtype}`}
                        </Badge>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-1">
                      {aiSuggestion.keyRisks.map((risk, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {risk}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleApplySuggestions}
                    className="w-full gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {t('incidents.applyAiSuggestions')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Severity & Actions */}
          <Card>
            <CardHeader>
              <CardTitle>{t('incidents.severity')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('incidents.severity')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} dir={direction}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('common.select')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SEVERITY_LEVELS.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            <div className="flex items-center gap-2">
                              <div className={`h-2 w-2 rounded-full ${level.color}`} />
                              {t(level.labelKey)}
                            </div>
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
                name="immediate_actions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('incidents.immediateActions')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('incidents.immediateActionsPlaceholder')}
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Injury Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                {t('incidents.injuryDetails')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="has_injury"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">{t('incidents.hasInjury')}</FormLabel>
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

              {hasInjury && (
                <div className="space-y-4 ps-4 border-s-2 border-yellow-500">
                  <FormField
                    control={form.control}
                    name="injury_count"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('incidents.injuryCount')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            {...field}
                            onChange={(e) => field.onChange(e.target.valueAsNumber)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="injury_description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('incidents.injuryDescription')}</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Damage Details */}
          <Card>
            <CardHeader>
              <CardTitle>{t('incidents.damageDetails')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="has_damage"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">{t('incidents.hasDamage')}</FormLabel>
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

              {hasDamage && (
                <div className="space-y-4 ps-4 border-s-2 border-orange-500">
                  <FormField
                    control={form.control}
                    name="damage_description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('incidents.damageDescription')}</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="damage_cost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('incidents.estimatedCost')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            {...field}
                            onChange={(e) => field.onChange(e.target.valueAsNumber)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/incidents')}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={createIncident.isPending}
              className="min-w-[150px]"
            >
              {createIncident.isPending ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  {t('common.submitting')}
                </>
              ) : (
                t('incidents.submitIncident')
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
