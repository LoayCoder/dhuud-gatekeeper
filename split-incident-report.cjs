const fs = require('fs');
const path = require('path');

const hooksDir = path.join(__dirname, 'src/pages/incidents/IncidentReport/hooks');

const stateFile = `import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useAITags } from '@/hooks/use-ai-tags';
import { useAIAutoTrigger } from '@/hooks/use-ai-auto-trigger';
import { type SelectedAsset } from '@/components/incidents/AssetSelectionSection';
import { type NearestSiteResult } from '@/lib/geo-utils';
import { type LocationAddress } from '@/hooks/use-reverse-geocode';
import { createIncidentFormSchema, FormValues } from '../types';

export function useIncidentReportState() {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const direction = i18n.dir();
  const { profile } = useAuth();
  
  const [reportMode, setReportMode] = useState<'observation' | 'incident' | null>(null);
  const preselectedAssetId = searchParams.get('assetId');
  const incidentFormSchema = createIncidentFormSchema(t);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<SelectedAsset | null>(null);

  const { tags: availableIncidentTags = [] } = useAITags('incident');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const [isApplyingAISuggestions, setIsApplyingAISuggestions] = useState(false);
  const [pendingAISubtype, setPendingAISubtype] = useState<string | null>(null);
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
  const [closedOnSpot, setClosedOnSpot] = useState(false);
  const [closedOnSpotPhotos, setClosedOnSpotPhotos] = useState<File[]>([]);
  const [showClosedOnSpotConfirm, setShowClosedOnSpotConfirm] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<FormValues | null>(null);
  const [isConfirmSubmitting, setIsConfirmSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submittedIncident, setSubmittedIncident] = useState<{ id: string; referenceId: string } | null>(null);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(incidentFormSchema),
    defaultValues: {
      title: '', description: '', event_type: undefined, incident_type: '', subtype: '',
      occurred_at: new Date().toISOString().slice(0, 16), site_id: '', branch_id: '', department_id: '',
      location: '', latitude: undefined, longitude: undefined, severity: undefined, risk_rating: undefined,
      immediate_actions: '', has_injury: false, injury_count: undefined, injury_description: '',
      has_damage: false, damage_description: '', damage_cost: undefined, is_against_contractor: false,
      related_contractor_company_id: undefined,
    },
  });

  const hasInjury = form.watch('has_injury');
  const hasDamage = form.watch('has_damage');
  const eventType = form.watch('event_type');
  const incidentType = form.watch('incident_type');
  const isAgainstContractor = form.watch('is_against_contractor');
  const selectedBranchId = form.watch('branch_id');
  const selectedSiteId = form.watch('site_id');
  const description = form.watch('description');
  const title = form.watch('title');
  const location = form.watch('location');
  
  const { isAutoTriggerEnabled, setAutoTriggerEnabled, isPendingAutoTrigger, triggerAnalysis, validator: aiValidator } = useAIAutoTrigger(
    title || '', description || '', {
    minCharacters: 20, debounceDelay: 2000, enabled: true,
    context: { location: location, assetId: selectedAsset?.id },
  });

  const isObservation = eventType === 'observation';

  return {
    t, i18n, direction, profile, reportMode, setReportMode, preselectedAssetId,
    currentStep, setCurrentStep, isGettingLocation, setIsGettingLocation, coordinates, setCoordinates,
    selectedAsset, setSelectedAsset, availableIncidentTags, selectedTags, setSelectedTags,
    isApplyingAISuggestions, setIsApplyingAISuggestions, pendingAISubtype, setPendingAISubtype,
    autoDetectedBranch, setAutoDetectedBranch, autoDetectedSite, setAutoDetectedSite,
    gpsDetectedSite, setGpsDetectedSite, gpsDetectedBranch, setGpsDetectedBranch,
    noSiteNearby, setNoSiteNearby, gpsLocationConfirmed, setGpsLocationConfirmed,
    gpsAccuracy, setGpsAccuracy, locationAddress, setLocationAddress, uploadedPhotos, setUploadedPhotos,
    uploadedVideo, setUploadedVideo, isUploading, setIsUploading, activeEventId, setActiveEventId,
    showConfirmation, setShowConfirmation, closedOnSpot, setClosedOnSpot, closedOnSpotPhotos, setClosedOnSpotPhotos,
    showClosedOnSpotConfirm, setShowClosedOnSpotConfirm, pendingSubmitData, setPendingSubmitData,
    isConfirmSubmitting, setIsConfirmSubmitting, hasSubmitted, setHasSubmitted,
    submittedIncident, setSubmittedIncident, form, hasInjury, hasDamage, eventType, incidentType,
    isAgainstContractor, selectedBranchId, selectedSiteId, description, title, location,
    isAutoTriggerEnabled, setAutoTriggerEnabled, isPendingAutoTrigger, triggerAnalysis, aiValidator,
    isObservation
  };
}`;

