import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export type ConfidentialityLevel = 'public' | 'restricted' | 'confidential';

export interface ConfidentialitySettings {
  level: ConfidentialityLevel;
  expiry: string | null;
  autoDeclassifyTo: 'public' | 'restricted' | null;
  expiryReason: string | null;
  setBy: string | null;
  setAt: string | null;
}

export interface AccessListUser {
  id: string;
  user_id: string;
  full_name: string;
  email?: string;
  granted_by_name: string;
  granted_at: string;
  reason?: string;
}

export interface ConfidentialityAuditEntry {
  id: string;
  action: string;
  old_level: string | null;
  new_level: string | null;
  actor_name: string;
  affected_user_name?: string;
  reason?: string;
  created_at: string;
}

// Check if user can set confidentiality level
export function useCanSetConfidentiality(incidentId: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['can-set-confidentiality', incidentId, user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data, error } = await supabase.rpc('can_set_confidentiality', {
        _user_id: user.id,
        _incident_id: incidentId
      });
      
      if (error) {
        console.error('Error checking confidentiality permission:', error);
        return false;
      }
      
      return data as boolean;
    },
    enabled: !!incidentId && !!user?.id
  });
}

// Check if user can manage access list (HSSE Manager only)
export function useCanManageAccessList() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['can-manage-access-list', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data, error } = await supabase.rpc('can_manage_access_list', {
        _user_id: user.id
      });
      
      if (error) {
        console.error('Error checking access list permission:', error);
        return false;
      }
      
      return data as boolean;
    },
    enabled: !!user?.id
  });
}

// Check if user has confidentiality access to incident
export function useHasConfidentialityAccess(incidentId: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['has-confidentiality-access', incidentId, user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data, error } = await supabase.rpc('has_confidentiality_access', {
        _incident_id: incidentId,
        _user_id: user.id
      });
      
      if (error) {
        console.error('Error checking confidentiality access:', error);
        return false;
      }
      
      return data as boolean;
    },
    enabled: !!incidentId && !!user?.id
  });
}

// Get incident confidentiality settings
export function useIncidentConfidentiality(incidentId: string) {
  return useQuery({
    queryKey: ['incident-confidentiality', incidentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select('confidentiality_level, confidentiality_expiry, auto_declassify_to, confidentiality_expiry_reason, confidentiality_set_by, confidentiality_set_at')
        .eq('id', incidentId)
        .single();
      
      if (error) throw error;
      
      return {
        level: (data.confidentiality_level || 'public') as ConfidentialityLevel,
        expiry: data.confidentiality_expiry,
        autoDeclassifyTo: data.auto_declassify_to as 'public' | 'restricted' | null,
        expiryReason: data.confidentiality_expiry_reason,
        setBy: data.confidentiality_set_by,
        setAt: data.confidentiality_set_at
      } as ConfidentialitySettings;
    },
    enabled: !!incidentId
  });
}

// Get access list for confidential incidents
export function useIncidentAccessList(incidentId: string) {
  return useQuery({
    queryKey: ['incident-access-list', incidentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incident_access_list')
        .select(`
          id,
          user_id,
          user:user_id(full_name, email),
          granted_by_user:granted_by(full_name),
          granted_at,
          reason
        `)
        .eq('incident_id', incidentId)
        .is('revoked_at', null)
        .is('deleted_at', null)
        .order('granted_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map((item: Record<string, unknown>) => ({
        id: item.id as string,
        user_id: item.user_id as string,
        full_name: (item.user as { full_name: string } | null)?.full_name || 'Unknown',
        email: (item.user as { email: string } | null)?.email,
        granted_by_name: (item.granted_by_user as { full_name: string } | null)?.full_name || 'Unknown',
        granted_at: item.granted_at as string,
        reason: item.reason as string | undefined
      })) as AccessListUser[];
    },
    enabled: !!incidentId
  });
}

