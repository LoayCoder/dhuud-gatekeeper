const fs = require('fs');

const file = 'src/pages/incidents/InvestigationWorkspace.tsx';
let content = fs.readFileSync(file, 'utf8');

const hookStart = '  // Fetch corrective actions count for the selected incident';
const hookEnd = '  const handleRefresh = () => {';

let s = content.indexOf(hookStart);
let e = content.indexOf(hookEnd);

if (s !== -1 && e !== -1) {
    // Find the end of handleRefresh function
    let handleRefreshEndPos = content.indexOf('};', e);
    if (handleRefreshEndPos !== -1) {
        handleRefreshEndPos += 2; // Include "};\n"

        // Ensure we catch the end of the line
        while (content[handleRefreshEndPos] === '\\n' || content[handleRefreshEndPos] === '\\r') {
            handleRefreshEndPos++;
        }

        const replacement = `  const {
    actionsCount, incidents, loadingIncidents, pendingApprovals, loadingPending,
    selectedIncident, refetchIncident, investigation, refetchInvestigation,
    closureEligibility, approveClosureMutation, rejectClosureMutation, canApprove,
    workflowActors, investigatorInfo, editAccess, isInvestigator, canAccessGovernance,
    isAssignedClinicUser, isAssignedTechEvaluator, isAssignedEnvironmentalExpert,
    canReviewSpecialistData, incidentData, status, investigationAllowed, handleRefresh,
    queryClient
  } = useInvestigationWorkspaceData(selectedIncidentId);
`;

        content = content.substring(0, s) + replacement + content.substring(handleRefreshEndPos);

        // Add import
        const lastImportIdx = content.lastIndexOf('import');
        const nextNewline = content.indexOf('\\n', lastImportIdx);
        content = content.substring(0, nextNewline + 1) + 'import { useInvestigationWorkspaceData } from "./InvestigationWorkspace/hooks/useInvestigationWorkspaceData";\\n' + content.substring(nextNewline + 1);

        fs.writeFileSync(file, content);
        console.log('Hooks replaced!');
    } else {
        console.log('handleRefresh end not found');
    }
} else {
    console.log('Hooks start/end not found. s:', s, 'e:', e);
}
