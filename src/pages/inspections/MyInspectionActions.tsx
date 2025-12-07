import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ClipboardCheck, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Calendar,
  Play,
  CheckCircle
} from 'lucide-react';
import { useMyInspectionActions, useUpdateActionStatus } from '@/hooks/use-inspection-actions';
import { Skeleton } from '@/components/ui/skeleton';

export default function MyInspectionActions() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { data: actions, isLoading } = useMyInspectionActions();
  const updateStatus = useUpdateActionStatus();
  const [activeTab, setActiveTab] = useState('all');

  const filterActions = (status: string) => {
    if (status === 'all') return actions || [];
    if (status === 'pending') {
      return actions?.filter(a => ['assigned', 'in_progress'].includes(a.status)) || [];
    }
    return actions?.filter(a => a.status === status) || [];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
      case 'closed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'completed':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'in_progress':
        return <Play className="h-4 w-4 text-primary" />;
      default:
        return <ClipboardCheck className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-amber-500';
      default: return 'bg-green-500';
    }
  };

  const handleStatusUpdate = async (actionId: string, newStatus: string) => {
    await updateStatus.mutateAsync({ actionId, status: newStatus });
  };

  const filteredActions = filterActions(activeTab);
  const pendingCount = actions?.filter(a => ['assigned', 'in_progress'].includes(a.status)).length || 0;
  const overdueCount = actions?.filter(a => 
    a.due_date && 
    new Date(a.due_date) < new Date() && 
    !['completed', 'verified', 'closed'].includes(a.status)
  ).length || 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4">
        <div className="space-y-6" dir={direction}>
          {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">{t('actions.myInspectionActions')}</h1>
          <p className="text-muted-foreground">{t('actions.myActionsDescription')}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <ClipboardCheck className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('actions.pendingActions')}</p>
                  <p className="text-2xl font-bold">{pendingCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500/10 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('actions.overdue')}</p>
                  <p className="text-2xl font-bold">{overdueCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-full">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('actions.completed')}</p>
                  <p className="text-2xl font-bold">
                    {actions?.filter(a => ['completed', 'verified', 'closed'].includes(a.status)).length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions List */}
        <Card>
          <CardHeader>
            <CardTitle>{t('actions.actionsList')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} dir={direction}>
              <TabsList className="mb-4">
                <TabsTrigger value="all">{t('common.all')}</TabsTrigger>
                <TabsTrigger value="pending">{t('actions.pending')}</TabsTrigger>
                <TabsTrigger value="completed">{t('actions.awaitingVerification')}</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab}>
                {isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : filteredActions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>{t('actions.noActionsAssigned')}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredActions.map((action) => {
                      const isOverdue = action.due_date && 
                        new Date(action.due_date) < new Date() && 
                        !['completed', 'verified', 'closed'].includes(action.status);

                      return (
                        <div 
                          key={action.id}
                          className={`p-4 border rounded-lg space-y-3 ${
                            isOverdue ? 'border-destructive bg-destructive/5' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className={`w-1 h-12 rounded-full ${getPriorityColor(action.priority)}`} />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(action.status)}
                                  <span className="font-medium">{action.title}</span>
                                </div>
                                {action.description && (
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {action.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Badge variant={isOverdue ? 'destructive' : 'secondary'}>
                              {t(`actions.statusLabels.${action.status}`)}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {action.due_date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span className={isOverdue ? 'text-destructive' : ''}>
                                  {new Date(action.due_date).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            {action.status === 'assigned' && (
                              <Button 
                                size="sm"
                                onClick={() => handleStatusUpdate(action.id, 'in_progress')}
                                disabled={updateStatus.isPending}
                              >
                                <Play className="h-4 w-4 me-1" />
                                {t('actions.startWork')}
                              </Button>
                            )}
                            {action.status === 'in_progress' && (
                              <Button 
                                size="sm"
                                onClick={() => handleStatusUpdate(action.id, 'completed')}
                                disabled={updateStatus.isPending}
                              >
                                <CheckCircle className="h-4 w-4 me-1" />
                                {t('actions.markComplete')}
                              </Button>
                            )}
                            {action.status === 'completed' && (
                              <Badge variant="secondary">
                                <Clock className="h-3 w-3 me-1" />
                                {t('actions.awaitingVerification')}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
