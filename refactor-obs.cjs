const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, 'src/components/incidents/QuickObservationCard.tsx');
let content = fs.readFileSync(sourceFile, 'utf8');

const targetDir = path.join(__dirname, 'src/components/incidents/QuickObservationCard');
const hooksDir = path.join(targetDir, 'hooks');

function extractBetween(str, startStr, endStr) {
    const startIdx = str.indexOf(startStr);
    if (startIdx === -1) return '';
    const rest = str.substring(startIdx + startStr.length);
    const endIdx = rest.indexOf(endStr);
    if (endIdx === -1) return '';
    return rest.substring(0, endIdx);
}

const rootImports = content.substring(0, content.indexOf('const OBSERVATION_TYPES = ['));

const hookStateContent = `import { useState, useMemo, useEffect, useCallback } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useOfflineReporting } from '@/hooks/use-offline-reporting';
import { useOfflineReportQueue } from '@/hooks/use-offline-report-queue';
import { useObservationAIValidator } from '@/hooks/use-observation-ai-validator';
import { useAITags } from '@/hooks/use-ai-tags';
import { useCreateIncident } from '@/hooks/use-incidents';
import { useTenantSites } from '@/hooks/use-org-hierarchy';
import { useDepartmentsBySite } from '@/hooks/use-departments-by-site';
import { useTenantUsers } from '@/hooks/use-department-users';
import { useContractorWorkers } from '@/hooks/contractor-management/use-contractor-workers';
import { useContractorCompanies } from '@/hooks/contractor-management/use-contractor-companies';
import { useActiveEvent } from '@/hooks/use-special-events';
import { canCloseOnSpot, type SeverityLevelV2 } from '@/lib/hsse-severity-levels';
import { NearestSiteResult } from '@/lib/geo-utils';
import { createQuickObservationSchema, FormValues, OBSERVATION_TYPES } from '../types';

export function useQuickObservationCardState() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { profile } = useAuth();
  
  const schema = createQuickObservationSchema(t);
  
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
    return contractorCompanies.filter(company => company.assigned_branch_id === observationBranchId || !company.assigned_branch_id);
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
`;
fs.writeFileSync(path.join(hooksDir, 'useQuickObservationCardState.ts'), hookStateContent);

const handleGetLocationSrc = extractBetween(content, 'const handleGetLocation = () => {', '  const handleConfirmTranslation');
const handleConfirmTranslationSrc = extractBetween(content, 'const handleConfirmTranslation = useCallback(() => {', '  const handleConfirmAnalysis');
const handleConfirmAnalysisSrc = extractBetween(content, 'const handleConfirmAnalysis = useCallback(() => {', '  const handleAnalyzeDescription');
const handleAnalyzeDescriptionSrc = extractBetween(content, 'const handleAnalyzeDescription = useCallback(async () => {', '  const handlePhotoCapture');
const handlePhotoCaptureSrc = extractBetween(content, 'const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>, isClosedOnSpot: boolean = false) => {', '  const removePhoto');
const removePhotoSrc = extractBetween(content, 'const removePhoto = (index: number, isClosedOnSpot: boolean = false) => {', '  const onSubmit');
const onSubmitSrc = extractBetween(content, 'const onSubmit = async (values: FormValues) => {', '  return (');

const hookHandlersContent = `import { useCallback } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { findNearestSite } from '@/lib/geo-utils';
import { uploadFilesParallel } from '@/lib/upload-utils';
import { FormValues } from '../types';
import { type SeverityLevelV2 } from '@/lib/hsse-severity-levels';
import { IncidentFormData, ClosedOnSpotPayload } from '@/hooks/use-incidents';
import { OfflineReportFormData, OfflineReportGPSData } from '@/hooks/use-offline-report-queue';

export function useQuickObservationCardHandlers(state: any) {
  const navigate = useNavigate();
  const {
    t, form, sites, setGpsError, setIsGettingLocation, setGpsDetectedSite,
    aiValidator, isOnline, hasSubmitted, setHasSubmitted, profile, selectedTags,
    addReport, setSubmittedObservation, activeEvent, selectedSite, createIncident,
    photos, closedOnSpotPhotos, setIsUploading, setUploadProgress, setPhotos,
    setClosedOnSpotPhotos
  } = state;

  const handleGetLocation = () => {${handleGetLocationSrc}
  const handleConfirmTranslation = useCallback(() => {${handleConfirmTranslationSrc}
  const handleConfirmAnalysis = useCallback(() => {${handleConfirmAnalysisSrc}
  const handleAnalyzeDescription = useCallback(async () => {${handleAnalyzeDescriptionSrc}
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>, isClosedOnSpot: boolean = false) => {${handlePhotoCaptureSrc}
  const removePhoto = (index: number, isClosedOnSpot: boolean = false) => {${removePhotoSrc}
  const onSubmit = async (values: FormValues) => {${onSubmitSrc}

  return { handleGetLocation, handleConfirmTranslation, handleConfirmAnalysis, handleAnalyzeDescription, handlePhotoCapture, removePhoto, onSubmit };
}
`;
fs.writeFileSync(path.join(hooksDir, 'useQuickObservationCardHandlers.ts'), hookHandlersContent);

