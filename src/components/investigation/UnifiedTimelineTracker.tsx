import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FileText, ClipboardCheck, Shield, CheckCircle, Lock, Clock, Search, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IncidentWithDetails } from "@/hooks/use-incidents";
import { ROLE_BG_COLORS, ROLE_BORDER_COLORS, ROLE_TEXT_COLORS, type RoleCategory } from "@/lib/role-colors";

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
        // Incident mapping
        if (["submitted", "draft", "returned_to_reporter"].includes(status)) return 0;
        if (["pending_dept_rep_incident_review", "expert_screening", "pending_manager_approval", "hsse_manager_escalation"].includes(status)) return 1;
        if (["investigation_pending", "pending_investigator_assignment", "investigation_in_progress", "under_investigation"].includes(status)) return 2;
        if (["pending_contractor_implementation", "observation_actions_pending"].includes(status)) return 3;
        if (["pending_closure", "investigation_closed", "closed", "no_investigation_required"].includes(status)) return 4;
    }
    // Default fallback if a status sneaks through
    return 0; // Better to default to start than crash
}

export function UnifiedTimelineTracker({ incident }: UnifiedTimelineTrackerProps) {
    const { t } = useTranslation();
    const status = incident?.status || "submitted";
    const isObservation = incident?.event_type === "observation";
    const currentStepNum = getStepIndex(status, isObservation);

    const getSteps = (): TimelineStep[] => {
        if (isObservation) {
            return [
                { id: '1', label: t('workflow.merged.submitted', 'Submitted'), icon: FileText, roleCategory: 'system', typicalRole: 'Reporter', state: getS(0) },
                { id: '2', label: t('workflow.merged.initialReview', 'Initial Review'), icon: Shield, roleCategory: 'hsse', typicalRole: 'HSSE Expert', state: getS(1) },
                { id: '3', label: t('workflow.merged.approval', 'Approval'), icon: ClipboardCheck, roleCategory: 'internal', typicalRole: 'Department Rep / Client', state: getS(2) },
                { id: '4', label: t('workflow.merged.actions', 'Actions'), icon: Clock, roleCategory: 'contractor', typicalRole: 'Contractor / Action Owner', state: getS(3) },
                { id: '5', label: t('workflow.merged.closed', 'Closed'), icon: Lock, roleCategory: 'system', typicalRole: 'System Verifier', state: getS(4) },
            ];
        }
        return [
            { id: '1', label: t('workflow.merged.reported', 'Reported'), icon: FileText, roleCategory: 'system', typicalRole: 'Reporter', state: getS(0) },
            { id: '2', label: t('workflow.merged.triage', 'Triage'), icon: Shield, roleCategory: 'hsse', typicalRole: 'HSSE Expert', state: getS(1) },
            { id: '3', label: t('workflow.merged.investigation', 'Investigation'), icon: Search, roleCategory: 'internal', typicalRole: 'Investigator', state: getS(2) },
            { id: '4', label: t('workflow.merged.correctives', 'Corrective Actions'), icon: ListChecks, roleCategory: 'contractor', typicalRole: 'Action Owner', state: getS(3) },
            { id: '5', label: t('workflow.merged.closed', 'Closed'), icon: Lock, roleCategory: 'system', typicalRole: 'System Verifier', state: getS(4) },
        ];
    };

    const getS = (idx: number): StepState => {
        if (currentStepNum === idx) return 'current';
        if (currentStepNum > idx) return 'completed';
        return 'upcoming';
    };

    const steps = getSteps();

    return (
        <Card className="border shadow-md bg-card">
            <CardContent className="p-4 md:p-6">
                {/* Desktop: Horizontal | Mobile: Vertical */}
                <div className="flex flex-col md:flex-row md:items-start gap-0">
                    <TooltipProvider>
                        {steps.map((step, index) => {
                            const isCurrent = step.state === 'current';
                            const isCompleted = step.state === 'completed';
                            const isUpcoming = step.state === 'upcoming';
                            const Icon = isCompleted ? CheckCircle : step.icon;

                            const textClass = ROLE_TEXT_COLORS[step.roleCategory];
                            const bgClass = ROLE_BG_COLORS[step.roleCategory];
                            const borderClass = ROLE_BORDER_COLORS[step.roleCategory];

                            return (
                                <div key={step.id} className="flex md:flex-col md:flex-1 md:items-center relative">
                                    {/* Mobile layout: icon + content row */}
                                    <div className="flex md:hidden items-start gap-4 py-3 ps-1">
                                        {/* Vertical connector + circle */}
                                        <div className="flex flex-col items-center">
                                            <div className={cn(
                                                "flex items-center justify-center w-10 h-10 rounded-full shrink-0 text-sm font-bold transition-all",
                                                isCompleted && "bg-primary text-primary-foreground shadow-sm",
                                                isCurrent && "bg-background text-primary ring-2 ring-primary ring-offset-2 ring-offset-background",
                                                isUpcoming && "bg-muted border-2 border-muted-foreground/20 text-muted-foreground"
                                            )}>
                                                {isUpcoming ? <span>{index + 1}</span> : <Icon className="w-5 h-5" />}
                                            </div>
                                            {index < steps.length - 1 && (
                                                <div className={cn(
                                                    "w-0.5 h-8 mt-1",
                                                    isCompleted ? "bg-primary" : "bg-muted-foreground/20"
                                                )} />
                                            )}
                                        </div>
                                        {/* Label + role badge */}
                                        <div className="flex flex-col gap-1.5 pt-2">
                                            <span className={cn(
                                                "text-sm font-semibold",
                                                isCurrent && "text-primary",
                                                isCompleted && "text-foreground",
                                                isUpcoming && "text-muted-foreground"
                                            )}>
                                                {step.label}
                                            </span>
                                            <span className={cn(
                                                "text-[11px] font-medium px-2 py-0.5 rounded-full border w-fit",
                                                bgClass, borderClass, textClass
                                            )}>
                                                {step.typicalRole}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Desktop layout: column with horizontal connector */}
                                    <div className="hidden md:flex md:flex-col md:items-center md:w-full">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className={cn(
                                                    "flex flex-col items-center gap-2 px-2 py-3 rounded-xl transition-all w-full",
                                                    isCurrent && "bg-primary/5"
                                                )}>
                                                    {/* Circle + connector row */}
                                                    <div className="flex items-center w-full">
                                                        {/* Left connector */}
                                                        {index > 0 && (
                                                            <div className={cn(
                                                                "h-0.5 flex-1 rounded-full",
                                                                isCompleted || isCurrent ? "bg-primary" : "bg-muted-foreground/20"
                                                            )} />
                                                        )}
                                                        {index === 0 && <div className="flex-1" />}

                                                        {/* Node circle */}
                                                        <div className={cn(
                                                            "flex items-center justify-center w-10 h-10 rounded-full shrink-0 text-sm font-bold transition-all mx-1",
                                                            isCompleted && "bg-primary text-primary-foreground shadow-sm",
                                                            isCurrent && "bg-background text-primary ring-2 ring-primary ring-offset-2 ring-offset-background",
                                                            isUpcoming && "bg-muted border-2 border-muted-foreground/20 text-muted-foreground"
                                                        )}>
                                                            {isUpcoming ? <span>{index + 1}</span> : <Icon className="w-5 h-5" />}
                                                        </div>

                                                        {/* Right connector */}
                                                        {index < steps.length - 1 && (
                                                            <div className={cn(
                                                                "h-0.5 flex-1 rounded-full",
                                                                isCompleted ? "bg-primary" : "bg-muted-foreground/20"
                                                            )} />
                                                        )}
                                                        {index === steps.length - 1 && <div className="flex-1" />}
                                                    </div>

                                                    {/* Label */}
                                                    <span className={cn(
                                                        "text-xs font-semibold text-center leading-tight",
                                                        isCurrent && "text-primary",
                                                        isCompleted && "text-foreground",
                                                        isUpcoming && "text-muted-foreground"
                                                    )}>
                                                        {step.label}
                                                    </span>

                                                    {/* Role badge */}
                                                    <span className={cn(
                                                        "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                                                        bgClass, borderClass, textClass
                                                    )}>
                                                        {step.typicalRole}
                                                    </span>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className={cn("border shadow-lg", bgClass, borderClass)}>
                                                <p className={cn("text-xs font-semibold", textClass)}>
                                                    {t('workflow.handledBy', 'Typically handled by')}: {step.typicalRole}
                                                </p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                </div>
                            );
                        })}
                    </TooltipProvider>
                </div>
            </CardContent>
        </Card>
    );
}
