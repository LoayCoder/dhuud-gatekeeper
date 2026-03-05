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

const hookStateContent =
    "import { useState, useMemo, useEffect, useCallback } from 'react';\n" +
    "import { useForm, UseFormReturn } from 'react-hook-form';\n" +
    "import { zodResolver } from '@hookform/resolvers/zod';\n" +
    "import { useTranslation } from 'react-i18next';\n" +
    "import { useAuth } from '@/contexts/AuthContext';\n" +
    "import { useNetworkStatus } from '@/hooks/use-network-status';\n" +
    "import { useOfflineReporting } from '@/hooks/use-offline-reporting';\n" +
    "import { useOfflineReportQueue } from '@/hooks/use-offline-report-queue';\n" +
    "import { useObservationAIValidator } from '@/hooks/use-observation-ai-validator';\n" +
    "import { useAITags } from '@/hooks/use-ai-tags';\n" +
    "import { useCreateIncident } from '@/hooks/use-incidents';\n" +
    "import { useTenantSites } from '@/hooks/use-org-hierarchy';\n" +
    "import { useDepartmentsBySite } from '@/hooks/use-departments-by-site';\n" +
    "import { useTenantUsers } from '@/hooks/use-department-users';\n" +
    "import { useContractorWorkers } from '@/hooks/contractor-management/use-contractor-workers';\n" +
    "import { useContractorCompanies } from '@/hooks/contractor-management/use-contractor-companies';\n" +
    "import { useActiveEvent } from '@/hooks/use-special-events';\n" +
    "import { canCloseOnSpot, type SeverityLevelV2 } from '@/lib/hsse-severity-levels';\n" +
    "import { NearestSiteResult } from '@/lib/geo-utils';\n" +
    "import { createQuickObservationSchema, FormValues, OBSERVATION_TYPES } from '../types';\n" +
    "\nexport function useQuickObservationCardState() {\n" +
    "  const { t, i18n } = useTranslation();\n" +
    "  const direction = i18n.dir();\n" +
    "  const { profile } = useAuth();\n" +
    "  \n" +
    "  const schema = createQuickObservationSchema(t);\n" +
    "  \n" +
    "  const { isOnline } = useNetworkStatus();\n" +
    "  const { isCacheReady, getOfflineSites, getOfflineDepartments, getOfflineContractorCompanies, prefetchReportingData } = useOfflineReporting();\n" +
    "  const { addReport, pendingCount } = useOfflineReportQueue();\n" +
    "  \n" +
    "  const [isGettingLocation, setIsGettingLocation] = useState(false);\n" +
    "  const [gpsDetectedSite, setGpsDetectedSite] = useState<NearestSiteResult | null>(null);\n" +
    "  const [gpsError, setGpsError] = useState<'none' | 'not_supported' | 'permission_denied' | 'unavailable' | 'timeout' | 'no_nearby_site'>('none');\n" +
    "  const [photos, setPhotos] = useState<File[]>([]);\n" +
    "  const [closedOnSpotPhotos, setClosedOnSpotPhotos] = useState<File[]>([]);\n" +
    "  const [isUploading, setIsUploading] = useState(false);\n" +
    "  const [uploadProgress, setUploadProgress] = useState(0);\n" +
    "  const [submittedObservation, setSubmittedObservation] = useState<{ id: string; referenceId: string } | null>(null);\n" +
    "  const [hasSubmitted, setHasSubmitted] = useState(false);\n" +
    "  const [offlineSites, setOfflineSites] = useState<any[]>([]);\n" +
    "  const [offlineDepartments, setOfflineDepartments] = useState<any[]>([]);\n" +
    "  const [offlineContractorCompanies, setOfflineContractorCompanies] = useState<any[]>([]);\n" +
    "  \n" +
    "  const aiValidator = useObservationAIValidator();\n" +
    "  \n" +
    "  const { tags: availableObservationTags = [] } = useAITags('observation');\n" +
    "  const [selectedTags, setSelectedTags] = useState<string[]>([]);\n" +
    "  \n" +
    "  const createIncident = useCreateIncident();\n" +
    "  const { data: onlineSites = [] } = useTenantSites();\n" +
    "  const { data: tenantUsers = [] } = useTenantUsers();\n" +
    "  const { data: contractorWorkers = [] } = useContractorWorkers();\n" +
    "  const { data: onlineContractorCompanies = [] } = useContractorCompanies();\n" +
    "  const { data: activeEvent } = useActiveEvent();\n" +
    "\n  useEffect(() => {\n" +
    "    if (!isOnline && isCacheReady) {\n" +
    "      getOfflineSites().then(setOfflineSites);\n" +
    "      getOfflineDepartments().then(setOfflineDepartments);\n" +
    "      getOfflineContractorCompanies().then(setOfflineContractorCompanies);\n" +
    "    }\n" +
    "  }, [isOnline, isCacheReady, getOfflineSites, getOfflineDepartments, getOfflineContractorCompanies]);\n" +
    "  \n" +
    "  useEffect(() => {\n" +
    "    if (isOnline) prefetchReportingData();\n" +
    "  }, [isOnline, prefetchReportingData]);\n" +
    "\n  const sites = isOnline ? onlineSites : offlineSites;\n" +
    "  const contractorCompanies = isOnline ? onlineContractorCompanies : offlineContractorCompanies;\n" +
    "  \n" +
    "  const now = new Date();\n" +
    "  const currentDate = now.toISOString().split('T')[0];\n" +
    "  const currentTime = now.toTimeString().slice(0, 5);\n" +
    "  \n" +
    "  const form = useForm<FormValues>({\n" +
    "    resolver: zodResolver(schema),\n" +
    "    defaultValues: {\n" +
    "      description: '', subtype: '', severity_v2: 'level_2',\n" +
    "      observed_date: currentDate, observed_time: currentTime,\n" +
    "      site_id: profile?.assigned_site_id || '',\n" +
    "      latitude: undefined, longitude: undefined,\n" +
    "      closed_on_spot: false, recognition_type: undefined,\n" +
    "      recognized_user_id: undefined, recognized_department_id: undefined,\n" +
    "      recognized_contractor_worker_id: undefined, is_against_contractor: false,\n" +
    "      related_contractor_company_id: undefined,\n" +
    "    },\n" +
    "  });\n" +
    "  \n" +
    "  const closedOnSpot = form.watch('closed_on_spot');\n" +
    "  const selectedSeverity = form.watch('severity_v2');\n" +
    "  const selectedSubtype = form.watch('subtype');\n" +
    "  const recognitionType = form.watch('recognition_type');\n" +
    "  const isAgainstContractor = form.watch('is_against_contractor');\n" +
    "  const selectedSiteId = form.watch('site_id');\n" +
    "  \n" +
    "  const allowCloseOnSpot = canCloseOnSpot(selectedSeverity as SeverityLevelV2);\n" +
    "  \n" +
    "  const isPositiveObservation = useMemo(() => {\n" +
    "    const type = OBSERVATION_TYPES.find(t => t.value === selectedSubtype);\n" +
    "    return type?.isPositive ?? false;\n" +
    "  }, [selectedSubtype]);\n" +
    "  \n" +
    "  const selectedSite = useMemo(() => sites.find(s => s.id === selectedSiteId), [sites, selectedSiteId]);\n" +
    "  \n" +
    "  const observationBranchId = selectedSite?.branch_id || null;\n" +
    "  \n" +
    "  const { departments: siteDepartments = [], usingFallback: departmentsUsingFallback } = useDepartmentsBySite(selectedSiteId, observationBranchId || undefined);\n" +
    "  \n" +
    "  const departments = isOnline ? siteDepartments : offlineDepartments;\n" +
    "  \n" +
    "  const isCrossBranchReport = !!(observationBranchId && profile?.assigned_branch_id && observationBranchId !== profile.assigned_branch_id);\n" +
    "  \n" +
    "  const locationFilteredContractorCompanies = useMemo(() => {\n" +
    "    if (!observationBranchId) return contractorCompanies;\n" +
    "    return contractorCompanies.filter(company => company.assigned_branch_id === observationBranchId || !company.assigned_branch_id);\n" +
    "  }, [contractorCompanies, observationBranchId]);\n" +
    "\n  useEffect(() => {\n" +
    "    if (!isPositiveObservation) {\n" +
    "      form.setValue('recognition_type', undefined);\n" +
    "      form.setValue('recognized_user_id', undefined);\n" +
    "      form.setValue('recognized_department_id', undefined);\n" +
    "      form.setValue('recognized_contractor_worker_id', undefined);\n" +
    "    }\n" +
    "  }, [isPositiveObservation, form]);\n" +
    "\n  return {\n" +
    "    t, i18n, direction, profile, form,\n" +
    "    isOnline, pendingCount, isGettingLocation, setIsGettingLocation,\n" +
    "    gpsDetectedSite, setGpsDetectedSite, gpsError, setGpsError,\n" +
    "    photos, setPhotos, closedOnSpotPhotos, setClosedOnSpotPhotos,\n" +
    "    isUploading, setIsUploading, uploadProgress, setUploadProgress,\n" +
    "    submittedObservation, setSubmittedObservation, hasSubmitted, setHasSubmitted,\n" +
    "    aiValidator, availableObservationTags, selectedTags, setSelectedTags,\n" +
    "    createIncident, sites, tenantUsers, contractorWorkers, contractorCompanies,\n" +
    "    activeEvent, closedOnSpot, selectedSeverity, selectedSubtype, recognitionType,\n" +
    "    isAgainstContractor, selectedSiteId, allowCloseOnSpot, isPositiveObservation,\n" +
    "    selectedSite, observationBranchId, departments, isCrossBranchReport,\n" +
    "    locationFilteredContractorCompanies, addReport\n" +
    "  };\n" +
    "}\n";

