import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCachedProfile } from '@/hooks/use-cached-profile';
import { useVersionInfo } from '@/hooks/use-version-info';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface WelcomeCompactProps {
  className?: string;
}

export function WelcomeCompact({ className }: WelcomeCompactProps) {
  const { t, i18n } = useTranslation();
  const { data: profile, isLoading } = useCachedProfile();
  const { version, publishedAt, isLoading: isVersionLoading } = useVersionInfo();
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

  const formatPublishedAt = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    // Use Saudi Arabia timezone (Asia/Riyadh)
    const datePart = date.toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'Asia/Riyadh',
    });
    const timePart = date.toLocaleTimeString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Riyadh',
    });
    return `${datePart} ${timePart}`;
  };

  const firstName = profile?.full_name?.split(' ')[0] || '';

  if (isLoading) {
    return <Skeleton className="h-5 w-32" />;
  }

  return (
    <div className={cn("text-end", className)}>
      <p className="text-sm font-medium text-foreground">
        {t('home.welcome')}, {firstName} 👋
      </p>
      <p className="text-xs text-muted-foreground">
        {formatDate(currentTime)} • {formatTime(currentTime)}
      </p>
      {!isVersionLoading && version && (
        <p className="text-xs text-muted-foreground/70">
          v{version} {publishedAt && `• ${formatPublishedAt(publishedAt)}`}
        </p>
      )}
    </div>
  );
}
