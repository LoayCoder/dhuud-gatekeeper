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
        <Card className="border-0 shadow-md">
            <CardContent className="p-0">
                {/* Mobile: Vertical Scroll Container (Passive), Desktop: Horizontal Flex */}
                <div className="overflow-y-auto max-h-[400px] md:max-h-none md:overflow-visible">
                    {/* 
            sticky top-0 ensures the currently active mobile step stays at the top of the viewport 
            while scrolling the history, but only if we structure it as a vertical list on small screens.
          */}
                    <div className="flex flex-col md:flex-row relative">
                        <TooltipProvider>
                            {steps.map((step, index) => {
                                const isCurrent = step.state === 'current';
                                const isCompleted = step.state === 'completed';
                                const Icon = isCompleted ? CheckCircle : step.icon;

                                const bgClass = ROLE_BG_COLORS[step.roleCategory];
                                const textClass = ROLE_TEXT_COLORS[step.roleCategory];
                                const borderClass = ROLE_BORDER_COLORS[step.roleCategory];

                                return (
                                    <div
                                        key={step.id}
                                        className={cn(
                                            "flex md:flex-1 relative pb-8 md:pb-0 pt-4 md:pt-6 px-2",
                                            isCurrent && "sticky top-0 z-10 bg-background md:static" // Sticky on mobile specifically
                                        )}
                                    >
                                        {/* 
                                         * Added Container Panel for distinct boundary definition 
                                         */}
                                        <div className={cn(
                                            "absolute inset-y-0 left-0 right-0 md:inset-0 rounded-lg border bg-card/40 transition-all",
                                            isCurrent ? "border-primary/30 bg-primary/5 shadow-sm" : "border-border/50",
                                            step.state === 'upcoming' && "opacity-50 border-dashed"
                                        )} />

                                        {/* Vertical line (Mobile) */}
                                        {index < steps.length - 1 && (
                                            <div className={cn(
                                                "absolute left-[2.7rem] w-[2px] md:hidden z-0",
                                                isCompleted ? "bg-primary" : "bg-muted"
                                            )} style={{ top: "calc(3.5rem + 15px)", bottom: "calc(-1.5rem + 15px)" }} />
                                        )}

                                        {/* Horizontal line (Desktop) */}
                                        {index < steps.length - 1 && (
                                            <div className={cn(
                                                "hidden md:block absolute top-[3.25rem] h-[2px] z-0",
                                                isCompleted ? "bg-primary" : "bg-muted"
                                            )} style={{ left: "calc(50% + 28px)", right: "calc(-50% + 28px)" }} />
                                        )}

                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className={cn(
                                                    "flex md:flex-col items-center gap-4 md:gap-3 w-full px-4 md:px-2 py-4 z-10 relative",
                                                    step.state === 'upcoming' && "opacity-80"
                                                )}>
                                                    {/* Node Circle */}
                                                    <div className={cn(
                                                        "flex items-center justify-center shrink-0 w-10 h-10 rounded-full transition-all relative z-20",
                                                        isCompleted ? "bg-primary text-primary-foreground shadow-sm" :
                                                            isCurrent ? "bg-background text-primary ring-2 ring-primary ring-offset-4 ring-offset-background" :
                                                                "bg-background border-2 border-muted-foreground/30 text-muted-foreground"
                                                    )}>
                                                        <Icon className="w-5 h-5" />
                                                    </div>

                                                    {/* Node Label */}
                                                    <div className="flex flex-col md:items-center text-left md:text-center mt-1">
                                                        <span className={cn(
                                                            "text-sm font-bold tracking-tight",
                                                            isCurrent ? "text-primary dark:text-foreground" :
                                                                isCompleted ? "text-foreground" :
                                                                    "text-muted-foreground"
                                                        )}>
                                                            {step.label}
                                                        </span>
                                                    </div>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className={cn("border shadow-lg", bgClass, borderClass)}>
                                                <p className={cn("text-xs font-semibold", textClass)}>
                                                    Typically handled by: {step.typicalRole}
                                                </p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                );
                            })}
                        </TooltipProvider>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
