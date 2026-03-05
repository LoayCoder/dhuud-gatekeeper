import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { ConfidentialityLevel, ConfidentialitySettings, AccessListUser, ConfidentialityAuditEntry } from './types';

export function useCanSetConfidentiality(incidentId: string) {
    const { user } = useAuth();
    return useQuery({ queryKey: ['can-set-confidentiality', incidentId, user?.id], queryFn: async () => { if (!user?.id) return false; const { data, error } = await supabase.rpc('can_set_confidentiality', { _user_id: user.id, _incident_id: incidentId }); if (error) { console.error('Error checking confidentiality permission:', error); return false; } return data as boolean; }, enabled: !!incidentId && !!user?.id });
}

export function useCanManageAccessList() {
    const { user } = useAuth();
    return useQuery({ queryKey: ['can-manage-access-list', user?.id], queryFn: async () => { if (!user?.id) return false; const { data, error } = await supabase.rpc('can_manage_access_list', { _user_id: user.id }); if (error) { console.error('Error checking access list permission:', error); return false; } return data as boolean; }, enabled: !!user?.id });
}

export function useHasConfidentialityAccess(incidentId: string) {
    const { user } = useAuth();
    return useQuery({ queryKey: ['has-confidentiality-access', incidentId, user?.id], queryFn: async () => { if (!user?.id) return false; const { data, error } = await supabase.rpc('has_confidentiality_access', { _incident_id: incidentId, _user_id: user.id }); if (error) { console.error('Error checking confidentiality access:', error); return false; } return data as boolean; }, enabled: !!incidentId && !!user?.id });
}

export function useIncidentConfidentiality(incidentId: string) {
    return useQuery({
        queryKey: ['incident-confidentiality', incidentId],
        queryFn: async () => {
            const { data, error } = await supabase.from('incidents').select('confidentiality_level, confidentiality_expiry, auto_declassify_to, confidentiality_expiry_reason, confidentiality_set_by, confidentiality_set_at').eq('id', incidentId).single();
            if (error) throw error;
            return { level: (data.confidentiality_level || 'public') as ConfidentialityLevel, expiry: data.confidentiality_expiry, autoDeclassifyTo: data.auto_declassify_to as 'public' | 'restricted' | null, expiryReason: data.confidentiality_expiry_reason, setBy: data.confidentiality_set_by, setAt: data.confidentiality_set_at } as ConfidentialitySettings;
        },
        enabled: !!incidentId
    });
}

export function useIncidentAccessList(incidentId: string) {
    return useQuery({
        queryKey: ['incident-access-list', incidentId],
        queryFn: async () => {
            const { data, error } = await supabase.from('incident_access_list').select(`id, user_id, user:user_id(full_name, email), granted_by_user:granted_by(full_name), granted_at, reason`).eq('incident_id', incidentId).is('revoked_at', null).is('deleted_at', null).order('granted_at', { ascending: false });
            if (error) throw error;
            return (data || []).map((item: Record<string, unknown>) => ({ id: item.id as string, user_id: item.user_id as string, full_name: (item.user as { full_name: string } | null)?.full_name || 'Unknown', email: (item.user as { email: string } | null)?.email, granted_by_name: (item.granted_by_user as { full_name: string } | null)?.full_name || 'Unknown', granted_at: item.granted_at as string, reason: item.reason as string | undefined })) as AccessListUser[];
        },
        enabled: !!incidentId
    });
}

export function useConfidentialityAudit(incidentId: string) {
    return useQuery({
        queryKey: ['confidentiality-audit', incidentId],
        queryFn: async () => {
            const { data, error } = await supabase.from('incident_confidentiality_audit').select(`id, action, old_level, new_level, actor:actor_id(full_name), affected_user:affected_user_id(full_name), reason, created_at`).eq('incident_id', incidentId).order('created_at', { ascending: false });
            if (error) throw error;
            return (data || []).map((item: Record<string, unknown>) => ({ id: item.id as string, action: item.action as string, old_level: item.old_level as string | null, new_level: item.new_level as string | null, actor_name: (item.actor as { full_name: string } | null)?.full_name || 'System', affected_user_name: (item.affected_user as { full_name: string } | null)?.full_name, reason: item.reason as string | undefined, created_at: item.created_at as string })) as ConfidentialityAuditEntry[];
        },
        enabled: !!incidentId
    });
}
