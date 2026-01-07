import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SecurityTeamMember {
  id: string;
  full_name: string | null;
  employee_id: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  is_active: boolean | null;
  job_title: string | null;
  assigned_site_id: string | null;
  role: string;
  sites?: { name: string } | null;
}

export function useSecurityTeam(filters?: { role?: string; isActive?: boolean }) {
  return useQuery({
    queryKey: ['security-team', filters],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();
      if (!profile?.tenant_id) throw new Error('No tenant found');

      // Get user roles for security personnel
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['admin', 'user', 'security_guard', 'security_supervisor', 'security_manager']);

      if (rolesError) throw rolesError;

      const userIds = userRoles?.map(r => r.user_id) || [];
      if (userIds.length === 0) return [];

      // Get profiles for those users within the tenant
      let query = supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          employee_id,
          phone_number,
          avatar_url,
          is_active,
          job_title,
          assigned_site_id,
          sites (name)
        `)
        .eq('tenant_id', profile.tenant_id)
        .in('id', userIds)
        .is('deleted_at', null);

      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      const { data: profiles, error } = await query.order('full_name');
      if (error) throw error;

      // Merge role info with profile data
      const teamMembers: SecurityTeamMember[] = (profiles || []).map(p => {
        const userRole = userRoles?.find(r => r.user_id === p.id);
        return {
          ...p,
          role: userRole?.role || 'user',
        };
      });

      // Filter by role if specified
      if (filters?.role) {
        return teamMembers.filter(m => m.role === filters.role);
      }

      return teamMembers;
    },
  });
}

export function useUpdateSecurityTeamMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; is_active?: boolean; assigned_site_id?: string | null; job_title?: string }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-team'] });
      toast({ title: 'Team member updated' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update', description: error.message, variant: 'destructive' });
    },
  });
}
