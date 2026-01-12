import { useEffect } from 'react';
import { BadgeShowcase } from './badges/BadgeShowcase';
import { useCheckBadges } from '@/hooks/use-my-badges';
import { useBadgeNotifications } from '@/hooks/use-badge-notifications';

export function MyBadgesSection() {
  const { mutate: checkBadges } = useCheckBadges();
  
  // Subscribe to realtime badge notifications
  useBadgeNotifications();

  // Check for new badges on mount
  useEffect(() => {
    checkBadges();
  }, [checkBadges]);

  return <BadgeShowcase />;
}