const hookBarrelContent = `import { useQuickObservationCardState } from './useQuickObservationCardState';
import { useQuickObservationCardHandlers } from './useQuickObservationCardHandlers';

export function useQuickObservationCard() {
  const state = useQuickObservationCardState();
  const handlers = useQuickObservationCardHandlers(state);
  return { ...state, ...handlers };
}
`;
fs.writeFileSync(path.join(hooksDir, 'useQuickObservationCard.ts'), hookBarrelContent);

const jsxBody = extractBetween(content, '<div className="space-y-2">', '</form>');
const splitByComment = (fullStr, commentStart) => {
    const idx = fullStr.indexOf(commentStart);
    if (idx === -1) return [fullStr, ''];
    return [fullStr.substring(0, idx), fullStr.substring(idx)];
}

const p1 = splitByComment(jsxBody, '{/* Observation Date & Time */}');
const p2 = splitByComment(p1[1], '{/* Report Against Contractor Toggle - Only for Negative Observations */}');
const p3 = splitByComment(p2[1], '{/* Recognition Section - Only for Positive Observations */}');
const p4 = splitByComment(p3[1], '{/* Severity Level (5-Level System) */}');
const p5 = splitByComment(p4[1], '{/* GPS Location - Enhanced with warning state */}');
const p6 = splitByComment(p5[1], '{/* Closed on Spot Toggle - Only for L1-L2 */}');

const photoSection = '<div className="space-y-2">' + p1[0].replace('<div className="space-y-2">', '');
const detailsSection = p2[0];
const contractorSection = p3[0];
const recognitionSection = p4[0];
const severitySection = p5[0];
const locationSection = p6[0];
const footerSection = p6[1];

