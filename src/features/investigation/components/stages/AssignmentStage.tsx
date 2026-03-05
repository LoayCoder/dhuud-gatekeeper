
import { useInvestigationContext } from "@/features/investigation/context/InvestigationContext";
import { useTranslation } from "react-i18next";
import { TeamInvestigationAssignmentStep } from '@/features/investigation';
import { InvestigatorAssignmentStep } from '@/features/investigation';
import { IncidentWithDetails } from '@/features/incidents';

export function AssignmentStage() {
    const { incident, refresh, userPermissions } = useInvestigationContext();

    const { t } = useTranslation();

    if (!incident) return null;

    // Logic from InvestigationWorkspace.tsx
    const severityLevel = incident.severity_v2 || (incident as any).severity;
    const severityNumber = severityLevel ? parseInt(severityLevel.replace('level_', '')) : 1;
    const isTeamRecommended = severityNumber >= 3;

    if (!userPermissions?.canAssignInvestigator) {
        return (
            <div className="p-8 text-center border rounded-lg bg-muted/50">
                <h3 className="text-lg font-medium">{t('investigation.assignment.restricted.title', 'Assignment Pending')}</h3>
                <p className="text-muted-foreground mt-2">
                    {t('investigation.assignment.restricted.message', 'You do not have permission to assign investigators for this incident.')}
                </p>
            </div>
        );
    }

    if (isTeamRecommended) {
        return (
            <TeamInvestigationAssignmentStep
                incident={incident as IncidentWithDetails}
                onComplete={refresh}
            />
        );
    }

    return (
        <InvestigatorAssignmentStep
            incident={incident as IncidentWithDetails}
            onComplete={refresh}
        />
    );
}


