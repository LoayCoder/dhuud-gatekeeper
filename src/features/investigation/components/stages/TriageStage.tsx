
import { useNavigate } from "react-router-dom";
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
    MonitoringCheckCard,
    HSSEExpertRejectionReviewCard
} from '@/features/investigation';
import { NoInvestigationApprovalCard } from '@/features/investigation';
import { IncidentWithDetails } from '@/features/incidents';
import type { ViolationIncidentFields } from '../../types/investigationTypes';

export function TriageStage() {
    const { incident, refresh } = useInvestigationContext();
    const navigate = useNavigate();

    if (!incident) return null;

    const status = incident.status as string;
    const typedIncident = incident as unknown as ViolationIncidentFields;

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
                    incident={typedIncident}
                    onEdit={() => navigate(`/incidents/report?edit=${incident.id}`)}
                    onComplete={refresh}
                />
            );

        case 'expert_rejected':
            return (
                <RejectionConfirmationCard
                    incident={typedIncident}
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
        case 'pending_dept_rep_mandatory_action':
        case 'pending_dept_rep_review':
            return (
                <DeptRepApprovalCard
                    incident={typedIncident}
                    onComplete={refresh}
                />
            );

        case 'pending_dept_rep_incident_review':
            return (
                <DeptRepIncidentReviewCard
                    incident={typedIncident}
                    onComplete={refresh}
                />
            );

        case 'manager_rejected':
        case 'hsse_manager_escalation':
            return (
                <HSSEManagerEscalationCard
                    incident={typedIncident}
                    onComplete={refresh}
                />
            );

        case 'pending_hsse_escalation_review':
            return (
                <HSSEEscalationReviewCard
                    incident={typedIncident}
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

        case 'pending_legal_review':
            return (
                <LegalReviewCard
                    incident={typedIncident}
                    onComplete={refresh}
                />
            );

        case 'pending_hsse_rejection_review':
            return (
                <HSSEExpertRejectionReviewCard
                    incident={typedIncident as unknown as IncidentWithDetails}
                    onComplete={refresh}
                />
            );

        case 'pending_hsse_validation':
        case 'pending_hsse_expert_review':
        case 'observation_actions_pending':
            return (
                <HSSEValidationCard
                    incident={incident as IncidentWithDetails}
                    onComplete={refresh}
                />
            );

        case 'pending_hsse_manager_closure':
        case 'pending_final_closure':
            return (
                <MonitoringCheckCard
                    incident={typedIncident}
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
