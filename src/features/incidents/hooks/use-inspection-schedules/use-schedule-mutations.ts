import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import type { CreateScheduleInput } from './types';

export function useCreateInspectionSchedule() {
    const queryClient = useQueryClient();
    const { user, profile } = useAuth();
    const { toast } = useToast();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: async (input: CreateScheduleInput) => {
            if (!profile?.tenant_id || !user?.id) throw new Error('No tenant');

            const payload = {
                ...input,
                tenant_id: profile.tenant_id,
                created_by: user.id,
                assigned_team: input.assigned_team || [],
            };

            const { data, error } = await supabase.from('inspection_schedules')
                .insert(payload as never)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inspection-schedules'] });
            queryClient.invalidateQueries({ queryKey: ['upcoming-schedules'] });
            toast({ title: t('common.success'), description: t('schedules.createSuccess') });
        },
        onError: (error) => {
            toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
        },
    });
}

export function useUpdateInspectionSchedule() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<CreateScheduleInput> & { id: string }) => {
            const { data, error } = await supabase.from('inspection_schedules')
                .update(updates as never)
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
            toast({ title: t('common.success'), description: t('schedules.updateSuccess') });
        },
        onError: (error) => {
            toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
        },
    });
}

export function useDeleteInspectionSchedule() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('inspection_schedules')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inspection-schedules'] });
            queryClient.invalidateQueries({ queryKey: ['upcoming-schedules'] });
            toast({ title: t('common.success'), description: t('schedules.deleteSuccess') });
        },
        onError: (error) => {
            toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
        },
    });
}

export function useToggleScheduleActive() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: async ({ id: scheduleId, isActive }: { id: string; isActive: boolean }) => {
            const { error } = await supabase.from('inspection_schedules')
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
    const currentDate = new Date(startDate);

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
