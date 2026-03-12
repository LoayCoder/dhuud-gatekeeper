import { useTranslation } from "react-i18next";
import { FileText, ClipboardCheck, Shield, CheckCircle, Lock, Clock, Search, ListChecks, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IncidentWithDetails } from '@/features/incidents';
import { ROLE_TEXT_COLORS, type RoleCategory } from "@/lib/role-colors";

type StepState = 'completed' | 'current' | 'upcoming';

interface TimelineStep {
    id: string;
    label: string;
    icon: React.ElementType;
    roleCategory: RoleCategory;
    typicalRole: string;
    state: StepState;
}

interface UnifiedTimelineTrackerProps {
    incident: Partial<IncidentWithDetails>;
}

// Map actual db status strings to a rigid 5-step integer scale
function getStepIndex(status: string, isObservation: boolean): number {
    if (isObservation) {
        if (["submitted"].includes(status)) return 0;
        if (["pending_expert_screening", "expert_screening", "pending_consultant_screening"].includes(status)) return 1;
        if (["pending_dept_rep_approval", "pending_manager_approval", "pending_site_client_approval"].includes(status)) return 2;
        if (["observation_actions_pending", "pending_contractor_implementation", "pending_consultant_actions"].includes(status)) return 3;
        if (["closed", "hsse_enforced", "pending_closure", "pending_hsse_validation"].includes(status)) return 4;
    } else {
        if (["submitted", "draft", "returned_to_reporter"].includes(status)) return 0;
        if (["pending_dept_rep_incident_review", "expert_screening", "pending_manager_approval", "hsse_manager_escalation"].includes(status)) return 1;
        if (["investigation_pending", "pending_investigator_assignment", "investigation_in_progress", "under_investigation"].includes(status)) return 2;
        if (["pending_contractor_implementation", "observation_actions_pending"].includes(status)) return 3;
        if (["pending_closure", "investigation_closed", "closed", "no_investigation_required"].includes(status)) return 4;
    }
    return 0;
}

export function UnifiedTimelineTracker({ incident }: UnifiedTimelineTrackerProps) {
    const { t } = useTranslation();
    const status = incident?.status || "submitted";
    const isObservation = incident?.event_type === "observation";
    const currentStepNum = getStepIndex(status, isObservation);

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
                { id: '1', label: t('workflow.merged.submitted', 'Submitted'), icon: FileText, roleCategory: 'system', typicalRole: t('workflow.roles.reporter', 'Reporter'), state: getS(0) },
                { id: '2', label: t('workflow.merged.initialReview', 'Initial Review'), icon: Shield, roleCategory: isContractor ? 'contractor' : 'hsse', typicalRole: reviewRole, state: getS(1) },
                { id: '3', label: t('workflow.merged.approval', 'Approval'), icon: ClipboardCheck, roleCategory: 'internal', typicalRole: t('workflow.roles.deptRepClient', 'Department Rep / Client'), state: getS(2) },
                { id: '4', label: t('workflow.merged.actions', 'Actions'), icon: Clock, roleCategory: 'contractor', typicalRole: t('workflow.roles.contractorActionOwner', 'Contractor / Action Owner'), state: getS(3) },
                { id: '5', label: t('workflow.merged.closed', 'Closed'), icon: Lock, roleCategory: 'system', typicalRole: t('workflow.roles.systemVerifier', 'System Verifier'), state: getS(4) },
            ];
        }
        return [
            { id: '1', label: t('workflow.merged.reported', 'Reported'), icon: FileText, roleCategory: 'system', typicalRole: t('workflow.roles.reporter', 'Reporter'), state: getS(0) },
            { id: '2', label: t('workflow.merged.triage', 'Triage'), icon: Shield, roleCategory: 'hsse', typicalRole: t('workflow.roles.hsseExpert', 'HSSE Expert'), state: getS(1) },
            { id: '3', label: t('workflow.merged.investigation', 'Investigation'), icon: Search, roleCategory: 'internal', typicalRole: t('workflow.roles.investigator', 'Investigator'), state: getS(2) },
            { id: '4', label: t('workflow.merged.correctives', 'Corrective Actions'), icon: ListChecks, roleCategory: 'contractor', typicalRole: t('workflow.roles.actionOwner', 'Action Owner'), state: getS(3) },
            { id: '5', label: t('workflow.merged.closed', 'Closed'), icon: Lock, roleCategory: 'system', typicalRole: t('workflow.roles.systemVerifier', 'System Verifier'), state: getS(4) },
        ];
    };

    const steps = getSteps();

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

                            {/* Label + role (role only on current) */}
                            <div className="mt-1.5 flex flex-col items-center gap-0.5 max-w-[90px]">
                                <span className={cn(
                                    "text-[11px] font-medium text-center leading-tight",
                                    isCurrent && "text-primary font-semibold",
                                    isCompleted && "text-foreground",
                                    isUpcoming && "text-muted-foreground"
                                )}>
                                    {step.label}
                                </span>
                                {isCurrent && (
                                    <span className={cn("text-[10px] text-center leading-tight", roleTextClass)}>
                                        {step.typicalRole}
                                    </span>
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

                            {/* Label + role */}
                            <div className="flex items-baseline gap-2 pt-1">
                                <span className={cn(
                                    "text-sm font-medium",
                                    isCurrent && "text-primary font-semibold",
                                    isCompleted && "text-foreground",
                                    isUpcoming && "text-muted-foreground"
                                )}>
                                    {step.label}
                                </span>
                                {isCurrent && (
                                    <span className={cn("text-xs", roleTextClass)}>
                                        · {step.typicalRole}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
