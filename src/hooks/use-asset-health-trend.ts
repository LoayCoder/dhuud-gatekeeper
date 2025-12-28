import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays } from 'date-fns';

export interface HealthTrendDataPoint {
  date: string;
  label: string;
  averageScore: number;
  assetCount: number;
}

export function useHealthTrendData(days = 7) {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['health-trend-data', profile?.tenant_id, days],
    queryFn: async (): Promise<HealthTrendDataPoint[]> => {
      if (!profile?.tenant_id) {
        throw new Error('No tenant ID available');
      }

      // Get the date range
      const endDate = new Date();
      const startDate = subDays(endDate, days - 1);

      // Fetch all health scores with their updated_at timestamps
      const { data: healthScores, error } = await supabase
        .from('asset_health_scores')
        .select('score, last_calculated_at')
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .gte('last_calculated_at', startDate.toISOString())
        .order('last_calculated_at', { ascending: true });

      if (error) throw error;

      // Group by date and calculate daily averages
      const dailyScores: Record<string, number[]> = {};

      // Initialize all days in range
      for (let i = 0; i < days; i++) {
        const date = format(subDays(endDate, days - 1 - i), 'yyyy-MM-dd');
        dailyScores[date] = [];
      }

      // Add scores to their respective days
      (healthScores || []).forEach(item => {
        const date = format(new Date(item.last_calculated_at), 'yyyy-MM-dd');
        if (dailyScores[date]) {
          dailyScores[date].push(item.score);
        }
      });

      // If no recent data, get current scores for today
      if (Object.values(dailyScores).every(arr => arr.length === 0)) {
        const { data: currentScores } = await supabase
          .from('asset_health_scores')
          .select('score')
          .eq('tenant_id', profile.tenant_id)
          .is('deleted_at', null);

        const today = format(new Date(), 'yyyy-MM-dd');
        if (currentScores && currentScores.length > 0) {
          // Spread current score across all days for baseline
          Object.keys(dailyScores).forEach(date => {
            dailyScores[date] = currentScores.map(s => s.score);
          });
        }
      }

      // Calculate averages and format output
      return Object.entries(dailyScores).map(([date, scores]) => {
        const avg = scores.length > 0 
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 0;
        
        return {
          date,
          label: format(new Date(date), 'MMM d'),
          averageScore: avg,
          assetCount: scores.length,
        };
      });
    },
    enabled: !!user && !!profile?.tenant_id,
    staleTime: 5 * 60 * 1000,
  });
}
