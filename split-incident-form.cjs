const fs = require('fs');
const path = require('path');

const fileSrc = 'src/pages/incidents/IncidentReport/IncidentReportForm.tsx';
const targetDir = 'src/pages/incidents/IncidentReport';

if (!fs.existsSync(fileSrc)) {
    console.log('Source file not found');
    process.exit(1);
}

let content = fs.readFileSync(fileSrc, 'utf8');

const importsMatch = content.match(/import React.*?from 'react';[\s\S]*?import \{ WIZARD_STEPS.*?\} from '\.\/helpers';/);
const importsStr = importsMatch ? importsMatch[0] : '';
let baseImports = importsStr;

// Extract StepIndicator
const stepIndicatorStart = content.indexOf('const StepIndicator = () => (');
const eventTypeSelectorStart = content.indexOf('const EventTypeSelector = () => (');

if (stepIndicatorStart > -1 && eventTypeSelectorStart > -1) {
    let stepIndBody = content.slice(stepIndicatorStart, eventTypeSelectorStart);
    let stepIndFile = `import React from 'react';\nimport { Check, ChevronRight } from 'lucide-react';\nimport { cn } from '@/lib/utils';\nimport { WIZARD_STEPS } from './helpers';\n\nexport ${stepIndBody.trim()}`;
    // Needs t, goToStep, currentStep
    stepIndFile = stepIndFile.replace('const StepIndicator = () => (', 'const StepIndicator = ({ currentStep, goToStep, t }: any) => (');
    fs.writeFileSync(path.join(targetDir, 'StepIndicator.tsx'), stepIndFile);
    content = content.replace(stepIndBody, '');
    content = content.replace('<StepIndicator />', '<StepIndicator currentStep={currentStep} goToStep={goToStep} t={t} />');
}

// Extract EventTypeSelector
const ifNoReportMode = content.indexOf('if (reportMode === null) {');
if (eventTypeSelectorStart > -1 && ifNoReportMode > -1) {
    let evtBody = content.slice(content.indexOf('const EventTypeSelector = () => ('), ifNoReportMode);
    let evtFile = `import React from 'react';\nimport { Eye, Siren, CheckCircle2, FileText } from 'lucide-react';\nimport { Card, CardContent } from '@/components/ui/card';\nimport { Badge } from '@/components/ui/badge';\n\nexport ${evtBody.trim()}`;
    evtFile = evtFile.replace('const EventTypeSelector = () => (', 'const EventTypeSelector = ({ setReportMode, t, direction }: any) => (');
    fs.writeFileSync(path.join(targetDir, 'EventTypeSelector.tsx'), evtFile);
    content = content.replace(evtBody, '');
    content = content.replace('<EventTypeSelector />', '<EventTypeSelector setReportMode={setReportMode} t={t} direction={direction} />');
}

// Extract Step 1, Step 2, Step 3
const step1Start = content.indexOf('{/* STEP 1: CAPTURE */}');
const step2Start = content.indexOf('{/* STEP 2: LOCATION */}');
const step3Start = content.indexOf('{/* STEP 3: DETAILS */}');
const modEnd = content.lastIndexOf('</form>');

if (step1Start > -1 && step2Start > -1 && step3Start > -1 && modEnd > -1) {
    const step1code = content.slice(step1Start, step2Start);
    const step2code = content.slice(step2Start, step3Start);
    const step3code = content.slice(step3Start, modEnd);

    // We write Step 1
    let s1File = `${baseImports}\nexport function Step1Capture({ viewProps }: { viewProps: any }) {\n  const { t, direction, form, branches, sites, profile, activeEventId, setActiveEventId, uploadedPhotos, setUploadedPhotos, uploadedVideo, setUploadedVideo, isAutoTriggerEnabled, setAutoTriggerEnabled, isPendingAutoTrigger, handleAnalyzeDescription, aiValidator, handleConfirmTranslation, handleConfirmAnalysis, availableIncidentTags, selectedTags, setSelectedTags, eventType, incidentType, isApplyingAISuggestions, getReferencePreview, dynamicCategories, subtypeOptions } = viewProps;\n  return (\n    ${step1code.trim()}\n  );\n}\n`;
    fs.writeFileSync(path.join(targetDir, 'Step1Capture.tsx'), s1File);

    // We write Step 2
    let s2File = `${baseImports}\nexport function Step2Location({ viewProps }: { viewProps: any }) {\n  const { t, direction, form, coordinates, gpsDetectedSite, noSiteNearby, gpsAccuracy, handleGpsConfirm, handleGpsChangeLocation, gpsLocationConfirmed, locationAddress, isFetchingAddress, handleGetLocation, isGettingLocation, branchesLoading, branches, gpsDetectedBranch, autoDetectedBranch, sitesLoading, selectedBranchId, filteredSites, autoDetectedSite, departmentsLoading, selectedSiteId, filteredDepartments, departmentsUsingFallback, selectedAsset, handleAssetSelect } = viewProps;\n  return (\n    ${step2code.trim()}\n  );\n}\n`;
    fs.writeFileSync(path.join(targetDir, 'Step2Location.tsx'), s2File);

    // We write Step 3
    let s3File = `${baseImports}\nexport function Step3Details({ viewProps }: { viewProps: any }) {\n  const { t, direction, form, isObservation, closedOnSpot, setClosedOnSpot, closedOnSpotPhotos, setClosedOnSpotPhotos, eventType, hasInjury, contractorCompanies, isAgainstContractor, isConfirmSubmitting, handleObservationSubmit, hasSubmitted, onSubmit } = viewProps;\n  return (\n    ${step3code.trim()}\n  );\n}\n`;
    fs.writeFileSync(path.join(targetDir, 'Step3Details.tsx'), s3File);

    // Re-write IncidentReportForm.tsx
    // Replace the extracted steps with the component placeholders
    let newFormBody = content.substring(0, step1Start) + `
          <Step1Capture viewProps={viewProps} />
          <Step2Location viewProps={viewProps} />
          <Step3Details viewProps={viewProps} />
` + content.substring(modEnd);

    let finalFormFile = `import React from 'react';\nimport { ChevronLeft } from 'lucide-react';\nimport { Button } from '@/components/ui/button';\nimport { Form } from '@/components/ui/form';\nimport { StepIndicator } from './StepIndicator';\nimport { EventTypeSelector } from './EventTypeSelector';\nimport { Step1Capture } from './Step1Capture';\nimport { Step2Location } from './Step2Location';\nimport { Step3Details } from './Step3Details';\nimport { QuickObservationCard } from '@/components/incidents/QuickObservationCard';\nimport { ClosedOnSpotConfirmDialog } from '@/components/incidents/ClosedOnSpotSection';\nimport { SubmissionSuccessDialog } from '@/components/incidents/SubmissionSuccessDialog';\n\n` + newFormBody;

    fs.writeFileSync(fileSrc, finalFormFile);
    console.log('IncidentReportForm Split into Steps successfully');
} else {
    console.log('Failed to find step boundaries.');
}
