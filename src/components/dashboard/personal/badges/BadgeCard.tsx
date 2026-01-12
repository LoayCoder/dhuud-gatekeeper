import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { icons, Lock } from 'lucide-react';
import { Badge as BadgePill } from '@/components/ui/badge';
import type { EarnedBadge, AvailableBadge } from '@/hooks/use-my-badges';

interface BadgeCardProps {
  badge: EarnedBadge | AvailableBadge;
  earned?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  onClick?: () => void;
}

const tierColors = {
  bronze: 'from-amber-600 to-amber-800',
  silver: 'from-slate-400 to-slate-600',
  gold: 'from-yellow-400 to-yellow-600',
  platinum: 'from-purple-400 to-indigo-600',
};

const tierBgColors = {
  bronze: 'bg-amber-100 dark:bg-amber-900/30',
  silver: 'bg-slate-100 dark:bg-slate-800/50',
  gold: 'bg-yellow-100 dark:bg-yellow-900/30',
  platinum: 'bg-purple-100 dark:bg-purple-900/30',
};

const tierTextColors = {
  bronze: 'text-amber-700 dark:text-amber-400',
  silver: 'text-slate-600 dark:text-slate-300',
  gold: 'text-yellow-700 dark:text-yellow-400',
  platinum: 'text-purple-700 dark:text-purple-400',
};

const sizeClasses = {
  sm: 'w-16 h-16',
  md: 'w-20 h-20',
  lg: 'w-24 h-24',
};

const iconSizes = {
  sm: 24,
  md: 32,
  lg: 40,
};

export function BadgeCard({ 
  badge, 
  earned = false, 
  size = 'md',
  showProgress = true,
  onClick 
}: BadgeCardProps) {
  const { i18n, t } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  const name = isRTL && badge.name_ar ? badge.name_ar : badge.name;
  const description = isRTL && badge.description_ar ? badge.description_ar : badge.description;
  
  // Get the icon component
  const IconComponent = icons[badge.icon_name as keyof typeof icons] || icons.Award;
  
  const isEarned = earned || 'earned_at' in badge;
  const isNew = 'is_new' in badge && badge.is_new;
  const progress = 'progress' in badge ? badge.progress : 100;

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex flex-col items-center gap-2 p-3 rounded-xl transition-all',
        'hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50',
        !isEarned && 'opacity-60'
      )}
    >
      {/* NEW indicator */}
      {isNew && (
        <BadgePill 
          className="absolute -top-1 end-0 text-[10px] px-1.5 py-0 bg-destructive text-destructive-foreground animate-pulse"
        >
          {t('common.new', 'NEW')}
        </BadgePill>
      )}

      {/* Badge Icon */}
      <div
        className={cn(
          'relative rounded-full flex items-center justify-center',
          sizeClasses[size],
          isEarned 
            ? `bg-gradient-to-br ${tierColors[badge.tier]} shadow-lg` 
            : 'bg-muted border-2 border-dashed border-muted-foreground/30'
        )}
      >
        {isEarned ? (
          <IconComponent 
            size={iconSizes[size]} 
            className="text-white drop-shadow-md"
          />
        ) : (
          <Lock 
            size={iconSizes[size] * 0.7} 
            className="text-muted-foreground/50"
          />
        )}

        {/* Progress ring for locked badges */}
        {!isEarned && showProgress && progress > 0 && (
          <svg
            className="absolute inset-0 -rotate-90"
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-primary/30"
            />
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeDasharray={`${progress * 2.89} 289`}
              className="text-primary transition-all duration-500"
            />
          </svg>
        )}
      </div>

      {/* Badge Name */}
      <span className={cn(
        'text-xs font-medium text-center line-clamp-2 max-w-[80px]',
        isEarned ? 'text-foreground' : 'text-muted-foreground'
      )}>
        {name}
      </span>

      {/* Points */}
      <span className={cn(
        'text-[10px] font-semibold',
        tierTextColors[badge.tier]
      )}>
        +{badge.points} {t('dashboard.badges.pts', 'pts')}
      </span>

      {/* Earned date */}
      {'earned_at' in badge && badge.earned_at && (
        <span className="text-[10px] text-muted-foreground">
          {format(new Date(badge.earned_at), 'MMM d', { 
            locale: isRTL ? ar : enUS 
          })}
        </span>
      )}

      {/* Progress text for locked */}
      {!isEarned && 'current' in badge && 'threshold' in badge && (
        <span className="text-[10px] text-muted-foreground">
          {badge.current}/{badge.threshold}
        </span>
      )}
    </button>
  );
}
