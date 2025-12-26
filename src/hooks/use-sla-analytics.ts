import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';
import { startOfMonth, subMonths, format, differenceInDays } from 'date-fns';

export interface SLAAnalyticsFilters {
  startDate?: Date;
  endDate?: Date;
  departmentId?: string;
  userId?: string;
  priority?: string;
}

export interface MonthlyComplianceData {
  month: string;
  completed: number;
  breached: number;
  complianceRate: number;
}

export interface DepartmentPerformance {
  departmentId: string;
  departmentName: string;
  totalActions: number;
  completedOnTime: number;
  breached: number;
  complianceRate: number;
  avgResolutionDays: number;
}

export interface PriorityMetrics {
  priority: string;
  total: number;
  completed: number;
  breached: number;
  avgDaysToComplete: number;
}

export interface EscalationMetrics {
  level0: number;
  level1: number;
  level2: number;
  escalationRate: number;
}

export interface SLAAnalyticsData {
  monthlyTrends: MonthlyComplianceData[];
  departmentPerformance: DepartmentPerformance[];
  priorityMetrics: PriorityMetrics[];
  escalationMetrics: EscalationMetrics;
  overallComplianceRate: number;
  avgResolutionTime: number;
  totalActions: number;
  activeActions: number;
}

export function useSLAAnalytics(filters: SLAAnalyticsFilters = {}) {
  const { profile } = useAuth();

  const { data: rawActions, isLoading: actionsLoading } = useQuery({
    queryKey: ['sla-analytics-actions', profile?.tenant_id, filters],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      let query = supabase
        .from('corrective_actions')
        .select(`
          id,
          title,
          priority,
          due_date,
          status,
          escalation_level,
          created_at,
          updated_at,
          assigned_to,
          tenant_id,
          profiles!corrective_actions_assigned_to_fkey(
            id,
            full_name,
            department_id
          )
        `)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null);

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString());
      }
      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: departments } = useQuery({
    queryKey: ['departments', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.tenant_id,
  });

  const analytics = useMemo<SLAAnalyticsData>(() => {
    if (!rawActions || rawActions.length === 0) {
      return {
        monthlyTrends: [],
        departmentPerformance: [],
        priorityMetrics: [],
        escalationMetrics: { level0: 0, level1: 0, level2: 0, escalationRate: 0 },
        overallComplianceRate: 0,
        avgResolutionTime: 0,
        totalActions: 0,
        activeActions: 0,
      };
    }

    const actions = rawActions as Array<{
      id: string;
      title: string;
      priority: string | null;
      due_date: string | null;
      status: string | null;
      escalation_level: number;
      created_at: string | null;
      updated_at: string | null;
      assigned_to: string | null;
      tenant_id: string;
      profiles: { id: string; full_name: string; department_id: string | null } | null;
    }>;

    // Monthly Trends (last 12 months)
    const monthlyTrends: MonthlyComplianceData[] = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(new Date(), i));
      const monthKey = format(monthStart, 'yyyy-MM');
      const monthLabel = format(monthStart, 'MMM yyyy');

      const monthActions = actions.filter(a => {
        if (!a.created_at) return false;
        const created = format(new Date(a.created_at), 'yyyy-MM');
        return created === monthKey;
      });

      const completedOnTime = monthActions.filter(a => {
        if (a.status !== 'completed' && a.status !== 'verified' && a.status !== 'closed') return false;
        if (!a.updated_at || !a.due_date) return false;
        return new Date(a.updated_at) <= new Date(a.due_date);
      }).length;

      const breached = monthActions.filter(a => {
        if (!a.due_date) return false;
        const checkDate = (a.status === 'completed' || a.status === 'verified' || a.status === 'closed') && a.updated_at ? new Date(a.updated_at) : new Date();
        return checkDate > new Date(a.due_date);
      }).length;

      const total = completedOnTime + breached;
      monthlyTrends.push({
        month: monthLabel,
        completed: completedOnTime,
        breached,
        complianceRate: total > 0 ? Math.round((completedOnTime / total) * 100) : 100,
      });
    }

    // Department Performance
    const deptMap = new Map<string, { total: number; onTime: number; breached: number; totalDays: number; completedCount: number }>();
    
    actions.forEach(action => {
      const deptId = action.profiles?.department_id || 'unknown';
      if (!deptMap.has(deptId)) {
        deptMap.set(deptId, { total: 0, onTime: 0, breached: 0, totalDays: 0, completedCount: 0 });
      }
      const stats = deptMap.get(deptId)!;
      stats.total++;

      if (action.due_date) {
        const completedDate = (action.status === 'completed' || action.status === 'verified' || action.status === 'closed') && action.updated_at ? new Date(action.updated_at) : new Date();
        const dueDate = new Date(action.due_date);
        
        if (action.status === 'completed' || action.status === 'verified' || action.status === 'closed') {
          if (action.updated_at) {
            const days = differenceInDays(new Date(action.updated_at), new Date(action.created_at || action.updated_at));
            stats.totalDays += Math.max(0, days);
            stats.completedCount++;
          }
          if (completedDate <= dueDate) {
            stats.onTime++;
          } else {
            stats.breached++;
          }
        } else if (new Date() > dueDate) {
          stats.breached++;
        }
      }
    });

    const departmentPerformance: DepartmentPerformance[] = Array.from(deptMap.entries()).map(([deptId, stats]) => {
      const dept = departments?.find(d => d.id === deptId);
      const complianceBase = stats.onTime + stats.breached;
      return {
        departmentId: deptId,
        departmentName: dept?.name || 'Unassigned',
        totalActions: stats.total,
        completedOnTime: stats.onTime,
        breached: stats.breached,
        complianceRate: complianceBase > 0 ? Math.round((stats.onTime / complianceBase) * 100) : 100,
        avgResolutionDays: stats.completedCount > 0 ? Math.round(stats.totalDays / stats.completedCount) : 0,
      };
    });

    // Priority Metrics
    const priorityMap = new Map<string, { total: number; completed: number; breached: number; totalDays: number; completedCount: number }>();
    const priorities = ['critical', 'high', 'medium', 'low'];
    priorities.forEach(p => priorityMap.set(p, { total: 0, completed: 0, breached: 0, totalDays: 0, completedCount: 0 }));

    actions.forEach(action => {
      const priority = action.priority || 'medium';
      if (!priorityMap.has(priority)) {
        priorityMap.set(priority, { total: 0, completed: 0, breached: 0, totalDays: 0, completedCount: 0 });
      }
      const stats = priorityMap.get(priority)!;
      stats.total++;

      if (action.status === 'completed' || action.status === 'verified' || action.status === 'closed') {
        stats.completed++;
        if (action.updated_at && action.created_at) {
          const days = differenceInDays(new Date(action.updated_at), new Date(action.created_at));
          stats.totalDays += Math.max(0, days);
          stats.completedCount++;
        }
      }

      if (action.due_date) {
        const completedDate = (action.status === 'completed' || action.status === 'verified' || action.status === 'closed') && action.updated_at ? new Date(action.updated_at) : new Date();
        if (completedDate > new Date(action.due_date)) {
          stats.breached++;
        }
      }
    });

    const priorityMetrics: PriorityMetrics[] = Array.from(priorityMap.entries()).map(([priority, stats]) => ({
      priority,
      total: stats.total,
      completed: stats.completed,
      breached: stats.breached,
      avgDaysToComplete: stats.completedCount > 0 ? Math.round(stats.totalDays / stats.completedCount) : 0,
    }));

    // Escalation Metrics
    const level0 = actions.filter(a => a.escalation_level === 0).length;
    const level1 = actions.filter(a => a.escalation_level === 1).length;
    const level2 = actions.filter(a => a.escalation_level >= 2).length;
    const escalated = level1 + level2;

    const escalationMetrics: EscalationMetrics = {
      level0,
      level1,
      level2,
      escalationRate: actions.length > 0 ? Math.round((escalated / actions.length) * 100) : 0,
    };

    // Overall metrics
    const completedActions = actions.filter(a => 
      a.status === 'completed' || a.status === 'verified' || a.status === 'closed'
    );
    const onTimeCount = completedActions.filter(a => {
      if (!a.updated_at || !a.due_date) return true;
      return new Date(a.updated_at) <= new Date(a.due_date);
    }).length;

    let totalResolutionDays = 0;
    let resolutionCount = 0;
    completedActions.forEach(a => {
      if (a.updated_at && a.created_at) {
        const days = differenceInDays(new Date(a.updated_at), new Date(a.created_at));
        totalResolutionDays += Math.max(0, days);
        resolutionCount++;
      }
    });

    const activeActions = actions.filter(a => 
      a.status !== 'completed' && a.status !== 'verified' && a.status !== 'closed'
    ).length;

    return {
      monthlyTrends,
      departmentPerformance,
      priorityMetrics,
      escalationMetrics,
      overallComplianceRate: completedActions.length > 0 ? Math.round((onTimeCount / completedActions.length) * 100) : 100,
      avgResolutionTime: resolutionCount > 0 ? Math.round(totalResolutionDays / resolutionCount) : 0,
      totalActions: actions.length,
      activeActions,
    };
  }, [rawActions, departments]);

  return {
    analytics,
    isLoading: actionsLoading,
  };
}
