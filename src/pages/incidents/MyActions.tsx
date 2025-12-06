import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, AlertCircle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMyCorrectiveActions, useUpdateMyActionStatus } from '@/hooks/use-incidents';
import { formatDistanceToNow } from 'date-fns';

const getStatusIcon = (status: string | null) => {
  switch (status) {
    case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'in_progress': return <Clock className="h-4 w-4 text-blue-500" />;
    case 'verified': return <CheckCircle2 className="h-4 w-4 text-primary" />;
    default: return <AlertCircle className="h-4 w-4 text-amber-500" />;
  }
};

const getPriorityBadgeVariant = (priority: string | null) => {
  switch (priority) {
    case 'critical': return 'destructive';
    case 'high': return 'destructive';
    case 'medium': return 'secondary';
    default: return 'outline';
  }
};

export default function MyActions() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { data: actions, isLoading } = useMyCorrectiveActions();
  const updateStatus = useUpdateMyActionStatus();

  const handleStatusChange = (actionId: string, newStatus: string) => {
    updateStatus.mutate({ id: actionId, status: newStatus });
  };

  const pendingActions = actions?.filter(a => a.status === 'assigned' || a.status === 'pending') || [];
  const inProgressActions = actions?.filter(a => a.status === 'in_progress') || [];
  const completedActions = actions?.filter(a => a.status === 'completed' || a.status === 'verified') || [];

  return (
    <div className="container py-6 space-y-6" dir={direction}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('investigation.myActions')}</h1>
          <p className="text-muted-foreground">{t('investigation.myActionsDescription')}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('investigation.pendingActions')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{pendingActions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('investigation.inProgressActions')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{inProgressActions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('investigation.completedActions')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{completedActions.length}</div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : actions && actions.length > 0 ? (
        <div className="space-y-4">
          {actions.map((action) => (
            <Card key={action.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(action.status)}
                    <CardTitle className="text-base">{action.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {action.priority && (
                      <Badge variant={getPriorityBadgeVariant(action.priority)}>
                        {t(`investigation.priority.${action.priority}`)}
                      </Badge>
                    )}
                  </div>
                </div>
                <CardDescription>
                  {action.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {action.due_date && (
                    <div>
                      <span className="font-medium">{t('investigation.dueDate')}:</span>{' '}
                      {new Date(action.due_date).toLocaleDateString()}
                    </div>
                  )}
                  {action.created_at && (
                    <div>
                      <span className="font-medium">{t('common.createdAt')}:</span>{' '}
                      {formatDistanceToNow(new Date(action.created_at), { addSuffix: true })}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{t('investigation.updateStatus')}:</span>
                    <Select
                      value={action.status || 'assigned'}
                      onValueChange={(value) => handleStatusChange(action.id, value)}
                      disabled={action.status === 'verified'}
                      dir={direction}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="assigned">{t('investigation.actionStatus.assigned')}</SelectItem>
                        <SelectItem value="in_progress">{t('investigation.actionStatus.in_progress')}</SelectItem>
                        <SelectItem value="completed">{t('investigation.actionStatus.completed')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {action.incident_id && (
                    <Button asChild variant="ghost" size="sm">
                      <Link to={`/incidents/${action.incident_id}`} className="gap-2">
                        {t('investigation.viewIncident')}
                        <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('investigation.noActionsAssigned')}</h3>
            <p className="text-muted-foreground">{t('investigation.noActionsDescription')}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
