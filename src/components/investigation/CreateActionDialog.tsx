/**
 * CreateActionDialog - Standalone dialog for creating corrective actions
 * Used by ConsultantReviewCard and other workflow components
 */
import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Loader2, Link2, Building2, User, Sparkles } from "lucide-react";
import { useCreateCorrectiveAction } from "@/hooks/use-investigation";
import { useInvestigation } from "@/hooks/use-investigation";
import { useTenantDepartments } from "@/hooks/use-org-hierarchy";
import { useDepartmentUsers, useTenantUsers } from "@/hooks/use-department-users";
import { useRCAAI } from "@/hooks/use-rca-ai";
import { useIncident } from "@/hooks/use-incidents";
import { toast } from "sonner";

interface RootCause {
  id: string;
  text: string;
}

interface ContributingFactor {
  id: string;
  text: string;
}

const actionSchema = z.object({
  title: z.string().min(3, 'Title is required (min 3 characters)'),
  description: z.string().min(10, 'Description is required (min 10 characters)'),
  responsible_department_id: z.string().min(1, 'Department is required'),
  assigned_to: z.string().min(1, 'Assignee is required'),
  start_date: z.string().min(1, 'Start date is required'),
  due_date: z.string().min(1, 'Due date is required'),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  action_type: z.enum(['corrective', 'preventive', 'improvement']),
  category: z.enum(['engineering', 'administrative', 'ppe', 'training', 'procedure_update']),
  linked_cause_type: z.enum(['root_cause', 'contributing_factor']).optional().nullable(),
  linked_root_cause_id: z.string().optional().nullable(),
}).refine((data) => {
  if (data.start_date && data.due_date) {
    return new Date(data.start_date) <= new Date(data.due_date);
  }
  return true;
}, { message: 'Start date must be before due date', path: ['due_date'] });

type ActionFormValues = z.infer<typeof actionSchema>;

interface CreateActionDialogProps {
  incidentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActionCreated?: () => void;
}

