import type { IncidentWithDetails } from '@/features/incidents';
import { getActionVerb } from "./incident-status-colors";
import { getRoleCategory, type RoleCategory } from "./role-colors";

export interface CurrentOwnerInfo {
    name: string | null;
    role: string;
    roleCategory: RoleCategory;
    isUnassigned: boolean;
    actionRequired: string;
    warningMessage: string | null;
}

/**
 * Computed property to resolve backend data uncertainties.
 * Evaluates the exact workflow status and returns a definitive single owner.
 * Automatically ties into Role Categories and Action Verbs explicitly for the unified UI.
 */
export function getCurrentOwner(incident: Partial<IncidentWithDetails> | null): CurrentOwnerInfo | null {
    if (!incident || !incident.status) return null;

    const status = String(incident.status);
    const actionRequired = getActionVerb(status);

    // Helper to construct the unified interface expected by the UI
    const buildOwner = (name: string | null, role: string, isUnassigned: boolean = false): CurrentOwnerInfo => ({
        name,
        role,
        roleCategory: getRoleCategory(role),
        isUnassigned,
        actionRequired,
        warningMessage: isUnassigned ? `Contact admin to assign a ${role}` : null,
    });

    switch (status) {
        // Dept Rep Stage
        case "pending_dept_rep_incident_review":
        case "pending_dept_rep_approval":
        case "pending_dept_rep_review":
        case "pending_dept_rep_mandatory_action":
            return buildOwner(
                incident.approval_manager?.full_name || null,
                "Department Representative",
                !incident.approval_manager?.full_name
            );

        // Manager / Dept Manager Stage
        case "pending_manager_approval":
        case "pending_no_investigation_approval":
        case "pending_department_manager_approval":
        case "pending_department_manager_violation_approval":
            return buildOwner(
                incident.approval_manager?.full_name || null,
                "Department Manager",
                !incident.approval_manager?.full_name
            );

        // HSSE Expert Queue
        case "expert_screening":
        case "pending_expert_screening":
            if (incident.related_contractor_company_id || incident.related_contractor_company) {
                const consultantName = incident.approval_manager?.full_name || null;
                return buildOwner(consultantName, "Contractor Consultant", !consultantName);
            }
            const expertName = incident.approval_manager?.full_name || null;
            return buildOwner(expertName, "HSSE Expert", !expertName);

        case "investigation_pending":
        case "pending_investigator_assignment":
        case "pending_hsse_expert_review":
        case "pending_hsse_rejection_review":
            return buildOwner(null, "HSSE Expert", true);

        // HSSE Manager Queue
        case "hsse_manager_escalation":
        case "pending_hsse_escalation_review":
        case "pending_hsse_manager_closure":
        case "pending_escalation_approval":
            return buildOwner(null, "HSSE Manager", true);

        // Investigation Stage (Assigned Investigator)
        case "investigation_in_progress":
        case "under_investigation": {
            const investigator = incident.investigations?.[0]?.investigator;
            return buildOwner(
                investigator?.full_name || null,
                "Investigator",
                !investigator?.full_name
            );
        }

        // Contractor Consultant Validation
        case "pending_consultant_screening":
        case "pending_consultant_review":
        case "pending_consultant_verification":
        case "pending_consultant_actions":
        case "pending_action_dispute_review":
            return buildOwner(
                incident.approval_manager?.full_name || null,
                "Contractor Consultant",
                !incident.approval_manager?.full_name
            );

        // Contractor Implementation & Observations actions
        case "pending_contractor_implementation":
        case "contractor_action_implementation":
        case "pending_contractor_action":
        case "observation_actions_pending":
            if (incident.related_contractor_company_id || incident.related_contractor_company?.company_name) {
                return buildOwner(
                    incident.related_contractor_company?.company_name || null,
                    "Contractor",
                    !incident.related_contractor_company?.company_name
                );
            }
            return buildOwner(null, "Action Owner", true);

        // Site Client Approval
        case "pending_site_client_approval":
        case "pending_site_client_action_approval":
            return buildOwner(null, "Site Client Rep", true);

        // Compliance & Dispute
        case "dispute_resolution":
        case "pending_contractor_dispute_review":
            return buildOwner(null, "Legal & Compliance", true);

        // Monitoring & Closure Verification Stages
        case "monitoring_30_day":
        case "monitoring_60_day":
        case "monitoring_90_day":
        case "pending_final_closure":
        case "pending_closure":
        case "pending_hsse_validation":
            return buildOwner(null, "HSSE Team", true);

        // Closed / Completed (No one is pending)
        case "closed":
        case "no_investigation_required":
        case "investigation_closed":
        case "closed_rejected_approved_by_hsse":
        case "hsse_enforced":
        case "expert_rejected":
        case "manager_rejected":
        case "dept_rep_rejected":
            return null;

        case "returned_to_reporter":
            return buildOwner(null, "Reporter", true);

        // Submitted observations are pending HSSE Expert / Dept Rep routing
        case "submitted":
            return buildOwner(null, "HSSE Expert", true);

        default:
            return null;
    }
}
