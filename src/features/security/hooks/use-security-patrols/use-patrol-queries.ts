import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function usePatrolRoutes() {
    const { profile } = useAuth();
    return useQuery({ queryKey: ['patrol-routes', profile?.tenant_id], queryFn: async () => { if (!profile?.tenant_id) return []; const { data, error } = await supabase.from('security_patrol_routes').select(`*, checkpoints:patrol_checkpoints(count)`).eq('tenant_id', profile.tenant_id).is('deleted_at', null).order('name'); if (error) throw error; return data || []; }, enabled: !!profile?.tenant_id });
}

export function usePatrolRoute(id: string | undefined) {
    return useQuery({ queryKey: ['patrol-route', id], queryFn: async () => { if (!id) return null; const { data, error } = await supabase.from('security_patrol_routes').select(`*, checkpoints:patrol_checkpoints(*)`).eq('id', id).is('deleted_at', null).single(); if (error) throw error; return data; }, enabled: !!id });
}

export function useSecurityPatrols(filters: { status?: string; routeId?: string } = {}) {
    const { profile } = useAuth();
    return useQuery({
        queryKey: ['security-patrols', filters, profile?.tenant_id],
        queryFn: async () => {
            if (!profile?.tenant_id) return [];
            let query = supabase.from('security_patrols' as never).select('*, route:security_patrol_routes(name), guard:profiles!security_patrols_guard_id_fkey(full_name)').eq('tenant_id', profile.tenant_id).is('deleted_at', null).order('created_at', { ascending: false });
            if (filters.status) query = query.eq('status', filters.status);
            if (filters.routeId) query = query.eq('route_id', filters.routeId);
            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        },
        enabled: !!profile?.tenant_id,
    });
}

export function useSecurityPatrol(id: string | undefined) {
    return useQuery({
        queryKey: ['security-patrol', id],
        queryFn: async () => {
            if (!id) return null;
            const { data, error } = await supabase.from('security_patrols' as never).select('*, route:security_patrol_routes(*, checkpoints:patrol_checkpoints(*)), guard:profiles!security_patrols_guard_id_fkey(full_name), logs:patrol_checkpoint_logs(*)').eq('id', id).single();
            if (error) throw error;
            return data;
        },
        enabled: !!id,
    });
}
