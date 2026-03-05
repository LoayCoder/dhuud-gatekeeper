import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { useCreateIncident, type IncidentFormData, type ClosedOnSpotPayload } from '@/features/incidents';
import { useLinkAssetToIncident } from '@/features/incidents';
import { useReverseGeocode } from '@/hooks/use-reverse-geocode';
import { findNearestSite } from '@/lib/geo-utils';
import { uploadFilesParallel } from '@/lib/upload-utils';
import { type SeverityLevelV2 } from '@/lib/hsse-severity-levels';
import { FormValues } from '../types';
import { useIncidentReportState } from './useIncidentReportState';
import { useIncidentReportData } from './useIncidentReportData';
import { type SelectedAsset } from '@/features/incidents';

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
    return `${prefix}-${year}-XXXX (${state.t('incidents.preview')})`;
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
        state.form.setValue('location', `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        
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
      state.form.setValue('immediate_actions', result.immediateActions.map((a, i) => `${i + 1}. ${a}`).join('\n'));
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
                const path = `${state.profile!.tenant_id}/${responseData.id}/photos/${Date.now()}-${index}-${file.name}`;
                await supabase.storage.from('incident-attachments').upload(path, file);
                uploadedPaths.push(path);
              }, { compressImages: true, maxWidth: 1920, quality: 0.85 });
            }
            if (state.uploadedVideo) {
              await uploadFilesParallel([state.uploadedVideo], async (file, index) => {
                const path = `${state.profile!.tenant_id}/${responseData.id}/videos/${Date.now()}-${index}-${file.name}`;
                await supabase.storage.from('incident-attachments').upload(path, file);
                uploadedPaths.push(path);
              }, { compressImages: false });
            }
            if (state.closedOnSpot && state.closedOnSpotPhotos.length > 0) {
              const closedOnSpotPaths: string[] = [];
              await uploadFilesParallel(state.closedOnSpotPhotos, async (file, index) => {
                const path = `${state.profile!.tenant_id}/${responseData.id}/closed-on-spot/${Date.now()}-${index}-${file.name}`;
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
        setTimeout(() => { navigate(`/incidents/${responseData.id}`); }, 3000);
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
}
