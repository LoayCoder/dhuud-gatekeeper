import { useTranslation } from "react-i18next";
import { FileText, ClipboardCheck, Shield, CheckCircle, Lock, Clock, Search, ListChecks, Check, User, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IncidentWithDetails } from '@/features/incidents';
import { ROLE_TEXT_COLORS, type RoleCategory } from "@/lib/role-colors";
import { getCurrentOwner } from "@/lib/current-owner";
import { formatDate } from "@/lib/date-utils";

type StepState = 'completed' | 'current' | 'upcoming';

interface WorkflowActor {
    full_name: unknown;
    timestamp: string | null;
}

interface WorkflowActors {
    submitted_by?: WorkflowActor;
    dept_rep?: WorkflowActor;
    expert_screener?: WorkflowActor;
    manager_approver?: WorkflowActor;
    hsse_manager?: WorkflowActor;
    investigator?: WorkflowActor;
    closure_approver?: WorkflowActor;
}

interface TimelineStep {
    id: string;
    label: string;
    icon: React.ElementType;
    roleCategory: RoleCategory;
    typicalRole: string;
    state: StepState;
    actorKey: keyof WorkflowActors;
}

interface UnifiedTimelineTrackerProps {
    incident: Partial<IncidentWithDetails>;
    workflowActors?: WorkflowActors | null;
}

// Map actual db status strings to a rigid 5-step integer scale
function getStepIndex(status: string, isObservation: boolean): number {
    if (isObservation) {
        if (["submitted"].includes(status)) return 0;
        if ([
            "pending_expert_screening", "expert_screening", "pending_consultant_screening",
            "pending_consultant_review", "pending_consultant_actions",
            "pending_consultant_verification", "pending_action_dispute_review"
        ].includes(status)) return 1;
        if ([
            "pending_dept_rep_approval", "pending_dept_rep_review", "pending_dept_rep_mandatory_action",
            "pending_manager_approval", "pending_site_client_approval", "pending_site_client_action_approval",
            "pending_hsse_expert_review", "pending_hsse_rejection_review", "pending_hsse_escalation_review"
        ].includes(status)) return 2;
        if ([
            "observation_actions_pending", "pending_contractor_implementation",
            "contractor_action_implementation", "pending_contractor_action"
        ].includes(status)) return 3;
        if (["closed", "hsse_enforced", "pending_closure", "pending_hsse_validation", "pending_final_closure", "pending_hsse_manager_closure"].includes(status)) return 4;
    } else {
        if (["submitted", "draft", "returned_to_reporter"].includes(status)) return 0;
        if ([
            "pending_dept_rep_incident_review", "pending_dept_rep_approval",
            "expert_screening", "pending_expert_screening",
            "pending_manager_approval", "pending_department_manager_approval",
            "pending_no_investigation_approval",
            "hsse_manager_escalation", "pending_hsse_escalation_review",
            "pending_hsse_expert_review", "pending_hsse_rejection_review",
            "expert_rejected", "manager_rejected",
            "pending_clinic_review", "pending_legal_review",
        ].includes(status)) return 1;
        if ([
            "investigation_pending", "pending_investigator_assignment",
            "investigation_in_progress", "under_investigation",
        ].includes(status)) return 2;
        if ([
            "pending_contractor_implementation", "observation_actions_pending",
            "contractor_action_implementation", "pending_contractor_action",
            "pending_department_manager_violation_approval",
            "pending_contract_controller_approval",
            "dispute_resolution", "pending_contractor_dispute_review",
        ].includes(status)) return 3;
        if ([
            "pending_closure", "pending_final_closure", "pending_hsse_validation",
            "pending_hsse_incident_validation",
            "monitoring_30_day", "monitoring_60_day", "monitoring_90_day",
            "investigation_closed", "closed", "no_investigation_required",
            "hsse_enforced",
        ].includes(status)) return 4;
    }
    return 0;
}

function formatActorTimestamp(timestamp: string | null): string | null {
    if (!timestamp) return null;
    try {
        return formatDate(timestamp, 'MMM d, HH:mm');
    } catch {
        return null;
    }
}

