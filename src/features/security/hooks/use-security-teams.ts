import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export interface SecurityTeam {
  id: string;
  name: string;
  description: string | null;
  supervisor_id: string;
  supervisor_name: string | null;
  supervisor_avatar: string | null;
  is_active: boolean;
  created_at: string;
  member_count: number;
  members: SecurityTeamMember[];
}

export interface SecurityTeamMember {
  id: string;
  guard_id: string;
  guard_name: string | null;
  guard_avatar: string | null;
  assigned_at: string;
}

export function useSecurityTeams() {
  return useQuery({
    queryKey: ['security-teams'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) throw new Error('No tenant found');

      // Fetch teams with supervisor info
      const { data: teams, error: teamsError } = await supabase
        .from('security_teams')
        .select(`
          id,
          name,
          description,
          supervisor_id,
          is_active,
          created_at,
          supervisor:profiles!security_teams_supervisor_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (teamsError) throw teamsError;

      // Fetch members for all teams
      const { data: members, error: membersError } = await supabase
        .from('security_team_members')
        .select(`
          id,
          team_id,
          guard_id,
          assigned_at,
          guard:profiles!security_team_members_guard_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null);

      if (membersError) throw membersError;

      // Map members to teams
      const teamsWithMembers: SecurityTeam[] = (teams || []).map((team) => {
        const teamMembers = (members || [])
          .filter((m) => m.team_id === team.id)
          .map((m) => ({
            id: m.id,
            guard_id: m.guard_id,
            guard_name: (m.guard as { full_name: string | null } | null)?.full_name ?? null,
            guard_avatar: (m.guard as { avatar_url: string | null } | null)?.avatar_url ?? null,
            assigned_at: m.assigned_at,
          }));

        return {
          id: team.id,
          name: team.name,
          description: team.description,
          supervisor_id: team.supervisor_id,
          supervisor_name: (team.supervisor as { full_name: string | null } | null)?.full_name ?? null,
          supervisor_avatar: (team.supervisor as { avatar_url: string | null } | null)?.avatar_url ?? null,
          is_active: team.is_active ?? true,
          created_at: team.created_at ?? '',
          member_count: teamMembers.length,
          members: teamMembers,
        };
      });

      return teamsWithMembers;
    },
  });
}

export function useCreateSecurityTeam() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      supervisor_id: string;
      member_ids?: string[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) throw new Error('No tenant found');

      // Create team
      const { data: team, error: teamError } = await supabase
        .from('security_teams')
        .insert({
          name: data.name,
          description: data.description,
          supervisor_id: data.supervisor_id,
          tenant_id: profile.tenant_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // Add members if provided
      if (data.member_ids && data.member_ids.length > 0) {
        const memberInserts = data.member_ids.map((guard_id) => ({
          team_id: team.id,
          guard_id,
          tenant_id: profile.tenant_id,
          assigned_by: user.id,
        }));

        const { error: membersError } = await supabase
          .from('security_team_members')
          .insert(memberInserts);

        if (membersError) throw membersError;
      }

      return team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-teams'] });
      toast({
        title: t('common.success'),
        description: t('security.teamCreatedSuccess'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateSecurityTeam() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      name?: string;
      description?: string;
      supervisor_id?: string;
      is_active?: boolean;
    }) => {
      const { id, ...updateData } = data;

      const { data: team, error } = await supabase
        .from('security_teams')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-teams'] });
      toast({
        title: t('common.success'),
        description: t('security.teamUpdatedSuccess'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteSecurityTeam() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (teamId: string) => {
      // Soft delete team and members
      const { error: membersError } = await supabase
        .from('security_team_members')
        .update({ deleted_at: new Date().toISOString() })
        .eq('team_id', teamId);

      if (membersError) throw membersError;

      const { error } = await supabase
        .from('security_teams')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', teamId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-teams'] });
      toast({
        title: t('common.success'),
        description: t('security.teamDeletedSuccess'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useAddTeamMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: { team_id: string; guard_id: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) throw new Error('No tenant found');

      const { error } = await supabase
        .from('security_team_members')
        .insert({
          team_id: data.team_id,
          guard_id: data.guard_id,
          tenant_id: profile.tenant_id,
          assigned_by: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-teams'] });
      toast({
        title: t('common.success'),
        description: t('security.memberAddedSuccess'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.rpc('remove_team_member', {
        p_member_id: memberId
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-teams'] });
      toast({
        title: t('common.success'),
        description: t('security.memberRemovedSuccess'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
