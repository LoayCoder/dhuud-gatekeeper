import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { InspectionSchedule, ScheduleFilters } from './types';

export function useInspectionSchedules(filters?: ScheduleFilters) {
    const { profile } = useAuth();

    return useQuery({
        queryKey: ['inspection-schedules', profile?.tenant_id, filters],
        queryFn: async () => {
            let query = supabase.from('inspection_schedules' as never)
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

            const { data, error } = await supabase.from('inspection_schedules' as never)
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
