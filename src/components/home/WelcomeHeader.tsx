import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Clock } from 'lucide-react';
import { useCachedProfile } from '@/hooks/use-cached-profile';
import { Skeleton } from '@/components/ui/skeleton';

export function WelcomeHeader() {
  const { t, i18n } = useTranslation();
  const { data: profile, isLoading } = useCachedProfile();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const firstName = profile?.full_name?.split(' ')[0] || '';
  const branchName = profile?.branches?.name;
  const siteName = profile?.sites?.name;
  const locationDisplay = [branchName, siteName].filter(Boolean).join(' - ');

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-5 w-40" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Welcome message */}
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
        {t('home.welcome')}, {firstName} 👋
      </h1>

      {/* Date & Time */}
      <div className="flex items-center gap-2 text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span className="text-sm sm:text-base">
          {formatDate(currentTime)} • {formatTime(currentTime)}
        </span>
      </div>

      {/* Location */}
      {locationDisplay && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span className="text-sm sm:text-base">{locationDisplay}</span>
        </div>
      )}
    </div>
  );
}
