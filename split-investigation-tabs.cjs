const fs = require('fs');
const path = require('path');

const sourceFile = 'src/pages/incidents/InvestigationWorkspace.tsx';
const targetDir = 'src/pages/incidents/InvestigationWorkspace/components';
const targetFile = path.join(targetDir, 'InvestigationTabsContent.tsx');

let content = fs.readFileSync(sourceFile, 'utf8');
const lines = content.split('\n');

// Find start and end
let s = -1;
let e = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('className="flex flex-col gap-6"')) {
        s = i;
    }
    if (lines[i].includes('export default function InvestigationWorkspace()')) {
        // we passed it, but wait, the start is below this
    }
    if (lines[i].includes('{/* Closure Approval Card - show if closure is pending (either investigation or final) */}')) {
        e = i - 1; // End of tabs content
        break;
    }
}

if (s !== -1 && e !== -1) {
    const tabsLines = lines.slice(s, e);

    const importsToCopy = [
        'import { cn } from "@/lib/utils";',
        'import { useTranslation } from "react-i18next";',
        'import {',
        '  LayoutDashboard,',
        '  FileSearch,',
        '  Users,',
        '  Search,',
        '  ListChecks,',
        '  HeartPulse,',
        '  Wrench,',
        '  Scale,',
        '  Leaf',
        '} from "lucide-react";',
        'import {',
        '  EvidenceManager,',
        '  WitnessPanel,',
        '  RCAPanel,',
        '  ActionsPanel,',
        '  OverviewPanel,',
        '  SubmitInvestigationCard,',
        '  CauseCoverageIndicator,',
        '  InvestigatorViolationIdentificationCard,',
        '  InvestigatorViolationSubmissionCard',
        '} from "@/components/investigation";',
        'import { InjuryPanel } from "@/components/investigation/InjuryPanel";',
        'import { ClinicUserAssignmentCard } from "@/components/investigation/ClinicUserAssignmentCard";',
        'import { PropertyDamagePanel } from "@/components/investigation/property-damage";',
        'import { TechEvaluatorAssignmentCard } from "@/components/investigation/TechEvaluatorAssignmentCard";',
        'import { EnvironmentalImpactPanel } from "@/components/investigation/environmental-impact";',
        'import { EnvironmentalExpertAssignmentCard } from "@/components/investigation/EnvironmentalExpertAssignmentCard";',
        'import { SpecialistDataReviewCard } from "@/components/investigation/SpecialistDataReviewCard";'
    ];

    let componentCode = `${importsToCopy.join('\n')}

interface InvestigationTabsContentProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isTabLocked: (tab: string) => boolean;
  selectedIncidentId: string;
  selectedIncident: any;
  investigation: any;
  handleRefresh: () => void;
  canApprove: boolean;
  startInvestigation: () => void;
  unlockedTabs: string[];
  completedTabs: string[];
  investigationAllowed: boolean | undefined;
  editAccess: any;
  showActionDialog: boolean;
  setShowActionDialog: (show: boolean) => void;
  incidentData: any;
  isAssignedClinicUser: boolean;
  canReviewSpecialistData: boolean;
  isAssignedTechEvaluator: boolean;
  isAssignedEnvironmentalExpert: boolean;
  canAccessGovernance: boolean;
  status: string | undefined;
}

export function InvestigationTabsContent({
  activeTab,
  setActiveTab,
  isTabLocked,
  selectedIncidentId,
  selectedIncident,
  investigation,
  handleRefresh,
  canApprove,
  startInvestigation,
  unlockedTabs,
  completedTabs,
  investigationAllowed,
  editAccess,
  showActionDialog,
  setShowActionDialog,
  incidentData,
  isAssignedClinicUser,
  canReviewSpecialistData,
  isAssignedTechEvaluator,
  isAssignedEnvironmentalExpert,
  canAccessGovernance,
  status
}: InvestigationTabsContentProps) {
  const { t } = useTranslation();

  return (
${tabsLines.map(l => l.substring(6)).join('\n')}
  );
}
`;

    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(targetFile, componentCode);
    console.log('InvestigationTabsContent component created!');

    const tablePropsExec = `          <InvestigationTabsContent
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isTabLocked={isTabLocked}
            selectedIncidentId={selectedIncidentId!}
            selectedIncident={selectedIncident}
            investigation={investigation}
            handleRefresh={handleRefresh}
            canApprove={canApprove}
            startInvestigation={startInvestigation}
            unlockedTabs={unlockedTabs}
            completedTabs={completedTabs}
            investigationAllowed={investigationAllowed}
            editAccess={editAccess}
            showActionDialog={showActionDialog}
            setShowActionDialog={setShowActionDialog}
            incidentData={incidentData}
            isAssignedClinicUser={isAssignedClinicUser}
            canReviewSpecialistData={canReviewSpecialistData}
            isAssignedTechEvaluator={isAssignedTechEvaluator}
            isAssignedEnvironmentalExpert={isAssignedEnvironmentalExpert}
            canAccessGovernance={canAccessGovernance}
            status={status}
          />`;

    lines.splice(s, e - s, tablePropsExec);
    content = lines.join('\n');

    const lastImportIdx = content.lastIndexOf('import');
    const nextNewline = content.indexOf('\n', lastImportIdx);
    content = content.substring(0, nextNewline + 1) + 'import { InvestigationTabsContent } from "./InvestigationWorkspace/components/InvestigationTabsContent";\n' + content.substring(nextNewline + 1);

    fs.writeFileSync(sourceFile, content);
    console.log('Source file updated!');
} else {
    console.log('Could not find boundaries! s:', s, 'e:', e);
}