fs.writeFileSync(path.join(hooksDir, 'useQuickObservationCardState.ts'), hookStateContent);

const handleGetLocationSrc = extractBetween(content, 'const handleGetLocation = () => {', '  const handleConfirmTranslation');
const handleConfirmTranslationSrc = extractBetween(content, 'const handleConfirmTranslation = useCallback(() => {', '  const handleConfirmAnalysis');
const handleConfirmAnalysisSrc = extractBetween(content, 'const handleConfirmAnalysis = useCallback(() => {', '  const handleAnalyzeDescription');
const handleAnalyzeDescriptionSrc = extractBetween(content, 'const handleAnalyzeDescription = useCallback(async () => {', '  const handlePhotoCapture');
const handlePhotoCaptureSrc = extractBetween(content, 'const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>, isClosedOnSpot: boolean = false) => {', '  const removePhoto');
const removePhotoSrc = extractBetween(content, 'const removePhoto = (index: number, isClosedOnSpot: boolean = false) => {', '  const onSubmit');
const onSubmitSrc = extractBetween(content, 'const onSubmit = async (values: FormValues) => {', '  return (');

const hookHandlersContent =
    "import { useCallback } from 'react';\n" +
    "import { toast } from 'sonner';\n" +
    "import { useNavigate } from 'react-router-dom';\n" +
    "import { supabase } from '@/integrations/supabase/client';\n" +
    "import { findNearestSite } from '@/lib/geo-utils';\n" +
    "import { uploadFilesParallel } from '@/lib/upload-utils';\n" +
    "import { FormValues } from '../types';\n" +
    "import { type SeverityLevelV2 } from '@/lib/hsse-severity-levels';\n" +
    "import { IncidentFormData, ClosedOnSpotPayload } from '@/hooks/use-incidents';\n" +
    "import { OfflineReportFormData, OfflineReportGPSData } from '@/hooks/use-offline-report-queue';\n" +
    "\nexport function useQuickObservationCardHandlers(state: any) {\n" +
    "  const navigate = useNavigate();\n" +
    "  const {\n" +
    "    t, form, sites, setGpsError, setIsGettingLocation, setGpsDetectedSite,\n" +
    "    aiValidator, isOnline, hasSubmitted, setHasSubmitted, profile, selectedTags,\n" +
    "    addReport, setSubmittedObservation, activeEvent, selectedSite, createIncident,\n" +
    "    photos, closedOnSpotPhotos, setIsUploading, setUploadProgress, setPhotos,\n" +
    "    setClosedOnSpotPhotos\n" +
    "  } = state;\n" +
    "\n  const handleGetLocation = () => {" + handleGetLocationSrc +
    "  const handleConfirmTranslation = useCallback(() => {" + handleConfirmTranslationSrc +
    "  const handleConfirmAnalysis = useCallback(() => {" + handleConfirmAnalysisSrc +
    "  const handleAnalyzeDescription = useCallback(async () => {" + handleAnalyzeDescriptionSrc +
    "  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>, isClosedOnSpot: boolean = false) => {" + handlePhotoCaptureSrc +
    "  const removePhoto = (index: number, isClosedOnSpot: boolean = false) => {" + removePhotoSrc +
    "  const onSubmit = async (values: FormValues) => {" + onSubmitSrc +
    "\n  return { handleGetLocation, handleConfirmTranslation, handleConfirmAnalysis, handleAnalyzeDescription, handlePhotoCapture, removePhoto, onSubmit };\n" +
    "}\n";

