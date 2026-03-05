import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AlertCircle, ClipboardCheck, List, FileSearch, ArrowRight, Clock, PlusCircle } from "lucide-react";
import { useIncidents } from '@/features/incidents';
import { usePendingIncidentApprovals } from "@/hooks/use-pending-approvals";
import { IncidentStatusBadge } from '@/features/incidents';
import { ResponsibleUserBadge } from '@/features/incidents';
import { calculateInvestigationSLA } from "@/lib/investigation-sla";
import { cn } from "@/lib/utils";
import { getStatusBorderColor } from "@/lib/incident-status-colors";
import { Progress } from "@/components/ui/progress";

export function InvestigationListView() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState<'my-pending' | 'all'>('my-pending');

    const { data: incidents, isLoading: loadingIncidents } = useIncidents();
    const { data: pendingApprovals, isLoading: loadingPending } = usePendingIncidentApprovals();

    // Filter incidents that need investigation (not closed status)
    const investigableIncidents = incidents?.data?.filter(
        (inc) => inc.status !== 'closed'
    );

    const displayedIncidents = viewMode === 'my-pending' ? pendingApprovals : investigableIncidents;
    const isLoading = viewMode === 'my-pending' ? loadingPending : loadingIncidents;

    const getPriorityColor = (severity?: string) => {
        if (!severity) return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
        const s = severity.toLowerCase();
        if (s.includes('5') || s.includes('fatal')) return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800";
        if (s.includes('4') || s.includes('major')) return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800";
        if (s.includes('3') || s.includes('moderate')) return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-800";
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
    };

    const getPriorityLabel = (severity?: string) => {
        if (!severity) return "TBD";
        const match = severity.match(/\d/);
        if (match) return `LEVEL ${match[0]}`;
        return severity.toUpperCase().split('_')[0];
    };

    // Mock progress calculation for list view (in a real app, this might come from a DB aggregate)
    const getMockProgress = (id: string, status: string) => {
        if (status === 'submitted' || status === 'pending_manager_approval') return 10;
        if (status === 'investigation_pending') return 25;
        if (status === 'investigation_in_progress') return 60;
        if (status === 'pending_closure') return 90;
        if (status === 'closed') return 100;
        return 0;
    };

    return (
        <div className="space-y-6">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <FileSearch className="h-6 w-6" />
                        </div>
                        {t('investigation.myInvestigations', 'My Investigations')}
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        {t('investigation.listDescription', 'Manage and track active workplace investigations')}
                    </p>
                </div>
                <Button onClick={() => navigate('/incidents/report')} className="gap-2">
                    <PlusCircle className="h-4 w-4" />
                    {t('incidents.reportNew', 'New Event')}
                </Button>
            </div>

            {/* Filters & View Toggle */}
            <Card className="border-0 shadow-sm bg-muted/30">
                <div className="p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <ToggleGroup
                        type="single"
                        value={viewMode}
                        onValueChange={(v) => v && setViewMode(v as 'my-pending' | 'all')}
                        className="justify-start bg-background p-1.5 rounded-xl border shadow-sm w-full sm:w-auto"
                    >
                        <ToggleGroupItem
                            value="my-pending"
                            className="gap-2 px-4 py-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground rounded-lg transition-all flex-1 sm:flex-none"
                        >
                            <ClipboardCheck className="h-4 w-4" />
                            <span className="font-medium">{t('investigation.myPending', 'Active Tasks')}</span>
                            {pendingApprovals && pendingApprovals.length > 0 && (
                                <Badge variant={viewMode === 'my-pending' ? "secondary" : "destructive"} className="ms-1 h-5 min-w-5 px-1.5 text-xs font-bold">
                                    {pendingApprovals.length}
                                </Badge>
                            )}
                        </ToggleGroupItem>
                        <ToggleGroupItem
                            value="all"
                            className="gap-2 px-4 py-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground rounded-lg transition-all flex-1 sm:flex-none"
                        >
                            <List className="h-4 w-4" />
                            <span className="font-medium">{t('investigation.all', 'Team Investigations')}</span>
                        </ToggleGroupItem>
                    </ToggleGroup>
                </div>
            </Card>

            {/* Loading State */}
            {isLoading && (
                <div className="grid grid-cols-1 gap-4">
                    {[1, 2, 3].map(i => (
                        <Card key={i} className="animate-pulse h-32"></Card>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!isLoading && (!displayedIncidents || displayedIncidents.length === 0) && (
                <Card className="border-dashed border-2 bg-transparent shadow-none">
                    <CardContent className="py-16 text-center">
                        <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground">
                            <ClipboardCheck className="h-8 w-8" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">
                            {t('investigation.noTasksActive', 'No Active Investigations')}
                        </h3>
                        <p className="text-muted-foreground max-w-sm mx-auto">
                            {viewMode === 'my-pending'
                                ? t('investigation.noTasksDesc', 'You have no assigned investigations or pending approvals at this time.')
                                : t('investigation.noIncidentsDesc', 'There are no open investigations in the system.')}
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Incident List */}
            {!isLoading && displayedIncidents && displayedIncidents.length > 0 && (
                <div className="grid grid-cols-1 gap-4">
                    {displayedIncidents.map((incident) => {
                        // Use severity_v2 if available, fallback to severity
                        const severity = (incident as unknown).severity_v2 || incident.severity;
                        const priorityColor = getPriorityColor(severity);
                        const priorityLabel = getPriorityLabel(severity);
                        const sla = calculateInvestigationSLA(incident.created_at || new Date().toISOString(), severity);

                        // Dynamic progress based on status (simulated)
                        const mockProgress = getMockProgress(incident.id, incident.status || '');
                        const isComplete = incident.status === 'closed';

                        return (
                            <Card
                                key={incident.id}
                                className={cn(
                                    "overflow-hidden transition-all hover:shadow-md border-s-[5px] group cursor-pointer",
                                    getStatusBorderColor(incident.status)
                                )}
                                onClick={() => navigate(`/incidents/investigate?incident=${incident.id}`)}
                            >
                                <div className="flex flex-col md:flex-row">
                                    {/* Left Column: Priority & Basics */}
                                    <div className="p-5 md:w-1/3 border-b md:border-b-0 md:border-r bg-muted/10">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Badge className={cn("px-2 py-0.5 border shadow-sm font-bold tracking-wider rounded-md", priorityColor)} variant="outline">
                                                {severity && (priorityColor.includes('red') ? 'ðŸ”´ ' : priorityColor.includes('yellow') || priorityColor.includes('orange') ? 'ðŸŸ¡ ' : 'ðŸ”µ ')}
                                                {priorityLabel}
                                            </Badge>
                                            <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                                {incident.reference_id}
                                            </span>
                                        </div>

                                        <h3 className="font-semibold text-lg line-clamp-2 leading-tight mb-2 group-hover:text-primary transition-colors">
                                            {incident.title}
                                        </h3>

                                        <div className="mt-auto space-y-3">
                                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                <IncidentStatusBadge status={incident.status || ''} className="text-xs" />
                                            </div>
                                            <ResponsibleUserBadge incident={incident as unknown} className="scale-[0.85] origin-left" />
                                        </div>
                                    </div>

                                    {/* Middle Column: SLA & Progress */}
                                    <div className="p-5 md:w-5/12 flex flex-col justify-center">
                                        <div className="space-y-4">
                                            {/* SLA Warning */}
                                            {!isComplete && (
                                                <div className={cn(
                                                    "flex items-center gap-2 text-sm font-medium rounded-md px-3 py-2",
                                                    sla.status === 'red' ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400" :
                                                        sla.status === 'yellow' ? "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400" :
                                                            "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                                                )}>
                                                    {sla.status === 'red' ? <AlertCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                                                    {sla.isOverdue
                                                        ? t('investigation.sla.overdueBy', { count: Math.abs(sla.daysRemaining), defaultValue: `Overdue by ${Math.abs(sla.daysRemaining)} days âš ï¸` })
                                                        : t('investigation.sla.dueIn', { count: sla.daysRemaining, defaultValue: `Due in ${sla.daysRemaining} days` })
                                                    }
                                                </div>
                                            )}

                                            {/* Progress */}
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between text-xs font-medium text-muted-foreground">
                                                    <span>{t('investigation.progress', 'Progress')}</span>
                                                    <span>{mockProgress}% Complete</span>
                                                </div>
                                                <Progress value={mockProgress} className="h-2" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Actions */}
                                    <div className="p-5 md:w-1/4 flex items-center justify-end bg-muted/5">
                                        <Button
                                            className="w-full md:w-auto gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                                            variant="outline"
                                        >
                                            {t('investigation.continue', 'Continue')}
                                            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

