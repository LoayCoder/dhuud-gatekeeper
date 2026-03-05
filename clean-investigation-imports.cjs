const fs = require('fs');
const file = 'src/pages/incidents/InvestigationWorkspace.tsx';
let content = fs.readFileSync(file, 'utf8');

const importStart = content.indexOf('import {\n  EvidenceManager');
const importEnd = content.indexOf('} from "@/components/investigation";') + '} from "@/components/investigation";'.length;

if (importStart !== -1 && importEnd !== -1) {
    const replacement = `import {
  OverviewPanel,
  IncidentClosureRequestDialog,
  IncidentClosureApprovalCard,
  CurrentOwnerCard,
  UnifiedTimelineTracker,
  EscalationAlertBanner,
  IncidentClosurePrerequisitesCard
} from "@/components/investigation";`;

    content = content.substring(0, importStart) + replacement + content.substring(importEnd);

    // Also remove contractor-workflow and panels that are no longer used here
    const toRemove = [
        'import { ActionDisputeReviewCard, ConsultantReviewCard, SiteClientActionApprovalCard } from "@/components/investigation/contractor-workflow";',
        'import { HSSEEnforcementBanner } from "@/components/investigation/HSSEEnforcementBanner";',
        'import { InjuryPanel } from "@/components/investigation/InjuryPanel";',
        'import { ClinicUserAssignmentCard } from "@/components/investigation/ClinicUserAssignmentCard";',
        'import { PropertyDamagePanel } from "@/components/investigation/property-damage";',
        'import { TechEvaluatorAssignmentCard } from "@/components/investigation/TechEvaluatorAssignmentCard";',
        'import { EnvironmentalImpactPanel } from "@/components/investigation/environmental-impact";',
        'import { EnvironmentalExpertAssignmentCard } from "@/components/investigation/EnvironmentalExpertAssignmentCard";',
        'import { SpecialistDataReviewCard } from "@/components/investigation/SpecialistDataReviewCard";'
    ];

    for (const line of toRemove) {
        content = content.replace(line + '\\n', '');
        content = content.replace(line + '\\r\\n', '');
        content = content.replace(line, '');
    }

    fs.writeFileSync(file, content);
    console.log("Imports cleaned.");
} else {
    console.log("Not found.");
}
