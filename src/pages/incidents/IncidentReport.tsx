import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { MapPin, Loader2, Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCreateIncident, type IncidentFormData } from '@/hooks/use-incidents';
import { analyzeIncidentDescription, type AISuggestion } from '@/lib/incident-ai-assistant';

const incidentFormSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  description: z.string().min(20, 'Description must be at least 20 characters').max(5000),
  event_type: z.string().min(1, 'Event type is required'),
  subtype: z.string().optional(),
  occurred_at: z.string().min(1, 'Date/time is required'),
  location: z.string().optional(),
  department: z.string().optional(),
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

const EVENT_TYPES = [
  { value: 'injury', labelKey: 'incidents.eventTypes.injury' },
  { value: 'near_miss', labelKey: 'incidents.eventTypes.nearMiss' },
  { value: 'property_damage', labelKey: 'incidents.eventTypes.propertyDamage' },
  { value: 'environmental', labelKey: 'incidents.eventTypes.environmental' },
  { value: 'fire', labelKey: 'incidents.eventTypes.fire' },
  { value: 'security', labelKey: 'incidents.eventTypes.security' },
  { value: 'other', labelKey: 'incidents.eventTypes.other' },
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
  
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  
  const createIncident = useCreateIncident();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(incidentFormSchema),
    defaultValues: {
      title: '',
      description: '',
      event_type: '',
      subtype: '',
      occurred_at: new Date().toISOString().slice(0, 16),
      location: '',
      department: '',
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

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      return;
    }
    
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoordinates({ lat: latitude, lng: longitude });
        form.setValue('location', `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
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

  const handleApplySuggestions = () => {
    if (!aiSuggestion) return;
    form.setValue('severity', aiSuggestion.suggestedSeverity);
    form.setValue('description', aiSuggestion.refinedDescription);
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
      department: values.department,
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
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t('incidents.basicInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('incidents.title')}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={t('incidents.titlePlaceholder')} 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="event_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('incidents.eventType')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} dir={direction}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('incidents.selectEventType')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {EVENT_TYPES.map((type) => (
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
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('incidents.location')}</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input 
                            placeholder={t('incidents.locationPlaceholder')} 
                            {...field} 
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleGetLocation}
                          disabled={isGettingLocation}
                        >
                          {isGettingLocation ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MapPin className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {coordinates && (
                        <FormDescription>
                          GPS: {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('incidents.department')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{field.value.length} / 5000</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleAnalyzeDescription}
                        disabled={isAnalyzing || field.value.length < 20}
                        className="gap-2"
                      >
                        {isAnalyzing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        {isAnalyzing ? t('incidents.analyzing') : t('incidents.analyzeDescription')}
                      </Button>
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
