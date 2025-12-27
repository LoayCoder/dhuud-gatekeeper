import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FleetHealthStats {
  totalAssets: number;
  averageScore: number;
  criticalCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  averageComplianceRate: number;
  overdueMaintenance: number;
  upcomingMaintenance: number;
  improvingTrend: number;
  decliningTrend: number;
  stableTrend: number;
}

export interface AtRiskAsset {
  id: string;
  assetId: string;
  assetName: string;
  assetCode: string;
  score: number;
  riskLevel: string;
  trend: string | null;
  daysUntilFailure: number | null;
  maintenanceCompliance: number | null;
}

export function useFleetHealthStats() {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['fleet-health-stats', profile?.tenant_id],
    queryFn: async (): Promise<FleetHealthStats> => {
      if (!profile?.tenant_id) {
        throw new Error('No tenant ID available');
      }

      // Fetch all health scores for tenant
      const { data: healthScores, error: healthError } = await supabase
        .from('asset_health_scores')
        .select('score, risk_level, trend, maintenance_compliance_pct')
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null);

      if (healthError) throw healthError;

      // Fetch overdue maintenance
      const now = new Date().toISOString();
      const { data: overdueSchedules, error: overdueError } = await supabase
        .from('asset_maintenance_schedules')
        .select('id')
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .lt('next_due', now);

      if (overdueError) throw overdueError;

      // Fetch upcoming maintenance (next 7 days)
      const sevenDaysLater = new Date();
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
      const { data: upcomingSchedules, error: upcomingError } = await supabase
        .from('asset_maintenance_schedules')
        .select('id')
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .gte('next_due', now)
        .lte('next_due', sevenDaysLater.toISOString());

      if (upcomingError) throw upcomingError;

      const scores = healthScores || [];
      const totalAssets = scores.length;

      if (totalAssets === 0) {
        return {
          totalAssets: 0,
          averageScore: 0,
          criticalCount: 0,
          highRiskCount: 0,
          mediumRiskCount: 0,
          lowRiskCount: 0,
          averageComplianceRate: 0,
          overdueMaintenance: 0,
          upcomingMaintenance: 0,
          improvingTrend: 0,
          decliningTrend: 0,
          stableTrend: 0,
        };
      }

      const averageScore = Math.round(
        scores.reduce((sum, s) => sum + (s.score || 0), 0) / totalAssets
      );

      const criticalCount = scores.filter(s => s.risk_level === 'critical').length;
      const highRiskCount = scores.filter(s => s.risk_level === 'high').length;
      const mediumRiskCount = scores.filter(s => s.risk_level === 'medium').length;
      const lowRiskCount = scores.filter(s => s.risk_level === 'low').length;

      const complianceScores = scores.filter(s => s.maintenance_compliance_pct !== null);
      const averageComplianceRate = complianceScores.length > 0
        ? Math.round(complianceScores.reduce((sum, s) => sum + (s.maintenance_compliance_pct || 0), 0) / complianceScores.length)
        : 0;

      const improvingTrend = scores.filter(s => s.trend === 'improving').length;
      const decliningTrend = scores.filter(s => s.trend === 'declining').length;
      const stableTrend = scores.filter(s => s.trend === 'stable').length;

      return {
        totalAssets,
        averageScore,
        criticalCount,
        highRiskCount,
        mediumRiskCount,
        lowRiskCount,
        averageComplianceRate,
        overdueMaintenance: overdueSchedules?.length || 0,
        upcomingMaintenance: upcomingSchedules?.length || 0,
        improvingTrend,
        decliningTrend,
        stableTrend,
      };
    },
    enabled: !!user && !!profile?.tenant_id,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useAtRiskAssets(limit = 10) {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['at-risk-assets', profile?.tenant_id, limit],
    queryFn: async (): Promise<AtRiskAsset[]> => {
      if (!profile?.tenant_id) {
        throw new Error('No tenant ID available');
      }

      const { data, error } = await supabase
        .from('asset_health_scores')
        .select(`
          id,
          asset_id,
          score,
          risk_level,
          trend,
          days_until_predicted_failure,
          maintenance_compliance_pct,
          hsse_assets!inner(id, name, asset_code)
        `)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .in('risk_level', ['critical', 'high'])
        .order('score', { ascending: true })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.id,
        assetId: item.asset_id,
        assetName: item.hsse_assets?.name || 'Unknown Asset',
        assetCode: item.hsse_assets?.asset_code || '',
        score: item.score,
        riskLevel: item.risk_level,
        trend: item.trend,
        daysUntilFailure: item.days_until_predicted_failure,
        maintenanceCompliance: item.maintenance_compliance_pct,
      }));
    },
    enabled: !!user && !!profile?.tenant_id,
    staleTime: 5 * 60 * 1000,
  });
}
