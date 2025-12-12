import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SLAAction {
  id: string;
  reference_id: string | null;
  title: string;
  priority: string | null;
  due_date: string | null;
  status: string | null;
  escalation_level: number;
  assigned_to: string | null;
  assignee_name: string | null;
  incident_id: string | null;
  session_id: string | null;
  created_at: string | null;
  tenant_id: string;
}

export interface SLAStats {
  total: number;
  onTrack: number;
  warning: number;
  overdue: number;
  escalatedLevel1: number;
  escalatedLevel2: number;
}

export function useSLADashboard() {
  const { profile } = useAuth();
  const [actions, setActions] = useState<SLAAction[]>([]);

  // Fetch all active corrective actions
  const { data: initialActions, isLoading, refetch } = useQuery({
    queryKey: ['sla-dashboard-actions', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from('corrective_actions')
        .select(`
          id,
          reference_id,
          title,
          priority,
          due_date,
          status,
          escalation_level,
          assigned_to,
          incident_id,
          session_id,
          created_at,
          tenant_id,
          profiles!corrective_actions_assigned_to_fkey(full_name)
        `)
        .eq('tenant_id', profile.tenant_id)
        .not('status', 'in', '(completed,verified,closed)')
        .is('deleted_at', null)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;

      return (data || []).map((action: any) => ({
        ...action,
        assignee_name: action.profiles?.full_name || null,
      }));
    },
    enabled: !!profile?.tenant_id,
    refetchInterval: 60000, // Refetch every minute
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!profile?.tenant_id) return;

    const channel = supabase
      .channel('sla-dashboard-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'corrective_actions',
          filter: `tenant_id=eq.${profile.tenant_id}`,
        },
        (payload) => {
          console.log('Realtime SLA update:', payload);
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.tenant_id, refetch]);

  // Update local state when initial data loads
  useEffect(() => {
    if (initialActions) {
      setActions(initialActions);
    }
  }, [initialActions]);

  // Calculate stats
  const stats: SLAStats = {
    total: actions.length,
    onTrack: 0,
    warning: 0,
    overdue: 0,
    escalatedLevel1: 0,
    escalatedLevel2: 0,
  };

  const now = Date.now();
  actions.forEach((action) => {
    if (action.escalation_level >= 2) {
      stats.escalatedLevel2++;
    } else if (action.escalation_level === 1) {
      stats.escalatedLevel1++;
    } else if (action.due_date) {
      const dueDate = new Date(action.due_date).getTime();
      const daysUntilDue = (dueDate - now) / (1000 * 60 * 60 * 24);
      
      if (daysUntilDue < 0) {
        stats.overdue++;
      } else if (daysUntilDue <= 3) {
        stats.warning++;
      } else {
        stats.onTrack++;
      }
    } else {
      stats.onTrack++;
    }
  });

  return {
    actions,
    stats,
    isLoading,
    refetch,
  };
}
