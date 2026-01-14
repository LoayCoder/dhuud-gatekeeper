import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBranchFilter } from '@/hooks/use-branch-filter';

interface SessionStats {
  total_sessions: number;
  draft: number;
  in_progress: number;
  completed_with_open_actions: number;
  closed: number;
  avg_compliance: number | null;
}

interface ComplianceTrendItem {
  month: string;
  avg_compliance: number;
  session_count: number;
}

interface FindingsDistribution {
  by_classification: Array<{ classification: string; count: number }>;
  by_risk_level: Array<{ risk_level: string; count: number }>;
  by_status: Array<{ status: string; count: number }>;
  total_open: number;
}

export function useInspectionSessionStats() {
  const { profile } = useAuth();
  const { queryKey: branchQueryKey } = useBranchFilter();
  
  return useQuery({
    queryKey: ['inspection-session-stats', profile?.tenant_id, ...branchQueryKey],
    queryFn: async () => {
      // Note: RPC doesn't support branch filtering yet, but query key includes branch for cache invalidation
      const { data, error } = await supabase.rpc('get_inspection_session_stats');
      if (error) throw error;
      return data as unknown as SessionStats;
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useComplianceTrend() {
  const { profile } = useAuth();
  const { queryKey: branchQueryKey } = useBranchFilter();
  
  return useQuery({
    queryKey: ['compliance-trend', profile?.tenant_id, ...branchQueryKey],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_inspection_compliance_trend');
      if (error) throw error;
      return (data || []) as unknown as ComplianceTrendItem[];
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useFindingsDistribution() {
  const { profile } = useAuth();
  const { queryKey: branchQueryKey } = useBranchFilter();
  
  return useQuery({
    queryKey: ['findings-distribution', profile?.tenant_id, ...branchQueryKey],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_findings_distribution');
      if (error) throw error;
      return data as unknown as FindingsDistribution;
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useOverdueInspectionsCount() {
  const { profile } = useAuth();
  const { queryKey: branchQueryKey } = useBranchFilter();
  
  return useQuery({
    queryKey: ['overdue-inspections-count', profile?.tenant_id, ...branchQueryKey],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_overdue_inspections_count');
      if (error) throw error;
      return (data || 0) as number;
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useRecentFindings(limit: number = 10) {
  const { profile } = useAuth();
  const { branchIds, isAllBranchesMode, queryKey: branchQueryKey } = useBranchFilter();
  
  return useQuery({
    queryKey: ['recent-findings', profile?.tenant_id, limit, ...branchQueryKey],
    queryFn: async () => {
      let query = supabase
        .from('area_inspection_findings')
        .select(`
          id, reference_id, classification, risk_level, status, description, created_at,
          session:inspection_sessions(reference_id)
        `)
        .is('deleted_at', null)
        .neq('status', 'closed')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      // Apply branch filter
      if (!isAllBranchesMode && branchIds && branchIds.length > 0) {
        query = branchIds.length === 1
          ? query.eq('branch_id', branchIds[0])
          : query.in('branch_id', branchIds);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });
}
