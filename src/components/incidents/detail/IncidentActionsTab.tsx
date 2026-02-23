import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { CheckSquare, Plus, ExternalLink, Calendar, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { formatStatusLabel } from '@/lib/incident-status-colors';

interface IncidentActionsTabProps {
    incidentId: string;
}

export function IncidentActionsTab({ incidentId }: IncidentActionsTabProps) {
    const { t } = useTranslation();

    const { data: actions, isLoading } = useQuery({
        queryKey: ['incident-actions', incidentId],
        queryFn: async () => {
            const { data } = await supabase
                .from('corrective_actions')
                .select(`
          *,
          assigned_user:profiles!corrective_actions_assigned_to_fkey(full_name),
          responsible_department:departments!corrective_actions_responsible_department_id_fkey(name)
        `)
                .eq('incident_id', incidentId)
                .order('created_at', { ascending: false });
            return data;
        },
        enabled: !!incidentId
    });

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
        );
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                    <CheckSquare className="h-5 w-5 text-primary" />
                    {t('incidents.tabs.actions', 'Corrective Actions')}
                    <Badge variant="secondary" className="ml-2">
                        {actions?.length || 0}
                    </Badge>
                </CardTitle>
                <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t('actions.create', 'Add Action')}
                </Button>
            </CardHeader>
            <CardContent>
                {!actions || actions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                        <CheckSquare className="h-10 w-10 mx-auto mb-3 opacity-20" />
                        <p>{t('actions.empty', 'No actions assigned yet.')}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {actions.map((action) => (
                            <div
                                key={action.id}
                                className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                            >
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-start justify-between">
                                        <h4 className="font-medium text-base">{action.title}</h4>
                                        <Badge variant={action.status === 'completed' || action.status === 'verified' ? 'default' : 'secondary'}>
                                            {formatStatusLabel(action.status)}
                                        </Badge>
                                    </div>
                                    {action.description && (
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                            {action.description}
                                        </p>
                                    )}
                                    <div className="flex flex-wrap gap-4 pt-2 text-xs text-muted-foreground">
                                        {action.assigned_user && (
                                            <div className="flex items-center gap-1.5">
                                                <User className="h-3.5 w-3.5" />
                                                <span>{action.assigned_user.full_name}</span>
                                            </div>
                                        )}
                                        {action.due_date && (
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="h-3.5 w-3.5" />
                                                <span>Due: {format(new Date(action.due_date), 'PP')}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
