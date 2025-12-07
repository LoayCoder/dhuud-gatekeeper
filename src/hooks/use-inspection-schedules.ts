import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export interface InspectionSchedule {
  id: string;
  tenant_id: string;
  reference_id: string;
  name: string;
  name_ar: string | null;
  schedule_type: 'asset' | 'area' | 'audit';
  template_id: string;
  frequency_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semi_annually' | 'annually' | 'custom';
  frequency_value: number;
  day_of_week: number | null;
  day_of_month: number | null;
  month_of_year: number | null;
  site_id: string | null;
  building_id: string | null;
  floor_zone_id: string | null;
  category_id: string | null;
  type_id: string | null;
  assigned_inspector_id: string | null;
  assigned_team: string[];
  start_date: string;
  end_date: string | null;
  next_due: string | null;
  last_generated: string | null;
  reminder_days_before: number;
  is_active: boolean;
  created_at: string;
  template?: {
    id: string;
    name: string;
    name_ar: string | null;
    template_type: string;
  };
  assigned_inspector?: {
    id: string;
    full_name: string;
  };
  site?: { id: string; name: string };
  building?: { id: string; name: string };
}

interface ScheduleFilters {
  type?: 'asset' | 'area' | 'audit';
  isActive?: boolean;
  siteId?: string;
}

export function useInspectionSchedules(filters?: ScheduleFilters) {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['inspection-schedules', profile?.tenant_id, filters],
    queryFn: async () => {
      // Use type assertion to avoid deep type instantiation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase.from('inspection_schedules') as any)
        .select(`
          id, tenant_id, reference_id, name, name_ar, schedule_type, template_id,
          frequency_type, frequency_value, day_of_week, day_of_month, month_of_year,
          site_id, building_id, floor_zone_id, category_id, type_id,
          assigned_inspector_id, assigned_team, start_date, end_date, next_due,
          last_generated, reminder_days_before, is_active, created_at,
          template:inspection_templates(id, name, name_ar, template_type),
          assigned_inspector:profiles!assigned_inspector_id(id, full_name),
          site:sites(id, name),
          building:buildings(id, name)
        `)
        .is('deleted_at', null)
        .order('next_due', { ascending: true, nullsFirst: false });
      
      if (filters?.type) {
        query = query.eq('schedule_type', filters.type);
      }
      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }
      if (filters?.siteId) {
        query = query.eq('site_id', filters.siteId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as InspectionSchedule[];
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useInspectionSchedule(id: string | undefined) {
  return useQuery({
    queryKey: ['inspection-schedule', id],
    queryFn: async () => {
      if (!id) return null;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('inspection_schedules') as any)
        .select(`
          id, tenant_id, reference_id, name, name_ar, schedule_type, template_id,
          frequency_type, frequency_value, day_of_week, day_of_month, month_of_year,
          site_id, building_id, floor_zone_id, category_id, type_id,
          assigned_inspector_id, assigned_team, start_date, end_date, next_due,
          last_generated, reminder_days_before, is_active, created_at,
          template:inspection_templates(id, name, name_ar, template_type),
          assigned_inspector:profiles!assigned_inspector_id(id, full_name)
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .single();
      
      if (error) throw error;
      return data as InspectionSchedule;
    },
    enabled: !!id,
  });
}

export function useUpcomingSchedules(daysAhead: number = 7) {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['upcoming-schedules', profile?.tenant_id, daysAhead],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_upcoming_inspection_schedules', {
        p_days_ahead: daysAhead
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useOverdueSchedulesCount() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['overdue-schedules-count', profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_overdue_schedules_count');
      if (error) throw error;
      return (data || 0) as number;
    },
    enabled: !!profile?.tenant_id,
  });
}

interface CreateScheduleInput {
  name: string;
  name_ar?: string;
  schedule_type: 'asset' | 'area' | 'audit';
  template_id: string;
  frequency_type: string;
  frequency_value: number;
  day_of_week?: number | null;
  day_of_month?: number | null;
  month_of_year?: number | null;
  site_id?: string | null;
  building_id?: string | null;
  floor_zone_id?: string | null;
  category_id?: string | null;
  type_id?: string | null;
  assigned_inspector_id?: string | null;
  assigned_team?: string[];
  start_date: string;
  end_date?: string | null;
  reminder_days_before?: number;
}

export function useCreateInspectionSchedule() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async (input: CreateScheduleInput) => {
      if (!profile?.tenant_id || !user?.id) throw new Error('No tenant');
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('inspection_schedules') as any)
        .insert({
          ...input,
          tenant_id: profile.tenant_id,
          created_by: user.id,
          assigned_team: input.assigned_team || [],
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspection-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-schedules'] });
      toast({
        title: t('common.success'),
        description: t('schedules.createSuccess'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateInspectionSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CreateScheduleInput> & { id: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('inspection_schedules') as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inspection-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['inspection-schedule', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-schedules'] });
      toast({
        title: t('common.success'),
        description: t('schedules.updateSuccess'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteInspectionSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('inspection_schedules') as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspection-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-schedules'] });
      toast({
        title: t('common.success'),
        description: t('schedules.deleteSuccess'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useToggleScheduleActive() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async ({ id: scheduleId, isActive }: { id: string; isActive: boolean }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('inspection_schedules') as any)
        .update({ is_active: isActive })
        .eq('id', scheduleId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inspection-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-schedules'] });
      toast({
        title: t('common.success'),
        description: variables.isActive ? t('schedules.resumed') : t('schedules.paused'),
      });
    },
  });
}

// Helper to calculate preview dates
export function calculatePreviewDates(
  frequencyType: string,
  frequencyValue: number,
  startDate: Date,
  count: number = 5
): Date[] {
  const dates: Date[] = [];
  let currentDate = new Date(startDate);
  
  for (let i = 0; i < count; i++) {
    dates.push(new Date(currentDate));
    
    switch (frequencyType) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + frequencyValue);
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + (frequencyValue * 7));
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + frequencyValue);
        break;
      case 'quarterly':
        currentDate.setMonth(currentDate.getMonth() + (frequencyValue * 3));
        break;
      case 'semi_annually':
        currentDate.setMonth(currentDate.getMonth() + (frequencyValue * 6));
        break;
      case 'annually':
        currentDate.setFullYear(currentDate.getFullYear() + frequencyValue);
        break;
      default:
        currentDate.setDate(currentDate.getDate() + frequencyValue);
    }
  }
  
  return dates;
}