export function CreateActionDialog({
  incidentId,
  open,
  onOpenChange,
  onActionCreated
}: CreateActionDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [isAISuggesting, setIsAISuggesting] = useState(false);

  const { data: investigation } = useInvestigation(incidentId);
  const { data: incident } = useIncident(incidentId);
  const { data: departments } = useTenantDepartments();
  const { data: departmentUsers } = useDepartmentUsers(selectedDepartmentId);
  const { data: allUsers } = useTenantUsers();
  const createAction = useCreateCorrectiveAction();
  const { suggestCorrectiveAction } = useRCAAI();

  // Parse root causes and contributing factors from investigation
  const investigationData = investigation as unknown as { 
    root_causes?: RootCause[]; 
    contributing_factors_list?: ContributingFactor[];
    five_whys?: Array<{ why: string; answer: string }>;
    immediate_cause?: string;
    underlying_cause?: string;
  } | null;
  const rootCauses: RootCause[] = investigationData?.root_causes || [];
  const contributingFactors: ContributingFactor[] = investigationData?.contributing_factors_list || [];

  const form = useForm<ActionFormValues>({
    resolver: zodResolver(actionSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      action_type: 'corrective',
      category: 'administrative',
      responsible_department_id: '',
      assigned_to: '',
      start_date: '',
      due_date: '',
      linked_cause_type: undefined,
      linked_root_cause_id: '',
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        title: '',
        description: '',
        priority: 'medium',
        action_type: 'corrective',
        category: 'administrative',
        responsible_department_id: '',
        assigned_to: '',
        start_date: '',
        due_date: '',
        linked_cause_type: undefined,
        linked_root_cause_id: '',
      });
      setSelectedDepartmentId(null);
    }
  }, [open, form]);

  const selectedCauseType = form.watch('linked_cause_type');
  const selectedCauseId = form.watch('linked_root_cause_id');

  // Get the appropriate list based on selected cause type
  const causesForSelection = useMemo(() => {
    if (selectedCauseType === 'root_cause') return rootCauses;
    if (selectedCauseType === 'contributing_factor') return contributingFactors;
    return [];
  }, [selectedCauseType, rootCauses, contributingFactors]);

  // Get selected cause details for preview
  const selectedCause = useMemo(() => {
    if (!selectedCauseId || selectedCauseId === '_none_') return null;
    if (selectedCauseType === 'root_cause') {
      return rootCauses.find(c => c.id === selectedCauseId);
    }
    return contributingFactors.find(c => c.id === selectedCauseId);
  }, [selectedCauseId, selectedCauseType, rootCauses, contributingFactors]);

  // Users to show in assignment dropdown
  const usersForAssignment = selectedDepartmentId ? departmentUsers : allUsers;

  // AI Suggest handler for title & description
  const handleAISuggestAction = async () => {
    if (!selectedCause) {
      toast.error(t('investigation.actions.ai.selectCauseFirst', 'Select a cause first'));
      return;
    }
    
    setIsAISuggesting(true);
    
    const rcaData = {
      incident_title: incident?.title,
      incident_description: incident?.description,
      severity: incident?.severity,
      event_type: incident?.event_type,
      five_whys: investigationData?.five_whys?.map(w => ({ question: w.why, answer: w.answer })),
      immediate_cause: investigationData?.immediate_cause,
      underlying_cause: investigationData?.underlying_cause,
      selected_cause_type: selectedCauseType as 'root_cause' | 'contributing_factor',
      selected_cause_text: selectedCause.text,
    };
    
    const result = await suggestCorrectiveAction(rcaData);
    
    if (result) {
      try {
        const cleanJson = result.replace(/```(?:json)?\s*/g, '').replace(/\s*```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        
        if (parsed.suggested_title) {
          form.setValue('title', parsed.suggested_title);
        }
        if (parsed.suggested_description) {
          form.setValue('description', parsed.suggested_description);
        }
        if (parsed.suggested_category && ['engineering', 'administrative', 'ppe', 'training', 'procedure_update'].includes(parsed.suggested_category)) {
          form.setValue('category', parsed.suggested_category);
        }
        if (parsed.suggested_type && ['corrective', 'preventive', 'improvement'].includes(parsed.suggested_type)) {
          form.setValue('action_type', parsed.suggested_type);
        }
        if (parsed.suggested_priority && ['critical', 'high', 'medium', 'low'].includes(parsed.suggested_priority)) {
          form.setValue('priority', parsed.suggested_priority);
        }
        toast.success(t('investigation.actions.ai.suggestionApplied', 'AI suggestion applied'));
      } catch (e) {
        console.error('Failed to parse AI suggestion:', e, result);
        toast.error(t('investigation.actions.ai.parseError', 'Failed to parse AI suggestion'));
      }
    }
    
    setIsAISuggesting(false);
  };

  const onSubmit = async (data: ActionFormValues) => {
    if (!data.title) return;
    
    // Validate cause linking when causes exist
    const hasCauses = rootCauses.length > 0 || contributingFactors.length > 0;
    if (hasCauses && (!data.linked_cause_type || !data.linked_root_cause_id)) {
      toast.error(t('investigation.actions.selectCauseRequired', 'Please link this action to a root cause or contributing factor'));
      return;
    }
    
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
      linked_cause_type: data.linked_cause_type,
      responsible_department_id: data.responsible_department_id,
      assigned_to: data.assigned_to,
    });
    
    onActionCreated?.();
    onOpenChange(false);
    toast.success(t('investigation.actions.created', 'Corrective action created successfully'));
  };

  const hasCauses = rootCauses.length > 0 || contributingFactors.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={direction} className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t('investigation.actions.newAction', 'New Corrective Action')}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            {/* Link to Cause (if causes exist) */}
            {hasCauses && (
              <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Link2 className="h-4 w-4" />
                  {t('investigation.actions.linkToCause', 'Link to Root Cause / Contributing Factor')} *
                </div>
                
                {/* Cause Type Selection */}
                <FormField
                  control={form.control}
                  name="linked_cause_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('investigation.actions.causeType', 'Cause Type')}</FormLabel>
                      <Select 
                        onValueChange={(v) => {
                          field.onChange(v);
                          form.setValue('linked_root_cause_id', '');
                        }} 
                        value={field.value ?? undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('investigation.actions.selectCauseType', 'Select cause type')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {rootCauses.length > 0 && (
                            <SelectItem value="root_cause">
                              {t('investigation.rca.rootCause', 'Root Cause')} ({rootCauses.length})
                            </SelectItem>
                          )}
                          {contributingFactors.length > 0 && (
                            <SelectItem value="contributing_factor">
                              {t('investigation.rca.contributingFactor', 'Contributing Factor')} ({contributingFactors.length})
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Specific Cause Selection */}
                {selectedCauseType && causesForSelection.length > 0 && (
                  <FormField
                    control={form.control}
                    name="linked_root_cause_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {selectedCauseType === 'root_cause' 
                            ? t('investigation.rca.selectRootCause', 'Select Root Cause')
                            : t('investigation.rca.selectContributingFactor', 'Select Contributing Factor')
                          }
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('investigation.actions.selectCause', 'Select a cause')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {causesForSelection.map((cause) => (
                              <SelectItem key={cause.id} value={cause.id}>
                                <span className="line-clamp-2">{cause.text}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Selected Cause Preview */}
                {selectedCause && (
                  <div className="bg-primary/5 border border-primary/20 rounded p-2 text-sm">
                    <div className="font-medium text-primary mb-1">
                      {selectedCauseType === 'root_cause' 
                        ? t('investigation.rca.rootCause', 'Root Cause')
                        : t('investigation.rca.contributingFactor', 'Contributing Factor')
                      }:
                    </div>
                    <div className="text-muted-foreground">{selectedCause.text}</div>
                  </div>
                )}
              </div>
            )}

            {/* Title with AI Suggest */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>{t('investigation.actions.actionTitle', 'Action Title')}</FormLabel>
                    {hasCauses && selectedCause && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleAISuggestAction}
                        disabled={isAISuggesting}
                        className="text-xs text-primary hover:text-primary/80"
                      >
                        {isAISuggesting ? (
                          <Loader2 className="h-3 w-3 me-1 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3 me-1" />
                        )}
                        {t('investigation.actions.ai.suggest', 'AI Suggest')}
                      </Button>
                    )}
                  </div>
                  <FormControl>
                    <Input {...field} placeholder={t('investigation.actions.titlePlaceholder', 'Enter action title')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('investigation.actions.description', 'Description')}</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      rows={3}
                      placeholder={t('investigation.actions.descriptionPlaceholder', 'Describe the corrective action in detail')} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Priority & Type Row */}
            <div className="grid grid-cols-2 gap-3">
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
                      <SelectContent>
                        <SelectItem value="low">{t('priority.low', 'Low')}</SelectItem>
                        <SelectItem value="medium">{t('priority.medium', 'Medium')}</SelectItem>
                        <SelectItem value="high">{t('priority.high', 'High')}</SelectItem>
                        <SelectItem value="critical">{t('priority.critical', 'Critical')}</SelectItem>
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
                      <SelectContent>
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

            {/* Category */}
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
                    <SelectContent>
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

            {/* Department */}
            <FormField
              control={form.control}
              name="responsible_department_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    {t('investigation.actions.responsibleDepartment', 'Responsible Department')}
                  </FormLabel>
                  <Select 
                    onValueChange={(val) => {
                      field.onChange(val);
                      setSelectedDepartmentId(val);
                      form.setValue('assigned_to', '');
                    }} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('investigation.actions.selectDepartment', 'Select department')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {departments?.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Assigned To */}
            <FormField
              control={form.control}
              name="assigned_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    {t('investigation.actions.assignedTo', 'Assigned To')}
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('investigation.actions.selectAssignee', 'Select assignee')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {usersForAssignment?.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name || (user as unknown as { email?: string }).email || user.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dates Row */}
            <div className="grid grid-cols-2 gap-3">
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
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" disabled={createAction.isPending}>
                {createAction.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                <Plus className="h-4 w-4 me-2" />
                {t('investigation.actions.createAction', 'Create Action')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
