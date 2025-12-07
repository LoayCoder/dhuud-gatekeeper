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
import { Label } from '@/components/ui/label';
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
import { Loader2, Sparkles, Calendar as CalendarIcon } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateActionFromFinding } from '@/hooks/use-area-findings';
import type { AreaFinding } from '@/hooks/use-area-findings';

interface CreateActionFromFindingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  finding: AreaFinding | null;
  sessionId: string;
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

export function CreateActionFromFindingDialog({
  open,
  onOpenChange,
  finding,
  sessionId,
}: CreateActionFromFindingDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { profile } = useAuth();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [users, setUsers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  
  const createAction = useCreateActionFromFinding();
  
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
    
    const loadData = async () => {
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
      
      if (usersRes.data) setUsers(usersRes.data);
      if (deptsRes.data) setDepartments(deptsRes.data);
    };
    
    loadData();
  }, [open, profile?.tenant_id]);
  
  // Reset form when dialog opens with new finding
  useEffect(() => {
    if (open && finding) {
      form.reset({
        title: '',
        description: '',
        assigned_to: undefined,
        responsible_department_id: undefined,
        due_date: addDays(new Date(), finding.risk_level === 'critical' ? 1 : finding.risk_level === 'high' ? 3 : 7),
        priority: finding.risk_level as FormValues['priority'],
        action_type: 'corrective',
        category: 'operations',
      });
    }
  }, [open, finding, form]);
  
  const handleAISuggestion = async () => {
    if (!finding) return;
    
    setIsGenerating(true);
    try {
      const questionText = finding.response?.template_item?.question || finding.description || '';
      
      const { data, error } = await supabase.functions.invoke('suggest-inspection-action', {
        body: {
          finding_classification: finding.classification,
          finding_risk_level: finding.risk_level,
          checklist_item_question: questionText,
          finding_description: finding.description,
          failure_notes: finding.recommendation,
        },
      });
      
      if (error) throw error;
      
      if (data) {
        form.setValue('title', data.suggested_title || '');
        form.setValue('description', data.suggested_description || '');
        if (data.suggested_category) {
          form.setValue('category', data.suggested_category);
        }
        if (data.suggested_priority) {
          form.setValue('priority', data.suggested_priority);
        }
        if (data.suggested_action_type) {
          form.setValue('action_type', data.suggested_action_type);
        }
      }
    } catch (error) {
      console.error('AI suggestion error:', error);
    } finally {
      setIsGenerating(false);
    }
  };
  
  const onSubmit = async (values: FormValues) => {
    if (!finding) return;
    
    await createAction.mutateAsync({
      findingId: finding.id,
      sessionId,
      title: values.title,
      description: values.description,
      assigned_to: values.assigned_to,
      responsible_department_id: values.responsible_department_id,
      due_date: format(values.due_date, 'yyyy-MM-dd'),
      priority: values.priority,
      action_type: values.action_type,
      category: values.category,
    });
    
    onOpenChange(false);
  };
  
  if (!finding) return null;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={direction} className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t('inspections.findings.createAction')}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t('inspections.findings.createActionFor')}: <span className="font-mono">{finding.reference_id}</span>
          </p>
        </DialogHeader>
        
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
                {isGenerating ? t('inspections.findings.generating') : t('inspections.findings.aiSuggest')}
              </Button>
            </div>
            
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('inspections.findings.actionTitle')}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t('inspections.findings.actionTitlePlaceholder')} />
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
                  <FormLabel>{t('inspections.findings.actionDescription')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} placeholder={t('inspections.findings.actionDescriptionPlaceholder')} />
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
                    <FormLabel>{t('inspections.findings.assignTo')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('common.select')} />
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
                    <FormLabel>{t('inspections.findings.responsibleDept')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('common.select')} />
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
                    <FormLabel>{t('inspections.findings.dueDate')}</FormLabel>
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
                            {field.value ? format(field.value, 'PPP') : t('common.selectDate')}
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
                    <FormLabel>{t('inspections.findings.priority')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent dir={direction}>
                        <SelectItem value="low">{t('common.priority.low')}</SelectItem>
                        <SelectItem value="medium">{t('common.priority.medium')}</SelectItem>
                        <SelectItem value="high">{t('common.priority.high')}</SelectItem>
                        <SelectItem value="critical">{t('common.priority.critical')}</SelectItem>
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
                    <FormLabel>{t('inspections.findings.actionType')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent dir={direction}>
                        <SelectItem value="corrective">{t('inspections.findings.actionTypes.corrective')}</SelectItem>
                        <SelectItem value="preventive">{t('inspections.findings.actionTypes.preventive')}</SelectItem>
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
                    <FormLabel>{t('inspections.findings.category')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent dir={direction}>
                        <SelectItem value="operations">{t('inspections.findings.categories.operations')}</SelectItem>
                        <SelectItem value="maintenance">{t('inspections.findings.categories.maintenance')}</SelectItem>
                        <SelectItem value="training">{t('inspections.findings.categories.training')}</SelectItem>
                        <SelectItem value="procedural">{t('inspections.findings.categories.procedural')}</SelectItem>
                        <SelectItem value="equipment">{t('inspections.findings.categories.equipment')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createAction.isPending}>
                {createAction.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t('inspections.findings.createActionButton')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
