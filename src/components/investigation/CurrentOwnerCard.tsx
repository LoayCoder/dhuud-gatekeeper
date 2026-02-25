import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, User, UserCheck, Bell, ArrowUpRight, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import type { IncidentWithDetails } from "@/hooks/use-incidents";
import { getCurrentOwner } from "@/lib/current-owner";
import { ROLE_BG_COLORS, ROLE_BORDER_COLORS, ROLE_TEXT_COLORS } from "@/lib/role-colors";

export function CurrentOwnerCard({ incident }: { incident: IncidentWithDetails }) {
    const { t } = useTranslation();
    const { profile } = useAuth();

    const owner = getCurrentOwner(incident);
    if (!owner) return null; // If no one is pending (e.g. Closed), do not render the card.

    const isCurrentUserOwner = profile?.full_name === owner.name;

    // Unassigned State UI
    if (owner.isUnassigned) {
        return (
            <Card className="border-warning/50 shadow-md bg-warning/5 overflow-hidden">
                <div className="bg-warning/10 px-4 py-2 border-b border-warning/20 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <span className="text-xs font-semibold text-warning tracking-wider uppercase">
                        {t('workflow.unassigned', 'Action Required • Unassigned')}
                    </span>
                </div>
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                                Waiting for Assignment
                            </h3>
                            <p className="text-muted-foreground">
                                <span className="font-semibold text-foreground">{owner.role}</span> will pick this up for: {owner.actionRequired}
                            </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            <Button variant="outline" className="border-warning/50 text-warning hover:bg-warning/10 shadow-sm">
                                <Bell className="h-4 w-4 mr-2" />
                                Notify {owner.role}s
                            </Button>
                            <Button variant="default" className="bg-warning text-warning-foreground hover:bg-warning/90 shadow-sm">
                                Request Priority Assignment
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Assigned State UI
    const category = owner.roleCategory;
    const bgClass = ROLE_BG_COLORS[category];
    const borderClass = ROLE_BORDER_COLORS[category];
    const textClass = ROLE_TEXT_COLORS[category];

    // Determine if the card should have a warning style (e.g., for critical roles or specific states)
    // For now, let's assume 'critical' category implies warning, or if owner.isWarning is explicitly set
    const isWarning = category === 'warning';

    return (
        <Card className={cn("border shadow-md overflow-hidden flex p-0", borderClass, bgClass)}>
            {/* Status Indicator Bar */}
            <div className={cn(
                "w-1.5 shrink-0 rounded-l-lg",
                isWarning ? "bg-warning" : "bg-primary"
            )} />

            {/* Main Content Area */}
            <div className="flex-1 p-5 lg:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-8">
                {/* Left: Owner Info */}
                <div className="flex items-start gap-4 flex-1">
                    <div className={cn(
                        "flex items-center justify-center w-12 h-12 rounded-full border-2 shrink-0 transition-colors",
                        isWarning
                            ? "bg-warning/10 border-warning/30 text-warning"
                            : "bg-primary/5 border-primary/20 text-primary"
                    )}>
                        <User className="w-5 h-5" /> {/* Changed from UserIcon to User from lucide-react */}
                    </div>
                    <div className="space-y-1.5">
                        <h2 className={cn(
                            "text-lg font-bold tracking-tight",
                            isWarning ? "text-warning-foreground dark:text-warning" : "text-foreground"
                        )}>
                            {owner.name}
                        </h2>
                        <div className="flex items-center flex-wrap gap-2 text-muted-foreground">
                            <span className={cn("font-medium px-2 py-0.5 rounded-md text-xs border bg-background/50", borderClass, textClass)}>
                                {owner.role}
                            </span>
                            <span>•</span>
                            <span>{owner.actionRequired}</span>
                        </div>
                    </div>
                </div>

                {/* Action Context Panel */}
                <div className="flex items-center gap-3 shrink-0">
                    {isCurrentUserOwner ? (
                        <Button
                            size="lg"
                            className="shadow-lg px-8"
                            onClick={() => {
                                const workflowCard = document.querySelector('[data-workflow-card]');
                                if (workflowCard) {
                                    workflowCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                            }}
                        >
                            {t('workflow.currentOwner.takeAction', 'Take Action')}
                            <ArrowRight className="h-4 w-4 ms-2 rtl:rotate-180" />
                        </Button>
                    ) : (
                        <>
                            <Button variant="outline" className="bg-background shadow-sm border-muted-foreground/30">
                                <Bell className="h-4 w-4 me-2 text-muted-foreground" />
                                {t('workflow.currentOwner.sendReminder', 'Send Reminder')}
                            </Button>
                            <Button variant="outline" className="bg-background shadow-sm border-destructive/30 text-destructive hover:bg-destructive/10">
                                <ArrowUpRight className="h-4 w-4 me-2" />
                                {t('workflow.currentOwner.escalate', 'Escalate')}
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </Card>
    );
}
