import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AgentWorkload {
  agent_id: string;
  agent_name: string;
  open_tickets: number;
  in_progress_tickets: number;
  total_active: number;
  avg_resolution_hours: number | null;
}

interface Agent {
  id: string;
  full_name: string;
}

export function useSupportAgents() {
  // Fetch all admin users who can be assigned tickets
  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ['support-agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (error) throw error;

      if (!data || data.length === 0) return [];

      const userIds = data.map(r => r.user_id);
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds)
        .eq('is_active', true);

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
