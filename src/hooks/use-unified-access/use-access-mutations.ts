import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import type { EntityType } from './types';

export function useRecordUnifiedEntry() {
    const { profile, user } = useAuth();
    const tenantId = profile?.tenant_id;
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { t } = useTranslation(['security', 'translation']);

    return useMutation({
        mutationFn: async (params: {
            entityType: EntityType;
            personName: string;
            visitorId?: string;
            mobileNumber?: string;
            carPlate?: string;
            destinationName?: string;
            purpose?: string;
            nationality?: string;
            worker_id?: string;
            workerId?: string;
            projectId?: string;
            validationStatus?: string;
            validationErrors?: string[];
            materialGatePassId?: string;
            siteId?: string;
            notes?: string;
        }) => {
            if (!tenantId) throw new Error('No tenant ID');

            const { data, error } = await supabase
                .from('gate_entry_logs')
                .insert({
                    tenant_id: tenantId,
                    guard_id: user?.id,
                    entry_type: params.entityType,
                    person_name: params.personName,
                    visitor_id: params.visitorId || null,
                    mobile_number: params.mobileNumber || null,
                    car_plate: params.carPlate || null,
                    destination_name: params.destinationName || null,
                    purpose: params.purpose || null,
                    nationality: params.nationality || null,
                    worker_id: params.worker_id || params.workerId || null,
                    project_id: params.projectId || null,
                    validation_status: params.validationStatus || null,
                    validation_errors: params.validationErrors || null,
                    material_gate_pass_id: params.materialGatePassId || null,
                    site_id: params.siteId || null,
                    notes: params.notes || null,
                    entry_time: new Date().toISOString(),
                    access_type: 'entry',
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['unified-access-logs'] });
            queryClient.invalidateQueries({ queryKey: ['unified-access-stats'] });
            queryClient.invalidateQueries({ queryKey: ['gate-entries'] });
            toast({ title: t('accessControl.entryRecorded', 'Entry recorded successfully') });
        },
        onError: (error) => {
            toast({ title: t('accessControl.entryFailed', 'Failed to record entry'), variant: 'destructive' });
            console.error('Entry error:', error);
        },
    });
}

export function useRecordUnifiedExit() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { t } = useTranslation(['security', 'translation']);

    return useMutation({
        mutationFn: async (params: { entryId: string; source?: 'gate_entry_logs' | 'contractor_access_logs' }) => {
            const table = params.source || 'gate_entry_logs';

            const { data, error } = await supabase
                .from(table)
                .update({ exit_time: new Date().toISOString() })
                .eq('id', params.entryId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['unified-access-logs'] });
            queryClient.invalidateQueries({ queryKey: ['unified-access-stats'] });
            queryClient.invalidateQueries({ queryKey: ['gate-entries'] });
            queryClient.invalidateQueries({ queryKey: ['worker-access-logs'] });
            toast({ title: t('accessControl.exitRecorded', 'Exit recorded successfully') });
        },
        onError: (error) => {
            toast({ title: t('accessControl.exitFailed', 'Failed to record exit'), variant: 'destructive' });
            console.error('Exit error:', error);
        },
    });
}
