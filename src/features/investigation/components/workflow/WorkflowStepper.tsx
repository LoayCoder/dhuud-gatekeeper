
import { Check, Circle, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkflowStage } from "../../types";

interface Step {
    id: WorkflowStage;
    label: string;
    icon?: React.ElementType;
}

import { useTranslation } from "react-i18next";

interface WorkflowStepperProps {
    currentStage: WorkflowStage;
}

export function WorkflowStepper({ currentStage }: WorkflowStepperProps) {
    const { t, i18n } = useTranslation();
    const direction = i18n.dir();

    const STEPS: Step[] = [
        { id: WorkflowStage.Triage, label: t('investigation.stepper.triage', 'Triage & Approval') },
        { id: WorkflowStage.Assignment, label: t('investigation.stepper.assignment', 'Assignment') },
        { id: WorkflowStage.DataCollection, label: t('investigation.stepper.dataCollection', 'Data Collection') },
        { id: WorkflowStage.Analysis, label: t('investigation.stepper.analysis', 'Analysis (RCA)') },
        { id: WorkflowStage.Review, label: t('investigation.stepper.review', 'Review & Closure') },
    ];

    const currentStepIndex = STEPS.findIndex(s => s.id === currentStage);

    // If stage is not found (e.g. Closed or custom), handle gracefully
    // For 'Closure', we can assume it's after Review
    const effectiveIndex = currentStage === WorkflowStage.Closure
        ? STEPS.length
        : currentStepIndex === -1 ? 0 : currentStepIndex;

    return (
        <div className="w-full py-4" dir={direction}>
            {/* Force LTR for stepper if we want it strictly left-to-right, OR support RTL. 
                Usually pipelines are time-based so LTR is common even in RTL, but for Arabic UI it should probably mirror.
                Let's support RTL by using start-0 etc.
             */}
            <div className="relative flex items-center justify-between w-full">
                <div className="absolute start-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-muted -z-10" />
                <div
                    className="absolute start-0 top-1/2 transform -translate-y-1/2 h-1 bg-primary transition-all duration-500 -z-10"
                    style={{ width: `${Math.min((effectiveIndex / (STEPS.length - 1)) * 100, 100)}%` }}
                />

                {STEPS.map((step, index) => {
                    const isCompleted = index < effectiveIndex;
                    const isCurrent = index === effectiveIndex;

                    return (
                        <div key={step.id} className="relative z-10 flex flex-col items-center bg-background px-2">
                            {/* z-10 added to ensure circles are above the line */}
                            <div
                                className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all",
                                    isCompleted ? "bg-primary border-primary text-primary-foreground" :
                                        isCurrent ? "border-primary text-primary ring-4 ring-primary/20" :
                                            "border-muted text-muted-foreground bg-background"
                                )}
                            >
                                {isCompleted ? <Check className="w-5 h-5" /> :
                                    isCurrent ? <Clock className="w-5 h-5 animate-pulse" /> :
                                        <Circle className="w-5 h-5" />}
                            </div>
                            <span className={cn(
                                "mt-2 text-xs font-medium transition-colors hidden md:block text-center max-w-[100px]",
                                isCompleted || isCurrent ? "text-foreground" : "text-muted-foreground"
                            )}>
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
