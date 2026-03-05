const fs = require('fs');
const path = require('path');

const srcPath = 'src/pages/incidents/MyActions.tsx';
const targetDir = 'src/pages/incidents/MyActions';
const hooksDir = path.join(targetDir, 'hooks');
const tabsDir = path.join(targetDir, 'tabs');

if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
if (!fs.existsSync(hooksDir)) fs.mkdirSync(hooksDir, { recursive: true });
if (!fs.existsSync(tabsDir)) fs.mkdirSync(tabsDir, { recursive: true });

let content = fs.readFileSync(srcPath, 'utf8');

// Normalize line endings to help indexing
content = content.replace(/\r\n/g, '\n');

// 1. Extract types and helpers
const typesMatch = content.match(/\/\/ Type for action dialog\ninterface ActionForDialog {[\s\S]*?source\?: 'incident' \| 'inspection';\n}/);
let typesCode = `export interface ActionForDialog {\n  id: string;\n  title: string;\n  description?: string | null;\n  status?: string | null;\n  due_date?: string | null;\n  priority?: string | null;\n  incident_id?: string | null;\n  session_id?: string | null;\n  source?: 'incident' | 'inspection';\n}\n`;

fs.writeFileSync(path.join(targetDir, 'types.ts'), typesCode);

const helpersMatch = content.match(/const getStatusIcon = [\s\S]*?return 'outline';\n  }\n};/);
let helpersCode = `import React from 'react';\nimport { CheckCircle2, Clock, AlertCircle } from 'lucide-react';\n\n`;
if (helpersMatch) {
    let block = helpersMatch[0].replace(/const /g, 'export const ');
    helpersCode += block + '\n';
}
fs.writeFileSync(path.join(targetDir, 'helpers.tsx'), helpersCode);

// 2. Extract hook useMyActions
const hookStartMarker = 'export default function MyActions() {';
const hookEndMarker = '  return (\n    <div className="container py-6 space-y-6" dir={direction}>';

const startIdx = content.indexOf(hookStartMarker);
const endIdx = content.indexOf(hookEndMarker);

