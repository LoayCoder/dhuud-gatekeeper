import { useCallback } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { findNearestSite } from '@/lib/geo-utils';
import { uploadFilesParallel } from '@/lib/upload-utils';
import { FormValues } from '../types';
import { type SeverityLevelV2 } from '@/lib/hsse-severity-levels';
import { IncidentFormData, ClosedOnSpotPayload } from '@/features/incidents';
import { OfflineReportFormData, OfflineReportGPSData } from '@/hooks/use-offline-report-queue';

export function useQuickObservationCardHandlers(state: unknown) {
  const navigate = useNavigate();
  const {
    t, form, sites, setGpsError, setIsGettingLocation, setGpsDetectedSite,
    aiValidator, isOnline, hasSubmitted, setHasSubmitted, profile, selectedTags,
    addReport, setSubmittedObservation, activeEvent, selectedSite, createIncident,
    photos, closedOnSpotPhotos, setIsUploading, setUploadProgress, setPhotos,
    setClosedOnSpotPhotos
  } = state;

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
    // Prevent double-submission
    if (hasSubmitted) return;
    setHasSubmitted(true);
    
    // Build closed_on_spot_data
    let closedOnSpotData: ClosedOnSpotPayload | undefined;
    if (values.closed_on_spot) {
      closedOnSpotData = {
        closed_on_spot: true,
        photo_paths: [],
      };
    }
    
    // Prepare GPS data for offline storage
    const gpsData: OfflineReportGPSData | null = values.latitude && values.longitude ? {
      latitude: values.latitude,
      longitude: values.longitude,
      accuracy: 10, // Default accuracy
      captured_at: new Date().toISOString(),
    } : null;
    
    // OFFLINE MODE: Store locally and show success
    if (!isOnline) {
      // Combine user-selected date and time into occurred_at
      // Convert local date/time to proper ISO timestamp (UTC) to avoid timezone mismatch
      const localDateTimeOffline = new Date(`${values.observed_date}T${values.observed_time}:00`);
      const observedDateTime = localDateTimeOffline.toISOString();
      
      const offlineFormData: OfflineReportFormData = {
        title: values.description.slice(0, 80) + (values.description.length > 80 ? '...' : ''),
        description: values.description,
        event_type: 'observation',
        subtype: values.subtype,
        occurred_at: observedDateTime,
        site_id: values.site_id || undefined,
        severity: values.severity_v2,
        risk_rating: values.severity_v2 === 'level_1' ? 'low' : values.severity_v2 === 'level_2' ? 'medium' : 'high',
        location: '',
        immediate_actions: '',
        has_injury: false,
        has_damage: false,
        is_against_contractor: values.is_against_contractor,
        related_contractor_company_id: values.is_against_contractor ? values.related_contractor_company_id : undefined,
        selected_tags: selectedTags.length > 0 ? selectedTags : undefined,
        closed_on_spot: values.closed_on_spot,
        department_id: values.recognition_type === 'department' ? values.recognized_department_id : profile?.assigned_department_id,
      };
      
      const offlineId = await addReport(offlineFormData, gpsData, photos, closedOnSpotPhotos, null);
      
      if (offlineId) {
        // Show offline success with special messaging
        setSubmittedObservation({
          id: offlineId,
          referenceId: t('offline.pendingSync'),
        });
        
        // Navigate back after delay
        setTimeout(() => {
          onCancel();
        }, 3000);
      } else {
        setHasSubmitted(false);
        toast.error(t('offline.failedToSaveOffline'));
      }
      return;
    }
    
    // Combine user-selected date and time into occurred_at for online submission
    // Convert local date/time to proper ISO timestamp (UTC) to avoid timezone mismatch
    const localDateTimeOnline = new Date(`${values.observed_date}T${values.observed_time}:00`);
    const observedDateTimeOnline = localDateTimeOnline.toISOString();
    
    // ONLINE MODE: Normal submission flow
    const formData: IncidentFormData = {
      title: values.description.slice(0, 80) + (values.description.length > 80 ? '...' : ''),
      description: values.description,
      event_type: 'observation',
      subtype: values.subtype,
      occurred_at: observedDateTimeOnline,
      severity: values.severity_v2 as SeverityLevelV2,
      // Map severity_v2 to risk_rating for backward compatibility
      risk_rating: values.severity_v2 === 'level_1' ? 'low' : values.severity_v2 === 'level_2' ? 'medium' : 'high',
      site_id: values.site_id || undefined,
      // Set branch_id from selected site (where observation occurred)
      branch_id: selectedSite?.branch_id || undefined,
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
        
        // Show success dialog and auto-redirect after 3 seconds
        setSubmittedObservation({
          id: data.id,
          referenceId: data.reference_id || '',
        });
        
        setTimeout(() => {
          navigate(`/incidents/${data.id}`);
        }, 3000);
      },
      onError: () => {
        // Reset submission guard on error
        setHasSubmitted(false);
      },
    });
  };
  

  return { handleGetLocation, handleConfirmTranslation, handleConfirmAnalysis, handleAnalyzeDescription, handlePhotoCapture, removePhoto, onSubmit };
}

