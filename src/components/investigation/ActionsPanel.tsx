import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Loader2, CheckCircle2, Clock, AlertCircle, ChevronDown, Link2 } from "lucide-react";
import { useCorrectiveActions, useCreateCorrectiveAction, useUpdateCorrectiveAction } from "@/hooks/use-investigation";
import { useInvestigation } from "@/hooks/use-investigation";
import { format } from "date-fns";
import { ActionEvidenceSection } from "./ActionEvidenceSection";

interface RootCause {
  id: string;
  text: string;
}

const actionSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  description: z.string().optional(),
  assigned_to: z.string().optional(),
  start_date: z.string().optional(),
  due_date: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  action_type: z.enum(['corrective', 'preventive', 'improvement']).default('corrective'),
  category: z.enum(['engineering', 'administrative', 'ppe', 'training', 'procedure_update']).default('administrative'),
  linked_root_cause_id: z.string().optional(),
});

type ActionFormValues = z.infer<typeof actionSchema>;

interface ActionsPanelProps {
  incidentId: string;
}

export function ActionsPanel({ incidentId }: ActionsPanelProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set());

  const { data: actions, isLoading } = useCorrectiveActions(incidentId);
  const { data: investigation } = useInvestigation(incidentId);
  const createAction = useCreateCorrectiveAction();
  const updateAction = useUpdateCorrectiveAction();

  // Parse root causes from investigation - using type assertion for new field
  const investigationData = investigation as unknown as { root_causes?: RootCause[] } | null;
  const rootCauses: RootCause[] = investigationData?.root_causes || [];

  const form = useForm<ActionFormValues>({
    resolver: zodResolver(actionSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      action_type: 'corrective',
      category: 'administrative',
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
      start_date: data.start_date,
      category: data.category,
      linked_root_cause_id: data.linked_root_cause_id,
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

  const toggleActionExpand = (actionId: string) => {
    setExpandedActions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(actionId)) {
        newSet.delete(actionId);
      } else {
        newSet.add(actionId);
      }
      return newSet;
    });
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'completed':
      case 'verified':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'overdue':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityVariant = (priority: string | null): "default" | "secondary" | "destructive" | "outline" => {
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

  const getCategoryLabel = (category: string | null) => {
    switch (category) {
      case 'engineering':
        return t('investigation.actions.categories.engineering', 'Engineering');
      case 'administrative':
        return t('investigation.actions.categories.administrative', 'Administrative');
      case 'ppe':
        return t('investigation.actions.categories.ppe', 'PPE');
      case 'training':
        return t('investigation.actions.categories.training', 'Training');
      case 'procedure_update':
        return t('investigation.actions.categories.procedureUpdate', 'Procedure Update');
      default:
        return category || '-';
    }
  };

  const getLinkedCauseText = (linkedId: string | null) => {
    if (!linkedId) return null;
    const cause = rootCauses.find(c => c.id === linkedId);
    return cause?.text;
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
          <DialogContent dir={direction} className="max-w-lg max-h-[90vh] overflow-y-auto">
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

                {rootCauses.length > 0 && (
                  <FormField
                    control={form.control}
                    name="linked_root_cause_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Link2 className="h-4 w-4" />
                          {t('investigation.actions.linkedRootCause', 'Linked Root Cause')}
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('investigation.actions.selectRootCause', 'Select root cause...')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent dir={direction}>
                            <SelectItem value="">{t('common.none', 'None')}</SelectItem>
                            {rootCauses.map((cause, idx) => (
                              <SelectItem key={cause.id} value={cause.id}>
                                {t('investigation.rca.rootCause', 'Root Cause')} {idx + 1}: {cause.text.substring(0, 50)}...
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('investigation.actions.category', 'Category')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent dir={direction}>
                            <SelectItem value="engineering">{t('investigation.actions.categories.engineering', 'Engineering')}</SelectItem>
                            <SelectItem value="administrative">{t('investigation.actions.categories.administrative', 'Administrative')}</SelectItem>
                            <SelectItem value="ppe">{t('investigation.actions.categories.ppe', 'PPE')}</SelectItem>
                            <SelectItem value="training">{t('investigation.actions.categories.training', 'Training')}</SelectItem>
                            <SelectItem value="procedure_update">{t('investigation.actions.categories.procedureUpdate', 'Procedure Update')}</SelectItem>
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
                    name="start_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('investigation.actions.startDate', 'Start Date')}</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
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
          {actions?.map((action) => {
            const linkedCauseText = getLinkedCauseText((action as unknown as { linked_root_cause_id: string | null }).linked_root_cause_id);
            const category = (action as unknown as { category: string | null }).category;
            const startDate = (action as unknown as { start_date: string | null }).start_date;
            const isExpanded = expandedActions.has(action.id);

            return (
              <Card key={action.id}>
                <Collapsible open={isExpanded} onOpenChange={() => toggleActionExpand(action.id)}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {getStatusIcon(action.status)}
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium truncate">{action.title}</h4>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              </Button>
                            </CollapsibleTrigger>
                          </div>
                          {action.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{action.description}</p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge variant={getPriorityVariant(action.priority)}>
                              {action.priority}
                            </Badge>
                            <Badge variant="outline">
                              {action.action_type}
                            </Badge>
                            {category && (
                              <Badge variant="secondary">
                                {getCategoryLabel(category)}
                              </Badge>
                            )}
                            {startDate && (
                              <Badge variant="outline" className="text-xs">
                                {t('investigation.actions.start', 'Start')}: {format(new Date(startDate), 'MMM d')}
                              </Badge>
                            )}
                            {action.due_date && (
                              <Badge variant="outline" className="text-xs">
                                {t('investigation.actions.due', 'Due')}: {format(new Date(action.due_date), 'MMM d, yyyy')}
                              </Badge>
                            )}
                          </div>
                          {linkedCauseText && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                              <Link2 className="h-3 w-3" />
                              <span className="truncate">{linkedCauseText}</span>
                            </div>
                          )}
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

                    <CollapsibleContent className="mt-4 pt-4 border-t">
                      <ActionEvidenceSection
                        actionId={action.id}
                        incidentId={incidentId}
                        isReadOnly={action.status === 'verified'}
                      />
                    </CollapsibleContent>
                  </CardContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
