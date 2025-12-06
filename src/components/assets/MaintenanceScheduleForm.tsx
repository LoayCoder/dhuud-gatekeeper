import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useCreateMaintenanceSchedule, useUpdateMaintenanceSchedule, MaintenanceSchedule } from '@/hooks/use-maintenance';

const MAINTENANCE_TYPES = ['preventive', 'predictive', 'corrective', 'condition_based'] as const;
const FREQUENCY_TYPES = ['daily', 'weekly', 'monthly', 'quarterly', 'semi_annually', 'annually', 'custom'] as const;

const formSchema = z.object({
  schedule_type: z.enum(MAINTENANCE_TYPES),
  frequency_type: z.enum(FREQUENCY_TYPES),
  frequency_value: z.number().min(1).max(365),
  description: z.string().optional(),
  vendor_name: z.string().optional(),
  estimated_duration_hours: z.number().min(0).optional(),
  next_due: z.date().optional(),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface MaintenanceScheduleFormProps {
  assetId: string;
  schedule?: MaintenanceSchedule | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MaintenanceScheduleForm({
  assetId,
  schedule,
  open,
  onOpenChange,
}: MaintenanceScheduleFormProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const isEditing = !!schedule;

  const createSchedule = useCreateMaintenanceSchedule();
  const updateSchedule = useUpdateMaintenanceSchedule();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      schedule_type: (schedule?.schedule_type as typeof MAINTENANCE_TYPES[number]) || 'preventive',
      frequency_type: (schedule?.frequency_type as typeof FREQUENCY_TYPES[number]) || 'monthly',
      frequency_value: schedule?.frequency_value || 1,
      description: schedule?.description || '',
      vendor_name: schedule?.vendor_name || '',
      estimated_duration_hours: schedule?.estimated_duration_hours ? Number(schedule.estimated_duration_hours) : undefined,
      next_due: schedule?.next_due ? new Date(schedule.next_due) : undefined,
      is_active: schedule?.is_active ?? true,
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const data = {
        asset_id: assetId,
        schedule_type: values.schedule_type,
        frequency_type: values.frequency_type,
        frequency_value: values.frequency_value,
        description: values.description || null,
        vendor_name: values.vendor_name || null,
        estimated_duration_hours: values.estimated_duration_hours || null,
        next_due: values.next_due ? format(values.next_due, 'yyyy-MM-dd') : null,
        is_active: values.is_active,
      };

      if (isEditing && schedule) {
        await updateSchedule.mutateAsync({ id: schedule.id, ...data });
      } else {
        await createSchedule.mutateAsync(data);
      }

      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving maintenance schedule:', error);
    }
  };

  const isPending = createSchedule.isPending || updateSchedule.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" dir={direction}>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('maintenance.editSchedule') : t('maintenance.addSchedule')}
          </DialogTitle>
          <DialogDescription>
            {t('maintenance.scheduleFormDescription')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Maintenance Type */}
            <FormField
              control={form.control}
              name="schedule_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('maintenance.type')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} dir={direction}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('maintenance.selectType')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MAINTENANCE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(`maintenance.types.${type}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Frequency */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="frequency_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('maintenance.frequency')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} dir={direction}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('maintenance.selectFrequency')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FREQUENCY_TYPES.map((freq) => (
                          <SelectItem key={freq} value={freq}>
                            {t(`maintenance.frequencies.${freq}`)}
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
                name="frequency_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('maintenance.interval')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormDescription>{t('maintenance.intervalHint')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Next Due Date */}
            <FormField
              control={form.control}
              name="next_due"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('maintenance.nextDue')}</FormLabel>
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
                          {field.value ? format(field.value, 'PPP') : t('maintenance.selectDate')}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
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
                  <FormLabel>{t('common.description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('maintenance.descriptionPlaceholder')}
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Vendor Name */}
            <FormField
              control={form.control}
              name="vendor_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('maintenance.vendor')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('maintenance.vendorPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Estimated Duration */}
            <FormField
              control={form.control}
              name="estimated_duration_hours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('maintenance.estimatedDuration')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      placeholder="e.g., 2"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                    />
                  </FormControl>
                  <FormDescription>{t('maintenance.durationHint')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Active Status */}
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>{t('common.active')}</FormLabel>
                    <FormDescription>{t('maintenance.activeDescription')}</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? t('common.saving') : isEditing ? t('common.save') : t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