fs.writeFileSync(path.join(hooksDir, 'useQuickObservationCardHandlers.ts'), hookHandlersContent);

const hookBarrelContent =
    "import { useQuickObservationCardState } from './useQuickObservationCardState';\n" +
    "import { useQuickObservationCardHandlers } from './useQuickObservationCardHandlers';\n" +
    "\nexport function useQuickObservationCard() {\n" +
    "  const state = useQuickObservationCardState();\n" +
    "  const handlers = useQuickObservationCardHandlers(state);\n" +
    "  return { ...state, ...handlers };\n" +
    "}\n";
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
    "import { ReactElement } from 'react';\n" +
    "import { Camera, ImagePlus, X } from 'lucide-react';\n" +
    "import { useTranslation } from 'react-i18next';\n" +
    "export function QuickObservationCardFormPhotos({ photos, removePhoto, handlePhotoCapture }: any) {\n" +
    "  const { t } = useTranslation();\n" +
    "  return (\n    " + photoSection + "\n  );\n}"
);

fs.writeFileSync(path.join(targetDir, 'QuickObservationCardForm.tsx'),
    "import { Form } from '@/components/ui/form';\n" +
    "import { QuickObservationCardFormPhotos } from './QuickObservationCardFormPhotos';\n" +
    "import { QuickObservationCardFormDetails } from './QuickObservationCardFormDetails';\n" +
    "import { QuickObservationCardFormRecognition } from './QuickObservationCardFormRecognition';\n" +
    "import { QuickObservationCardFormLocation } from './QuickObservationCardFormLocation';\n" +
    "import { QuickObservationCardFormFooter } from './QuickObservationCardFormFooter';\n" +
    "\nexport function QuickObservationCardForm({ state, form, onSubmit }: any) {\n" +
    "  return (\n" +
    "    <Form {...form}>\n" +
    "      <form onSubmit={form.handleSubmit(onSubmit)} className=\"space-y-5\">\n" +
    "        <QuickObservationCardFormPhotos photos={state.photos} removePhoto={state.removePhoto} handlePhotoCapture={state.handlePhotoCapture} />\n" +
    "        <QuickObservationCardFormDetails state={state} form={form} />\n" +
    "        <QuickObservationCardFormRecognition state={state} form={form} />\n" +
    "        <QuickObservationCardFormLocation state={state} form={form} />\n" +
    "        <QuickObservationCardFormFooter state={state} form={form} />\n" +
    "      </form>\n" +
    "    </Form>\n  );\n}\n"
);