if (startIdx !== -1 && endIdx !== -1) {
    let hookBody = content.slice(startIdx + hookStartMarker.length, endIdx);

    const varsToReturn = [
        't', 'direction', 'searchQuery', 'setSearchQuery', 'priorityFilter', 'setPriorityFilter',
        'activeTab', 'setActiveTab', 'activeFilter', 'setActiveFilter', 'kpiItems',
        'isLoading', 'displayedActiveActions', 'displayedClosedActions',
        'myInvestigations', 'myInspections', 'witnessStatements', 'myReportedIncidents',
        'pendingApprovals', 'pendingSeverity', 'pendingPotentialSeverity', 'pendingIncidentApprovals',
        'pendingClosures', 'pendingExtensions', 'pendingWorkers', 'pendingGatePasses', 'pendingCompanies',
        'totalPendingApprovals', 'canAccessApprovals', 'canApproveSeverity', 'canVerifyActions',
        'canApproveWorkers', 'canApproveGatePasses', 'isHSSEManager', 'canApproveClosures',
        'selectedWitnessTask', 'setSelectedWitnessTask', 'handleWitnessStatementSubmit',
        'selectedActionForVerification', 'setSelectedActionForVerification',
        'actionDialogAction', 'setActionDialogAction', 'actionDialogMode', 'setActionDialogMode',
        'actionDialogOpen', 'setActionDialogOpen', 'handleActionDialogConfirm',
        'extensionRequestAction', 'setExtensionRequestAction',
        'rejectingGatePass', 'setRejectingGatePass', 'rejectingCompany', 'setRejectingCompany',
        'companyRejectionReason', 'setCompanyRejectionReason', 'rejectCompany',
        'deletingCompany', 'setDeletingCompany', 'hardDeleteCompany',
        'handleStartWork', 'handleMarkCompleted', 'handleFilterClick', 'allActions', 'approveCompany',
        'updateStatus', 'uploadEvidence', 'submittingActionIds', 'getDaysInfo',
        'updateInspectionStatus', 'approveGatePass'
    ];

    let hookImports = `import { useState, useEffect } from 'react';\nimport { useTranslation } from 'react-i18next';\nimport { useSearchParams } from 'react-router-dom';\nimport { useQueryClient } from '@tanstack/react-query';\nimport { supabase } from '@/integrations/supabase/client';\nimport { useAuth } from '@/contexts/AuthContext';\nimport { logger } from '@/lib/logger';\n`;

    const importsMatch = content.match(/import .* from '@\/hooks\/.*?';/g);
    if (importsMatch) {
        hookImports += Array.from(new Set(importsMatch)).join('\n') + '\n';
    }

    let hookCode = `${hookImports}\nimport { ActionForDialog } from '../types';\nimport { CheckCircle2, Clock, AlertCircle, AlertTriangle, PlayCircle, FileCheck, MessageSquare, ShieldCheck } from 'lucide-react';\n\nexport function useMyActions() {\n${hookBody}\n  return {\n    ${varsToReturn.join(',\n    ')}\n  };\n}\n`;

    fs.writeFileSync(path.join(hooksDir, 'useMyActions.ts'), hookCode);

    // 3. Extract JSX Form Body
    let jsxBody = content.slice(endIdx);
    const lastCurly = jsxBody.lastIndexOf('}');
    if (lastCurly > -1) jsxBody = jsxBody.substring(0, lastCurly);

    // Wrapper component
    let wrapperCode = `import React from 'react';\nimport { useMyActions } from './hooks/useMyActions';\nimport { MyActionsLayout } from './MyActionsLayout';\n\nexport default function MyActions() {\n  const viewProps = useMyActions();\n  return <MyActionsLayout viewProps={viewProps} />;\n}\n`;
    fs.writeFileSync(path.join(targetDir, 'MyActions.tsx'), wrapperCode);
    fs.writeFileSync(path.join(targetDir, 'index.tsx'), `export { default } from './MyActions';\n`);

    // MyActionsLayout.tsx
    let layoutImports = `import React from 'react';\nimport { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';\nimport { KPIStrip } from '@/components/ui/kpi-strip';\nimport { SearchIcon, Calendar, MessageSquare, FileText, ShieldCheck, ClipboardList, X } from 'lucide-react';\nimport { Badge } from '@/components/ui/badge';\nimport { Button } from '@/components/ui/button';\n`;

    let originalImports = content.match(/import .* from '.*';/g);
    if (originalImports) {
        layoutImports += `\n// Use original imports as safety. Remove conflicting type imports later if needed.\n` +
            originalImports.filter(imp => !imp.includes('useTranslation') && !imp.includes('logger') && !imp.includes('useMyActions.ts')).join('\n');
    }

    let layoutCode = `${layoutImports}\nimport { getPriorityBadgeVariant, getStatusIcon } from './helpers';\nimport { ActionForDialog } from './types';\nexport function MyActionsLayout({ viewProps }: { viewProps: any }) {\n  const {\n    t, direction, searchQuery, setSearchQuery, priorityFilter, setPriorityFilter,\n    activeTab, setActiveTab, activeFilter, setActiveFilter, kpiItems,\n    isLoading, displayedActiveActions, displayedClosedActions,\n    myInvestigations, myInspections, witnessStatements, myReportedIncidents,\n    pendingApprovals, pendingSeverity, pendingPotentialSeverity, pendingIncidentApprovals,\n    pendingClosures, pendingExtensions, pendingWorkers, pendingGatePasses, pendingCompanies,\n    totalPendingApprovals, canAccessApprovals, canApproveSeverity, canVerifyActions,\n    canApproveWorkers, canApproveGatePasses, isHSSEManager, canApproveClosures,\n    selectedWitnessTask, setSelectedWitnessTask, handleWitnessStatementSubmit,\n    selectedActionForVerification, setSelectedActionForVerification,\n    actionDialogAction, setActionDialogAction, actionDialogMode, setActionDialogMode,\n    actionDialogOpen, setActionDialogOpen, handleActionDialogConfirm,\n    extensionRequestAction, setExtensionRequestAction,\n    rejectingGatePass, setRejectingGatePass, rejectingCompany, setRejectingCompany,\n    companyRejectionReason, setCompanyRejectionReason, rejectCompany,\n    deletingCompany, setDeletingCompany, hardDeleteCompany,\n    handleStartWork, handleMarkCompleted, handleFilterClick, allActions, approveCompany,\n    updateStatus, uploadEvidence, submittingActionIds, getDaysInfo, updateInspectionStatus, approveGatePass \n  } = viewProps;\n\n  return (\n${jsxBody}\n  );\n}\n`;

    fs.writeFileSync(path.join(targetDir, 'MyActionsLayout.tsx'), layoutCode);

    // Remove the original file
    fs.rmSync(srcPath);

    console.log('MyActions refactoring phase 1 complete.');
} else {
    console.log('Failed to find hook boundaries in MyActions.tsx');
}
