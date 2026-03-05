import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SecurityGuard {
  guard_id: string;
  guard_name: string;
  avatar_url: string | null;
  employee_id: string | null;
  job_title: string | null;
  team_name: string | null;
}

export function useSecurityGuards() {
  return useQuery({
    queryKey: ['security-guards-list'],
    queryFn: async () => {
      // Get current user's tenant
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();
      
      if (!profile?.tenant_id) throw new Error('No tenant found');

      const guardMap = new Map<string, SecurityGuard>();

      // Fetch guards from security_team_members with profiles
      const { data: teamMembers, error: tmError } = await supabase
        .from('security_team_members')
        .select(`
          guard_id,
          team:security_teams(name),
          guard:profiles!security_team_members_guard_id_fkey(
            id, full_name, avatar_url, employee_id, job_title
          )
        `)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null);

      if (!tmError && teamMembers) {
        for (const tm of teamMembers) {
          const guard = tm.guard as unknown;
          if (guard?.id) {
            guardMap.set(guard.id, {
              guard_id: guard.id,
              guard_name: guard.full_name || 'Unknown',
              avatar_url: guard.avatar_url,
              employee_id: guard.employee_id,
              job_title: guard.job_title,
              team_name: (tm.team as unknown)?.name || null,
            });
          }
        }
      }

      // Also fetch guards by job_title containing "security" or "guard"
      const { data: securityProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, employee_id, job_title')
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .or('job_title.ilike.%security%,job_title.ilike.%guard%,job_title.ilike.%حارس%,job_title.ilike.%أمن%');

      // Add from profiles with security job titles
      if (securityProfiles) {
        for (const p of securityProfiles) {
          if (!guardMap.has(p.id)) {
            guardMap.set(p.id, {
              guard_id: p.id,
              guard_name: p.full_name || 'Unknown',
              avatar_url: p.avatar_url,
              employee_id: p.employee_id,
              job_title: p.job_title,
              team_name: null,
            });
          }
        }
      }

      // If still no guards found, try fetching all profiles as fallback (for testing)
      if (guardMap.size === 0) {
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, employee_id, job_title')
          .eq('tenant_id', profile.tenant_id)
          .is('deleted_at', null)
          .limit(50);

        if (allProfiles) {
          for (const p of allProfiles) {
            guardMap.set(p.id, {
              guard_id: p.id,
              guard_name: p.full_name || 'Unknown',
              avatar_url: p.avatar_url,
              employee_id: p.employee_id,
              job_title: p.job_title,
              team_name: null,
            });
          }
        }
      }

      return Array.from(guardMap.values()).sort((a, b) => 
        a.guard_name.localeCompare(b.guard_name)
      );
    },
  });
}
