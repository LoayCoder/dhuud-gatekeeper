import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Info, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useInspectionTemplates } from '@/hooks/use-inspections';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import {
  useCreateInspectionSchedule,
  useUpdateInspectionSchedule,
  calculatePreviewDates,
  InspectionSchedule,
} from '@/hooks/use-inspection-schedules';
import { cn } from '@/lib/utils';
import i18n from '@/i18n';

const scheduleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  name_ar: z.string().optional(),
  schedule_type: z.enum(['asset', 'area', 'audit']),
  template_id: z.string().min(1, 'Template is required'),
  frequency_type: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'semi_annually', 'annually', 'custom']),
  frequency_value: z.number().min(1).max(365),
  day_of_week: z.number().min(0).max(6).nullable().optional(),
  day_of_month: z.number().min(1).max(31).nullable().optional(),
  site_id: z.string().nullable().optional(),
  building_id: z.string().nullable().optional(),
  assigned_inspector_id: z.string().nullable().optional(),
  start_date: z.date(),
  end_date: z.date().nullable().optional(),
  reminder_days_before: z.number().min(1).max(30),
  auto_generate_session: z.boolean(),
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

interface ScheduleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule?: InspectionSchedule | null;
}

export function ScheduleFormDialog({ open, onOpenChange, schedule }: ScheduleFormDialogProps) {
  const { t } = useTranslation();
  const direction = i18n.dir();
  const isEditing = !!schedule;
  
  const { profile } = useAuth();
  const { data: templates = [] } = useInspectionTemplates();
  
  // Fetch profiles for inspector selection
  const { data: profiles = [] } = useQuery({
    queryKey: ['schedule-profiles', profile?.tenant_id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name').eq('is_active', true).is('deleted_at', null);
      return data || [];
    },
    enabled: !!profile?.tenant_id,
  });
  
  // Fetch sites and buildings
  const { data: sites = [] } = useQuery({
    queryKey: ['schedule-sites', profile?.tenant_id],
    queryFn: async () => {
      const { data } = await supabase.from('sites').select('id, name').is('deleted_at', null);
      return data || [];
    },
    enabled: !!profile?.tenant_id,
  });
  
  const { data: buildings = [] } = useQuery({
    queryKey: ['schedule-buildings', profile?.tenant_id],
    queryFn: async () => {
      const { data } = await supabase.from('buildings').select('id, name, site_id').is('deleted_at', null);
      return data || [];
    },
    enabled: !!profile?.tenant_id,
  });
  
  const createSchedule = useCreateInspectionSchedule();
  const updateSchedule = useUpdateInspectionSchedule();
  
  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      name: '',
      name_ar: '',
      schedule_type: 'area',
      template_id: '',
      frequency_type: 'monthly',
      frequency_value: 1,
      day_of_week: null,
      day_of_month: null,
      site_id: null,
      building_id: null,
      assigned_inspector_id: null,
      start_date: new Date(),
      end_date: null,
      reminder_days_before: 3,
      auto_generate_session: true,
    },
  });
  
  const [previewDates, setPreviewDates] = useState<Date[]>([]);
  
  // Watch form values for preview calculation
  const frequencyType = form.watch('frequency_type');
  const frequencyValue = form.watch('frequency_value');
  const startDate = form.watch('start_date');
  const scheduleType = form.watch('schedule_type');
  const selectedSiteId = form.watch('site_id');
  
  // Update preview dates when frequency changes
  useEffect(() => {
    if (startDate && frequencyType && frequencyValue) {
      const dates = calculatePreviewDates(frequencyType, frequencyValue, startDate, 5);
      setPreviewDates(dates);
    }
  }, [frequencyType, frequencyValue, startDate]);
  
  // Populate form when editing
  useEffect(() => {
    if (schedule) {
      form.reset({
        name: schedule.name,
        name_ar: schedule.name_ar || '',
        schedule_type: schedule.schedule_type,
        template_id: schedule.template_id,
        frequency_type: schedule.frequency_type,
        frequency_value: schedule.frequency_value,
        day_of_week: schedule.day_of_week,
        day_of_month: schedule.day_of_month,
        site_id: schedule.site_id,
        building_id: schedule.building_id,
        assigned_inspector_id: schedule.assigned_inspector_id,
        start_date: new Date(schedule.start_date),
        end_date: schedule.end_date ? new Date(schedule.end_date) : null,
        reminder_days_before: schedule.reminder_days_before,
        auto_generate_session: schedule.auto_generate_session ?? true,
      });
    }
  }, [schedule, form]);
  
  // Filter templates by schedule type
  const filteredTemplates = templates.filter(t => t.template_type === scheduleType);
  
  // Filter buildings by selected site
  const filteredBuildings = selectedSiteId 
    ? buildings.filter(b => b.site_id === selectedSiteId)
    : buildings;
  
  const onSubmit = async (formData: ScheduleFormData) => {
    const payload = {
      name: formData.name,
      name_ar: formData.name_ar,
      schedule_type: formData.schedule_type,
      template_id: formData.template_id,
      frequency_type: formData.frequency_type,
      frequency_value: formData.frequency_value,
      day_of_week: formData.day_of_week,
      day_of_month: formData.day_of_month,
      site_id: formData.site_id,
      building_id: formData.building_id,
      assigned_inspector_id: formData.assigned_inspector_id,
      start_date: format(formData.start_date, 'yyyy-MM-dd'),
      end_date: formData.end_date ? format(formData.end_date, 'yyyy-MM-dd') : null,
      reminder_days_before: formData.reminder_days_before,
      auto_generate_session: formData.auto_generate_session,
    };
    
    if (isEditing && schedule) {
      await updateSchedule.mutateAsync({ id: schedule.id, ...payload });
    } else {
      await createSchedule.mutateAsync(payload);
    }
    
    onOpenChange(false);
    form.reset();
  };
  
  const frequencyOptions = [
    { value: 'daily', label: t('schedules.frequency.daily') },
    { value: 'weekly', label: t('schedules.frequency.weekly') },
    { value: 'monthly', label: t('schedules.frequency.monthly') },
    { value: 'quarterly', label: t('schedules.frequency.quarterly') },
    { value: 'semi_annually', label: t('schedules.frequency.semiAnnually') },
    { value: 'annually', label: t('schedules.frequency.annually') },
  ];
  
  const dayOfWeekOptions = [
    { value: 0, label: t('schedules.days.sunday') },
    { value: 1, label: t('schedules.days.monday') },
    { value: 2, label: t('schedules.days.tuesday') },
    { value: 3, label: t('schedules.days.wednesday') },
    { value: 4, label: t('schedules.days.thursday') },
    { value: 5, label: t('schedules.days.friday') },
    { value: 6, label: t('schedules.days.saturday') },
  ];
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={direction}>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('schedules.editSchedule') : t('schedules.createSchedule')}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">
                {t('schedules.basicInfo')}
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('schedules.name')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t('schedules.namePlaceholder')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="name_ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('schedules.nameAr')}</FormLabel>
                      <FormControl>
                        <Input {...field} dir="rtl" placeholder={t('schedules.nameArPlaceholder')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="schedule_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('schedules.type')}</FormLabel>
                      <Select 
                        value={field.value} 
                        onValueChange={(v) => {
                          field.onChange(v);
                          form.setValue('template_id', ''); // Reset template when type changes
                        }}
                        dir={direction}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="asset">{t('inspections.types.asset')}</SelectItem>
                          <SelectItem value="area">{t('inspections.types.area')}</SelectItem>
                          <SelectItem value="audit">{t('inspections.types.audit')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="template_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('schedules.template')}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange} dir={direction}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('schedules.selectTemplate')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredTemplates.map(template => (
                            <SelectItem key={template.id} value={template.id}>
                              {i18n.language === 'ar' && template.name_ar ? template.name_ar : template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <Separator />
            
            {/* Frequency */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">
                {t('schedules.frequencySection')}
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="frequency_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('schedules.frequencyType')}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange} dir={direction}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {frequencyOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
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
                      <FormLabel>{t('schedules.every')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={1} 
                          max={365}
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {frequencyType === 'weekly' && (
                <FormField
                  control={form.control}
                  name="day_of_week"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('schedules.dayOfWeek')}</FormLabel>
                      <Select 
                        value={field.value?.toString() || ''} 
                        onValueChange={(v) => field.onChange(parseInt(v))}
                        dir={direction}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('schedules.selectDay')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {dayOfWeekOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value.toString()}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {['monthly', 'quarterly', 'semi_annually', 'annually'].includes(frequencyType) && (
                <FormField
                  control={form.control}
                  name="day_of_month"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('schedules.dayOfMonth')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={1} 
                          max={31}
                          value={field.value || ''}
                          onChange={e => field.onChange(parseInt(e.target.value) || null)}
                          placeholder="1-31"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            
            <Separator />
            
            {/* Location & Assignment */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">
                {t('schedules.locationAssignment')}
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="site_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('schedules.site')}</FormLabel>
                      <Select 
                        value={field.value || '__none__'} 
                        onValueChange={(v) => {
                          field.onChange(v === '__none__' ? null : v);
                          form.setValue('building_id', null);
                        }}
                        dir={direction}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('schedules.allSites')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">{t('schedules.allSites')}</SelectItem>
                          {sites.map(site => (
                            <SelectItem key={site.id} value={site.id}>
                              {site.name}
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
                  name="building_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('schedules.building')}</FormLabel>
                      <Select 
                        value={field.value || '__none__'} 
                        onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
                        disabled={!selectedSiteId}
                        dir={direction}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('schedules.allBuildings')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">{t('schedules.allBuildings')}</SelectItem>
                          {filteredBuildings.map(building => (
                            <SelectItem key={building.id} value={building.id}>
                              {building.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="assigned_inspector_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('schedules.assignedInspector')}</FormLabel>
                    <Select 
                      value={field.value || '__none__'} 
                      onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
                      dir={direction}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('schedules.selectInspector')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">{t('schedules.unassigned')}</SelectItem>
                        {profiles.map(profile => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Separator />
            
            {/* Timing */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">
                {t('schedules.timing')}
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t('schedules.startDate')}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'justify-start text-start font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              <CalendarIcon className="me-2 h-4 w-4" />
                              {field.value ? format(field.value, 'PPP') : t('schedules.pickDate')}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t('schedules.endDate')}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'justify-start text-start font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              <CalendarIcon className="me-2 h-4 w-4" />
                              {field.value ? format(field.value, 'PPP') : t('schedules.noEndDate')}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            disabled={(date) => date < (form.getValues('start_date') || new Date())}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="reminder_days_before"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('schedules.reminderDays')}: {field.value} {t('schedules.daysSimple')}
                    </FormLabel>
                    <FormControl>
                      <Slider
                        value={[field.value]}
                        onValueChange={(v) => field.onChange(v[0])}
                        min={1}
                        max={14}
                        step={1}
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Separator />
            
            {/* Automation Settings */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">
                {t('schedules.automationSettings')}
              </h3>
              
              <FormField
                control={form.control}
                name="auto_generate_session"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        {t('schedules.autoGenerateSession')}
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        {t('schedules.autoGenerateSessionDescription')}
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              {isEditing && schedule && (
                <div className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{t('schedules.generationStats')}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">{t('schedules.sessionsGenerated')}:</span>
                      <span className="ms-2 font-medium">{schedule.sessions_generated_count || 0}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('schedules.lastGenerated')}:</span>
                      <span className="ms-2 font-medium">
                        {schedule.last_generated 
                          ? format(new Date(schedule.last_generated), 'PPp') 
                          : t('common.never')}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <Separator />
            
            {/* Preview */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium text-sm text-muted-foreground">
                  {t('schedules.nextOccurrences')}
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {previewDates.map((date, idx) => (
                  <Badge key={idx} variant="secondary">
                    {format(date, 'MMM d, yyyy')}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button 
                type="submit" 
                disabled={createSchedule.isPending || updateSchedule.isPending}
              >
                {isEditing ? t('common.save') : t('schedules.create')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
