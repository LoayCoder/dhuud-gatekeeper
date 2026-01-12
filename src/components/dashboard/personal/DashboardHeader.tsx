import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

export function DashboardHeader() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const isArabic = i18n.language === 'ar';
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = profile?.full_name?.split(' ')[0] || '';
    
    if (hour < 12) {
      return t('dashboard.greetingMorning', 'Good morning{{name}}', { name: name ? `, ${name}` : '' });
    } else if (hour < 17) {
      return t('dashboard.greetingAfternoon', 'Good afternoon{{name}}', { name: name ? `, ${name}` : '' });
    } else {
      return t('dashboard.greetingEvening', 'Good evening{{name}}', { name: name ? `, ${name}` : '' });
    }
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const currentDate = format(new Date(), 'EEEE, MMMM d', { 
    locale: isArabic ? ar : enUS 
  });

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14 border-2 border-primary/20">
          <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || ''} />
          <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
            {getInitials(profile?.full_name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {getGreeting()} 👋
          </h1>
          <p className="text-muted-foreground text-sm">
            {currentDate}
          </p>
        </div>
      </div>
    </div>
  );
}
