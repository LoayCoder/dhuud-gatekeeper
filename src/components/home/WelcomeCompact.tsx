import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCachedProfile } from '@/hooks/use-cached-profile';
import { Skeleton } from '@/components/ui/skeleton';

export function WelcomeCompact() {
  const { t, i18n } = useTranslation();
  const { data: profile, isLoading } = useCachedProfile();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const firstName = profile?.full_name?.split(' ')[0] || '';

  if (isLoading) {
    return <Skeleton className="h-5 w-32" />;
  }

  return (
    <div className="text-end">
      <p className="text-sm font-medium text-foreground">
        {t('home.welcome')}, {firstName} 👋
      </p>
      <p className="text-xs text-muted-foreground">
        {formatDate(currentTime)} • {formatTime(currentTime)}
      </p>
    </div>
  );
}
