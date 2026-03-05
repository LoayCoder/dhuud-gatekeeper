
import { useUserRoles } from '@/features/users';
import { useAuth } from "@/contexts/AuthContext";
import {
    Incident,
    InvestigationRecord,
    WorkflowStage,
    InvestigationRole
} from "../types";

export function useInvestigationWorkflow(
    incident: Incident | null,
    investigation: InvestigationRecord | null
) {
    const { user } = useAuth();
    const { hasRole } = useUserRoles();

    // 1. Determine User Role for this specific investigation
    const getUserRole = (): InvestigationRole => {
        if (!user || !incident) return InvestigationRole.Viewer;

        // Check specific assignments first
        if (investigation?.investigator_id === user.id) return InvestigationRole.Investigator;
        if (incident.reporter_id === user.id) return InvestigationRole.Reporter;

        // Check system roles
        if (hasRole('hsse_manager')) return InvestigationRole.HSSEManager;
        if (hasRole('hsse_expert')) return InvestigationRole.HSSEExpert;
        if (hasRole('department_manager')) return InvestigationRole.Manager; // You might need to check if it's the *correct* department
        if (hasRole('department_rep')) return InvestigationRole.DeptRep;

        // Fallback
        return InvestigationRole.Viewer;
    };

    const userRole = getUserRole();

    // 2. Determine Current Workflow Stage
    const getWorkflowStage = (): WorkflowStage => {
        if (!incident) return WorkflowStage.ReadOnly;

        const status = incident.status as string;

        switch (status) {
            case 'submitted':
            case 'returned_to_reporter':
            case 'expert_rejected':
            case 'pending_manager_approval':
            case 'manager_rejected':
            case 'hsse_manager_escalation':
            case 'pending_dept_rep_approval':
            case 'pending_dept_rep_incident_review':
            case 'pending_hsse_escalation_review':
            case 'pending_no_investigation_approval':
            case 'pending_legal_review':
                return WorkflowStage.Triage;

            case 'investigation_pending':
                return WorkflowStage.Assignment;

            case 'investigation_in_progress':
            case 'under_investigation':
                // Could distinguish between Data Collection and Analysis based on investigation progress
                if (investigation?.immediate_cause != null || (Array.isArray(investigation?.root_causes) && investigation.root_causes.length > 0)) {
                    return WorkflowStage.Analysis;
                }
                return WorkflowStage.DataCollection;

            case 'pending_closure':
            case 'pending_final_closure':
            case 'pending_hsse_validation':
            case 'pending_department_manager_approval':
                return WorkflowStage.Review;

            case 'closed':
            case 'investigation_closed':
            case 'no_investigation_required':
                return WorkflowStage.Closure;

            default:
                return WorkflowStage.ReadOnly;
        }
    };

    const currentStage = getWorkflowStage();

    // 3. Determine Allowed Actions based on Role + Stage
    const getAllowedActions = (): string[] => {
        const actions: string[] = [];

        const isInvestigator = userRole === InvestigationRole.Investigator;
        // Assuming 'admin' or 'hsse_manager' can act as an admin for investigation purposes
        const isAdmin = hasRole('admin') || userRole === InvestigationRole.HSSEManager;

        // Basic Example Logic
        const canAddEvidence = currentStage === WorkflowStage.DataCollection && (isInvestigator || isAdmin);
        const canPerformAnalysis = currentStage === WorkflowStage.Analysis && (isInvestigator || isAdmin);

        if (canAddEvidence) {
            actions.push('add_evidence', 'add_witness');
        }

        if (canPerformAnalysis) {
            actions.push('edit_rca', 'create_action');
        }

        if (userRole === InvestigationRole.HSSEManager && currentStage === WorkflowStage.Review) {
            actions.push('approve_closure', 'reject_closure');
        }

        return actions;
    };

    const allowedActions = getAllowedActions();

    const userPermissions = {
        canAssignInvestigator: userRole === InvestigationRole.HSSEManager || hasRole('admin') || userRole === InvestigationRole.Manager
    };

    return {
        currentStage,
        userRole,
        allowedActions,
        userPermissions
    };
}

