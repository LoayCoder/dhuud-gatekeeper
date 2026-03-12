import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { User, Users, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IncidentWithDetails } from '@/features/incidents';
import { getCurrentOwner } from "@/lib/current-owner";

/**
 * Maps workflow statuses to their responsible parties using the centralized getCurrentOwner.
 */
export function getResponsibleParty(incident: Partial<IncidentWithDetails> | null) {
    const owner = getCurrentOwner(incident);
    if (!owner) return null;

    if (owner.isUnassigned) {
        return { role: owner.role, unassigned: true };
    }

    return {
        user: {
            name: owner.name || owner.role,
        },
    };
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

