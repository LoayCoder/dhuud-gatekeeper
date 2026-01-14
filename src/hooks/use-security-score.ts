import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBranchFilter } from '@/hooks/use-branch-filter';

export interface SecurityScoreMetrics {
  score: number;
  blacklistEnforcement: number;
  qrExpiryCompliance: number;
  approvalTurnaround: number;
  emergencyResponseTime: number;
  activeEmergencies: number;
  trend: 'up' | 'down' | 'stable';
}

export function useSecurityScore() {
  const { branchIds, isAllBranchesMode, queryKey: branchQueryKey } = useBranchFilter();

  return useQuery({
    queryKey: ['security-score', ...branchQueryKey],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .single();

      if (!profile?.tenant_id) {
        return {
          score: 85,
          blacklistEnforcement: 100,
          qrExpiryCompliance: 100,
          approvalTurnaround: 100,
          emergencyResponseTime: 100,
          activeEmergencies: 0,
          trend: 'stable' as const,
        };
      }

      const tenantId = profile.tenant_id;
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Helper to check if we should apply branch filter
      const shouldFilterBranch = !isAllBranchesMode && branchIds && branchIds.length > 0;

      // 1. Blacklist count
      let blacklistQuery = supabase.from('security_blacklist').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).is('deleted_at', null);
      if (shouldFilterBranch && branchIds) {
        blacklistQuery = branchIds.length === 1 ? blacklistQuery.eq('branch_id', branchIds[0]) : blacklistQuery.in('branch_id', branchIds);
      }
      const { count: blacklistCount } = await blacklistQuery;

      // 2. Gate entries count  
      let gateEntriesQuery = supabase.from('gate_entry_logs').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('entry_time', weekAgo).is('deleted_at', null);
      if (shouldFilterBranch && branchIds) {
        gateEntriesQuery = branchIds.length === 1 ? gateEntriesQuery.eq('branch_id', branchIds[0]) : gateEntriesQuery.in('branch_id', branchIds);
      }
      const { count: gateEntriesCount } = await gateEntriesQuery;

      // 3. Visit requests count
      let visitRequestsQuery = supabase.from('visit_requests').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('created_at', weekAgo).in('status', ['approved', 'rejected']);
      if (shouldFilterBranch && branchIds) {
        visitRequestsQuery = branchIds.length === 1 ? visitRequestsQuery.eq('branch_id', branchIds[0]) : visitRequestsQuery.in('branch_id', branchIds);
      }
      const { count: visitRequestsCount } = await visitRequestsQuery;

      // 4. Active emergencies
      let emergenciesQuery = supabase.from('emergency_alerts').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).is('resolved_at', null);
      if (shouldFilterBranch && branchIds) {
        emergenciesQuery = branchIds.length === 1 ? emergenciesQuery.eq('branch_id', branchIds[0]) : emergenciesQuery.in('branch_id', branchIds);
      }
      const { count: activeEmergencies } = await emergenciesQuery;

      // Calculate metrics (simplified)
      const blacklistEnforcement = 100;
      const qrExpiryCompliance = 100;
      const approvalTurnaround = visitRequestsCount ? 90 : 100;
      const emergencyResponseTime = 100;

      // Calculate overall score (85-100 range)
      const baseScore = (
        blacklistEnforcement * 0.25 +
        qrExpiryCompliance * 0.25 +
        approvalTurnaround * 0.25 +
        emergencyResponseTime * 0.25
      );

      const emergencyPenalty = Math.min((activeEmergencies || 0) * 2, 10);
      const rawScore = baseScore - emergencyPenalty;
      const score = Math.round(Math.max(85, Math.min(100, 85 + (rawScore / 100) * 15)));

      const trend: 'up' | 'down' | 'stable' = 
        (activeEmergencies || 0) > 0 ? 'down' : 
        score >= 95 ? 'up' : 'stable';

      return {
        score,
        blacklistEnforcement: Math.round(blacklistEnforcement),
        qrExpiryCompliance: Math.round(qrExpiryCompliance),
        approvalTurnaround: Math.round(approvalTurnaround),
        emergencyResponseTime: Math.round(emergencyResponseTime),
        activeEmergencies: activeEmergencies || 0,
        trend,
      } as SecurityScoreMetrics;
    },
    refetchInterval: 60000,
  });
}
