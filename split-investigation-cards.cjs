const fs = require('fs');
const path = require('path');

const sourceFile = 'src/pages/incidents/InvestigationWorkspace.tsx';
const targetDir = 'src/pages/incidents/InvestigationWorkspace/components';
const targetFile = path.join(targetDir, 'InvestigationWorkflowCards.tsx');

let content = fs.readFileSync(sourceFile, 'utf8');

// The block starts at line 340 and ends at line 600
const lines = content.split('\n');
const workflowBlockLines = lines.slice(339, 600); // 339 to 599

// Also need imports
const importsToCopy = [
    'import type { SeverityLevelV2 } from "@/lib/hsse-severity-levels";',
    'import {',
    '  HSSEExpertScreeningCard,',
    '  ReporterCorrectionBanner,',
    '  RejectionConfirmationCard,',
    '  ManagerApprovalCard,',
    '  HSSEManagerEscalationCard,',
    '  InvestigatorAssignmentStep,',
    '  DeptRepApprovalCard,',
    '  DeptRepIncidentReviewCard,',
    '  HSSEEscalationReviewCard,',
    '  HSSEValidationCard,',
    '  DeptManagerViolationApprovalCard,',
    '  ContractControllerApprovalCard,',
    '  LegalReviewCard,',
    '  DisputeResolutionCard,',
    '  MonitoringCheckCard,',
    '  ContractorDisputeCard,',
    '  HSSEIncidentValidationCard,',
    '  DeptManagerIncidentApprovalCard,',
    '  ClinicReviewCard,',
    '  TeamInvestigationAssignmentStep',
    '} from "@/components/investigation";',
    'import { ActionDisputeReviewCard, ConsultantReviewCard, SiteClientActionApprovalCard } from "@/components/investigation/contractor-workflow";',
    'import { HSSEEnforcementBanner } from "@/components/investigation/HSSEEnforcementBanner";'
];

let componentCode = `${importsToCopy.join('\n')}

interface InvestigationWorkflowCardsProps {
  incidentData: any;
  investigation: any;
  actionsCount: number;
  handleCreateAction: () => void;
  handleRefresh: () => void;
}

export function InvestigationWorkflowCards({
  incidentData,
  investigation,
  actionsCount,
  handleCreateAction,
  handleRefresh
}: InvestigationWorkflowCardsProps) {
  if (!incidentData) return null;

  // Cast status to string to handle new enum values not yet in generated types
  const currentStatus = incidentData.status as string;

${workflowBlockLines.slice(6, -1).map(l => l.substring(2)).join('\n')}
}
`;

fs.mkdirSync(targetDir, { recursive: true });
fs.writeFileSync(targetFile, componentCode);

console.log('InvestigationWorkflowCards component created!');

// Now replace in source file
lines.splice(339, 261, '  const renderWorkflowCards = () => (\n    <InvestigationWorkflowCards\n      incidentData={incidentData}\n      investigation={investigation}\n      actionsCount={actionsCount}\n      handleCreateAction={handleCreateAction}\n      handleRefresh={handleRefresh}\n    />\n  );');
content = lines.join('\n');

// Add import
const lastImportIdx = content.lastIndexOf('import');
const nextNewline = content.indexOf('\n', lastImportIdx);
content = content.substring(0, nextNewline + 1) + 'import { InvestigationWorkflowCards } from "./InvestigationWorkspace/components/InvestigationWorkflowCards";\n' + content.substring(nextNewline + 1);

fs.writeFileSync(sourceFile, content);
console.log('Source file updated!');
