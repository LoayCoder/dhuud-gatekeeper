import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { type SeverityLevelV2, type HSSEValidationStatus } from "@/lib/hsse-severity-levels";

export function useCanPerformHSSEValidation() {
    const { user } = useAuth();
    return useQuery({
        queryKey: ['can-perform-hsse-validation', user?.id],
        queryFn: async () => {
            if (!user?.id) return false;
            const { data: roles, error } = await supabase.from('user_role_assignments').select('roles(name)').eq('user_id', user.id).is('deleted_at', null);
            if (error || !roles) return false;
            const roleNames = roles.map((r: unknown) => (r as { roles?: { name: string } }).roles?.name).filter(Boolean);
            return roleNames.some((name: string) => ['hsse_expert', 'hsse_manager', 'environmental'].includes(name));
        },
        enabled: !!user?.id,
    });
}

export function useCanPerformFinalClosure() {
    const { user } = useAuth();
    return useQuery({
        queryKey: ['can-perform-final-closure', user?.id],
        queryFn: async () => {
            if (!user?.id) return false;
            const { data: roles, error } = await supabase.from('user_role_assignments').select('roles(name)').eq('user_id', user.id).is('deleted_at', null);
            if (error || !roles) return false;
            const roleNames = roles.map((r: unknown) => (r as { roles?: { name: string } }).roles?.name).filter(Boolean);
            return roleNames.some((name: string) => ['hsse_manager', 'admin'].includes(name));
        },
        enabled: !!user?.id,
    });
}

export function usePendingHSSEValidation() {
    const { user } = useAuth();
    const { data: canValidate } = useCanPerformHSSEValidation();
    return useQuery({
        queryKey: ['pending-hsse-validation', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase.from('incidents' as never).select(`
        id, reference_id, title, description, event_type, subtype, severity_v2, status, occurred_at, location,
        site_id, sites(name), reporter_id, profiles!incidents_reporter_id_fkey(full_name)
      `).eq('event_type', 'observation').eq('status', 'pending_hsse_validation').is('deleted_at', null).order('occurred_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },
        enabled: !!user?.id && canValidate === true,
    });
}

export function usePendingFinalClosure() {
    const { user } = useAuth();
    const { data: canClose } = useCanPerformFinalClosure();
    return useQuery({
        queryKey: ['pending-final-closure', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase.from('incidents' as never).select(`
        id, reference_id, title, description, event_type, subtype, severity_v2, status, occurred_at, location,
        site_id, sites(name), reporter_id, profiles!incidents_reporter_id_fkey(full_name)
      `).eq('event_type', 'observation').eq('status', 'pending_final_closure').eq('closure_requires_manager', true).is('deleted_at', null).order('occurred_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },
        enabled: !!user?.id && canClose === true,
    });
}
