import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CalendarIcon } from 'lucide-react';
import { useCreateTrainingRecord, TRAINING_TYPES } from '@/hooks/use-guard-training';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

const trainingSchema = z.object({
  guard_id: z.string().min(1, 'Select a guard'),
  training_type: z.string().min(1, 'Select a training type'),
  training_name: z.string().min(1, 'Enter training name'),
  training_provider: z.string().optional(),
  completion_date: z.date(),
  expiry_date: z.date().optional(),
  certificate_number: z.string().optional(),
  certificate_url: z.string().url().optional().or(z.literal('')),
  score: z.number().min(0).max(100).optional(),
  passed: z.boolean(),
  notes: z.string().optional(),
});

type TrainingFormData = z.infer<typeof trainingSchema>;

interface AddTrainingRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guardId?: string;
}

export function AddTrainingRecordDialog({ open, onOpenChange, guardId }: AddTrainingRecordDialogProps) {
  const { t } = useTranslation();
  const createRecord = useCreateTrainingRecord();

  // Get guards list when guardId is not provided
  const { data: currentProfile } = useQuery({
    queryKey: ['current-user-profile-training'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from('profiles').select('tenant_id').eq('user_id', user.id).eq('is_deleted', false).eq('is_active', true).single();
      return data;
    },
    enabled: !guardId,
  });

  const { data: guards } = useQuery({
    queryKey: ['guards-for-training', currentProfile?.tenant_id],
    queryFn: async () => {
      if (!currentProfile?.tenant_id) return [];
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('tenant_id', currentProfile.tenant_id)
        .is('deleted_at', null);
      return data || [];
    },
    enabled: !guardId && !!currentProfile?.tenant_id,
  });

  const form = useForm<TrainingFormData>({
    resolver: zodResolver(trainingSchema),
    defaultValues: {
      guard_id: guardId || '',
      training_type: '',
      training_name: '',
      training_provider: '',
      completion_date: new Date(),
      passed: true,
      notes: '',
    },
  });

  const onSubmit = async (data: TrainingFormData) => {
    await createRecord.mutateAsync({
      guard_id: data.guard_id,
      training_type: data.training_type,
      training_name: data.training_name,
      training_provider: data.training_provider || undefined,
      completion_date: format(data.completion_date, 'yyyy-MM-dd'),
      expiry_date: data.expiry_date ? format(data.expiry_date, 'yyyy-MM-dd') : undefined,
      certificate_number: data.certificate_number || undefined,
      certificate_url: data.certificate_url || undefined,
      score: data.score,
      passed: data.passed,
      notes: data.notes || undefined,
    });
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('security.training.addTitle', 'Add Training Record')}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Guard Selector - only show if guardId not provided */}
            {!guardId && (
              <FormField
                control={form.control}
                name="guard_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('security.training.guard', 'Guard')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('common.select', 'Select a guard')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {guards?.map(g => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="training_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('security.training.type', 'Training Type')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('common.select', 'Select')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TRAINING_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="training_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('security.training.name', 'Training Name')}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t('security.training.namePlaceholder', 'e.g., Advanced First Aid Course')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="training_provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('security.training.provider', 'Provider (Optional)')}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t('security.training.providerPlaceholder', 'e.g., Red Crescent')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="completion_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('security.training.completionDate', 'Completion Date')}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className={cn("w-full justify-start", !field.value && "text-muted-foreground")}>
                            <CalendarIcon className="h-4 w-4 me-2" />
                            {field.value ? format(field.value, 'PP') : t('common.pickDate', 'Pick date')}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiry_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('security.training.expiryDate', 'Expiry Date (Optional)')}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className={cn("w-full justify-start", !field.value && "text-muted-foreground")}>
                            <CalendarIcon className="h-4 w-4 me-2" />
                            {field.value ? format(field.value, 'PP') : t('common.pickDate', 'Pick date')}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="certificate_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('security.training.certNumber', 'Certificate #')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="score"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('security.training.score', 'Score (%)')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={0} 
                        max={100}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="passed"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0">{t('security.training.passed', 'Passed / Certified')}</FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('security.training.notes', 'Notes (Optional)')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" disabled={createRecord.isPending}>
                {createRecord.isPending ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