fs.writeFileSync(path.join(targetDir, 'QuickObservationCardFormDetails.tsx'),
    "import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';\n" +
    "import { Input } from '@/components/ui/input';\n" +
    "import { Textarea } from '@/components/ui/textarea';\n" +
    "import { Button } from '@/components/ui/button';\n" +
    "import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';\n" +
    "import { CalendarDays, Clock, Loader2, Sparkles, Tags } from 'lucide-react';\n" +
    "import { useTranslation } from 'react-i18next';\n" +
    "import { AIAnalysisPanel } from '@/components/observations/AIAnalysisPanel';\n" +
    "import { AITagsSelector } from '@/components/ai/AITagsSelector';\n" +
    "import { OBSERVATION_TYPES } from './types';\n" +
    "\nexport function QuickObservationCardFormDetails({ state, form }: any) {\n" +
    "  const { t } = useTranslation();\n" +
    "  const { isOnline, aiValidator, handleAnalyzeDescription, handleConfirmTranslation, handleConfirmAnalysis, availableObservationTags, selectedTags, setSelectedTags } = state;\n" +
    "  return (\n    <>      " + detailsSection + "\n    </>\n  );\n}\n"
);

fs.writeFileSync(path.join(targetDir, 'QuickObservationCardFormRecognition.tsx'),
    "import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';\n" +
    "import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';\n" +
    "import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';\n" +
    "import { Switch } from '@/components/ui/switch';\n" +
    "import { Building2, Trophy, User, HardHat } from 'lucide-react';\n" +
    "import { useTranslation } from 'react-i18next';\n" +
    "import { cn } from '@/lib/utils';\n" +
    "import { RECOGNITION_TYPES } from './types';\n" +
    "\nexport function QuickObservationCardFormRecognition({ state, form }: any) {\n" +
    "  const { t, i18n } = useTranslation();\n" +
    "  const { isPositiveObservation, selectedSubtype, isAgainstContractor, locationFilteredContractorCompanies, recognitionType, tenantUsers, departments, contractorWorkers } = state;\n" +
    "  return (\n    <>      " + contractorSection + "\n      " + recognitionSection + "\n    </>\n  );\n}\n"
);