export function UnifiedTimelineTracker({ incident, workflowActors }: UnifiedTimelineTrackerProps) {
    const { t } = useTranslation();
    const status = incident?.status || "submitted";
    const isObservation = incident?.event_type === "observation";
    const currentStepNum = getStepIndex(status, isObservation);

    // Get current owner info for the active step
    const ownerInfo = getCurrentOwner(incident as Partial<IncidentWithDetails>);

    const getS = (idx: number): StepState => {
        if (currentStepNum === idx) return 'current';
        if (currentStepNum > idx) return 'completed';
        return 'upcoming';
    };

    const getSteps = (): TimelineStep[] => {
        if (isObservation) {
            const isContractor = !!incident?.related_contractor_company;
            const reviewRole = isContractor ? t('workflow.roles.consultant', 'Consultant') : t('workflow.roles.hsseExpert', 'HSSE Expert');
            return [
                { id: '1', label: t('workflow.merged.submitted', 'Submitted'), icon: FileText, roleCategory: 'system', typicalRole: t('workflow.roles.reporter', 'Reporter'), state: getS(0), actorKey: 'submitted_by' },
                { id: '2', label: t('workflow.merged.initialReview', 'Initial Review'), icon: Shield, roleCategory: isContractor ? 'contractor' : 'hsse', typicalRole: reviewRole, state: getS(1), actorKey: 'expert_screener' },
                { id: '3', label: t('workflow.merged.approval', 'Approval'), icon: ClipboardCheck, roleCategory: 'internal', typicalRole: t('workflow.roles.deptRepClient', 'Department Rep / Client'), state: getS(2), actorKey: 'dept_rep' },
                { id: '4', label: t('workflow.merged.actions', 'Actions'), icon: Clock, roleCategory: 'contractor', typicalRole: t('workflow.roles.contractorActionOwner', 'Contractor / Action Owner'), state: getS(3), actorKey: 'manager_approver' },
                { id: '5', label: t('workflow.merged.closed', 'Closed'), icon: Lock, roleCategory: 'system', typicalRole: t('workflow.roles.systemVerifier', 'System Verifier'), state: getS(4), actorKey: 'closure_approver' },
            ];
        }
        return [
            { id: '1', label: t('workflow.merged.reported', 'Reported'), icon: FileText, roleCategory: 'system', typicalRole: t('workflow.roles.reporter', 'Reporter'), state: getS(0), actorKey: 'submitted_by' },
            { id: '2', label: t('workflow.merged.triage', 'Triage'), icon: Shield, roleCategory: 'hsse', typicalRole: t('workflow.roles.hsseExpert', 'HSSE Expert'), state: getS(1), actorKey: 'expert_screener' },
            { id: '3', label: t('workflow.merged.investigation', 'Investigation'), icon: Search, roleCategory: 'internal', typicalRole: t('workflow.roles.investigator', 'Investigator'), state: getS(2), actorKey: 'investigator' },
            { id: '4', label: t('workflow.merged.correctives', 'Corrective Actions'), icon: ListChecks, roleCategory: 'contractor', typicalRole: t('workflow.roles.actionOwner', 'Action Owner'), state: getS(3), actorKey: 'manager_approver' },
            { id: '5', label: t('workflow.merged.closed', 'Closed'), icon: Lock, roleCategory: 'system', typicalRole: t('workflow.roles.systemVerifier', 'System Verifier'), state: getS(4), actorKey: 'closure_approver' },
        ];
    };

    const steps = getSteps();

    const getActorInfo = (step: TimelineStep): WorkflowActor | null => {
        if (!workflowActors) return null;
        return workflowActors[step.actorKey] || null;
    };

    // Render owner info inline on active step
    const renderOwnerBadge = () => {
        if (!ownerInfo) return null;
        if (ownerInfo.isUnassigned) {
            return (
                <span className="inline-flex items-center gap-1 text-[10px] text-warning-foreground bg-warning/10 px-1.5 py-0.5 rounded-full border border-warning/20">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    {t('workflow.awaitingRole', 'Awaiting {{role}}', { role: ownerInfo.role })}
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 text-[10px] text-foreground/80 bg-secondary/50 px-1.5 py-0.5 rounded-full">
                <User className="w-2.5 h-2.5" />
                <span className="truncate max-w-[100px]">{ownerInfo.name}</span>
            </span>
        );
    };

    // Render actor name + timestamp for completed steps
    const renderActorInfo = (step: TimelineStep) => {
        const actor = getActorInfo(step);
        const actorName = actor?.full_name ? String(actor.full_name) : null;
        if (!actorName) return null;
        const time = formatActorTimestamp(actor.timestamp);
        return (
            <div className="flex flex-col items-center gap-0">
                <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                    {actorName}
                </span>
                {time && (
                    <span className="text-[9px] text-muted-foreground/70">
                        {time}
                    </span>
                )}
            </div>
        );
    };

    // Render actor info for mobile (inline)
    const renderActorInfoMobile = (step: TimelineStep) => {
        const actor = getActorInfo(step);
        const actorName = actor?.full_name ? String(actor.full_name) : null;
        if (!actorName) return null;
        const time = formatActorTimestamp(actor.timestamp);
        return (
            <span className="text-xs text-muted-foreground">
                · {actorName}{time ? ` · ${time}` : ''}
            </span>
        );
    };

    return (
        <div className="w-full py-3">
            {/* Desktop: horizontal stepper */}
            <div className="hidden md:flex items-start w-full">
                {steps.map((step, index) => {
                    const isCurrent = step.state === 'current';
                    const isCompleted = step.state === 'completed';
                    const isUpcoming = step.state === 'upcoming';
                    const roleTextClass = ROLE_TEXT_COLORS[step.roleCategory];

                    return (
                        <div key={step.id} className="flex flex-col items-center flex-1">
                            {/* Connector + Node row */}
                            <div className="flex items-center w-full">
                                {/* Left connector */}
                                {index > 0 ? (
                                    <div className={cn(
                                        "h-[2px] flex-1 rounded-full transition-colors",
                                        isCompleted || isCurrent ? "bg-primary" : "bg-muted-foreground/20"
                                    )} />
                                ) : <div className="flex-1" />}

                                {/* Node */}
                                <div className={cn(
                                    "flex items-center justify-center w-7 h-7 rounded-full shrink-0 transition-all",
                                    isCompleted && "bg-primary text-primary-foreground",
                                    isCurrent && "bg-primary/15 text-primary ring-2 ring-primary",
                                    isUpcoming && "bg-muted text-muted-foreground border border-muted-foreground/25"
                                )}>
                                    {isCompleted ? <Check className="w-3.5 h-3.5" /> :
                                     isCurrent ? <Clock className="w-3.5 h-3.5" /> :
                                     <span className="text-[10px] font-medium">{index + 1}</span>}
                                </div>

                                {/* Right connector */}
                                {index < steps.length - 1 ? (
                                    <div className={cn(
                                        "h-[2px] flex-1 rounded-full transition-colors",
                                        isCompleted ? "bg-primary" : "bg-muted-foreground/20"
                                    )} />
                                ) : <div className="flex-1" />}
                            </div>

                            {/* Label + role + owner + actor info */}
                            <div className="mt-1.5 flex flex-col items-center gap-0.5 max-w-[110px]">
                                <span className={cn(
                                    "text-[11px] font-medium text-center leading-tight",
                                    isCurrent && "text-primary font-semibold",
                                    isCompleted && "text-foreground",
                                    isUpcoming && "text-muted-foreground"
                                )}>
                                    {step.label}
                                </span>
                                {isCompleted && renderActorInfo(step)}
                                {isCurrent && (
                                    <>
                                        <span className={cn("text-[10px] text-center leading-tight", roleTextClass)}>
                                            {step.typicalRole}
                                        </span>
                                        {renderOwnerBadge()}
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Mobile: compact vertical list */}
            <div className="flex flex-col gap-0 md:hidden">
                {steps.map((step, index) => {
                    const isCurrent = step.state === 'current';
                    const isCompleted = step.state === 'completed';
                    const isUpcoming = step.state === 'upcoming';
                    const roleTextClass = ROLE_TEXT_COLORS[step.roleCategory];

                    return (
                        <div key={step.id} className="flex items-start gap-3">
                            {/* Node + vertical connector */}
                            <div className="flex flex-col items-center">
                                <div className={cn(
                                    "flex items-center justify-center w-7 h-7 rounded-full shrink-0 transition-all",
                                    isCompleted && "bg-primary text-primary-foreground",
                                    isCurrent && "bg-primary/15 text-primary ring-2 ring-primary",
                                    isUpcoming && "bg-muted text-muted-foreground border border-muted-foreground/25"
                                )}>
                                    {isCompleted ? <Check className="w-3.5 h-3.5" /> :
                                     isCurrent ? <Clock className="w-3.5 h-3.5" /> :
                                     <span className="text-[10px] font-medium">{index + 1}</span>}
                                </div>
                                {index < steps.length - 1 && (
                                    <div className={cn(
                                        "w-0.5 h-5 mt-0.5",
                                        isCompleted ? "bg-primary" : "bg-muted-foreground/20"
                                    )} />
                                )}
                            </div>

                            {/* Label + role + owner + actor */}
                            <div className="flex flex-col gap-0.5 pt-1">
                                <div className="flex items-baseline gap-2 flex-wrap">
                                    <span className={cn(
                                        "text-sm font-medium",
                                        isCurrent && "text-primary font-semibold",
                                        isCompleted && "text-foreground",
                                        isUpcoming && "text-muted-foreground"
                                    )}>
                                        {step.label}
                                    </span>
                                    {isCompleted && renderActorInfoMobile(step)}
                                    {isCurrent && (
                                        <span className={cn("text-xs", roleTextClass)}>
                                            · {step.typicalRole}
                                        </span>
                                    )}
                                </div>
                                {isCurrent && renderOwnerBadge()}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
