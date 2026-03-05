import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMyReportingStats } from './use-my-reporting-stats';
import { useTranslation } from 'react-i18next';

export interface AIInsight {
  id: string;
  title: string;
  description: string;
  type: 'tip' | 'achievement' | 'suggestion';
  icon: string;
}

export function useAIDashboardInsights() {
  const { isAuthenticated, user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useMyReportingStats();
  const { i18n } = useTranslation();

  return useQuery({
    queryKey: ['ai-dashboard-insights', user?.id, stats?.my_incidents, stats?.my_observations],
    queryFn: async () => {
      if (!stats) return [];

      const { data, error } = await supabase.functions.invoke('dashboard-ai-insights', {
        body: {
          stats,
          language: i18n.language,
        },
      });

      if (error) {
        console.error('Error fetching AI insights:', error);
        // Return fallback insights on error
        return getFallbackInsights(stats, i18n.language);
      }

      return data?.insights || getFallbackInsights(stats, i18n.language);
    },
    enabled: isAuthenticated && !!user?.id && !!stats && !statsLoading,
    staleTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    gcTime: 7 * 24 * 60 * 60 * 1000, // Keep in cache for 7 days
  });
}

function getFallbackInsights(stats: { my_incidents: number; my_observations: number; percentile: number; trend_observations: number; completed_actions: number }, language: string): AIInsight[] {
  const isArabic = language === 'ar';
  const insights: AIInsight[] = [];

  // Generate contextual fallback insights based on stats
  if (stats.my_observations > stats.my_incidents * 2) {
    insights.push({
      id: 'observation-focused',
      title: isArabic ? 'مراقب ممتاز!' : 'Great Observer!',
      description: isArabic
        ? 'ملاحظاتك تساعد في منع الحوادث قبل وقوعها. استمر!'
        : 'Your observations help prevent incidents before they happen. Keep it up!',
      type: 'achievement',
      icon: 'Eye',
    });
  }

  if (stats.percentile >= 75) {
    insights.push({
      id: 'top-performer',
      title: isArabic ? 'أداء متميز' : 'Top Performer',
      description: isArabic
        ? `أنت في أعلى ${100 - stats.percentile}% من المبلغين في شركتك`
        : `You're in the top ${100 - stats.percentile}% of reporters in your company`,
      type: 'achievement',
      icon: 'Trophy',
    });
  }

  if (stats.trend_observations > 0) {
    insights.push({
      id: 'trend-up',
      title: isArabic ? 'تحسن ملحوظ' : 'Improvement Trend',
      description: isArabic
        ? `زيادة ${stats.trend_observations} ملاحظات مقارنة بالشهر الماضي`
        : `${stats.trend_observations} more observations than last month`,
      type: 'tip',
      icon: 'TrendingUp',
    });
  }

  if (stats.completed_actions > 0) {
    insights.push({
      id: 'actions-complete',
      title: isArabic ? 'إنجاز الإجراءات' : 'Actions Completed',
      description: isArabic
        ? `أكملت ${stats.completed_actions} إجراء تصحيحي`
        : `You've completed ${stats.completed_actions} corrective actions`,
      type: 'achievement',
      icon: 'CheckCircle',
    });
  }

  // Always include a tip
  if (insights.length < 2) {
    insights.push({
      id: 'near-miss-tip',
      title: isArabic ? 'نصيحة السلامة' : 'Safety Tip',
      description: isArabic
        ? 'الإبلاغ عن الحوادث الوشيكة يساعد في منع الحوادث الكبيرة'
        : 'Reporting near-misses helps prevent major incidents',
      type: 'tip',
      icon: 'Lightbulb',
    });
  }

  return insights.slice(0, 3);
}
