import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { VisitRequestWithRelations, UseVisitRequestsFilters } from './types';

export function useVisitRequests(filters?: UseVisitRequestsFilters) {
    const { profile } = useAuth();
    const tenantId = profile?.tenant_id;

    return useQuery({
        queryKey: ['visit-requests', tenantId, filters],
        queryFn: async () => {
            if (!tenantId) throw new Error('No tenant');

            let query = supabase
                .from('visit_requests')
                .select(`
          id, status, valid_from, valid_until, security_notes, created_at, host_id, visitor_id, site_id, tenant_id, approved_by, qr_issued_at, host_notified_at,
          visitor:visitors(id, full_name, email, phone, company_name, national_id, qr_code_token, host_name, host_phone, host_email, host_id),
          site:sites(id, name)
        `)
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false });

            if (filters?.status) {
                query = query.eq('status', filters.status);
            }

            if (filters?.hostId) {
                query = query.eq('host_id', filters.hostId);
            }

            if (filters?.siteId) {
                query = query.eq('site_id', filters.siteId);
            }

            if (filters?.todayOnly) {
                const today = new Date().toISOString().split('T')[0];
                query = query.lte('valid_from', today + 'T23:59:59').gte('valid_until', today + 'T00:00:00');
            }

            const { data, error } = await query.limit(100);
            if (error) throw error;
            return data as VisitRequestWithRelations[];
        },
        enabled: !!tenantId,
    });
}

export function usePendingSecurityRequests() {
    return useVisitRequests({ status: 'pending_security' });
}

export function useTodaysVisitors() {
    return useVisitRequests({ todayOnly: true });
}

export function useMyHostedVisits() {
    const { user } = useAuth();
    return useVisitRequests({ hostId: user?.id });
}

export function useCurrentlyOnSite() {
    return useVisitRequests({ status: 'checked_in' });
}

// Find visit request by visitor QR token
export function useVisitRequestByVisitorToken(token: string | undefined) {
    return useQuery({
        queryKey: ['visit-request-by-token', token],
        queryFn: async () => {
            if (!token) return null;

            // First find the visitor
            const { data: visitor, error: visitorError } = await supabase
                .from('visitors')
                .select('id, full_name, company_name, phone, host_phone, host_name')
                .eq('qr_code_token', token)
                .eq('is_active', true)
                .maybeSingle();

            if (visitorError || !visitor) return null;

            // Then find their approved visit request
            const { data: visitRequest, error: vrError } = await supabase
                .from('visit_requests')
                .select(`
          id, status, valid_from, valid_until, site_id, host_id, 
          site:sites(id, name)
        `)
                .eq('visitor_id', visitor.id)
                .in('status', ['approved', 'checked_in'])
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (vrError || !visitRequest) return null;

            return {
                visitor,
                visitRequest,
            };
        },
        enabled: !!token,
    });
}
