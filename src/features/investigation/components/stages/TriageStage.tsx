
import { useInvestigationContext } from "@/features/investigation/context/InvestigationContext";
import {
    HSSEExpertScreeningCard,
    ManagerApprovalCard,
    ReporterCorrectionBanner,
    RejectionConfirmationCard,
    HSSEManagerEscalationCard,
    DeptRepApprovalCard,
    DeptRepIncidentReviewCard,
    HSSEEscalationReviewCard,
    HSSEValidationCard,
    LegalReviewCard,
    DisputeResolutionCard,
    MonitoringCheckCard
} from '@/features/investigation';
import { NoInvestigationApprovalCard } from '@/features/investigation';
import { IncidentWithDetails } from '@/features/incidents';

export function TriageStage() {
    const { incident, refresh } = useInvestigationContext();

    if (!incident) return null;

    const status = incident.status as string;

    // Render specific card based on sub-status
    switch (status) {
        case 'submitted':
            return (
                <HSSEExpertScreeningCard
                    incident={incident as IncidentWithDetails}
                    onComplete={refresh}
                />
            );

        case 'returned_to_reporter':
            return (
                <ReporterCorrectionBanner
                    incident={incident as unknown as unknown}
                    onEdit={() => {/* TODO: Navigate to edit form */ }}
                    onComplete={refresh}
                />
            );

        case 'expert_rejected':
            return (
                <RejectionConfirmationCard
                    incident={incident as unknown as unknown}
                    onComplete={refresh}
                />
            );

        case 'pending_manager_approval':
            return (
                <ManagerApprovalCard
                    incident={incident as IncidentWithDetails}
                    onComplete={refresh}
                />
            );

        case 'pending_dept_rep_approval':
            return (
                <DeptRepApprovalCard
                    incident={incident as unknown as unknown}
                    onComplete={refresh}
                />
            );

        case 'pending_dept_rep_incident_review':
            return (
                <DeptRepIncidentReviewCard
                    incident={incident as unknown as unknown}
                    onComplete={refresh}
                />
            );

        case 'manager_rejected':
        case 'hsse_manager_escalation':
            return (
                <HSSEManagerEscalationCard
                    incident={incident as unknown as unknown}
                    onComplete={refresh}
                />
            );

        case 'pending_hsse_escalation_review':
            return (
                <HSSEEscalationReviewCard
                    incident={incident as unknown as unknown}
                    onComplete={refresh}
                />
            );

        case 'pending_no_investigation_approval':
            return (
                <NoInvestigationApprovalCard
                    incident={incident as IncidentWithDetails}
                    onComplete={refresh}
                />
            );

        // New incident workflow statuses that fit in "Triage/Review" bucket
        case 'pending_legal_review':
            return (
                <LegalReviewCard
                    incident={incident as unknown as unknown}
                    onComplete={refresh}
                />
            );

        default:
            return (
                <div className="p-4 bg-muted rounded border border-dashed text-center text-muted-foreground">
                    Current Status: {status} (Triage Stage)
                </div>
            );
    }
}