const dataFile = `import { useMemo, useEffect } from 'react';
import { useTenantSites, useTenantBranches } from '@/hooks/use-org-hierarchy';
import { useDepartmentsBySite } from '@/hooks/use-departments-by-site';
import { useActiveEventCategories } from '@/hooks/use-active-event-categories';
import { useActiveEventSubtypes } from '@/hooks/use-active-event-subtypes';
import { useContractorCompanies } from '@/hooks/contractor-management/use-contractor-companies';
import { getSubtypesForEventType } from '@/lib/hsse-event-types';
import { OBSERVATION_TYPES } from '../helpers';
import { useIncidentReportState } from './useIncidentReportState';

export function useIncidentReportData(state: ReturnType<typeof useIncidentReportState>) {
  const { data: sites = [], isLoading: sitesLoading } = useTenantSites();
  const { data: branches = [], isLoading: branchesLoading } = useTenantBranches();
  const { data: dynamicCategories = [] } = useActiveEventCategories();
  const { data: contractorCompanies = [] } = useContractorCompanies();

  const filteredSites = useMemo(() => {
    if (!state.selectedBranchId) return sites;
    return sites.filter(site => site.branch_id === state.selectedBranchId);
  }, [sites, state.selectedBranchId]);

  const { 
    departments: filteredDepartments, 
    isLoading: departmentsLoading,
    usingFallback: departmentsUsingFallback,
    primaryDepartmentId: sitePrimaryDepartmentId
  } = useDepartmentsBySite(state.selectedSiteId, state.selectedBranchId);

  useEffect(() => {
    if (sitePrimaryDepartmentId && !state.form.getValues('department_id')) {
      state.form.setValue('department_id', sitePrimaryDepartmentId);
    }
  }, [sitePrimaryDepartmentId, state.form]);

  useEffect(() => {
    const currentDeptId = state.form.getValues('department_id');
    if (currentDeptId && filteredDepartments.length > 0) {
      const deptStillValid = filteredDepartments.some(d => d.id === currentDeptId);
      if (!deptStillValid) {
        state.form.setValue('department_id', '');
      }
    }
  }, [state.selectedSiteId, filteredDepartments, state.form]);

  const { data: dynamicSubtypes = [] } = useActiveEventSubtypes(
    state.eventType === 'incident' ? state.incidentType : undefined
  );

  const subtypeOptions = state.eventType === 'observation' 
    ? OBSERVATION_TYPES 
    : (dynamicSubtypes.length > 0 
        ? dynamicSubtypes.map(s => ({ value: s.code, labelKey: s.name_key }))
        : (state.incidentType ? getSubtypesForEventType(state.incidentType) : []));

  return {
    sites, sitesLoading,
    branches, branchesLoading,
    dynamicCategories,
    contractorCompanies,
    filteredSites,
    filteredDepartments,
    departmentsLoading,
    departmentsUsingFallback,
    dynamicSubtypes,
    subtypeOptions
  };
}`;

