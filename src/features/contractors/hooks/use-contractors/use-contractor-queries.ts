import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Contractor, ContractorAccessLog, ContractorFilters } from './types';

export function useContractors(filters: ContractorFilters = {}) {
    const { profile } = useAuth();
    return useQuery({
        queryKey: ['contractors', filters, profile?.tenant_id],
        queryFn: async () => {
            if (!profile?.tenant_id) return [];
            let query = supabase.from('contractors')
                .select('id, contractor_code, full_name, company_name, mobile_number, nationality, preferred_language, permit_expiry_date, safety_induction_expiry, medical_exam_expiry, is_banned, ban_reason, ban_expires_at, photo_path, allowed_sites, allowed_zones, created_at, tenant_id')
                .eq('tenant_id', profile.tenant_id).is('deleted_at', null).order('created_at', { ascending: false });
            if (filters.search) query = query.or(`full_name.ilike.%${filters.search}%,contractor_code.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%`);
            if (filters.status === 'banned') query = query.eq('is_banned', true);
            else if (filters.status === 'expired') { const today = new Date().toISOString().split('T')[0]; query = query.or(`permit_expiry_date.lt.${today},safety_induction_expiry.lt.${today},medical_exam_expiry.lt.${today}`); }
            else if (filters.status === 'active') query = query.or('is_banned.is.null,is_banned.eq.false');
            if (filters.companyName) query = query.ilike('company_name', `%${filters.companyName}%`);
            const { data, error } = await query;
            if (error) throw error;
            return data as Contractor[];
        },
        enabled: !!profile?.tenant_id,
    });
}

export function useContractor(id: string | null) {
    const { profile } = useAuth();
    return useQuery({
        queryKey: ['contractor', id],
        queryFn: async () => {
            if (!id) return null;
            const { data, error } = await supabase.from('contractors').select('*').eq('id', id).is('deleted_at', null).single();
            if (error) throw error;
            return data as Contractor;
        },
        enabled: !!id && !!profile?.tenant_id,
    });
}

export function useContractorAccessLogs(filters: { contractorId?: string; siteId?: string; dateFrom?: string; dateTo?: string } = {}) {
    const { profile } = useAuth();
    return useQuery({
        queryKey: ['contractor-access-logs', filters, profile?.tenant_id],
        queryFn: async () => {
            if (!profile?.tenant_id) return [];
            let query = supabase.from('contractor_access_logs')
                .select(`id, contractor_id, site_id, zone_id, guard_id, entry_time, exit_time, access_type, validation_status, validation_errors, alert_sent, notes, tenant_id, contractor:contractors(id, full_name, company_name, contractor_code, photo_path)`)
                .eq('tenant_id', profile.tenant_id).is('deleted_at', null).order('entry_time', { ascending: false }).limit(100);
            if (filters.contractorId) query = query.eq('contractor_id', filters.contractorId);
            if (filters.siteId) query = query.eq('site_id', filters.siteId);
            if (filters.dateFrom) query = query.gte('entry_time', filters.dateFrom);
            if (filters.dateTo) query = query.lte('entry_time', filters.dateTo);
            const { data, error } = await query;
            if (error) throw error;
            return data as ContractorAccessLog[];
        },
        enabled: !!profile?.tenant_id,
    });
}
