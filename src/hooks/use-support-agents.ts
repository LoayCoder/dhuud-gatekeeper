import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AgentWorkload {
  agent_id: string;
  full_name: string;
  open_tickets: number;
  avg_response_time: number;
}

interface Agent {
  id: string;
  full_name: string;
}

export function useSupportAgents() {
  // Fetch all admin users who can be assigned tickets (using normalized role structure)
  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ['support-agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_role_assignments')
        .select(`
          user_id,
          roles!inner(code, is_active)
        `)
        .eq('roles.code', 'admin')
        .eq('roles.is_active', true);

      if (error) throw error;

      if (!data || data.length === 0) return [];

      const userIds = data.map(r => r.user_id);
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds)
        .is('deleted_at', null);

      if (profilesError) throw profilesError;

      return (profiles || []) as Agent[];
    },
  });

  // Fetch agent workload using the RPC function
  const { data: workload = [], isLoading: workloadLoading } = useQuery({
    queryKey: ['agent-workload'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_agent_workload');
      if (error) throw error;
      return (data || []) as AgentWorkload[];
    },
  });

  return {
    agents,
    workload,
    isLoading: agentsLoading || workloadLoading,
  };
}
