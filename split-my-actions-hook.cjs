const fs = require('fs');
const path = require('path');

const srcFile = 'src/pages/incidents/MyActions/hooks/useMyActions.ts';
const targetFile = 'src/pages/incidents/MyActions/hooks/useMyApprovalsState.ts';

let content = fs.readFileSync(srcFile, 'utf8');

// The lines we want to extract
const startString = "  // Pending approvals data";
const endString = "  // Combine incident and inspection actions into a unified list with source indicator";

const startIdx = content.indexOf(startString);
const endIdx = content.indexOf(endString);

if (startIdx !== -1 && endIdx !== -1) {
    const extractedCode = content.substring(startIdx, endIdx);

    // We need to remove the extracted part from useMyActions
    content = content.replace(extractedCode, "  const approvalsState = useMyApprovalsState();\n\n  // Combine incident and inspection actions into a unified list with source indicator\n");

    // Create useMyApprovalsState.ts
    const approvalsHookImports = `import { useState } from 'react';\n` +
        `import { useUserRoles } from '@/hooks/use-user-roles';\n` +
        `import { usePendingActionApprovals, usePendingSeverityApprovals, usePendingPotentialSeverityApprovals, usePendingIncidentApprovals, useCanAccessApprovals, type PendingActionApproval } from '@/hooks/use-pending-approvals';\n` +
        `import { usePendingClosureRequests } from '@/hooks/use-incident-closure';\n` +
        `import { usePendingExtensionRequests } from '@/hooks/use-action-extensions';\n` +
        `import { usePendingWorkerApprovals } from '@/hooks/contractor-management/use-contractor-workers';\n` +
        `import { usePendingGatePassApprovals, useApproveGatePass, MaterialGatePass } from '@/hooks/contractor-management/use-material-gate-passes';\n` +
        `import { usePendingCompanyApprovals, useApproveCompany, useRejectCompany, useHardDeleteContractorCompany, ContractorCompany } from '@/hooks/contractor-management/use-contractor-companies';\n\n` +
        `export function useMyApprovalsState() {\n` +
        extractedCode + `\n` +
        `  const totalExtensions = pendingExtensions?.length || 0;\n` +
        `  const contractorApprovalCount = (canApproveWorkers ? (pendingWorkers?.length || 0) : 0) + (canApproveGatePasses ? (pendingGatePasses?.length || 0) : 0);\n` +
        `  const totalPendingApprovals = (canVerifyActions ? (pendingApprovals?.length || 0) : 0) + (canApproveSeverity ? ((pendingSeverity?.length || 0) + (pendingPotentialSeverity?.length || 0)) : 0) + (pendingIncidentApprovals?.length || 0) + (canApproveClosures ? (pendingClosures?.length || 0) : 0) + totalExtensions + contractorApprovalCount;\n\n` +
        `  const approvalsLoading = false;\n\n` + // simplify the individual loadings
        `  return {\n` +
        `    canAccessApprovals, canApproveSeverity, canVerifyActions, pendingApprovals, pendingSeverity, pendingPotentialSeverity, pendingIncidentApprovals, pendingClosures, pendingExtensions, selectedActionForVerification, setSelectedActionForVerification, pendingWorkers, pendingGatePasses, canApproveWorkers, canApproveGatePasses, gatePassApprovalNotes, setGatePassApprovalNotes, rejectingGatePass, setRejectingGatePass, approveGatePass, pendingCompanies, approveCompany, rejectCompany, hardDeleteCompany, rejectingCompany, setRejectingCompany, companyRejectionReason, setCompanyRejectionReason, deletingCompany, setDeletingCompany, handleApproveGatePass, canApproveClosures, isHSSEManager, totalPendingApprovals, approvalsLoading\n  };\n}\n`;

    fs.writeFileSync(targetFile, approvalsHookImports);

    // Now modify the useMyActions.ts imports
    content = content.replace("import { usePendingActionApprovals", "// removed approvals imports\n");
    content = content.replace("import { usePendingClosureRequests", "// removed closures imports\n");
    content = content.replace("import { useUserRoles", "import { useMyApprovalsState } from './useMyApprovalsState';\n");
    content = content.replace("import { usePendingExtensionRequests", "// removed extensions imports\n");
    content = content.replace("import { usePendingWorkerApprovals", "// removed worker imports\n");
    content = content.replace("import { usePendingGatePassApprovals", "// removed gatepass imports\n");
    content = content.replace("import { usePendingCompanyApprovals", "// removed company imports\n");

    // In useMyActions, replace the return object
    content = content.replace(/totalExtensions = .*;/, '');
    content = content.replace(/contractorApprovalCount = .*;/, '');
    content = content.replace(/totalPendingApprovals = .*;/, '');

    // Use the values from approvalsState for KPI items
    content = content.replace(/canAccessApprovals/g, 'approvalsState.canAccessApprovals');
    content = content.replace(/totalPendingApprovals/g, 'approvalsState.totalPendingApprovals');

    // Add ...approvalsState to the final return
    const returnStart = content.indexOf('return {');
    if (returnStart > -1) {
        content = content.replace('return {', 'return {\n    ...approvalsState,');

        // Remove all the keys that are now in approvalsState from the return block
        const keysToRemove = [
            'pendingApprovals', 'pendingSeverity', 'pendingPotentialSeverity', 'pendingIncidentApprovals',
            'pendingClosures', 'pendingExtensions', 'pendingWorkers', 'pendingGatePasses', 'pendingCompanies',
            'canAccessApprovals: approvalsState.canAccessApprovals', 'canApproveSeverity', 'canVerifyActions', 'canApproveWorkers',
            'canApproveGatePasses', 'isHSSEManager', 'canApproveClosures', 'selectedActionForVerification',
            'setSelectedActionForVerification', 'rejectingGatePass', 'setRejectingGatePass', 'rejectingCompany',
            'setRejectingCompany', 'companyRejectionReason', 'setCompanyRejectionReason', 'rejectCompany',
            'deletingCompany', 'setDeletingCompany', 'hardDeleteCompany', 'approveCompany', 'approveGatePass',
            'totalPendingApprovals: approvalsState.totalPendingApprovals', // because of previous replacement
        ];

        keysToRemove.forEach(key => {
            const regex = new RegExp(`\\s+${key},`, 'g');
            content = content.replace(regex, '');
        });
    }

    fs.writeFileSync(srcFile, content);
    console.log('Hook split successfully');

} else {
    console.log('Failed to match hook start/end strings');
}
