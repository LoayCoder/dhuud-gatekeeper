import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { MapPin, Loader2, Sparkles, AlertTriangle, CheckCircle2, FileText, Wand2, Info, Navigation, Camera, ChevronRight, ChevronLeft, Check, Trophy, Eye, Siren } from 'lucide-react';
import { QuickObservationCard } from '@/components/incidents/QuickObservationCard';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import MediaUploadSection from '@/components/incidents/MediaUploadSection';
import { ClosedOnSpotSection, ClosedOnSpotConfirmDialog } from '@/components/incidents/ClosedOnSpotSection';
import { AssetSelectionSection, SelectedAsset } from '@/components/incidents/AssetSelectionSection';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCreateIncident, type IncidentFormData, type ClosedOnSpotPayload } from '@/hooks/use-incidents';
import { useTenantSites, useTenantBranches, useTenantDepartments } from '@/hooks/use-org-hierarchy';
import { useLinkAssetToIncident } from '@/hooks/use-incident-assets';
import { 
  analyzeIncidentWithAI,
  type AISuggestion,
  type AIAnalysisResult
} from '@/lib/incident-ai-assistant';
import { useIncidentAI } from '@/hooks/use-incident-ai';
import { useReverseGeocode, type LocationAddress } from '@/hooks/use-reverse-geocode';
import { findNearestSite, type NearestSiteResult } from '@/lib/geo-utils';
import { GPSLocationConfirmCard } from '@/components/incidents/GPSLocationConfirmCard';
import { ActiveEventBanner } from '@/components/incidents/ActiveEventBanner';
import { uploadFilesParallel } from '@/lib/upload-utils';
import { UploadProgressOverlay } from '@/components/ui/upload-progress';
import { HSSE_EVENT_TYPES, getSubtypesForEventType } from '@/lib/hsse-event-types';
import { useActiveEventCategories } from '@/hooks/use-active-event-categories';
import { useActiveEventSubtypes } from '@/hooks/use-active-event-subtypes';
import { 
  HSSE_SEVERITY_LEVELS, 
  calculateMinimumSeverity, 
  isSeverityBelowMinimum,
  getSeverityBadgeVariant,
  type SeverityLevelV2 
} from '@/lib/hsse-severity-levels';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { NotificationPreview } from '@/components/incidents/NotificationPreview';

// Schema moved inside component to access t() for translations
const createIncidentFormSchema = (t: (key: string) => string) => z.object({
  title: z.string().min(5, t('incidents.validation.titleMinLength')).max(120),
  description: z.string().min(20, t('incidents.validation.descriptionMinLength')).max(5000),
  event_type: z.enum(['observation', 'incident'], { required_error: t('incidents.validation.eventTypeRequired') }),
  incident_type: z.string().optional(), // HSSE Event Type (top-level category for incidents)
  subtype: z.string().min(1, t('incidents.validation.subtypeRequired')),
  occurred_at: z.string().min(1, t('incidents.validation.dateTimeRequired')),
  site_id: z.string().optional(),
  branch_id: z.string().optional(),
  department_id: z.string().optional(),
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  severity: z.enum(['level_1', 'level_2', 'level_3', 'level_4', 'level_5']).optional(),
  risk_rating: z.enum(['low', 'medium', 'high']).optional(), // For observations only
  erp_activated: z.boolean().optional(),
  severity_override_reason: z.string().optional(),
  injury_classification: z.string().optional(),
  immediate_actions: z.string().optional(),
  has_injury: z.boolean().default(false),
  injury_count: z.number().optional(),
  injury_description: z.string().optional(),
  has_damage: z.boolean().default(false),
  damage_description: z.string().optional(),
  damage_cost: z.number().optional(),
});

type FormValues = z.infer<ReturnType<typeof createIncidentFormSchema>>;

const EVENT_CATEGORIES = [
  { value: 'observation', labelKey: 'incidents.eventCategories.observation' },
  { value: 'incident', labelKey: 'incidents.eventCategories.incident' },
];

const OBSERVATION_TYPES = [
  { value: 'unsafe_act', labelKey: 'incidents.observationTypes.unsafeAct', isPositive: false },
  { value: 'unsafe_condition', labelKey: 'incidents.observationTypes.unsafeCondition', isPositive: false },
  { value: 'safe_act', labelKey: 'incidents.observationTypes.safeAct', isPositive: true },
  { value: 'safe_condition', labelKey: 'incidents.observationTypes.safeCondition', isPositive: true },
];

// Removed - now using HSSE_SEVERITY_LEVELS from src/lib/hsse-severity-levels.ts

