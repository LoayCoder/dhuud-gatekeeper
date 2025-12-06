import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Loader2, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useCorrectiveActions, useCreateCorrectiveAction, useUpdateCorrectiveAction } from "@/hooks/use-investigation";
import { format } from "date-fns";

const actionSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  description: z.string().optional(),
  assigned_to: z.string().optional(),
  due_date: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  action_type: z.enum(['corrective', 'preventive', 'improvement']).default('corrective'),
});

type ActionFormValues = z.infer<typeof actionSchema>;

interface ActionsPanelProps {
  incidentId: string;
}

export function ActionsPanel({ incidentId }: ActionsPanelProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: actions, isLoading } = useCorrectiveActions(incidentId);
  const createAction = useCreateCorrectiveAction();
  const updateAction = useUpdateCorrectiveAction();

  const form = useForm<ActionFormValues>({
    resolver: zodResolver(actionSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      action_type: 'corrective',
    },
  });

  const onSubmit = async (data: ActionFormValues) => {
    if (!data.title) return;
    await createAction.mutateAsync({
      incident_id: incidentId,
      title: data.title,
      description: data.description,
      priority: data.priority,
      action_type: data.action_type,
      due_date: data.due_date,
    });
    form.reset();
    setDialogOpen(false);
  };

  const handleStatusChange = async (actionId: string, newStatus: string) => {
    await updateAction.mutateAsync({
      id: actionId,
      incidentId,
      updates: {
        status: newStatus,
        completed_date: newStatus === 'completed' ? new Date().toISOString().split('T')[0] : null,
      },
    });
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'overdue':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityVariant = (priority: string | null) => {
    switch (priority) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4" dir={direction}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">
          {t('investigation.actions.title', 'Corrective Actions')}
        </h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 me-2" />
              {t('investigation.actions.addAction', 'Add Action')}
            </Button>
          </DialogTrigger>
          <DialogContent dir={direction}>
            <DialogHeader>
              <DialogTitle>{t('investigation.actions.newAction', 'New Corrective Action')}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('investigation.actions.actionTitle', 'Action Title')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t('investigation.actions.titlePlaceholder', 'Enter action title...')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('investigation.actions.description', 'Description')}</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('investigation.actions.priority', 'Priority')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent dir={direction}>
                            <SelectItem value="low">{t('incidents.severityLevels.low', 'Low')}</SelectItem>
                            <SelectItem value="medium">{t('incidents.severityLevels.medium', 'Medium')}</SelectItem>
                            <SelectItem value="high">{t('incidents.severityLevels.high', 'High')}</SelectItem>
                            <SelectItem value="critical">{t('incidents.severityLevels.critical', 'Critical')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="action_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('investigation.actions.type', 'Type')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent dir={direction}>
                            <SelectItem value="corrective">{t('investigation.actions.types.corrective', 'Corrective')}</SelectItem>
                            <SelectItem value="preventive">{t('investigation.actions.types.preventive', 'Preventive')}</SelectItem>
                            <SelectItem value="improvement">{t('investigation.actions.types.improvement', 'Improvement')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('investigation.actions.dueDate', 'Due Date')}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    {t('common.cancel', 'Cancel')}
                  </Button>
                  <Button type="submit" disabled={createAction.isPending}>
                    {createAction.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                    {t('common.create', 'Create')}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {actions?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>{t('investigation.actions.noActions', 'No corrective actions have been created yet.')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {actions?.map((action) => (
            <Card key={action.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(action.status)}
                    <div className="space-y-1">
                      <h4 className="font-medium">{action.title}</h4>
                      {action.description && (
                        <p className="text-sm text-muted-foreground">{action.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant={getPriorityVariant(action.priority)}>
                          {action.priority}
                        </Badge>
                        <Badge variant="outline">
                          {action.action_type}
                        </Badge>
                        {action.due_date && (
                          <Badge variant="secondary">
                            {t('investigation.actions.due', 'Due')}: {format(new Date(action.due_date), 'MMM d, yyyy')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Select
                    value={action.status || 'assigned'}
                    onValueChange={(value) => handleStatusChange(action.id, value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir={direction}>
                      <SelectItem value="assigned">{t('investigation.actions.statuses.assigned', 'Assigned')}</SelectItem>
                      <SelectItem value="in_progress">{t('investigation.actions.statuses.inProgress', 'In Progress')}</SelectItem>
                      <SelectItem value="completed">{t('investigation.actions.statuses.completed', 'Completed')}</SelectItem>
                      <SelectItem value="verified">{t('investigation.actions.statuses.verified', 'Verified')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