fs.writeFileSync(path.join(targetDir, 'QuickObservationCardFormLocation.tsx'),
    "import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';\n" +
    "import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';\n" +
    "import { Button } from '@/components/ui/button';\n" +
    "import { Badge } from '@/components/ui/badge';\n" +
    "import { Alert, AlertDescription } from '@/components/ui/alert';\n" +
    "import { cn } from '@/lib/utils';\n" +
    "import { MapPin, Building2, AlertTriangle, Loader2, RefreshCw, Info } from 'lucide-react';\n" +
    "import { useTranslation } from 'react-i18next';\n" +
    "import { SEVERITY_OPTIONS } from './types';\n" +
    "\nexport function QuickObservationCardFormLocation({ state, form }: any) {\n" +
    "  const { t } = useTranslation();\n" +
    "  const { sites, isGettingLocation, gpsDetectedSite, gpsError, handleGetLocation, isCrossBranchReport, selectedSite } = state;\n" +
    "  return (\n    <>      " + severitySection + "\n      " + locationSection + "\n    </>\n  );\n}\n"
);

fs.writeFileSync(path.join(targetDir, 'QuickObservationCardFormFooter.tsx'),
    "import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';\n" +
    "import { Switch } from '@/components/ui/switch';\n" +
    "import { Button } from '@/components/ui/button';\n" +
    "import { Alert, AlertDescription } from '@/components/ui/alert';\n" +
    "import { CheckCircle2, Camera, ImagePlus, X, AlertTriangle, Loader2, WifiOff, Send } from 'lucide-react';\n" +
    "import { useTranslation } from 'react-i18next';\n" +
    "import { cn } from '@/lib/utils';\n" +
    "\nexport function QuickObservationCardFormFooter({ state, form }: any) {\n" +
    "  const { t } = useTranslation();\n" +
    "  const { allowCloseOnSpot, closedOnSpot, closedOnSpotPhotos, removePhoto, handlePhotoCapture, photos, createIncident, isUploading, isOnline, aiValidator } = state;\n" +
    "  return (\n    <>      " + footerSection + "\n    </>\n  );\n}\n"
);

