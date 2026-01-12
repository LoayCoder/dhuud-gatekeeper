import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

export interface HSEMessage {
  id: string;
  title: string;
  title_ar: string | null;
  message: string;
  message_ar: string | null;
  icon_name: string | null;
  color_scheme: 'info' | 'warning' | 'success' | 'danger';
  display_from: string;
  display_until: string;
  priority: number;
}

export function useHSEMessages() {
  const { isAuthenticated } = useAuth();
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  return useQuery({
    queryKey: ['hse-weekly-messages'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('hse_weekly_messages')
        .select('id, title, title_ar, message, message_ar, icon_name, color_scheme, display_from, display_until, priority')
        .eq('is_active', true)
        .is('deleted_at', null)
        .lte('display_from', today)
        .gte('display_until', today)
        .order('priority', { ascending: false })
        .order('display_from', { ascending: false });

      if (error) {
        console.error('Error fetching HSE messages:', error);
        throw error;
      }

      // Transform to use correct language
      return (data || []).map((msg) => ({
        ...msg,
        displayTitle: isArabic && msg.title_ar ? msg.title_ar : msg.title,
        displayMessage: isArabic && msg.message_ar ? msg.message_ar : msg.message,
      }));
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
}