// Get confidentiality audit history
export function useConfidentialityAudit(incidentId: string) {
  return useQuery({
    queryKey: ['confidentiality-audit', incidentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incident_confidentiality_audit')
        .select(`
          id,
          action,
          old_level,
          new_level,
          actor:actor_id(full_name),
          affected_user:affected_user_id(full_name),
          reason,
          created_at
        `)
        .eq('incident_id', incidentId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map((item: Record<string, unknown>) => ({
        id: item.id as string,
        action: item.action as string,
        old_level: item.old_level as string | null,
        new_level: item.new_level as string | null,
        actor_name: (item.actor as { full_name: string } | null)?.full_name || 'System',
        affected_user_name: (item.affected_user as { full_name: string } | null)?.full_name,
        reason: item.reason as string | undefined,
        created_at: item.created_at as string
      })) as ConfidentialityAuditEntry[];
    },
    enabled: !!incidentId
  });
}

// Update confidentiality settings
export function useUpdateConfidentiality() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      incidentId, 
      level, 
      expiry, 
      autoDeclassifyTo, 
      expiryReason 
    }: {
      incidentId: string;
      level: ConfidentialityLevel;
      expiry?: string | null;
      autoDeclassifyTo?: 'public' | 'restricted' | null;
      expiryReason?: string | null;
    }) => {
      const { error } = await supabase
        .from('incidents')
        .update({
          confidentiality_level: level,
          confidentiality_expiry: level !== 'public' ? expiry : null,
          auto_declassify_to: level !== 'public' ? autoDeclassifyTo : null,
          confidentiality_expiry_reason: level !== 'public' ? expiryReason : null,
          confidentiality_set_by: user?.id,
          confidentiality_set_at: new Date().toISOString()
        })
        .eq('id', incidentId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incident-confidentiality', variables.incidentId] });
      queryClient.invalidateQueries({ queryKey: ['confidentiality-audit', variables.incidentId] });
      queryClient.invalidateQueries({ queryKey: ['incident', variables.incidentId] });
      toast({
        title: 'Confidentiality Updated',
        description: `Incident confidentiality level set to ${variables.level}`
      });
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update confidentiality',
        variant: 'destructive'
      });
    }
  });
}

// Grant access to user (for confidential level)
export function useGrantAccess() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const tenantId = profile?.tenant_id;
  
  return useMutation({
    mutationFn: async ({ incidentId, userId, reason }: { 
      incidentId: string; 
      userId: string; 
      reason?: string;
    }) => {
      // Insert or update (upsert would need unique constraint handling)
      const { error } = await supabase
        .from('incident_access_list')
        .upsert({
          tenant_id: tenantId!,
          incident_id: incidentId,
          user_id: userId,
          granted_by: user?.id!,
          granted_at: new Date().toISOString(),
          reason,
          revoked_at: null,
          revoked_by: null
        }, {
          onConflict: 'incident_id,user_id'
        });
      
      if (error) throw error;
      
      // Log to audit
      await supabase.from('incident_confidentiality_audit').insert({
        tenant_id: tenantId!,
        incident_id: incidentId,
        actor_id: user?.id!,
        action: 'access_granted',
        affected_user_id: userId,
        reason
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incident-access-list', variables.incidentId] });
      queryClient.invalidateQueries({ queryKey: ['confidentiality-audit', variables.incidentId] });
      toast({
        title: 'Access Granted',
        description: 'User has been granted access to this incident'
      });
    },
    onError: (error) => {
      toast({
        title: 'Grant Failed',
        description: error instanceof Error ? error.message : 'Failed to grant access',
        variant: 'destructive'
      });
    }
  });
}

// Revoke access from user
export function useRevokeAccess() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const tenantId = profile?.tenant_id;
  
  return useMutation({
    mutationFn: async ({ accessId, incidentId, userId, reason }: { 
      accessId: string;
      incidentId: string; 
      userId: string;
      reason?: string;
    }) => {
      const { error } = await supabase
        .from('incident_access_list')
        .update({
          revoked_at: new Date().toISOString(),
          revoked_by: user?.id
        })
        .eq('id', accessId);
      
      if (error) throw error;
      
      // Log to audit
      await supabase.from('incident_confidentiality_audit').insert({
        tenant_id: tenantId!,
        incident_id: incidentId,
        actor_id: user?.id!,
        action: 'access_revoked',
        affected_user_id: userId,
        reason
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incident-access-list', variables.incidentId] });
      queryClient.invalidateQueries({ queryKey: ['confidentiality-audit', variables.incidentId] });
      toast({
        title: 'Access Revoked',
        description: 'User access has been revoked'
      });
    },
    onError: (error) => {
      toast({
        title: 'Revoke Failed',
        description: error instanceof Error ? error.message : 'Failed to revoke access',
        variant: 'destructive'
      });
    }
  });
}
