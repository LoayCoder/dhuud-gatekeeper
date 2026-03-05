import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  ClipboardCheck, 
  Loader2, 
  CheckCircle2,
  Clock,
  Play,
  AlertTriangle,
  FileSearch,
  Users,
  Camera,
  Stethoscope
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMyInvestigationTasks, useCompleteTeamTask } from '@/features/investigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TASK_ICONS: Record<string, React.ElementType> = {
  'evidence_collection': Camera,
  'witness_interview': Users,
  'property_assessment': FileSearch,
  'injury_documentation': Stethoscope,
};

/**
 * Card displaying the current user's assigned investigation tasks.
 * Allows marking tasks as complete.
 */
export function MyInvestigationTasksCard() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState<Record<string, string>>({});
  
  const { data: myTasks, isLoading } = useMyInvestigationTasks();
  const completeTask = useCompleteTeamTask();
  
  // Filter out completed tasks
  const pendingTasks = myTasks?.filter((task: unknown) => task.status !== 'completed') || [];
  
  if (pendingTasks.length === 0 && !isLoading) {
    return null;
  }
  
  const handleStartComplete = (taskId: string) => {
    setCompletingTaskId(taskId);
    setCompletionNotes({});
  };
  
  const handleComplete = () => {
    if (!completingTaskId) return;
    
    completeTask.mutate({
      taskId: completingTaskId,
      completionNotes: completionNotes[completingTaskId]?.trim() || undefined,
    }, {
      onSuccess: () => {
        setCompletingTaskId(null);
        setCompletionNotes({});
      },
    });
  };
  
  const getTaskIcon = (type: string) => {
    const Icon = TASK_ICONS[type] || ClipboardCheck;
    return <Icon className="h-4 w-4" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 me-1" />{t('workflow.teamTasks.statusCompleted', 'Completed')}</Badge>;
      case 'in_progress':
        return <Badge variant="secondary"><Clock className="h-3 w-3 me-1" />{t('workflow.teamTasks.statusInProgress', 'In Progress')}</Badge>;
      default:
        return <Badge variant="outline"><AlertTriangle className="h-3 w-3 me-1" />{t('workflow.teamTasks.statusPending', 'Pending')}</Badge>;
    }
  };

  return (
    <>
      <Card className="border-primary/30 bg-primary/5" dir={direction}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">
              {String(t('workflow.myTasks.title', 'My Investigation Tasks'))}
            </CardTitle>
            {pendingTasks.length > 0 && (
              <Badge variant="destructive" className="ms-auto">
                {pendingTasks.length}
              </Badge>
            )}
          </div>
          <CardDescription>
            {t('workflow.myTasks.description', 'Tasks assigned to you for the current investigation.')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {pendingTasks.map((task: unknown) => (
                <div 
                  key={task.id} 
                  className={cn(
                    "p-4 rounded-lg border bg-background",
                    task.status === 'in_progress' && 'border-primary/50'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        {getTaskIcon(task.task_type)}
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium">
                          {String(t(`workflow.teamTasks.types.${task.task_type}`, task.task_type))}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {task.task_description}
                        </p>
                        {task.target_area && (
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium">{t('workflow.myTasks.targetArea', 'Target')}:</span> {task.target_area}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">{t('workflow.myTasks.incident', 'Incident')}:</span> {task.investigation?.incident?.reference_id || 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(task.status)}
                      {task.status !== 'completed' && (
                        <Button 
                          size="sm"
                          onClick={() => handleStartComplete(task.id)}
                        >
                          <CheckCircle2 className="h-4 w-4 me-1" />
                          {t('workflow.myTasks.markComplete', 'Complete')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completion Dialog */}
      <Dialog open={!!completingTaskId} onOpenChange={(open) => !open && setCompletingTaskId(null)}>
        <DialogContent dir={direction}>
          <DialogHeader>
            <DialogTitle>{t('workflow.myTasks.completeTask', 'Complete Task')}</DialogTitle>
            <DialogDescription>
              {t('workflow.myTasks.completeTaskDesc', 'Add any notes about what was found or completed.')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Textarea
              value={completionNotes[completingTaskId || ''] || ''}
              onChange={(e) => setCompletionNotes(prev => ({ ...prev, [completingTaskId || '']: e.target.value }))}
              placeholder={t('workflow.myTasks.completionNotesPlaceholder', 'Describe findings, observations, or outcomes...') as string}
              rows={4}
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompletingTaskId(null)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleComplete} disabled={completeTask.isPending}>
              {completeTask.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin me-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 me-2" />
              )}
              {t('workflow.myTasks.confirmComplete', 'Mark as Complete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

