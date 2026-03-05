import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';
import type { Contractor } from './types';
import { getProfileId } from './types';

export function useCreateContractor() {
    const queryClient = useQueryClient(); const { profile } = useAuth();
    return useMutation({
        mutationFn: async (data: Partial<Contractor>) => {
            if (!profile?.tenant_id) throw new Error('No tenant');
            const contractorCode = `CON-${Date.now().toString(36).toUpperCase()}`;
            const qrCodeData = `CONTRACTOR:${contractorCode}`;
            const profileId = getProfileId(profile);
            const { data: result, error } = await supabase.from('contractors').insert({
                full_name: data.full_name || '', company_name: data.company_name, mobile_number: data.mobile_number,
                email: data.email, national_id: data.national_id, nationality: data.nationality,
                preferred_language: data.preferred_language, permit_number: data.permit_number,
                permit_expiry_date: data.permit_expiry_date, safety_induction_date: data.safety_induction_date,
                safety_induction_expiry: data.safety_induction_expiry, medical_exam_date: data.medical_exam_date,
                medical_exam_expiry: data.medical_exam_expiry, tenant_id: profile.tenant_id,
                contractor_code: contractorCode, qr_code_data: qrCodeData, created_by: profileId,
            }).select().single();
            if (error) throw error;
            return result;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['contractors'] }); toast.success('Contractor created successfully'); },
        onError: (error: Error) => { toast.error(`Failed to create contractor: ${error.message}`); },
    });
}

export function useUpdateContractor() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Contractor> }) => {
            const { data: result, error } = await supabase.from('contractors').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select().single();
            if (error) throw error;
            return result;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['contractors'] }); toast.success('Contractor updated successfully'); },
        onError: (error: Error) => { toast.error(`Failed to update contractor: ${error.message}`); },
    });
}

export function useBanContractor() {
    const queryClient = useQueryClient(); const { profile } = useAuth();
    return useMutation({
        mutationFn: async ({ id, reason, expiresAt }: { id: string; reason: string; expiresAt?: string }) => {
            const profileId = getProfileId(profile);
            const { error } = await supabase.from('contractors').update({ is_banned: true, ban_reason: reason, ban_expires_at: expiresAt || null, banned_at: new Date().toISOString(), banned_by: profileId }).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['contractors'] }); toast.success('Contractor banned successfully'); },
        onError: (error: Error) => { toast.error(`Failed to ban contractor: ${error.message}`); },
    });
}

export function useUnbanContractor() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('contractors').update({ is_banned: false, ban_reason: null, ban_expires_at: null, banned_at: null, banned_by: null }).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['contractors'] }); toast.success('Contractor unbanned successfully'); },
        onError: (error: Error) => { toast.error(`Failed to unban contractor: ${error.message}`); },
    });
}

export function useValidateContractor() {
    const { profile } = useAuth();
    return useMutation({
        mutationFn: async ({ contractorCode, siteId, zoneId }: { contractorCode: string; siteId?: string; zoneId?: string }) => {
            const { data, error } = await supabase.functions.invoke('validate-contractor', { body: { contractor_code: contractorCode, site_id: siteId, zone_id: zoneId, tenant_id: profile?.tenant_id } });
            if (error) throw error;
            return data;
        },
    });
}

export function useLogContractorAccess() {
    const queryClient = useQueryClient(); const { profile } = useAuth();
    return useMutation({
        mutationFn: async (data: { contractorId: string; siteId?: string; zoneId?: string; accessType: 'entry' | 'exit'; validationStatus: string; validationErrors?: Json; notes?: string }) => {
            if (!profile?.tenant_id) throw new Error('No tenant');
            const profileId = getProfileId(profile);
            const { error } = await supabase.from('contractor_access_logs').insert({
                contractor_id: data.contractorId, site_id: data.siteId, zone_id: data.zoneId, guard_id: profileId,
                entry_time: new Date().toISOString(), access_type: data.accessType, validation_status: data.validationStatus,
                validation_errors: data.validationErrors, notes: data.notes, tenant_id: profile.tenant_id,
            });
            if (error) throw error;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['contractor-access-logs'] }); toast.success('Access logged successfully'); },
        onError: (error: Error) => { toast.error(`Failed to log access: ${error.message}`); },
    });
}

export function useRecordExit() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (logId: string) => {
            const { error } = await supabase.from('contractor_access_logs').update({ exit_time: new Date().toISOString() }).eq('id', logId);
            if (error) throw error;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['contractor-access-logs'] }); toast.success('Exit recorded'); },
        onError: (error: Error) => { toast.error(`Failed to record exit: ${error.message}`); },
    });
}
