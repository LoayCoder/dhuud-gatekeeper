import { useState, useMemo, useEffect, useCallback } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useOfflineReporting } from '@/hooks/use-offline-reporting';
import { useOfflineReportQueue } from '@/hooks/use-offline-report-queue';
import { useObservationAIValidator } from '@/features/incidents';
import { useAITags } from '@/hooks/use-ai-tags';
import { useCreateIncident } from '@/features/incidents';
import { useTenantSites } from '@/hooks/use-org-hierarchy';
import { useDepartmentsBySite } from '@/hooks/use-departments-by-site';
import { useTenantUsers } from '@/hooks/use-department-users';
import { useContractorWorkers } from '@/features/contractors/hooks/use-contractor-workers';
import { useContractorCompanies } from '@/features/contractors/hooks/use-contractor-companies';
import { useActiveEvent } from '@/hooks/use-special-events';
import { canCloseOnSpot, type SeverityLevelV2 } from '@/lib/hsse-severity-levels';
import { NearestSiteResult } from '@/lib/geo-utils';
import { createQuickObservationSchema, FormValues, OBSERVATION_TYPES } from '../types';

export function useQuickObservationCardState() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { profile } = useAuth();

  const schema = createQuickObservationSchema(t as (key: string, options?: unknown) => string);

  const { isOnline } = useNetworkStatus();
  const { isCacheReady, getOfflineSites, getOfflineDepartments, getOfflineContractorCompanies, prefetchReportingData } = useOfflineReporting();
  const { addReport, pendingCount } = useOfflineReportQueue();

  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [gpsDetectedSite, setGpsDetectedSite] = useState<NearestSiteResult | null>(null);
  const [gpsError, setGpsError] = useState<'none' | 'not_supported' | 'permission_denied' | 'unavailable' | 'timeout' | 'no_nearby_site'>('none');
  const [photos, setPhotos] = useState<File[]>([]);
  const [closedOnSpotPhotos, setClosedOnSpotPhotos] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submittedObservation, setSubmittedObservation] = useState<{ id: string; referenceId: string } | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [offlineSites, setOfflineSites] = useState<any[]>([]);
  const [offlineDepartments, setOfflineDepartments] = useState<any[]>([]);
  const [offlineContractorCompanies, setOfflineContractorCompanies] = useState<any[]>([]);

  const aiValidator = useObservationAIValidator();

  const { tags: availableObservationTags = [] } = useAITags('observation');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const createIncident = useCreateIncident();
  const { data: onlineSites = [] } = useTenantSites();
  const { data: tenantUsers = [] } = useTenantUsers();
  const { data: contractorWorkers = [] } = useContractorWorkers();
  const { data: onlineContractorCompanies = [] } = useContractorCompanies();
  const { data: activeEvent } = useActiveEvent();

  useEffect(() => {
    if (!isOnline && isCacheReady) {
      getOfflineSites().then(setOfflineSites);
      getOfflineDepartments().then(setOfflineDepartments);
      getOfflineContractorCompanies().then(setOfflineContractorCompanies);
    }
  }, [isOnline, isCacheReady, getOfflineSites, getOfflineDepartments, getOfflineContractorCompanies]);

  useEffect(() => {
    if (isOnline) prefetchReportingData();
  }, [isOnline, prefetchReportingData]);

  const sites = isOnline ? onlineSites : offlineSites;
  const contractorCompanies = isOnline ? onlineContractorCompanies : offlineContractorCompanies;

  const now = new Date();
  const currentDate = now.toISOString().split('T')[0];
  const currentTime = now.toTimeString().slice(0, 5);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: '', subtype: '', severity_v2: 'level_2',
      observed_date: currentDate, observed_time: currentTime,
      site_id: profile?.assigned_site_id || '',
      latitude: undefined, longitude: undefined,
      closed_on_spot: false, recognition_type: undefined,
      recognized_user_id: undefined, recognized_department_id: undefined,
      recognized_contractor_worker_id: undefined, is_against_contractor: false,
      related_contractor_company_id: undefined,
    },
  });

  const closedOnSpot = form.watch('closed_on_spot');
  const selectedSeverity = form.watch('severity_v2');
  const selectedSubtype = form.watch('subtype');
  const recognitionType = form.watch('recognition_type');
  const isAgainstContractor = form.watch('is_against_contractor');
  const selectedSiteId = form.watch('site_id');

  const allowCloseOnSpot = canCloseOnSpot(selectedSeverity as SeverityLevelV2);

  const isPositiveObservation = useMemo(() => {
    const type = OBSERVATION_TYPES.find(t => t.value === selectedSubtype);
    return type?.isPositive ?? false;
  }, [selectedSubtype]);

  const selectedSite = useMemo(() => sites.find(s => s.id === selectedSiteId), [sites, selectedSiteId]);

  const observationBranchId = selectedSite?.branch_id || null;

  const { departments: siteDepartments = [], usingFallback: departmentsUsingFallback } = useDepartmentsBySite(selectedSiteId, observationBranchId || undefined);

  const departments = isOnline ? siteDepartments : offlineDepartments;

  const isCrossBranchReport = !!(observationBranchId && profile?.assigned_branch_id && observationBranchId !== profile.assigned_branch_id);

  const locationFilteredContractorCompanies = useMemo(() => {
    if (!observationBranchId) return contractorCompanies;
    return contractorCompanies.filter(company => (company as any).assigned_branch_id === observationBranchId || !(company as any).assigned_branch_id);
  }, [contractorCompanies, observationBranchId]);

  useEffect(() => {
    if (!isPositiveObservation) {
      form.setValue('recognition_type', undefined);
      form.setValue('recognized_user_id', undefined);
      form.setValue('recognized_department_id', undefined);
      form.setValue('recognized_contractor_worker_id', undefined);
    }
  }, [isPositiveObservation, form]);

  return {
    t, i18n, direction, profile, form,
    isOnline, pendingCount, isGettingLocation, setIsGettingLocation,
    gpsDetectedSite, setGpsDetectedSite, gpsError, setGpsError,
    photos, setPhotos, closedOnSpotPhotos, setClosedOnSpotPhotos,
    isUploading, setIsUploading, uploadProgress, setUploadProgress,
    submittedObservation, setSubmittedObservation, hasSubmitted, setHasSubmitted,
    aiValidator, availableObservationTags, selectedTags, setSelectedTags,
    createIncident, sites, tenantUsers, contractorWorkers, contractorCompanies,
    activeEvent, closedOnSpot, selectedSeverity, selectedSubtype, recognitionType,
    isAgainstContractor, selectedSiteId, allowCloseOnSpot, isPositiveObservation,
    selectedSite, observationBranchId, departments, isCrossBranchReport,
    locationFilteredContractorCompanies, addReport
  };
}