const submitFile = `import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { useCreateIncident, type IncidentFormData, type ClosedOnSpotPayload } from '@/hooks/use-incidents';
import { useLinkAssetToIncident } from '@/hooks/use-incident-assets';
import { useReverseGeocode } from '@/hooks/use-reverse-geocode';
import { findNearestSite } from '@/lib/geo-utils';
import { uploadFilesParallel } from '@/lib/upload-utils';
import { type SeverityLevelV2 } from '@/lib/hsse-severity-levels';
import { FormValues } from '../types';
import { useIncidentReportState } from './useIncidentReportState';
import { useIncidentReportData } from './useIncidentReportData';
import { type SelectedAsset } from '@/components/incidents/AssetSelectionSection';

export function useIncidentReportSubmit(
  state: ReturnType<typeof useIncidentReportState>,
  data: ReturnType<typeof useIncidentReportData>
) {
  const navigate = useNavigate();
  const createIncident = useCreateIncident();
  const linkAsset = useLinkAssetToIncident();
  const { fetchAddress: fetchLocationAddress, isLoading: isFetchingAddress } = useReverseGeocode();

  useEffect(() => {
    if (state.profile?.assigned_branch_id && !state.form.getValues('branch_id')) {
      state.form.setValue('branch_id', state.profile.assigned_branch_id);
      state.setAutoDetectedBranch(true);
    }
  }, [state.profile?.assigned_branch_id, state.form]);

  useEffect(() => {
    if (state.profile?.assigned_site_id && !state.form.getValues('site_id')) {
      state.form.setValue('site_id', state.profile.assigned_site_id);
      state.setAutoDetectedSite(true);
    }
  }, [state.profile?.assigned_site_id, state.form]);

  useEffect(() => {
    if (state.reportMode === 'incident') {
      state.form.setValue('event_type', 'incident');
    }
  }, [state.reportMode, state.form]);

  const handleAssetSelect = useCallback((asset: SelectedAsset | null) => {
    state.setSelectedAsset(asset);
    if (asset) {
      if (asset.site_id && !state.form.getValues('site_id')) {
        state.form.setValue('site_id', asset.site_id);
        state.setAutoDetectedSite(false);
        state.setGpsDetectedSite(null);
      }
      if (asset.branch_id && !state.form.getValues('branch_id')) {
        state.form.setValue('branch_id', asset.branch_id);
        state.setAutoDetectedBranch(false);
        state.setGpsDetectedBranch(false);
      }
    }
  }, [state.form, state.setSelectedAsset, state.setAutoDetectedSite, state.setGpsDetectedSite, state.setAutoDetectedBranch, state.setGpsDetectedBranch]);

  useEffect(() => {
    if (state.preselectedAssetId && !state.selectedAsset) {
      supabase.from('hsse_assets').select('id, asset_code, name, site_id, branch_id, site:sites(id, name), building:buildings(name), category:asset_categories(name, name_ar)')
        .eq('id', state.preselectedAssetId).is('deleted_at', null).single().then(({ data: d, error }) => {
          if (!error && d) handleAssetSelect(d as unknown as SelectedAsset);
        });
    }
  }, [state.preselectedAssetId, state.selectedAsset, handleAssetSelect]);

  const getReferencePreview = useCallback(() => {
    if (!state.eventType) return state.t('incidents.referenceWillBeAssigned');
    const year = new Date().getFullYear();
    const prefix = state.eventType === 'incident' ? 'INC' : 'OBS';
    return \`\${prefix}-\${year}-XXXX (\${state.t('incidents.preview')})\`;
  }, [state.eventType, state.t]);

  const validateStep = async (step: number): Promise<boolean> => {
    const fieldsToValidate: (keyof FormValues)[] = [];
    if (step === 1) fieldsToValidate.push('title', 'description', 'event_type', 'incident_type', 'subtype', 'occurred_at');
    else if (step === 2) fieldsToValidate.push('site_id', 'branch_id', 'department_id', 'location');
    else if (step === 3) fieldsToValidate.push('severity', 'immediate_actions');
    
    if (fieldsToValidate.length > 0) {
      const result = await state.form.trigger(fieldsToValidate);
      if (!result) {
        const errors = state.form.formState.errors;
        const firstErrorKey = fieldsToValidate.find(f => errors[f]);
        if (firstErrorKey && errors[firstErrorKey]) toast.error(errors[firstErrorKey]?.message as string);
      }
      return result;
    }
    return true;
  };

  const goToNextStep = async () => {
    const isValid = await validateStep(state.currentStep);
    if (isValid && state.currentStep < 3) {
      state.setCurrentStep(state.currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPreviousStep = () => {
    if (state.currentStep > 1) {
      state.setCurrentStep(state.currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToStep = async (step: number) => {
    if (step < state.currentStep) {
      state.setCurrentStep(step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (step === state.currentStep + 1) {
      await goToNextStep();
    }
  };

  const handleGetLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    state.setIsGettingLocation(true);
    state.setNoSiteNearby(false);
    state.setGpsDetectedSite(null);
    state.setGpsDetectedBranch(false);
    state.setGpsLocationConfirmed(false);
    state.setGpsAccuracy(undefined);
    state.setLocationAddress(null);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        state.setCoordinates({ lat: latitude, lng: longitude });
        state.setGpsAccuracy(accuracy);
        state.form.setValue('latitude', latitude);
        state.form.setValue('longitude', longitude);
        state.form.setValue('location', \`\${latitude.toFixed(6)}, \${longitude.toFixed(6)}\`);
        
        const nearestResult = findNearestSite(latitude, longitude, data.sites, 500);
        if (nearestResult) {
          state.form.setValue('site_id', nearestResult.site.id);
          state.setGpsDetectedSite(nearestResult);
          state.setAutoDetectedSite(false);
          if (nearestResult.site.branch_id) {
            state.form.setValue('branch_id', nearestResult.site.branch_id);
            state.setGpsDetectedBranch(true);
            state.setAutoDetectedBranch(false);
          }
        } else {
          state.setNoSiteNearby(true);
        }
        state.setIsGettingLocation(false);
        fetchLocationAddress(latitude, longitude).then((address) => {
          if (address) state.setLocationAddress(address);
        });
      },
      () => { state.setIsGettingLocation(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [state, data.sites, fetchLocationAddress]);

  const handleGpsConfirm = useCallback(() => {
    state.setGpsLocationConfirmed(true);
    toast.success(state.t('incidents.gpsConfirmation.locationConfirmed'));
  }, [state]);

  const handleGpsChangeLocation = useCallback(() => {
    state.setGpsDetectedSite(null);
    state.setGpsLocationConfirmed(false);
    state.setNoSiteNearby(false);
    state.form.setValue('site_id', '');
    state.form.setValue('branch_id', '');
    state.setGpsDetectedBranch(false);
  }, [state]);

  const handleAnalyzeDescription = useCallback(() => {
    if ((state.description?.length || 0) < 20) return;
    state.setIsApplyingAISuggestions(true);
    state.triggerAnalysis();
  }, [state.description, state.triggerAnalysis, state.setIsApplyingAISuggestions]);

  const handleConfirmTranslation = useCallback(() => {
    state.aiValidator.confirmTranslation();
  }, [state.aiValidator]);

  const handleConfirmAnalysis = useCallback(() => {
    const result = state.aiValidator.analysisResult;
    if (!result) return;
    const severityMap: Record<string, SeverityLevelV2> = { 'low': 'level_1', 'medium': 'level_2', 'high': 'level_3', 'critical': 'level_4' };
    if (result.incidentType) state.form.setValue('incident_type', result.incidentType);
    if (result.subtype) state.setPendingAISubtype(result.subtype);
    if (result.severity) state.form.setValue('severity', severityMap[result.severity] || 'level_2');
    if (result.hasInjury) {
      state.form.setValue('has_injury', true);
      if (result.injuryCount) state.form.setValue('injury_count', result.injuryCount);
      if (result.injuryDescription) state.form.setValue('injury_description', result.injuryDescription);
    }
    if (result.hasDamage) {
      state.form.setValue('has_damage', true);
      if (result.damageDescription) state.form.setValue('damage_description', result.damageDescription);
      if (result.estimatedCost) state.form.setValue('damage_cost', result.estimatedCost);
    }
    if (result.immediateActions && result.immediateActions.length > 0) {
      state.form.setValue('immediate_actions', result.immediateActions.map((a, i) => \`\${i + 1}. \${a}\`).join('\\n'));
    }
    if (result.suggestedTags && result.suggestedTags.length > 0) state.setSelectedTags(result.suggestedTags);
    state.aiValidator.confirmAnalysis();
    toast.success(state.t('incidents.ai.analysisComplete'));
    setTimeout(() => state.setIsApplyingAISuggestions(false), 100);
  }, [state, state.t]);

  useEffect(() => {
    if (state.pendingAISubtype && data.dynamicSubtypes.length > 0) {
      if (data.dynamicSubtypes.some(s => s.code === state.pendingAISubtype)) {
        state.form.setValue('subtype', state.pendingAISubtype);
      }
      state.setPendingAISubtype(null);
    }
  }, [data.dynamicSubtypes, state.pendingAISubtype, state.form, state.setPendingAISubtype]);

  useEffect(() => {
    if (state.aiValidator.analysisResult && state.aiValidator.validationState === 'analysis_ready') handleConfirmAnalysis();
  }, [state.aiValidator.analysisResult, state.aiValidator.validationState, handleConfirmAnalysis]);

  const performSubmit = async (values: FormValues) => {
    if (state.hasSubmitted) return;
    state.setHasSubmitted(true);
    
    const isObs = values.event_type === 'observation';
    let closedOnSpotData: ClosedOnSpotPayload | undefined = undefined;
    if (isObs && state.closedOnSpot) {
      closedOnSpotData = { closed_on_spot: true, photo_paths: [] };
    }

    createIncident.mutate({
      title: values.title, description: values.description, event_type: values.event_type, subtype: values.subtype,
      occurred_at: values.occurred_at, location: values.location, department: values.department_id,
      severity: isObs ? undefined : values.severity, risk_rating: isObs ? values.risk_rating : undefined,
      immediate_actions: values.immediate_actions, closed_on_spot_data: closedOnSpotData,
      has_injury: isObs ? false : values.has_injury,
      injury_details: isObs ? undefined : (values.has_injury ? { count: values.injury_count, description: values.injury_description } : undefined),
      has_damage: isObs ? false : values.has_damage,
      damage_details: isObs ? undefined : (values.has_damage ? { description: values.damage_description, estimated_cost: values.damage_cost } : undefined),
      site_id: values.site_id || undefined, branch_id: values.branch_id || undefined, department_id: values.department_id || undefined,
      latitude: values.latitude, longitude: values.longitude, location_country: state.locationAddress?.country,
      location_city: state.locationAddress?.city, location_district: state.locationAddress?.district,
      location_street: state.locationAddress?.street, location_formatted: state.locationAddress?.formatted_address,
      special_event_id: state.activeEventId || undefined,
      related_contractor_company_id: values.is_against_contractor ? values.related_contractor_company_id : undefined,
      tags: state.selectedTags.length > 0 ? state.selectedTags : undefined,
    } as IncidentFormData, {
      onSuccess: async (responseData) => {
        if ((state.uploadedPhotos.length > 0 || state.uploadedVideo || state.closedOnSpotPhotos.length > 0) && state.profile?.tenant_id && responseData?.id) {
          state.setIsUploading(true);
          const uploadedPaths: string[] = [];
          try {
            if (state.uploadedPhotos.length > 0) {
              await uploadFilesParallel(state.uploadedPhotos, async (file, index) => {
                const path = \`\${state.profile!.tenant_id}/\${responseData.id}/photos/\${Date.now()}-\${index}-\${file.name}\`;
                await supabase.storage.from('incident-attachments').upload(path, file);
                uploadedPaths.push(path);
              }, { compressImages: true, maxWidth: 1920, quality: 0.85 });
            }
            if (state.uploadedVideo) {
              await uploadFilesParallel([state.uploadedVideo], async (file, index) => {
                const path = \`\${state.profile!.tenant_id}/\${responseData.id}/videos/\${Date.now()}-\${index}-\${file.name}\`;
                await supabase.storage.from('incident-attachments').upload(path, file);
                uploadedPaths.push(path);
              }, { compressImages: false });
            }
            if (state.closedOnSpot && state.closedOnSpotPhotos.length > 0) {
              const closedOnSpotPaths: string[] = [];
              await uploadFilesParallel(state.closedOnSpotPhotos, async (file, index) => {
                const path = \`\${state.profile!.tenant_id}/\${responseData.id}/closed-on-spot/\${Date.now()}-\${index}-\${file.name}\`;
                await supabase.storage.from('incident-attachments').upload(path, file);
                closedOnSpotPaths.push(path);
              }, { compressImages: true, maxWidth: 1920, quality: 0.85 });
              if (closedOnSpotPaths.length > 0) {
                await supabase.from('incidents').update({ immediate_actions_data: { closed_on_spot: true, photo_paths: closedOnSpotPaths } }).eq('id', responseData.id);
              }
            }
          } catch (uploadError) { console.error('Upload Error:', uploadError); }
          finally { state.setIsUploading(false); }
        }
        
        if (state.selectedAsset && responseData?.id) {
          try { await linkAsset.mutateAsync({ incidentId: responseData.id, assetId: state.selectedAsset.id, linkType: 'involved' }); }
          catch (error) { console.error(error); }
        }
        
        state.setSubmittedIncident({ id: responseData.id, referenceId: responseData.reference_id || '' });
        setTimeout(() => { navigate(\`/incidents/\${responseData.id}\`); }, 3000);
      },
      onError: () => {
        state.setHasSubmitted(false);
        state.setIsConfirmSubmitting(false);
      }
    });
  };

  const handleClosedOnSpotConfirm = async () => {
    state.setShowClosedOnSpotConfirm(false);
    if (state.pendingSubmitData) await performSubmit(state.pendingSubmitData);
  };

  const handleObservationSubmit = async (values: FormValues) => {
    if (values.event_type === 'observation' && state.closedOnSpot) {
      state.setPendingSubmitData(values);
      state.setShowClosedOnSpotConfirm(true);
      return;
    }
    await performSubmit(values);
  };

  const onSubmit = async (values: FormValues) => {
    await handleObservationSubmit(values);
  };

  return {
    getReferencePreview, validateStep, goToNextStep, goToPreviousStep, goToStep, handleGetLocation,
    handleGpsConfirm, handleGpsChangeLocation, handleAnalyzeDescription, handleConfirmTranslation,
    handleConfirmAnalysis, performSubmit, handleClosedOnSpotConfirm, handleObservationSubmit, onSubmit,
    isFetchingAddress, handleAssetSelect, navigate,
  };
}`;

const barrelFile = `import { useIncidentReportState } from './useIncidentReportState';
import { useIncidentReportData } from './useIncidentReportData';
import { useIncidentReportSubmit } from './useIncidentReportSubmit';

export function useIncidentReport() {
  const state = useIncidentReportState();
  const data = useIncidentReportData(state);
  const submit = useIncidentReportSubmit(state, data);

  return {
    ...state,
    ...data,
    ...submit
  };
}`;

fs.writeFileSync(path.join(hooksDir, 'useIncidentReportState.ts'), stateFile);
fs.writeFileSync(path.join(hooksDir, 'useIncidentReportData.ts'), dataFile);
fs.writeFileSync(path.join(hooksDir, 'useIncidentReportSubmit.ts'), submitFile);
fs.writeFileSync(path.join(hooksDir, 'useIncidentReport.ts'), barrelFile);

console.log("useIncidentReport split completed!");