fs.writeFileSync(path.join(targetDir, 'QuickObservationCardFormPhotos.tsx'),
    \`import { Camera, ImagePlus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
export function QuickObservationCardFormPhotos({ photos, removePhoto, handlePhotoCapture }: any) {
  const { t } = useTranslation();
  return (
    \${photoSection}
  );
}\`
);

fs.writeFileSync(path.join(targetDir, 'QuickObservationCardForm.tsx'), 
\`import { Form } from '@/components/ui/form';
import { QuickObservationCardFormPhotos } from './QuickObservationCardFormPhotos';
import { QuickObservationCardFormDetails } from './QuickObservationCardFormDetails';
import { QuickObservationCardFormRecognition } from './QuickObservationCardFormRecognition';
import { QuickObservationCardFormLocation } from './QuickObservationCardFormLocation';
import { QuickObservationCardFormFooter } from './QuickObservationCardFormFooter';

export function QuickObservationCardForm({ state, form, onSubmit }: any) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <QuickObservationCardFormPhotos photos={state.photos} removePhoto={state.removePhoto} handlePhotoCapture={state.handlePhotoCapture} />
        <QuickObservationCardFormDetails state={state} form={form} />
        <QuickObservationCardFormRecognition state={state} form={form} />
        <QuickObservationCardFormLocation state={state} form={form} />
        <QuickObservationCardFormFooter state={state} form={form} />
      </form>
    </Form>
  );
}
\`
);

fs.writeFileSync(path.join(targetDir, 'QuickObservationCardFormDetails.tsx'), 
\`import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, Clock, Loader2, Sparkles, Tags } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AIAnalysisPanel } from '@/components/observations/AIAnalysisPanel';
import { AITagsSelector } from '@/components/ai/AITagsSelector';
import { OBSERVATION_TYPES } from './types';

export function QuickObservationCardFormDetails({ state, form }: any) {
  const { t } = useTranslation();
  const { isOnline, aiValidator, handleAnalyzeDescription, handleConfirmTranslation, handleConfirmAnalysis, availableObservationTags, selectedTags, setSelectedTags } = state;
  return (
    <>
      \${detailsSection}
    </>
  );
}\`
);

fs.writeFileSync(path.join(targetDir, 'QuickObservationCardFormRecognition.tsx'), 
\`import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Building2, Trophy, User, HardHat } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { RECOGNITION_TYPES } from './types';

export function QuickObservationCardFormRecognition({ state, form }: any) {
  const { t, i18n } = useTranslation();
  const { isPositiveObservation, selectedSubtype, isAgainstContractor, locationFilteredContractorCompanies, recognitionType, tenantUsers, departments, contractorWorkers } = state;
  return (
    <>
      \${contractorSection}
      \${recognitionSection}
    </>
  );
}\`
);

fs.writeFileSync(path.join(targetDir, 'QuickObservationCardFormLocation.tsx'), 
\`import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { MapPin, Building2, AlertTriangle, Loader2, RefreshCw, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SEVERITY_OPTIONS } from './types';

export function QuickObservationCardFormLocation({ state, form }: any) {
  const { t } = useTranslation();
  const { sites, isGettingLocation, gpsDetectedSite, gpsError, handleGetLocation, isCrossBranchReport, selectedSite } = state;
  return (
    <>
      \${severitySection}
      \${locationSection}
    </>
  );
}\`
);

fs.writeFileSync(path.join(targetDir, 'QuickObservationCardFormFooter.tsx'), 
\`import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Camera, ImagePlus, X, AlertTriangle, Loader2, WifiOff, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export function QuickObservationCardFormFooter({ state, form }: any) {
  const { t } = useTranslation();
  const { allowCloseOnSpot, closedOnSpot, closedOnSpotPhotos, removePhoto, handlePhotoCapture, photos, createIncident, isUploading, isOnline, aiValidator } = state;
  return (
    <>
      \${footerSection}
    </>
  );
}\`
);

const shellContent = \`import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WifiOff, AlertTriangle, X, Trophy } from 'lucide-react';
import { UploadProgressOverlay } from '@/components/ui/upload-progress';
import { OfflineReportingBanner } from '@/components/offline/OfflineReportingBanner';
import { SubmissionSuccessDialog } from '@/components/incidents/SubmissionSuccessDialog';
import { useQuickObservationCard } from './hooks/useQuickObservationCard';
import { QuickObservationCardForm } from './QuickObservationCardForm';
import { QuickObservationCardProps } from './types';

export default function QuickObservationCard({ onCancel }: QuickObservationCardProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const direction = i18n.dir();
  
  const state = useQuickObservationCard();
  const {
    isUploading, uploadProgress, isOnline, pendingCount,
    activeEvent, submittedObservation, form, onSubmit
  } = state;

  return (
    <div className="container max-w-lg py-6" dir={direction}>
      {isUploading && <UploadProgressOverlay isUploading={isUploading} current={Math.round(uploadProgress / 10)} total={10} />}
      
      {(!isOnline || pendingCount > 0) && (
        <OfflineReportingBanner compact className="mb-4" />
      )}
      
      <Card className="shadow-lg border-2">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl">
              {!isOnline && <WifiOff className="h-5 w-5 text-warning" />}
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              {t('quickObservation.title')}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {!isOnline 
              ? t('offline.offlineModeDescription', 'Your observation will be saved and synced when online')
              : t('quickObservation.subtitle')}
          </p>
        </CardHeader>
        
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
          <QuickObservationCardForm state={state} form={form} onSubmit={onSubmit} />
        </CardContent>
      </Card>
      
      <SubmissionSuccessDialog
        open={!!submittedObservation}
        referenceId={submittedObservation?.referenceId || ''}
        incidentId={submittedObservation?.id || ''}
        onViewIncident={
          ((submittedObservation?.id || '').startsWith('offline_'))
            ? undefined 
            : () => submittedObservation && navigate(\`/incidents/\${submittedObservation.id}\`)
        }
      />
    </div>
  );
}\`;
fs.writeFileSync(path.join(targetDir, 'QuickObservationCard.tsx'), shellContent);

const currentTypes = fs.readFileSync(path.join(targetDir, 'types.ts'), 'utf8');
const sevOptsStr = extractBetween(content, '// Use the 5-level severity system', 'const createQuickObservationSchema');
const fixedTypes = currentTypes.replace('export const RECOGNITION_TYPES', 
  \`\${sevOptsStr.trim().replace('const SEVERITY_OPTIONS', 'export const SEVERITY_OPTIONS')}

export const RECOGNITION_TYPES\`);
fs.writeFileSync(path.join(targetDir, 'types.ts'), fixedTypes);

console.log("Extraction complete!");
