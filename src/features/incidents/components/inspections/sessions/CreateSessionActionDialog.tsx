import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Loader2,
  Sparkles,
  Calendar as CalendarIcon,
  AlertTriangle,
  MapPin,
  Wrench,
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateSessionAction } from '@/features/incidents/hooks/use-inspection-actions/use-create-session-action';
import type { FailedAssetSummary } from '@/features/incidents/hooks/use-inspection-actions/use-session-failed-assets';

interface CreateSessionActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  failedAssets: FailedAssetSummary[];
}

const formSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  assigned_to: z.string().optional(),
  responsible_department_id: z.string().optional(),
  due_date: z.date(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  action_type: z.enum(['corrective', 'preventive']),
  category: z.enum(['operations', 'maintenance', 'training', 'procedural', 'equipment']),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateSessionActionDialog({
  open,
  onOpenChange,
  sessionId,
  failedAssets,
}: CreateSessionActionDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { profile } = useAuth();

  const [users, setUsers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const safeFailedAssets = Array.isArray(failedAssets) ? failedAssets.filter(Boolean) : [];
  const createAction = useCreateSessionAction();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      assigned_to: undefined,
      responsible_department_id: undefined,
      due_date: addDays(new Date(), 7),
      priority: 'medium',
      action_type: 'corrective',
      category: 'operations',
    },
  });

  // Load users and departments
  useEffect(() => {
    if (!open || !profile?.tenant_id) return;

    setIsLoadingData(true);
    setLoadError(null);

    const loadData = async () => {
      try {
        const [usersRes, deptsRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, full_name')
            .eq('tenant_id', profile.tenant_id)
            .eq('is_active', true)
            .is('deleted_at', null)
            .order('full_name'),
          supabase
            .from('departments')
            .select('id, name')
            .eq('tenant_id', profile.tenant_id)
            .is('deleted_at', null)
            .order('name'),
        ]);

        if (usersRes.error) throw usersRes.error;
        if (deptsRes.error) throw deptsRes.error;

        setUsers(usersRes.data || []);
        setDepartments(deptsRes.data || []);
      } catch (err) {
        console.error('[CreateSessionActionDialog] Failed to load form data:', err);
        setLoadError('Failed to load form data. Please try again.');
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, [open, profile?.tenant_id]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        title: '',
        description: '',
        assigned_to: undefined,
        responsible_department_id: undefined,
        due_date: addDays(new Date(), 7),
        priority: 'medium',
        action_type: 'corrective',
        category: 'operations',
      });
    }
  }, [open, form]);

  const handleAISuggestion = async () => {
    setIsGenerating(true);
    try {
      const failureSummary = safeFailedAssets
        .map((fa) => `${fa.asset_name} (${fa.asset_code}): ${fa.failed_parts?.join(', ') || fa.failure_reason || 'Failed'}`)
        .join('; ');

      const { data, error } = await supabase.functions.invoke('suggest-inspection-action', {
        body: {
          finding_classification: 'major_nc',
          finding_risk_level: 'high',
          checklist_item_question: `Session-level failures: ${failureSummary}`,
          finding_description: `${safeFailedAssets.length} assets failed inspection`,
          failure_notes: failureSummary,
        },
      });

      if (error) throw error;

      if (data) {
        form.setValue('title', data.suggested_title || '');
        form.setValue('description', data.suggested_description || '');
        if (data.suggested_category) form.setValue('category', data.suggested_category);
        if (data.suggested_priority) form.setValue('priority', data.suggested_priority);
        if (data.suggested_action_type) form.setValue('action_type', data.suggested_action_type);
      }
    } catch (error) {
      console.error('AI suggestion error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    await createAction.mutateAsync({
      sessionId,
      title: values.title,
      description: values.description,
      assigned_to: values.assigned_to,
      responsible_department_id: values.responsible_department_id,
      due_date: format(values.due_date, 'yyyy-MM-dd'),
      priority: values.priority,
      action_type: values.action_type,
      category: values.category,
      failedAssets: safeFailedAssets,
    });

    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={direction} className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {t('actions.createSessionAction', { defaultValue: 'Create Corrective Action' })}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t('actions.failedAssetsContext', {
              count: safeFailedAssets.length,
              defaultValue: `${safeFailedAssets.length} failed asset(s) detected`,
            })}
          </p>
        </DialogHeader>

        {isLoadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ms-2 text-sm text-muted-foreground">Loading form data...</span>
          </div>
        ) : loadError ? (
          <div className="text-center py-8 space-y-2">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
            <p className="text-sm text-destructive">{loadError}</p>
            <Button variant="outline" size="sm" onClick={() => {
              setLoadError(null);
              // Re-trigger load
              const event = new Event('reload');
              window.dispatchEvent(event);
            }}>
              {t('common.retry', { defaultValue: 'Retry' })}
            </Button>
          </div>
        ) : safeFailedAssets.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No failed assets found for this session.</p>
          </div>
        ) : (
          <>
        {/* Step 1: Failed Assets Summary (Read-only) */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t('actions.failedAssetsSummary', { defaultValue: 'Failed Assets Summary' })}
          </h4>
          <ScrollArea className="max-h-[200px]">
            <div className="space-y-2">
              {failedAssets.map((fa) => (
                <div key={fa.id} className="p-3 border rounded-lg bg-muted/30 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="font-mono text-xs">
                      {fa.asset_code}
                    </Badge>
                    <span className="font-medium text-sm">{fa.asset_name}</span>
                    <Badge variant={fa.quick_result === 'not_good' ? 'destructive' : 'secondary'} className="text-xs">
                      {fa.quick_result === 'not_good' ? t('inspections.notGood', { defaultValue: 'Not Good' }) : t('inspections.partial', { defaultValue: 'Partial' })}
                    </Badge>
                  </div>
                  {fa.location !== '-' && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {fa.location}
                    </div>
                  )}
                  {fa.failed_parts.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Wrench className="h-3 w-3" />
                      {fa.failed_parts.join(', ')}
                    </div>
                  )}
                  {fa.failure_reason && (
                    <p className="text-xs text-muted-foreground">{fa.failure_reason}</p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Step 2: Action Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* AI Suggestion Button */}
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAISuggestion}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="me-2 h-4 w-4" />
                )}
                {isGenerating
                  ? t('inspections.findings.generating', { defaultValue: 'Generating...' })
                  : t('inspections.findings.aiSuggest', { defaultValue: 'AI Suggest' })}
              </Button>
            </div>

            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('inspections.findings.actionTitle', { defaultValue: 'Action Title' })}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t('inspections.findings.actionTitlePlaceholder', { defaultValue: 'Enter action title' })} />
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
                  <FormLabel>{t('inspections.findings.actionDescription', { defaultValue: 'Description' })}</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} placeholder={t('inspections.findings.actionDescriptionPlaceholder', { defaultValue: 'Describe the corrective action' })} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Two column layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Assigned To */}
              <FormField
                control={form.control}
                name="assigned_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('inspections.findings.assignTo', { defaultValue: 'Assign To' })}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('common.select', { defaultValue: 'Select' })} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent dir={direction}>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Responsible Department */}
              <FormField
                control={form.control}
                name="responsible_department_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('inspections.findings.responsibleDept', { defaultValue: 'Department' })}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('common.select', { defaultValue: 'Select' })} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent dir={direction}>
                        {departments.map((dept) => (
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

              {/* Due Date */}
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('inspections.findings.dueDate', { defaultValue: 'Due Date' })}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full justify-start text-start font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="me-2 h-4 w-4" />
                            {field.value ? format(field.value, 'PPP') : t('common.selectDate', { defaultValue: 'Select date' })}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Priority */}
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('inspections.findings.priority', { defaultValue: 'Priority' })}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent dir={direction}>
                        <SelectItem value="low">{t('common.priority.low', { defaultValue: 'Low' })}</SelectItem>
                        <SelectItem value="medium">{t('common.priority.medium', { defaultValue: 'Medium' })}</SelectItem>
                        <SelectItem value="high">{t('common.priority.high', { defaultValue: 'High' })}</SelectItem>
                        <SelectItem value="critical">{t('common.priority.critical', { defaultValue: 'Critical' })}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Action Type */}
              <FormField
                control={form.control}
                name="action_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('inspections.findings.actionType', { defaultValue: 'Action Type' })}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent dir={direction}>
                        <SelectItem value="corrective">{t('inspections.findings.actionTypes.corrective', { defaultValue: 'Corrective' })}</SelectItem>
                        <SelectItem value="preventive">{t('inspections.findings.actionTypes.preventive', { defaultValue: 'Preventive' })}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('inspections.findings.category', { defaultValue: 'Category' })}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent dir={direction}>
                        <SelectItem value="operations">{t('inspections.findings.categories.operations', { defaultValue: 'Operations' })}</SelectItem>
                        <SelectItem value="maintenance">{t('inspections.findings.categories.maintenance', { defaultValue: 'Maintenance' })}</SelectItem>
                        <SelectItem value="training">{t('inspections.findings.categories.training', { defaultValue: 'Training' })}</SelectItem>
                        <SelectItem value="procedural">{t('inspections.findings.categories.procedural', { defaultValue: 'Procedural' })}</SelectItem>
                        <SelectItem value="equipment">{t('inspections.findings.categories.equipment', { defaultValue: 'Equipment' })}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel', { defaultValue: 'Cancel' })}
              </Button>
              <Button type="submit" disabled={createAction.isPending}>
                {createAction.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t('actions.createAction', { defaultValue: 'Create Action' })}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
