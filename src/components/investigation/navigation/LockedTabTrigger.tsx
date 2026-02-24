import React from "react";
import { TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Lock, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface LockedTabTriggerProps {
    value: string;
    label: string;
    icon: React.ElementType;
    isLocked: boolean;
    isCompleted?: boolean;
    onUnlock?: () => void;
    className?: string;
    hidden?: boolean;
}

export function LockedTabTrigger({
    value,
    icon: Icon,
    label,
    isLocked,
    isCompleted,
    className,
    hidden = false
}: LockedTabTriggerProps) {
    const { t } = useTranslation();

    if (hidden) return null;

    if (!isLocked) {
        return (
            <TabsTrigger
                value={value}
                className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-t-lg border-b-2 border-transparent transition-all",
                    "data-[state=active]:border-primary data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:font-semibold",
                    isCompleted && "text-emerald-600 dark:text-emerald-400 font-medium",
                    className
                )}
            >
                {isCompleted ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Icon className="h-4 w-4" />}
                <span className="hidden sm:inline">{label}</span>
            </TabsTrigger>
        );
    }

    // Locked Tab State
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-t-lg border-b-2 border-transparent cursor-not-allowed opacity-60 text-muted-foreground bg-muted/20",
                        className
                    )}>
                        <Lock className="h-3 w-3" />
                        <Icon className="h-4 w-4" />
                        <span className="hidden sm:inline">{label}</span>
                    </div>
                </TooltipTrigger>
                <TooltipContent className="z-50 bg-popover text-popover-foreground border shadow-md">
                    <p className="flex items-center gap-2 font-medium">
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                        {t('investigation.workflow.lockedTab', 'Complete previous steps to unlock')}
                    </p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