const shellContent =
    "import { useTranslation } from 'react-i18next';\n" +
    "import { useNavigate } from 'react-router-dom';\n" +
    "import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';\n" +
    "import { Button } from '@/components/ui/button';\n" +
    "import { WifiOff, AlertTriangle, X, Trophy } from 'lucide-react';\n" +
    "import { UploadProgressOverlay } from '@/components/ui/upload-progress';\n" +
    "import { OfflineReportingBanner } from '@/components/offline/OfflineReportingBanner';\n" +
    "import { SubmissionSuccessDialog } from '@/components/incidents/SubmissionSuccessDialog';\n" +
    "import { useQuickObservationCard } from './hooks/useQuickObservationCard';\n" +
    "import { QuickObservationCardForm } from './QuickObservationCardForm';\n" +
    "import { QuickObservationCardProps } from './types';\n" +
    "\nexport default function QuickObservationCard({ onCancel }: QuickObservationCardProps) {\n" +
    "  const { t, i18n } = useTranslation();\n" +
    "  const navigate = useNavigate();\n" +
    "  const direction = i18n.dir();\n  \n" +
    "  const state = useQuickObservationCard();\n" +
    "  const {\n" +
    "    isUploading, uploadProgress, isOnline, pendingCount,\n" +
    "    activeEvent, submittedObservation, form, onSubmit\n" +
    "  } = state;\n" +
    "\n  return (\n" +
    "    <div className=\"container max-w-lg py-6\" dir={direction}>\n" +
    "      {isUploading && <UploadProgressOverlay isUploading={isUploading} current={Math.round(uploadProgress / 10)} total={10} />}\n" +
    "      \n" +
    "      {(!isOnline || pendingCount > 0) && (\n" +
    "        <OfflineReportingBanner compact className=\"mb-4\" />\n" +
    "      )}\n" +
    "      \n" +
    "      <Card className=\"shadow-lg border-2\">\n" +
    "        <CardHeader className=\"pb-4\">\n" +
    "          <div className=\"flex items-center justify-between\">\n" +
    "            <CardTitle className=\"flex items-center gap-2 text-xl\">\n" +
    "              {!isOnline && <WifiOff className=\"h-5 w-5 text-warning\" />}\n" +
    "              <AlertTriangle className=\"h-5 w-5 text-yellow-500\" />\n" +
    "              {t('quickObservation.title')}\n" +
    "            </CardTitle>\n" +
    "            <Button variant=\"ghost\" size=\"icon\" onClick={onCancel}>\n" +
    "              <X className=\"h-5 w-5\" />\n" +
    "            </Button>\n" +
    "          </div>\n" +
    "          <p className=\"text-sm text-muted-foreground mt-1\">\n" +
    "            {!isOnline \n" +
    "              ? t('offline.offlineModeDescription', 'Your observation will be saved and synced when online')\n" +
    "              : t('quickObservation.subtitle')}\n" +
    "          </p>\n" +
    "        </CardHeader>\n" +
    "        \n" +
    "        {activeEvent && (\n" +
    "          <div className=\"mx-4 mb-4 rounded-lg border-2 border-info bg-info/5 p-3\">\n" +
    "            <div className=\"flex items-start gap-2\">\n" +
    "              <div className=\"flex-shrink-0 rounded-full bg-info p-1.5\">\n" +
    "                <Trophy className=\"h-4 w-4 text-info-foreground\" />\n" +
    "              </div>\n" +
    "              <div className=\"flex-1 min-w-0\">\n" +
    "                <p className=\"text-xs font-medium text-foreground\">\n" +
    "                  {t('specialEvents.eventBannerTitle')}\n" +
    "                </p>\n" +
    "                <p className=\"text-sm font-bold text-info truncate\">\n" +
    "                  {activeEvent.name}\n" +
    "                </p>\n" +
    "                <p className=\"text-xs text-muted-foreground mt-1\">\n" +
    "                  {t('specialEvents.eventBannerNote')}\n" +
    "                </p>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "          </div>\n" +
    "        )}\n" +
    "        \n" +
    "        <CardContent>\n" +
    "          <QuickObservationCardForm state={state} form={form} onSubmit={onSubmit} />\n" +
    "        </CardContent>\n" +
    "      </Card>\n" +
    "      \n" +
    "      <SubmissionSuccessDialog\n" +
    "        open={!!submittedObservation}\n" +
    "        referenceId={submittedObservation?.referenceId || ''}\n" +
    "        incidentId={submittedObservation?.id || ''}\n" +
    "        onViewIncident={\n" +
    "          ((submittedObservation?.id || '').startsWith('offline_'))\n" +
    "            ? undefined \n" +
    "            : () => submittedObservation && navigate(`/incidents/${submittedObservation.id}`)\n" +
    "        }\n" +
    "      />\n" +
    "    </div>\n" +
    "  );\n}\n";

fs.writeFileSync(path.join(targetDir, 'QuickObservationCard.tsx'), shellContent);

const currentTypes = fs.readFileSync(path.join(targetDir, 'types.ts'), 'utf8');
const sevOptsStr = extractBetween(content, '// Use the 5-level severity system', 'const createQuickObservationSchema');
const fixedTypes = currentTypes.replace('export const RECOGNITION_TYPES',
    sevOptsStr.trim().replace('const SEVERITY_OPTIONS', 'export const SEVERITY_OPTIONS') + "\n\nexport const RECOGNITION_TYPES");
fs.writeFileSync(path.join(targetDir, 'types.ts'), fixedTypes);

console.log("Extraction complete!");
