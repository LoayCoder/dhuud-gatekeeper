import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileSearch, ClipboardCheck, RefreshCw, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface InvestigationWorkspaceHeaderProps {
    selectedIncidentId: string | null;
    selectedIncident: { event_type?: string; status?: string;[key: string]: unknown } | null;
    incidentData: { reference_id?: string; title?: string;[key: string]: unknown } | null;
    slaInfo: { status: string; isOverdue: boolean; daysRemaining: number; hoursRemaining: number } | null;
    onBack: () => void;
    onRefresh: () => void;
    onCloseOnSpot: () => void;
}

export function InvestigationWorkspaceHeader({
    selectedIncidentId,
    selectedIncident,
    incidentData,
    slaInfo,
    onBack,
    onRefresh,
    onCloseOnSpot
}: InvestigationWorkspaceHeaderProps) {
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            {/* Navigation Row & SLA Header */}
            <div className="flex items-center justify-between">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onBack}
                    className="gap-2 text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                    {t('incidents.backToList', 'Back to Event List')}
                </Button>

                {slaInfo && (
                    <div className={cn(
                        "flex items-center gap-2 text-sm font-semibold rounded-full px-4 py-1.5 border shadow-sm",
                        slaInfo.status === 'red' ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900" :
                            slaInfo.status === 'yellow' ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-900" :
                                "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900"
                    )}>
                        {slaInfo.status === 'red' ? <AlertCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                        {slaInfo.isOverdue
                            ? t('investigation.sla.overdueBy', { count: Math.abs(slaInfo.daysRemaining), defaultValue: `\${Math.abs(slaInfo.daysRemaining)}d OVERDUE` })
                            : t('investigation.sla.daysRemaining', { count: slaInfo.daysRemaining, defaultValue: `\${slaInfo.daysRemaining}d \${slaInfo.hoursRemaining}h REMAINING` })
                        }
                    </div>
                )}
            </div>

            {/* Header Content */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                <div className="space-y-3">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                            <FileSearch className="h-7 w-7 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">
                                {incidentData?.reference_id || t('investigation.title', 'Investigation')}
                            </h1>
                            <p className="text-muted-foreground mt-1 text-lg">
                                {incidentData?.title}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-3">
                    {selectedIncidentId && selectedIncident?.event_type === 'observation' && selectedIncident?.status !== 'closed' && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onCloseOnSpot}
                            className="gap-2 border-green-600/50 text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/30"
                        >
                            <ClipboardCheck className="h-4 w-4" />
                            {t('incidents.closedOnSpot.label', 'Close On Spot')}
                        </Button>
                    )}
                    {selectedIncidentId && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onRefresh}
                            className="gap-2"
                        >
                            <RefreshCw className="h-4 w-4" />
                            {t('common.refresh', 'Refresh')}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