const RISK_RATING_LEVELS = [
  { value: 'low', labelKey: 'incidents.riskRating.low', color: 'bg-green-500' },
  { value: 'medium', labelKey: 'incidents.riskRating.medium', color: 'bg-yellow-500' },
  { value: 'high', labelKey: 'incidents.riskRating.high', color: 'bg-red-500' },
];

const WIZARD_STEPS = [
  { id: 1, labelKey: 'incidents.wizard.stepCapture' },
  { id: 2, labelKey: 'incidents.wizard.stepLocation' },
  { id: 3, labelKey: 'incidents.wizard.stepDetails' },
];

export default function IncidentReport() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const direction = i18n.dir();
  const { profile } = useAuth();
  
  // Event type selection mode: null = show selector, 'observation' = quick card, 'incident' = wizard
  const [reportMode, setReportMode] = useState<'observation' | 'incident' | null>(null);
  
  // Get assetId from URL if present (from QR scan)
  const preselectedAssetId = searchParams.get('assetId');
  
  // Create schema with translated messages
  const incidentFormSchema = createIncidentFormSchema(t);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRewritingTitle, setIsRewritingTitle] = useState(false);
  const [isRewritingDesc, setIsRewritingDesc] = useState(false);
  
  // AI Analysis state - prevents Select handlers from clearing AI-set values
  const [isApplyingAISuggestions, setIsApplyingAISuggestions] = useState(false);
  const [pendingAISubtype, setPendingAISubtype] = useState<string | null>(null);
  
  // Real AI hook for translate & rewrite
  const incidentAI = useIncidentAI();
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [autoDetectedBranch, setAutoDetectedBranch] = useState(false);
  const [autoDetectedSite, setAutoDetectedSite] = useState(false);
  const [gpsDetectedSite, setGpsDetectedSite] = useState<NearestSiteResult | null>(null);
  const [gpsDetectedBranch, setGpsDetectedBranch] = useState(false);
  const [noSiteNearby, setNoSiteNearby] = useState(false);
  const [gpsLocationConfirmed, setGpsLocationConfirmed] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | undefined>(undefined);
  const [locationAddress, setLocationAddress] = useState<LocationAddress | null>(null);
  const [uploadedPhotos, setUploadedPhotos] = useState<File[]>([]);
  const [uploadedVideo, setUploadedVideo] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  // Observation "Closed on the Spot" state
  const [closedOnSpot, setClosedOnSpot] = useState(false);
  const [closedOnSpotPhotos, setClosedOnSpotPhotos] = useState<File[]>([]);
  const [showClosedOnSpotConfirm, setShowClosedOnSpotConfirm] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<FormValues | null>(null);
  // Asset selection state
  const [selectedAsset, setSelectedAsset] = useState<SelectedAsset | null>(null);
  
  const createIncident = useCreateIncident();
  const linkAsset = useLinkAssetToIncident();
  const { fetchAddress: fetchLocationAddress, isLoading: isFetchingAddress } = useReverseGeocode();
  const { data: sites = [], isLoading: sitesLoading } = useTenantSites();
  const { data: branches = [], isLoading: branchesLoading } = useTenantBranches();
  const { data: departments = [], isLoading: departmentsLoading } = useTenantDepartments();
  
  // Dynamic event categories from database
  const { data: dynamicCategories = [] } = useActiveEventCategories();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(incidentFormSchema),
    defaultValues: {
      title: '',
      description: '',
      event_type: undefined,
      incident_type: '',
      subtype: '',
      occurred_at: new Date().toISOString().slice(0, 16),
      site_id: '',
      branch_id: '',
      department_id: '',
      location: '',
      latitude: undefined,
      longitude: undefined,
      severity: undefined,
      risk_rating: undefined,
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
  const incidentType = form.watch('incident_type');
  
  // Helper: Is this an observation (simplified workflow)?
  const isObservation = eventType === 'observation';

  // Dynamic subtypes from database
  const { data: dynamicSubtypes = [] } = useActiveEventSubtypes(
    eventType === 'incident' ? incidentType : undefined
  );

  // Get subtype options based on event type and incident type
  // Use dynamic subtypes if available, fallback to static for observations
  const subtypeOptions = eventType === 'observation' 
    ? OBSERVATION_TYPES 
    : (dynamicSubtypes.length > 0 
        ? dynamicSubtypes.map(s => ({ value: s.code, labelKey: s.name_key }))
        : (incidentType ? getSubtypesForEventType(incidentType) : []));

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

  // Handle preselected asset from URL (QR scan)
  useEffect(() => {
    if (preselectedAssetId && !selectedAsset) {
      // Fetch the asset and select it
      supabase
        .from('hsse_assets')
        .select(`
          id,
          asset_code,
          name,
          site_id,
          branch_id,
          site:sites(id, name),
          building:buildings(name),
          category:asset_categories(name, name_ar)
        `)
        .eq('id', preselectedAssetId)
        .is('deleted_at', null)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            handleAssetSelect(data as SelectedAsset);
          }
        });
    }
  }, [preselectedAssetId]);

  // Handle asset selection and auto-populate location
  const handleAssetSelect = (asset: SelectedAsset | null) => {
    setSelectedAsset(asset);
    
    if (asset) {
      // Auto-populate site if available
      if (asset.site_id && !form.getValues('site_id')) {
        form.setValue('site_id', asset.site_id);
        setAutoDetectedSite(false);
        setGpsDetectedSite(null);
      }
      // Auto-populate branch if available
      if (asset.branch_id && !form.getValues('branch_id')) {
        form.setValue('branch_id', asset.branch_id);
        setAutoDetectedBranch(false);
        setGpsDetectedBranch(false);
      }
    }
  };

  // Generate reference preview based on event type
  const getReferencePreview = () => {
    if (!eventType) {
      return t('incidents.referenceWillBeAssigned');
    }
    const year = new Date().getFullYear();
    const prefix = eventType === 'incident' ? 'INC' : 'OBS';
    return `${prefix}-${year}-XXXX (${t('incidents.preview')})`;
  };

  // Step validation
  const validateStep = async (step: number): Promise<boolean> => {
    const fieldsToValidate: (keyof FormValues)[] = [];
    
    if (step === 1) {
      fieldsToValidate.push('title', 'description', 'event_type', 'subtype', 'occurred_at');
    }
    // Steps 2 and 3 have optional fields, so always valid
    
    if (fieldsToValidate.length > 0) {
      const result = await form.trigger(fieldsToValidate);
      return result;
    }
    return true;
  };

  const goToNextStep = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < 3) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToStep = async (step: number) => {
    // Only allow going back or to already validated steps
    if (step < currentStep) {
      setCurrentStep(step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (step === currentStep + 1) {
      await goToNextStep();
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      return;
    }
    
    setIsGettingLocation(true);
    setNoSiteNearby(false);
    setGpsDetectedSite(null);
    setGpsDetectedBranch(false);
    setGpsLocationConfirmed(false);
    setGpsAccuracy(undefined);
    setLocationAddress(null);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setCoordinates({ lat: latitude, lng: longitude });
        setGpsAccuracy(accuracy);
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
        
        // Fetch address details via reverse geocoding (non-blocking)
        fetchLocationAddress(latitude, longitude).then((address) => {
          if (address) {
            setLocationAddress(address);
          }
        });
      },
      () => {
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleGpsConfirm = () => {
    setGpsLocationConfirmed(true);
    toast.success(t('incidents.gpsConfirmation.locationConfirmed'));
  };

  const handleGpsChangeLocation = () => {
    setGpsDetectedSite(null);
    setGpsLocationConfirmed(false);
    setNoSiteNearby(false);
    form.setValue('site_id', '');
    form.setValue('branch_id', '');
    setGpsDetectedBranch(false);
  };

  const handleAnalyzeDescription = async () => {
    if (description.length < 20) return;
    
    setIsAnalyzing(true);
    setIsApplyingAISuggestions(true); // Prevent Select handlers from clearing values
    
    try {
      const result = await analyzeIncidentWithAI(description);
      
      // Map AI severity to form severity levels
      const severityMap: Record<string, SeverityLevelV2> = {
        'low': 'level_1',
        'medium': 'level_2', 
        'high': 'level_3',
        'critical': 'level_4',
      };
      
      // Auto-populate event type first
      if (result.eventType) {
        form.setValue('event_type', result.eventType);
        
        // Auto-populate incident type (event category) for incidents
        if (result.eventType === 'incident' && result.incidentType) {
          form.setValue('incident_type', result.incidentType);
        }
        
        // Store subtype for deferred application (wait for dynamicSubtypes to load)
        if (result.subtype) {
          if (result.eventType === 'observation') {
            // For observations, subtypes are static, set immediately
            form.setValue('subtype', result.subtype);
          } else {
            // For incidents, defer until dynamicSubtypes loads
            setPendingAISubtype(result.subtype);
          }
        }
      }
      
      // Auto-populate severity for incidents
      if (result.eventType === 'incident' && result.severity) {
        const mappedSeverity = severityMap[result.severity] || 'level_2';
        form.setValue('severity', mappedSeverity);
      }
      
      // Auto-populate injury details
      if (result.hasInjury) {
        form.setValue('has_injury', true);
        if (result.injuryCount) {
          form.setValue('injury_count', result.injuryCount);
        }
        if (result.injuryDescription) {
          form.setValue('injury_description', result.injuryDescription);
        }
      }
      
      // Auto-populate damage details
      if (result.hasDamage) {
        form.setValue('has_damage', true);
        if (result.damageDescription) {
          form.setValue('damage_description', result.damageDescription);
        }
        if (result.estimatedCost) {
          form.setValue('damage_cost', result.estimatedCost);
        }
      }
      
      // Create suggestion object for the AI panel
      const suggestion: AISuggestion = {
        suggestedSeverity: result.severity || 'low',
        suggestedEventType: result.eventType || undefined,
        suggestedIncidentType: result.incidentType || undefined,
        suggestedSubtype: result.subtype || undefined,
        refinedDescription: description,
        keyRisks: result.keyRisks,
        confidence: result.confidence,
      };
      setAiSuggestion(suggestion);
      
      // Build populated fields list for toast
      const populatedFields: string[] = [];
      if (result.eventType) populatedFields.push(t('incidents.eventType'));
      if (result.incidentType) populatedFields.push(t('incidents.incidentType'));
      if (result.subtype) populatedFields.push(t('incidents.subtype'));
      if (result.severity) populatedFields.push(t('incidents.severity'));
      if (result.hasInjury) populatedFields.push(t('incidents.injuryDetails'));
      if (result.hasDamage) populatedFields.push(t('incidents.damageDetails'));
      
      toast.success(t('incidents.ai.analysisComplete'), {
        description: populatedFields.length > 0 
          ? `${t('incidents.ai.fieldsPopulated')}: ${populatedFields.join(', ')}`
          : undefined
      });
    } catch (error) {
      console.error('AI analysis error:', error);
      toast.error(t('incidents.ai.detectionError'));
      setIsApplyingAISuggestions(false);
    } finally {
      setIsAnalyzing(false);
      // Reset flag after a short delay to allow React to process the form updates
      setTimeout(() => setIsApplyingAISuggestions(false), 100);
    }
  };

  // Apply pending AI subtype once dynamicSubtypes are loaded
  useEffect(() => {
    if (pendingAISubtype && dynamicSubtypes.length > 0) {
      const subtypeExists = dynamicSubtypes.some(s => s.code === pendingAISubtype);
      if (subtypeExists) {
        form.setValue('subtype', pendingAISubtype);
      }
      setPendingAISubtype(null);
    }
  }, [dynamicSubtypes, pendingAISubtype, form]);

  const handleRewriteTitle = async () => {
    if (title.length < 5) return;
    
    setIsRewritingTitle(true);
    try {
      const result = await incidentAI.translateAndRewrite(title, 'title');
      if (result) {
        form.setValue('title', result);
      }
    } finally {
      setIsRewritingTitle(false);
    }
  };

  const handleRewriteDescription = async () => {
    if (description.length < 20) return;
    
    setIsRewritingDesc(true);
    try {
      const result = await incidentAI.translateAndRewrite(description, 'description');
      if (result) {
        form.setValue('description', result);
      }
    } finally {
      setIsRewritingDesc(false);
    }
  };

  const handleApplySuggestions = () => {
    if (!aiSuggestion) return;
    // Map old severity to new 5-level system
    const severityMap: Record<string, SeverityLevelV2> = {
      'low': 'level_1',
      'medium': 'level_2', 
      'high': 'level_3',
      'critical': 'level_4',
    };
    const mappedSeverity = severityMap[aiSuggestion.suggestedSeverity] || 'level_2';
    form.setValue('severity', mappedSeverity);
    form.setValue('description', aiSuggestion.refinedDescription);
    if (aiSuggestion.suggestedEventType) {
      form.setValue('event_type', aiSuggestion.suggestedEventType);
    }
    if (aiSuggestion.suggestedSubtype) {
      form.setValue('subtype', aiSuggestion.suggestedSubtype);
    }
    setAiSuggestion(null);
  };

  // Handle observation with "Closed on the Spot" - show confirmation dialog
  const handleObservationSubmit = async (values: FormValues) => {
    if (values.event_type === 'observation' && closedOnSpot) {
      // Store pending data and show confirmation dialog
      setPendingSubmitData(values);
      setShowClosedOnSpotConfirm(true);
      return;
    }
    
    // Not closed on spot or not observation - proceed directly
    await performSubmit(values);
  };

  const handleClosedOnSpotConfirm = async () => {
    setShowClosedOnSpotConfirm(false);
    if (pendingSubmitData) {
      await performSubmit(pendingSubmitData);
    }
  };

  const performSubmit = async (values: FormValues) => {
    const isObs = values.event_type === 'observation';
    
    // Build closed_on_spot_data for observations
    let closedOnSpotData: ClosedOnSpotPayload | undefined = undefined;
    if (isObs && closedOnSpot) {
      closedOnSpotData = {
        closed_on_spot: true,
        photo_paths: [], // Will be populated after upload
      };
    }

    const formData: IncidentFormData = {
      title: values.title,
      description: values.description,
      event_type: values.event_type,
      subtype: values.subtype,
      occurred_at: values.occurred_at,
      location: values.location,
      department: values.department_id,
      // Observations use risk_rating, incidents use severity
      severity: isObs ? undefined : values.severity,
      risk_rating: isObs ? values.risk_rating : undefined,
      immediate_actions: values.immediate_actions,
      closed_on_spot_data: closedOnSpotData,
      // Observations don't have injury/damage
      has_injury: isObs ? false : values.has_injury,
      injury_details: isObs ? undefined : (values.has_injury ? {
        count: values.injury_count,
        description: values.injury_description,
      } : undefined),
      has_damage: isObs ? false : values.has_damage,
      damage_details: isObs ? undefined : (values.has_damage ? {
        description: values.damage_description,
        estimated_cost: values.damage_cost,
      } : undefined),
      site_id: values.site_id || undefined,
      branch_id: values.branch_id || undefined,
      department_id: values.department_id || undefined,
      latitude: values.latitude,
      longitude: values.longitude,
      // Location address from reverse geocoding
      location_country: locationAddress?.country || undefined,
      location_city: locationAddress?.city || undefined,
      location_district: locationAddress?.district || undefined,
      location_street: locationAddress?.street || undefined,
      location_formatted: locationAddress?.formatted_address || undefined,
      // Include active major event if detected
      special_event_id: activeEventId || undefined,
    };

    createIncident.mutate(formData, {
      onSuccess: async (data) => {
        // Upload media attachments in parallel with compression
        if ((uploadedPhotos.length > 0 || uploadedVideo || closedOnSpotPhotos.length > 0) && profile?.tenant_id && data?.id) {
          setIsUploading(true);
          const uploadedPaths: string[] = [];
          try {
            // Upload photos in parallel with image compression
            if (uploadedPhotos.length > 0) {
              console.log(`Uploading ${uploadedPhotos.length} photos for incident ${data.id}`);
              await uploadFilesParallel(
                uploadedPhotos,
                async (file, index) => {
                  const fileName = `${Date.now()}-${index}-${file.name}`;
                  const uploadPath = `${profile.tenant_id}/${data.id}/photos/${fileName}`;
                  console.log(`Uploading photo to: ${uploadPath}`);
                  const { error: uploadError } = await supabase.storage
                    .from('incident-attachments')
                    .upload(uploadPath, file);
                  if (uploadError) {
                    console.error(`Photo upload failed: ${file.name}`, uploadError);
                    throw new Error(`Failed to upload photo: ${file.name} - ${uploadError.message}`);
                  }
                  console.log(`Photo uploaded successfully: ${fileName}`);
                },
                { compressImages: true, maxWidth: 1920, quality: 0.85 }
              );
            }
            
            // Upload video (no compression)
            if (uploadedVideo) {
              const fileName = `${Date.now()}-${uploadedVideo.name}`;
              const uploadPath = `${profile.tenant_id}/${data.id}/video/${fileName}`;
              console.log(`Uploading video to: ${uploadPath}`);
              const { error: videoError } = await supabase.storage
                .from('incident-attachments')
                .upload(uploadPath, uploadedVideo);
              if (videoError) {
                console.error(`Video upload failed: ${uploadedVideo.name}`, videoError);
                toast.error(t('incidents.videoUploadFailed', 'Failed to upload video'));
              } else {
                console.log(`Video uploaded successfully: ${fileName}`);
              }
            }

            // Upload "Closed on the Spot" photos in parallel
            if (closedOnSpotPhotos.length > 0) {
              console.log(`Uploading ${closedOnSpotPhotos.length} closed-on-spot photos`);
              const paths = await uploadFilesParallel(
                closedOnSpotPhotos,
                async (file, index) => {
                  const fileName = `${Date.now()}-${index}-${file.name}`;
                  const photoPath = `${profile.tenant_id}/${data.id}/closed-on-spot/${fileName}`;
                  const { error: cosError } = await supabase.storage
                    .from('incident-attachments')
                    .upload(photoPath, file);
                  if (cosError) {
                    console.error(`Closed-on-spot photo upload failed: ${file.name}`, cosError);
                    throw new Error(`Failed to upload photo: ${file.name}`);
                  }
                  return photoPath;
                },
                { compressImages: true, maxWidth: 1920, quality: 0.85 }
              );
              uploadedPaths.push(...paths);
            }

            // Update the incident with the photo paths if we have any
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
            console.error('Media upload error:', error);
            toast.error(t('incidents.mediaUploadFailed', 'Failed to upload some media files'));
          } finally {
            setIsUploading(false);
          }
        }
        
        // Link selected asset to the incident
        if (selectedAsset && data?.id) {
          try {
            await linkAsset.mutateAsync({
              incidentId: data.id,
              assetId: selectedAsset.id,
              linkType: 'involved',
            });
          } catch (error) {
            console.error('Asset linking error:', error);
          }
        }
        
        navigate('/incidents');
      },
    });
  };

  const onSubmit = async (values: FormValues) => {
    await handleObservationSubmit(values);
  };

  // Removed local getSeverityBadgeVariant - now using imported version from @/lib/hsse-severity-levels

  // Step Indicator Component
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {WIZARD_STEPS.map((step, index) => {
        const isCompleted = currentStep > step.id;
        const isCurrent = currentStep === step.id;
        
        return (
          <div key={step.id} className="flex items-center">
            <button
              type="button"
              onClick={() => goToStep(step.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full transition-all",
                isCurrent && "bg-primary text-primary-foreground",
                isCompleted && "bg-primary/20 text-primary cursor-pointer hover:bg-primary/30",
                !isCurrent && !isCompleted && "bg-muted text-muted-foreground"
              )}
              disabled={!isCompleted && !isCurrent}
            >
              <span className={cn(
                "flex items-center justify-center w-6 h-6 rounded-full text-sm font-medium",
                isCurrent && "bg-primary-foreground text-primary",
                isCompleted && "bg-primary text-primary-foreground",
                !isCurrent && !isCompleted && "bg-muted-foreground/20 text-muted-foreground"
              )}>
                {isCompleted ? <Check className="h-4 w-4" /> : step.id}
              </span>
              <span className="hidden sm:inline font-medium">{t(step.labelKey)}</span>
            </button>
            {index < WIZARD_STEPS.length - 1 && (
              <ChevronRight className={cn(
                "h-5 w-5 mx-2 rtl:rotate-180",
                isCompleted ? "text-primary" : "text-muted-foreground/50"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );

  // Event Type Selector Component
  const EventTypeSelector = () => (
    <div className="container max-w-2xl py-6" dir={direction}>
      <div className="space-y-2 text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t('quickObservation.selectEventType')}</h1>
        <p className="text-muted-foreground">{t('quickObservation.selectEventTypeDescription')}</p>
      </div>
      
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Observation Card */}
        <Card 
          className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
          onClick={() => setReportMode('observation')}
        >
          <CardContent className="p-6 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center group-hover:bg-yellow-500/20 transition-colors">
              <Eye className="h-8 w-8 text-yellow-500" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{t('quickObservation.observationTitle')}</h3>
              <p className="text-sm text-muted-foreground mt-1">{t('quickObservation.observationDescription')}</p>
            </div>
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {t('quickObservation.quickReport')}
            </Badge>
          </CardContent>
        </Card>
        
        {/* Incident Card */}
        <Card 
          className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
          onClick={() => setReportMode('incident')}
        >
          <CardContent className="p-6 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
              <Siren className="h-8 w-8 text-red-500" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{t('quickObservation.incidentTitle')}</h3>
              <p className="text-sm text-muted-foreground mt-1">{t('quickObservation.incidentDescription')}</p>
            </div>
            <Badge variant="secondary" className="gap-1">
              <FileText className="h-3 w-3" />
              {t('quickObservation.fullForm')}
            </Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // If no report mode selected, show the selector
  if (reportMode === null) {
    return <EventTypeSelector />;
  }

  // If observation mode selected, show the quick card
  if (reportMode === 'observation') {
    return <QuickObservationCard onCancel={() => setReportMode(null)} />;
  }

  // Otherwise show the full incident wizard
  return (
    <div className="container max-w-4xl py-6 space-y-6" dir={direction}>
      <div className="space-y-2 text-center">
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setReportMode(null)}>
            <ChevronLeft className="h-4 w-4 me-1 rtl:rotate-180" />
            {t('common.back')}
          </Button>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t('incidents.reportIncident')}
        </h1>
        <p className="text-muted-foreground">{t('incidents.reportDescription')}</p>
      </div>

      <StepIndicator />

      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          {/* STEP 1: CAPTURE */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Active Event Banner */}
              <ActiveEventBanner onEventDetected={setActiveEventId} />

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

              {/* Quick Capture - Media Upload */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="flex items-center gap-2">
                      <Camera className="h-5 w-5" />
                      {t('incidents.quickCapture.title')}
                    </CardTitle>
                    <Badge variant="outline" className="gap-1 text-muted-foreground">
                      <Sparkles className="h-3 w-3" />
                      {t('incidents.quickCapture.aiComingSoon')}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('incidents.quickCapture.description')}
                  </p>
                </CardHeader>
                <CardContent>
                  <MediaUploadSection
                    photos={uploadedPhotos}
                    video={uploadedVideo}
                    onPhotosChange={setUploadedPhotos}
                    onVideoChange={setUploadedVideo}
                  />
                </CardContent>
              </Card>

              {/* Basic Information - Title, Description, Event Type, Date/Time */}
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

                  {/* Description with AI Assistant */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('incidents.description')}</FormLabel>
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
                              onClick={handleAnalyzeDescription}
                              disabled={isAnalyzing || field.value.length < 20}
                              className="gap-1"
                            >
                              {isAnalyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                              {t('incidents.aiAnalyze')}
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

                  {/* Event Category (Observation/Incident) */}
                  <FormField
                    control={form.control}
                    name="event_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('incidents.eventType')}</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Only clear dependent fields if user is manually changing (not AI)
                            if (!isApplyingAISuggestions) {
                              form.setValue('incident_type', '');
                              form.setValue('subtype', '');
                            }
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

                  {/* For Incidents: HSSE Event Type (Top-Level Category) */}
                  {eventType === 'incident' && (
                    <FormField
                      control={form.control}
                      name="incident_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('incidents.incidentCategory')}</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              // Only clear subtype if user is manually changing (not AI)
                              if (!isApplyingAISuggestions) {
                                form.setValue('subtype', '');
                              }
                            }} 
                            value={field.value} 
                            dir={direction}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('common.select')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {/* Use dynamic categories if available, fallback to static */}
                              {(dynamicCategories.length > 0 
                                ? dynamicCategories.map((cat) => (
                                    <SelectItem key={cat.code} value={cat.code}>
                                      {t(cat.name_key)}
                                    </SelectItem>
                                  ))
                                : HSSE_EVENT_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {t(type.labelKey)}
                                    </SelectItem>
                                  ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Subtype - Conditional based on event_type and incident_type */}
                  <FormField
                    control={form.control}
                    name="subtype"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {eventType === 'observation' 
                            ? t('incidents.observationType') 
                            : t('incidents.incidentSubCategory')}
                        </FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value} 
                          dir={direction}
                          disabled={!eventType || (eventType === 'incident' && !incidentType)}
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
                        {eventType === 'incident' && !incidentType && (
                          <FormDescription className="text-muted-foreground">
                            {t('incidents.selectHsseEventTypeFirst')}
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                </CardContent>
              </Card>
            </div>
          )}

          {/* STEP 2: LOCATION */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* GPS Location Confirmation Card */}
              {coordinates && (gpsDetectedSite || noSiteNearby) && (
                <GPSLocationConfirmCard
                  userCoordinates={coordinates}
                  gpsAccuracy={gpsAccuracy}
                  nearestSiteResult={gpsDetectedSite}
                  noSiteNearby={noSiteNearby}
                  onConfirm={handleGpsConfirm}
                  onChangeLocation={handleGpsChangeLocation}
                  isConfirmed={gpsLocationConfirmed}
                  locationAddress={locationAddress}
                  isFetchingAddress={isFetchingAddress}
                />
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    {t('incidents.wizard.stepLocation')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
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
                            setGpsLocationConfirmed(false);
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
                        
                        {autoDetectedSite && !gpsDetectedSite && field.value && (
                          <FormDescription className="flex items-center gap-1 text-blue-600">
                            <Info className="h-3 w-3" />
                            {t('incidents.autoDetectedFromProfile')}
                          </FormDescription>
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

              {/* Asset Selection */}
              <AssetSelectionSection 
                selectedAssetId={selectedAsset?.id || null}
                onAssetSelect={handleAssetSelect}
              />
            </div>
          )}

          {/* STEP 3: DETAILS */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Observation: Risk Rating (instead of Severity) */}
              {isObservation ? (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('incidents.riskRatingTitle')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="risk_rating"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('incidents.riskRatingLabel')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} dir={direction}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('common.select')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {RISK_RATING_LEVELS.map((level) => (
                                <SelectItem key={level.value} value={level.value}>
                                  <div className="flex items-center gap-2">
                                    <div className={`h-2 w-2 rounded-full ${level.color}`} />
                                    {t(level.labelKey)}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>{t('incidents.riskRatingDescription')}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <ClosedOnSpotSection
                      enabled={closedOnSpot}
                      onEnabledChange={setClosedOnSpot}
                      photos={closedOnSpotPhotos}
                      onPhotosChange={setClosedOnSpotPhotos}
                      direction={direction}
                    />
                  </CardContent>
                </Card>
              ) : (
                /* Incident: Severity & Actions */
                <Card>
                  <CardHeader>
                    <CardTitle>{t('severity.title')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* ERP Activation Toggle */}
                    <FormField
                      control={form.control}
                      name="erp_activated"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">{t('severity.erpActivated')}</FormLabel>
                            <FormDescription>{t('severity.erpActivatedDescription')}</FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value || false}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {/* Severity Selection with Validation */}
                    <FormField
                      control={form.control}
                      name="severity"
                      render={({ field }) => {
                        const minSeverity = calculateMinimumSeverity(
                          form.watch('injury_classification'),
                          form.watch('erp_activated'),
                          eventType
                        );
                        const showWarning = field.value && isSeverityBelowMinimum(field.value as SeverityLevelV2, minSeverity.minLevel);
                        
                        return (
                          <FormItem>
                            <FormLabel>{t('severity.ratingLabel')}</FormLabel>
                            <FormDescription className="text-xs mb-2">
                              {t('severity.ratingDescription')}
                            </FormDescription>
                            <Select onValueChange={field.onChange} value={field.value} dir={direction}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t('common.select')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {HSSE_SEVERITY_LEVELS.map((level) => (
                                  <SelectItem key={level.value} value={level.value}>
                                    <div className="flex items-center gap-2">
                                      <div className={`h-3 w-3 rounded-full ${level.bgColor}`} />
                                      <div className="flex flex-col">
                                        <span className="font-medium">{t(level.labelKey)}</span>
                                        <span className="text-xs text-muted-foreground">{t(level.descriptionKey)}</span>
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            
                            {/* Validation Warning */}
                            {showWarning && (
                              <Alert variant="destructive" className="mt-2">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                  <div className="space-y-2">
                                    <p>{t(`severity.${minSeverity.reason}`)}</p>
                                    <p className="text-xs">{t('severity.overrideRequired')}</p>
                                  </div>
                                </AlertDescription>
                              </Alert>
                            )}
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    {/* Override Reason (shown when below minimum) */}
                    {form.watch('severity') && isSeverityBelowMinimum(
                      form.watch('severity') as SeverityLevelV2,
                      calculateMinimumSeverity(
                        form.watch('injury_classification'),
                        form.watch('erp_activated'),
                        eventType
                      ).minLevel
                    ) && (
                      <FormField
                        control={form.control}
                        name="severity_override_reason"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-destructive">{t('severity.overrideReasonLabel')} *</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder={t('severity.overrideReasonPlaceholder')}
                                className="min-h-[80px] border-destructive"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription className="text-destructive text-xs">
                              {t('severity.overrideAuditWarning')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

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
              )}

              {/* Injury Details - Only for Incidents */}
              {!isObservation && (
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
              )}

              {/* Damage Details - Only for Incidents */}
              {!isObservation && (
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
              )}

              {/* Notification Preview - Show for incidents with severity */}
              {!isObservation && form.watch('severity') && (
                <NotificationPreview
                  severityLevel={form.watch('severity')}
                  hasInjury={hasInjury}
                  erpActivated={form.watch('erp_activated') || false}
                  siteId={form.watch('site_id')}
                  className="mt-4"
                />
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between gap-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={currentStep === 1 ? () => navigate('/incidents') : goToPreviousStep}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
              {currentStep === 1 ? t('common.cancel') : t('incidents.wizard.previous')}
            </Button>
            
            {currentStep < 3 ? (
              <Button
                type="button"
                onClick={goToNextStep}
                className="gap-2"
              >
                {t('incidents.wizard.next')}
                <ChevronRight className="h-4 w-4 rtl:rotate-180" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => setShowConfirmation(true)}
                disabled={createIncident.isPending || isUploading}
                className="min-w-[150px]"
              >
                {(createIncident.isPending || isUploading) ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    {t('common.submitting')}
                  </>
                ) : (
                  t('incidents.submitIncident')
                )}
              </Button>
            )}
          </div>
        </form>
      </Form>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent dir={direction}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('incidents.confirmSubmission')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('incidents.confirmSubmissionDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={form.handleSubmit(onSubmit)}>
              {t('incidents.confirmAndSubmit')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Closed on the Spot Confirmation Dialog (Observation Only) */}
      <ClosedOnSpotConfirmDialog
        open={showClosedOnSpotConfirm}
        onOpenChange={setShowClosedOnSpotConfirm}
        onConfirm={handleClosedOnSpotConfirm}
        direction={direction}
      />
    </div>
  );
}
