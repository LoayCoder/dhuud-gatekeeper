const fs = require('fs');
const path = require('path');

const srcPath = 'src/pages/incidents/IncidentReport.tsx';
const targetDir = 'src/pages/incidents/IncidentReport';
const hooksDir = path.join(targetDir, 'hooks');

if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
if (!fs.existsSync(hooksDir)) fs.mkdirSync(hooksDir, { recursive: true });

let content = fs.readFileSync(srcPath, 'utf8');

// ==== 1. Extract types.ts ====
let typesCode = `import { z } from 'zod';\n\n`;
// Find the schema definition using match
const schemaMatch = content.match(/(const createIncidentFormSchema = \([\s\S]*?)const OBSERVATION_TYPES =/);
if (schemaMatch) {
    let schemaBlock = schemaMatch[1].trim();
    // schemaBlock contains `const createIncidentFormSchema = ... type FormValues = ...`
    schemaBlock = schemaBlock.replace('const createIncidentFormSchema', 'export const createIncidentFormSchema');
    schemaBlock = schemaBlock.replace('type FormValues', 'export type FormValues');
    typesCode += schemaBlock + '\n';
    content = content.replace(schemaMatch[1], ''); // remove from main
}
fs.writeFileSync(path.join(targetDir, 'types.ts'), typesCode);


// ==== 2. Extract helpers.ts ====
const helpersMatch = content.match(/(const OBSERVATION_TYPES = [\s\S]*?)export default function IncidentReport/);
if (helpersMatch) {
    let helpersBlock = helpersMatch[1].trim();
    helpersBlock = helpersBlock.replace(/const /g, 'export const ');
    fs.writeFileSync(path.join(targetDir, 'helpers.ts'), helpersBlock + '\n');
    content = content.replace(helpersMatch[1], ''); // remove from main
}


// ==== 3. Extract useIncidentReport.ts ====
const hookStartMarker = 'export default function IncidentReport() {';
const hookEndMarker = '  // Step Indicator Component';

const startIdx = content.indexOf(hookStartMarker);
const endIdx = content.indexOf(hookEndMarker);

if (startIdx !== -1 && endIdx !== -1) {
    let hookBody = content.slice(startIdx + hookStartMarker.length, endIdx);

    // Replace schema call to use imported one
    // We assume all hooks, state, etc are within this block.
    // Extract all the declarations to return them
    const varsToReturn = [
        't', 'i18n', 'direction', 'reportMode', 'setReportMode', 'currentStep', 'setCurrentStep',
        'isGettingLocation', 'coordinates', 'selectedAsset', 'setSelectedAsset', 'availableIncidentTags',
        'selectedTags', 'setSelectedTags', 'isApplyingAISuggestions', 'pendingAISubtype', 'autoDetectedBranch',
        'autoDetectedSite', 'gpsDetectedSite', 'gpsDetectedBranch', 'noSiteNearby', 'gpsLocationConfirmed',
        'gpsAccuracy', 'locationAddress', 'uploadedPhotos', 'setUploadedPhotos', 'uploadedVideo', 'setUploadedVideo',
        'isUploading', 'activeEventId', 'setActiveEventId', 'showConfirmation', 'setShowConfirmation', 'closedOnSpot',
        'setClosedOnSpot', 'closedOnSpotPhotos', 'setClosedOnSpotPhotos', 'showClosedOnSpotConfirm', 'setShowClosedOnSpotConfirm',
        'pendingSubmitData', 'isConfirmSubmitting', 'hasSubmitted', 'submittedIncident', 'form', 'hasInjury', 'hasDamage',
        'eventType', 'incidentType', 'isAgainstContractor', 'selectedBranchId', 'selectedSiteId', 'isAutoTriggerEnabled',
        'setAutoTriggerEnabled', 'isPendingAutoTrigger', 'aiValidator', 'isObservation', 'filteredSites', 'filteredDepartments',
        'departmentsLoading', 'departmentsUsingFallback', 'dynamicSubtypes', 'subtypeOptions', 'getReferencePreview',
        'goToNextStep', 'goToPreviousStep', 'goToStep', 'handleGetLocation', 'handleGpsConfirm', 'handleGpsChangeLocation',
        'handleAnalyzeDescription', 'handleConfirmTranslation', 'handleConfirmAnalysis', 'handleObservationSubmit', 'handleClosedOnSpotConfirm',
        'contractorCompanies', 'branches', 'sites', 'branchesLoading', 'sitesLoading', 'dynamicCategories', 'isFetchingAddress', 'handleAssetSelect', 'onSubmit', 'navigate', 'profile'
    ];

    let hookExports = `import { useState, useEffect, useCallback, useMemo, useRef } from 'react';\nimport { toast } from 'sonner';\nimport { logger } from '@/lib/logger';\nimport { useNavigate, useSearchParams } from 'react-router-dom';\nimport { useForm } from 'react-hook-form';\nimport { zodResolver } from '@hookform/resolvers/zod';\nimport { useTranslation } from 'react-i18next';\nimport { supabase } from '@/integrations/supabase/client';\nimport { useCreateIncident, type IncidentFormData, type ClosedOnSpotPayload } from '@/hooks/use-incidents';\nimport { useTenantSites, useTenantBranches } from '@/hooks/use-org-hierarchy';\nimport { useDepartmentsBySite } from '@/hooks/use-departments-by-site';\nimport { useLinkAssetToIncident } from '@/hooks/use-incident-assets';\nimport { useIncidentAIValidator } from '@/hooks/use-incident-ai-validator';\nimport { useAIAutoTrigger } from '@/hooks/use-ai-auto-trigger';\nimport { useAITags } from '@/hooks/use-ai-tags';\nimport { useReverseGeocode, type LocationAddress } from '@/hooks/use-reverse-geocode';\nimport { findNearestSite, type NearestSiteResult } from '@/lib/geo-utils';\nimport { uploadFilesParallel } from '@/lib/upload-utils';\nimport { getSubtypesForEventType } from '@/lib/hsse-event-types';\nimport { useActiveEventCategories } from '@/hooks/use-active-event-categories';\nimport { useActiveEventSubtypes } from '@/hooks/use-active-event-subtypes';\nimport { useContractorCompanies } from '@/hooks/contractor-management/use-contractor-companies';\nimport { useAuth } from '@/contexts/AuthContext';\nimport { type SelectedAsset } from '@/components/incidents/AssetSelectionSection';\nimport { type SeverityLevelV2 } from '@/lib/hsse-severity-levels';\nimport { createIncidentFormSchema, FormValues } from '../types';\nimport { OBSERVATION_TYPES } from '../helpers';\n\nexport function useIncidentReport() {\n`;

    hookExports += hookBody;

    hookExports += `\n  return {\n    ${varsToReturn.join(', ')}\n  };\n}\n`;
    fs.writeFileSync(path.join(hooksDir, 'useIncidentReport.ts'), hookExports);

    // ==== 4. Extract Form Component and 5. Main wrapper ====
    let formBody = content.slice(endIdx);
    // remove the trailing syntax of original component closing
    const lastCurlyIdx = formBody.lastIndexOf('}');
    if (lastCurlyIdx !== -1) {
        formBody = formBody.substring(0, lastCurlyIdx);
    }

    // Prepend imports to form
    let formImports = `import React from 'react';\nimport { cn } from '@/lib/utils';\nimport { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';\nimport { Input } from '@/components/ui/input';\nimport { Textarea } from '@/components/ui/textarea';\nimport { Button } from '@/components/ui/button';\nimport { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';\nimport { Switch } from '@/components/ui/switch';\nimport { Badge } from '@/components/ui/badge';\nimport { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';\nimport { MapPin, Loader2, Sparkles, AlertTriangle, CheckCircle2, FileText, Info, Navigation, Camera, ChevronRight, ChevronLeft, Check, Trophy, Eye, Siren, Building2 } from 'lucide-react';\nimport { QuickObservationCard } from '@/components/incidents/QuickObservationCard';\nimport MediaUploadSection from '@/components/incidents/MediaUploadSection';\nimport { ClosedOnSpotSection, ClosedOnSpotConfirmDialog } from '@/components/incidents/ClosedOnSpotSection';\nimport { SubmissionSuccessDialog } from '@/components/incidents/SubmissionSuccessDialog';\nimport { AssetSelectionSection } from '@/components/incidents/AssetSelectionSection';\nimport { AIIncidentAnalysisPanel } from '@/components/incidents/AIIncidentAnalysisPanel';\nimport { AITagsSelector } from '@/components/ai/AITagsSelector';\nimport { GPSLocationConfirmCard } from '@/components/incidents/GPSLocationConfirmCard';\nimport { ActiveEventBanner } from '@/components/incidents/ActiveEventBanner';\nimport { NotificationPreview } from '@/components/incidents/NotificationPreview';\nimport { Alert, AlertDescription } from '@/components/ui/alert';\nimport { HSSE_SEVERITY_LEVELS, calculateMinimumSeverity, isSeverityBelowMinimum } from '@/lib/hsse-severity-levels';\nimport { HSSE_EVENT_TYPES, getSubtypesForEventType } from '@/lib/hsse-event-types';\nimport { WIZARD_STEPS, RISK_RATING_LEVELS } from './helpers';\n`;

    let formComponent = `${formImports}\nexport function IncidentReportForm({ viewProps }: { viewProps: any }) {\n  const { ${varsToReturn.join(', ')} } = viewProps;\n\n${formBody}\n}\n`;

    fs.writeFileSync(path.join(targetDir, 'IncidentReportForm.tsx'), formComponent);

    // ==== Boilerplate index.tsx and Main component ====
    fs.writeFileSync(path.join(targetDir, 'index.tsx'), `export { default } from './IncidentReport';\n`);

    let mainComponent = `import React from 'react';\nimport { useIncidentReport } from './hooks/useIncidentReport';\nimport { IncidentReportForm } from './IncidentReportForm';\n\nexport default function IncidentReport() {\n  const viewProps = useIncidentReport();\n  return <IncidentReportForm viewProps={viewProps} />;\n}\n`;
    fs.writeFileSync(path.join(targetDir, 'IncidentReport.tsx'), mainComponent);

    // remove the original file after extraction
    fs.rmSync(srcPath);

    console.log('IncidentReport extraction complete.');
} else {
    console.log('Failed to find hook boundaries.');
}
