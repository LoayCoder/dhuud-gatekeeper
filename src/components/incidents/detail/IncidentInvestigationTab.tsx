import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
    Circle,
    CheckCircle2,
    Clock,
    ArrowDown,
    User,
    FileSearch,
    AlertTriangle
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface IncidentInvestigationTabProps {
    incidentId: string;
}

export function IncidentInvestigationTab({ incidentId }: IncidentInvestigationTabProps) {
    const { t } = useTranslation();

    const { data: investigation, isLoading } = useQuery<any>({
        queryKey: ['investigation-detail', incidentId],
        queryFn: async () => {
            const { data } = await supabase
                .from('investigations')
                .select(`
          *,
          investigator:profiles!investigator_id(full_name),
          team_leader:profiles!team_leader_id(full_name)
        `)
                .eq('incident_id', incidentId)
                .maybeSingle();
            return data as any;
        },
        enabled: !!incidentId
    });

    const { data: rca } = useQuery<any>({
        queryKey: ['rca-detail', incidentId],
        queryFn: async () => {
            const { data } = await supabase
                .from('rca_analyses' as any)
                .select('*')
                .eq('incident_id', incidentId)
                .maybeSingle();
            return data as any;
        },
        enabled: !!incidentId
    });

    if (isLoading) {
        return <Skeleton className="h-[400px] w-full" />;
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
                {/* Investigation Status Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileSearch className="h-5 w-5 text-primary" />
                            {t('investigation.details', 'Investigation Details')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{t('investigation.investigator', 'Investigator')}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{investigation?.investigator?.full_name || 'Unassigned'}</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{t('investigation.startedAt', 'Started At')}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">
                                        {investigation?.started_at ? format(new Date(investigation.started_at), 'PP') : '-'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {investigation?.scope && (
                            <div className="mt-4">
                                <p className="text-sm font-medium text-muted-foreground mb-1">{t('investigation.scope', 'Scope')}</p>
                                <p className="text-sm bg-muted/50 p-3 rounded-md">{investigation.scope}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* RCA Summary Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                            {t('investigation.rcaSummary', 'Root Cause Analysis')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {rca ? (
                            <>
                                {rca.immediate_cause && (
                                    <div>
                                        <Badge variant="outline" className="mb-1 border-amber-500/50 text-amber-700 bg-amber-50">
                                            {t('rca.immediateCause', 'Immediate Cause')}
                                        </Badge>
                                        <p className="text-sm mt-1">{rca.immediate_cause}</p>
                                    </div>
                                )}
                                {rca.root_causes_summary && (
                                    <div>
                                        <Badge variant="outline" className="mb-1 border-destructive/50 text-destructive bg-destructive/5">
                                            {t('rca.rootCause', 'Root Cause')}
                                        </Badge>
                                        <p className="text-sm mt-1">{rca.root_causes_summary}</p>
                                    </div>
                                )}
                                {!rca.immediate_cause && !rca.root_causes_summary && (
                                    <p className="text-sm text-muted-foreground italic">
                                        {t('rca.noAnalysis', 'No detailed analysis recorded yet.')}
                                    </p>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-6 text-muted-foreground">
                                {t('investigation.noRca', 'No RCA started.')}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Timeline Placeholder - Enhancing this to be a real timeline visual */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('investigation.timeline', 'Investigation Timeline')}</CardTitle>
                    <CardDescription>{t('investigation.timelineDesc', 'Key events and milestones')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="relative pl-6 border-l-2 border-muted space-y-8 my-4">

                        {/* Timeline Item: Incident Reported */}
                        <div className="relative">
                            <span className="absolute -left-[31px] top-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center text-white ring-4 ring-background">
                                <AlertTriangle className="h-3 w-3" />
                            </span>
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold">{t('status.incidentReported', 'Incident Reported')}</span>
                                <span className="text-xs text-muted-foreground">
                                    {/* We would put the date here from incident.created_at */}
                                    {t('common.initialReport', 'Initial Report')}
                                </span>
                            </div>
                        </div>

                        {/* Timeline Item: Investigation Started */}
                        {investigation?.started_at && (
                            <div className="relative">
                                <span className="absolute -left-[31px] top-1 h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center text-white ring-4 ring-background">
                                    <FileSearch className="h-3 w-3" />
                                </span>
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold">{t('status.investigationStarted', 'Investigation Started')}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {format(new Date(investigation.started_at), 'PP p')}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Timeline Item: Completed */}
                        {investigation?.completed_at && (
                            <div className="relative">
                                <span className="absolute -left-[31px] top-1 h-6 w-6 rounded-full bg-green-500 flex items-center justify-center text-white ring-4 ring-background">
                                    <CheckCircle2 className="h-3 w-3" />
                                </span>
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold">{t('status.investigationCompleted', 'Investigation Completed')}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {format(new Date(investigation.completed_at), 'PP p')}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Future/Pending State */}
                        {!investigation?.completed_at && (
                            <div className="relative opacity-50">
                                <span className="absolute -left-[31px] top-1 h-6 w-6 rounded-full bg-muted border-2 border-muted-foreground/30 flex items-center justify-center ring-4 ring-background">
                                    <Circle className="h-3 w-3 text-muted-foreground" />
                                </span>
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-muted-foreground">{t('status.pendingCompletion', 'Pending Completion')}</span>
                                </div>
                            </div>
                        )}

                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
