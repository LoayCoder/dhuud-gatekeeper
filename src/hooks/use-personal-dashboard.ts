import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PersonalDashboardStats {
  actions: {
    pending: number;
    in_progress: number;
    overdue: number;
    completed_this_week: number;
    due_this_week: number;
    returned: number;
  };
  visitors: {
    pending_approval: number;
    arriving_today: number;
    on_site: number;
    total_hosted: number;
  };
  gate_passes: {
    my_pending: number;
    approved_today: number;
    awaiting_entry: number;
    total: number;
  };
  inspections: {
    assigned_pending: number;
    due_today: number;
    overdue: number;
    completed_this_week: number;
  };
  incidents: {
    my_reported: number;
    pending_investigation: number;
    closed_this_month: number;
  };
}

export function usePersonalDashboard() {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['personal-dashboard-stats', user?.id],
    queryFn: async () => {
      if (!user?.id || !profile?.tenant_id) return null;

      const { data, error } = await supabase.rpc('get_personal_dashboard_stats');

      if (error) throw error;
      return data as unknown as PersonalDashboardStats;
    },
    enabled: !!user?.id && !!profile?.tenant_id,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}

// Hook for user's own gate passes
export function useMyGatePasses() {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['my-gate-passes', user?.id],
    queryFn: async () => {
      if (!user?.id || !profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from('material_gate_passes')
        .select(`
          id, reference_number, pass_type, material_description, 
          pass_date, status, created_at, entry_time, exit_time,
          project:contractor_projects(project_name)
        `)
        .eq('tenant_id', profile.tenant_id)
        .eq('requested_by', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!profile?.tenant_id,
  });
}

// Hook for user's pending inspection actions (including verification awaiting)
export function useMyPendingInspections() {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['my-pending-inspections', user?.id],
    queryFn: async () => {
      if (!user?.id || !profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from('inspection_sessions')
        .select(`
          id, started_at, completed_at, status, compliance_percentage,
          template:inspection_templates(name, name_ar),
          site:sites(name)
        `)
        .eq('tenant_id', profile.tenant_id)
        .eq('inspector_id', user.id)
        .in('status', ['draft', 'in_progress'])
        .is('deleted_at', null)
        .order('started_at', { ascending: true })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!profile?.tenant_id,
  });
}

// Hook for upcoming scheduled inspections
export function useMyUpcomingScheduledInspections() {
  const { user, profile } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['my-upcoming-scheduled-inspections', user?.id],
    queryFn: async () => {
      if (!user?.id || !profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from('inspection_schedules')
        .select(`
          id, name, next_due, frequency_type, is_active,
          template:inspection_templates(name, name_ar),
          site:sites(name)
        `)
        .eq('tenant_id', profile.tenant_id)
        .eq('assigned_inspector_id', user.id)
        .eq('is_active', true)
        .gte('next_due', today)
        .is('deleted_at', null)
        .order('next_due', { ascending: true })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!profile?.tenant_id,
  });
}
