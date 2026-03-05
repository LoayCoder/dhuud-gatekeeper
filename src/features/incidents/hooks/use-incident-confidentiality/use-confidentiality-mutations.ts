import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { ConfidentialityLevel } from './types';

export function useUpdateConfidentiality() {
    const queryClient = useQueryClient(); const { toast } = useToast(); const { user } = useAuth();
    return useMutation({
        mutationFn: async ({ incidentId, level, expiry, autoDeclassifyTo, expiryReason }: { incidentId: string; level: ConfidentialityLevel; expiry?: string | null; autoDeclassifyTo?: 'public' | 'restricted' | null; expiryReason?: string | null }) => {
            const { error } = await supabase.from('incidents').update({ confidentiality_level: level, confidentiality_expiry: level !== 'public' ? expiry : null, auto_declassify_to: level !== 'public' ? autoDeclassifyTo : null, confidentiality_expiry_reason: level !== 'public' ? expiryReason : null, confidentiality_set_by: user?.id, confidentiality_set_at: new Date().toISOString() }).eq('id', incidentId);
            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['incident-confidentiality', variables.incidentId] });
            queryClient.invalidateQueries({ queryKey: ['confidentiality-audit', variables.incidentId] });
            queryClient.invalidateQueries({ queryKey: ['incident', variables.incidentId] });
            toast({ title: 'Confidentiality Updated', description: `Incident confidentiality level set to ${variables.level}` });
        },
        onError: (error) => { toast({ title: 'Update Failed', description: error instanceof Error ? error.message : 'Failed to update confidentiality', variant: 'destructive' }); }
    });
}

export function useGrantAccess() {
    const queryClient = useQueryClient(); const { toast } = useToast(); const { user, profile } = useAuth(); const tenantId = profile?.tenant_id;
    return useMutation({
        mutationFn: async ({ incidentId, userId, reason }: { incidentId: string; userId: string; reason?: string }) => {
            const { error } = await supabase.from('incident_access_list').upsert({ tenant_id: tenantId!, incident_id: incidentId, user_id: userId, granted_by: user!.id, granted_at: new Date().toISOString(), reason, revoked_at: null, revoked_by: null }, { onConflict: 'incident_id,user_id' });
            if (error) throw error;
            await supabase.from('incident_confidentiality_audit').insert({ tenant_id: tenantId!, incident_id: incidentId, actor_id: user!.id, action: 'access_granted', affected_user_id: userId, reason });
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['incident-access-list', variables.incidentId] });
            queryClient.invalidateQueries({ queryKey: ['confidentiality-audit', variables.incidentId] });
            toast({ title: 'Access Granted', description: 'User has been granted access to this incident' });
        },
        onError: (error) => { toast({ title: 'Grant Failed', description: error instanceof Error ? error.message : 'Failed to grant access', variant: 'destructive' }); }
    });
}

export function useRevokeAccess() {
    const queryClient = useQueryClient(); const { toast } = useToast(); const { user, profile } = useAuth(); const tenantId = profile?.tenant_id;
    return useMutation({
        mutationFn: async ({ accessId, incidentId, userId, reason }: { accessId: string; incidentId: string; userId: string; reason?: string }) => {
            const { error } = await supabase.from('incident_access_list').update({ revoked_at: new Date().toISOString(), revoked_by: user?.id }).eq('id', accessId);
            if (error) throw error;
            await supabase.from('incident_confidentiality_audit').insert({ tenant_id: tenantId!, incident_id: incidentId, actor_id: user!.id, action: 'access_revoked', affected_user_id: userId, reason });
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['incident-access-list', variables.incidentId] });
            queryClient.invalidateQueries({ queryKey: ['confidentiality-audit', variables.incidentId] });
            toast({ title: 'Access Revoked', description: 'User access has been revoked' });
        },
        onError: (error) => { toast({ title: 'Revoke Failed', description: error instanceof Error ? error.message : 'Failed to revoke access', variant: 'destructive' }); }
    });
}
