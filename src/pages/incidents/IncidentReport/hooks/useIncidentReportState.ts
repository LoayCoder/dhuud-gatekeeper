import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useAITags } from '@/hooks/use-ai-tags';
import { useAIAutoTrigger } from '@/hooks/use-ai-auto-trigger';
import { type SelectedAsset } from '@/features/incidents';
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
}
