import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { User, Users, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IncidentWithDetails } from "@/hooks/use-incidents";

/**
 * Maps workflow statuses to their responsible parties
 * @returns { user: { name: string, title?: string }, role?: string, unassigned?: boolean }
 */
export function getResponsibleParty(incident: Partial<IncidentWithDetails> | null) {
    if (!incident || !incident.status) return null;

    const status = String(incident.status);
    switch (status) {
        // Dept Rep Stage
        case "pending_dept_rep_incident_review":
        case "pending_dept_rep_approval":
            if (incident.approval_manager?.full_name) {
                return {
                    user: {
                        name: incident.approval_manager.full_name,
                        title: incident.approval_manager.job_title || undefined,
                    }
                };
            }
            return { role: "Department Representative", unassigned: true };

        // Manager / Area Authority Stage
        case "pending_manager_approval":
        case "pending_no_investigation_approval":
            if (incident.approval_manager?.full_name) {
                return {
                    user: {
                        name: incident.approval_manager.full_name,
                        title: incident.approval_manager.job_title || undefined,
                    }
                };
            }
            return { role: "Department Manager", unassigned: true };

        // HSSE Expert Queue
        case "expert_screening":
        case "investigation_pending":
            return { role: "HSSE Expert", unassigned: true };

        // HSSE Manager Escalation Queue
        case "hsse_manager_escalation":
            return { role: "HSSE Manager", unassigned: true };

        // Investigation Stage (Assigned Investigator)
        case "investigation_in_progress":
            const investigator = incident.investigations?.[0]?.investigator;
            if (investigator?.full_name) {
                return {
                    user: {
                        name: investigator.full_name,
                        title: investigator.job_title || undefined,
                    }
                };
            }
            return { role: "Investigator", unassigned: true };

        // Contractor Consultant Validation Queue
        case "expert_screening": // Handled above
        case "pending_consultant_screening":
        case "pending_consultant_review":
        case "pending_consultant_verification":
            return { role: "Contractor Consultant", unassigned: true };

        // Contractor Implementation
        case "pending_contractor_implementation":
            if (incident.related_contractor_company?.company_name) {
                return {
                    user: { name: incident.related_contractor_company.company_name },
                    isCompany: true
                };
            }
            return { role: "Contractor", unassigned: true };

        // Site Client Approval
        case "pending_site_client_approval":
            return { role: "Site Client Rep", unassigned: true };

        // Monitoring Stages
        case "monitoring_30_day":
        case "monitoring_60_day":
        case "monitoring_90_day":
        case "pending_final_closure":
            return { role: "HSSE Team", unassigned: true };

        // Closed / Completed (No one is pending)
        case "closed":
        case "expert_rejected":
        case "returned_to_reporter":
        case "submitted":
            return null;

        default:
            return null;
    }
}

interface ResponsibleUserBadgeProps {
    incident: Partial<IncidentWithDetails> | null;
    className?: string;
    showTitle?: boolean;
}

export function ResponsibleUserBadge({ incident, className, showTitle = false }: ResponsibleUserBadgeProps) {
    const { t } = useTranslation();

    const responsibleInfo = getResponsibleParty(incident);

    // If status is closed or doesn't have a clear pending party, render nothing
    if (!responsibleInfo) return null;

    return (
        <div className={cn("flex flex-col gap-1 items-start", className)}>
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                {t("workflow.pendingWith", "Pending With")}
            </span>
            <div className="flex items-center gap-1.5">
                {responsibleInfo.unassigned ? (
                    <Badge variant="outline" className="border-warning text-warning-foreground bg-warning/10 text-xs py-0.5 font-normal">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {t("workflow.unassigned", "Unassigned")} ({responsibleInfo.role})
                    </Badge>
                ) : responsibleInfo.user ? (
                    <Badge variant="secondary" className="text-xs py-0.5 font-normal bg-secondary mix-blend-multiply dark:mix-blend-screen text-secondary-foreground border border-border/50">
                        <User className="h-3 w-3 mr-1" />
                        <span className="truncate max-w-[150px] font-medium">{responsibleInfo.user.name}</span>
                        {showTitle && responsibleInfo.user.title && (
                            <span className="text-muted-foreground truncate max-w-[100px] ml-1.5 hidden sm:inline-block border-l border-border/50 pl-1.5">
                                {responsibleInfo.user.title}
                            </span>
                        )}
                    </Badge>
                ) : null}
            </div>
        </div>
    );
}
