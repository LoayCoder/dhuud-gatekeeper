import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, AlertCircle, ArrowRight, MessageSquare, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMyCorrectiveActions, useUpdateMyActionStatus } from '@/hooks/use-incidents';
import { useMyAssignedWitnessStatements } from '@/hooks/use-witness-statements';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { WitnessDirectEntry } from '@/components/investigation/WitnessDirectEntry';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const getStatusIcon = (status: string | null) => {
  switch (status) {
    case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'in_progress': return <Clock className="h-4 w-4 text-blue-500" />;
    case 'verified': return <CheckCircle2 className="h-4 w-4 text-primary" />;
    case 'approved': return <CheckCircle2 className="h-4 w-4 text-primary" />;
    default: return <AlertCircle className="h-4 w-4 text-amber-500" />;
  }
};

const getPriorityBadgeVariant = (priority: string | null): "destructive" | "secondary" | "outline" => {
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
  const { profile } = useAuth();
  const { data: actions, isLoading: actionsLoading } = useMyCorrectiveActions();
  const { data: witnessStatements, isLoading: witnessLoading, refetch: refetchWitness } = useMyAssignedWitnessStatements();
  const updateStatus = useUpdateMyActionStatus();
  const [selectedWitnessTask, setSelectedWitnessTask] = useState<{ id: string; incident_id: string } | null>(null);
  const [activeTab, setActiveTab] = useState('actions');

  const handleStatusChange = (actionId: string, newStatus: string) => {
    updateStatus.mutate({ id: actionId, status: newStatus });
  };

  const handleWitnessStatementSubmit = () => {
    setSelectedWitnessTask(null);
    refetchWitness();
  };

  const pendingActions = actions?.filter(a => a.status === 'assigned' || a.status === 'pending') || [];
  const inProgressActions = actions?.filter(a => a.status === 'in_progress') || [];
  const completedActions = actions?.filter(a => a.status === 'completed' || a.status === 'verified') || [];

  const pendingWitness = witnessStatements?.filter(w => w.assignment_status === 'pending' || w.assignment_status === 'in_progress') || [];

  const isLoading = actionsLoading || witnessLoading;

  return (
    <div className="container py-6 space-y-6" dir={direction}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('investigation.myActions', 'My Actions')}</h1>
          <p className="text-muted-foreground">{t('investigation.myActionsDescription', 'View and manage your assigned tasks')}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('investigation.pendingActions', 'Pending Actions')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{pendingActions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('investigation.inProgressActions', 'In Progress')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{inProgressActions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('investigation.completedActions', 'Completed')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{completedActions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('investigation.witnesses.pendingStatements', 'Pending Statements')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">{pendingWitness.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} dir={direction}>
        <TabsList>
          <TabsTrigger value="actions">
            {t('investigation.correctiveActions', 'Corrective Actions')} ({actions?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="witness">
            <MessageSquare className="h-4 w-4 me-2" />
            {t('investigation.witnesses.title', 'Witness Statements')} ({witnessStatements?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="actions" className="mt-4">
          {actionsLoading ? (
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
                            {t(`investigation.priority.${action.priority}`, action.priority)}
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
                          <span className="font-medium">{t('investigation.dueDate', 'Due Date')}:</span>{' '}
                          {new Date(action.due_date).toLocaleDateString()}
                        </div>
                      )}
                      {action.created_at && (
                        <div>
                          <span className="font-medium">{t('common.createdAt', 'Created')}:</span>{' '}
                          {formatDistanceToNow(new Date(action.created_at), { addSuffix: true })}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{t('investigation.updateStatus', 'Update Status')}:</span>
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
                            <SelectItem value="assigned">{t('investigation.actionStatus.assigned', 'Assigned')}</SelectItem>
                            <SelectItem value="in_progress">{t('investigation.actionStatus.in_progress', 'In Progress')}</SelectItem>
                            <SelectItem value="completed">{t('investigation.actionStatus.completed', 'Completed')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {action.incident_id && (
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/incidents/${action.incident_id}`} className="gap-2">
                            {t('investigation.viewIncident', 'View Incident')}
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
                <h3 className="text-lg font-medium mb-2">{t('investigation.noActionsAssigned', 'No Actions Assigned')}</h3>
                <p className="text-muted-foreground">{t('investigation.noActionsDescription', 'You have no pending corrective actions.')}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="witness" className="mt-4">
          {witnessLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
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
          ) : witnessStatements && witnessStatements.length > 0 ? (
            <div className="space-y-4">
              {witnessStatements.map((statement) => (
                <Card key={statement.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(statement.assignment_status)}
                        <CardTitle className="text-base">
                          {t('investigation.witnesses.statementRequest', 'Witness Statement Request')}
                        </CardTitle>
                      </div>
                      <Badge variant={statement.assignment_status === 'pending' ? 'destructive' : 'secondary'}>
                        {t(`investigation.witnesses.status.${statement.assignment_status}`, statement.assignment_status || 'pending')}
                      </Badge>
                    </div>
                    <CardDescription>
                      {t('investigation.witnesses.assignedToProvide', 'You have been assigned to provide a witness statement for an incident.')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      {statement.recorded_at && (
                        <div>
                          <span className="font-medium">{t('common.createdAt', 'Created')}:</span>{' '}
                          {formatDistanceToNow(new Date(statement.recorded_at), { addSuffix: true })}
                        </div>
                      )}
                    </div>
                    
                    {statement.assignment_status !== 'completed' && statement.assignment_status !== 'approved' && (
                      <Button onClick={() => setSelectedWitnessTask({ id: statement.id, incident_id: statement.incident_id })}>
                        {t('investigation.witnesses.provideStatement', 'Provide Statement')}
                      </Button>
                    )}

                    {statement.statement && (
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm font-medium mb-1">{t('investigation.witnesses.yourStatement', 'Your Statement')}:</p>
                        <p className="text-sm">{statement.statement}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="py-12">
              <CardContent className="flex flex-col items-center justify-center text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">{t('investigation.witnesses.noAssignedStatements', 'No Assigned Statements')}</h3>
                <p className="text-muted-foreground">{t('investigation.witnesses.noAssignedDescription', 'You have no pending witness statement requests.')}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog for entering witness statement */}
      <Dialog open={!!selectedWitnessTask} onOpenChange={(open) => !open && setSelectedWitnessTask(null)}>
        <DialogContent className="max-w-2xl" dir={direction}>
          <DialogHeader>
            <DialogTitle>{t('investigation.witnesses.provideStatement', 'Provide Statement')}</DialogTitle>
          </DialogHeader>
          {selectedWitnessTask && (
            <WitnessDirectEntry
              incidentId={selectedWitnessTask.incident_id}
              existingStatementId={selectedWitnessTask.id}
              onSuccess={handleWitnessStatementSubmit}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
