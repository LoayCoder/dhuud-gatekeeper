import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useCelebration } from './use-celebration';
import type { Badge } from './use-my-badges';

interface NewBadgeEvent {
  badge: Badge;
}

export function useBadgeNotifications() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [newBadges, setNewBadges] = useState<Badge[]>([]);
  const { celebrateBadge } = useCelebration();
  const isRTL = i18n.language === 'ar';

  const showBadgeToast = useCallback((badge: Badge) => {
    const name = isRTL && badge.name_ar ? badge.name_ar : badge.name;
    
    toast.success(
      t('dashboard.badges.newBadge', 'New Badge Earned!'),
      {
        description: t('dashboard.badges.congratulations', 
          'Congratulations! You\'ve earned the {{badge}} badge!', 
          { badge: name }
        ),
        duration: 5000,
        icon: '🏆',
      }
    );
    
    // Trigger celebration animation with confetti and sound
    celebrateBadge({ intensity: badge.tier === 'platinum' ? 'high' : badge.tier === 'gold' ? 'medium' : 'low' });
  }, [t, isRTL, celebrateBadge]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`user-badges-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_badges',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          // Fetch the badge details
          const { data: badgeData } = await (supabase as unknown)
            .from('badge_definitions')
            .select('*')
            .eq('id', payload.new.badge_id)
            .single();

          if (badgeData) {
            const badge: Badge = {
              id: badgeData.id,
              badge_key: badgeData.badge_key,
              name: badgeData.name,
              name_ar: badgeData.name_ar,
              description: badgeData.description,
              description_ar: badgeData.description_ar,
              icon_name: badgeData.icon_name,
              color_scheme: badgeData.color_scheme,
              category: badgeData.category,
              tier: badgeData.tier,
              points: badgeData.points,
            };

            setNewBadges((prev) => [...prev, badge]);
            showBadgeToast(badge);
            queryClient.invalidateQueries({ queryKey: ['my-badges'] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient, showBadgeToast]);

  const clearNewBadges = useCallback(() => {
    setNewBadges([]);
  }, []);

  return {
    newBadges,
    clearNewBadges,
  };
}
