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

    const owner = getCurrentOwner(incident);

    return (
        <div className={cn("flex flex-col gap-1 items-start", className)}>
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                {t("workflow.pendingWith", "Pending With")}
            </span>
            <div className="flex flex-col gap-1">
                {responsibleInfo.unassigned ? (
                    <>
                        <Badge variant="outline" className="border-destructive text-destructive bg-destructive/10 text-xs py-0.5 font-normal">
                            <AlertTriangle className="h-3 w-3 me-1" />
                            {t("workflow.noUserAssigned", "No user assigned to this role")}
                        </Badge>
                        {owner?.warningMessage && (
                            <span className="text-[11px] text-destructive/80 ps-1">
                                {t("workflow.contactAdmin", "Contact admin to assign a {{role}}", { role: responsibleInfo.role })}
                            </span>
                        )}
                    </>
                ) : responsibleInfo.user ? (
                    <Badge variant="secondary" className="text-xs py-0.5 font-normal bg-secondary mix-blend-multiply dark:mix-blend-screen text-secondary-foreground border border-border/50">
                        <User className="h-3 w-3 me-1" />
                        <span className="truncate max-w-[150px] font-medium">{responsibleInfo.user.name}</span>
                    </Badge>
                ) : null}
            </div>
        </div>
    );
}

