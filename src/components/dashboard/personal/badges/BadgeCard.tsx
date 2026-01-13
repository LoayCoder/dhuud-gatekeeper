import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { icons, Lock, Sparkles } from 'lucide-react';
import { Badge as BadgePill } from '@/components/ui/badge';
import type { EarnedBadge, AvailableBadge } from '@/hooks/use-my-badges';

interface BadgeCardProps {
  badge: EarnedBadge | AvailableBadge;
  earned?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  showDetails?: boolean;
  onClick?: () => void;
}

// Premium tier gradients with metallic effects
const tierStyles = {
  bronze: {
    gradient: 'from-amber-600 via-orange-500 to-amber-700',
    glow: 'shadow-amber-500/40',
    border: 'border-amber-400/60',
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950/50 dark:to-orange-900/30',
    ribbon: 'bg-gradient-to-r from-amber-600 to-amber-700',
  },
  silver: {
    gradient: 'from-slate-300 via-gray-100 to-slate-400',
    glow: 'shadow-slate-400/40',
    border: 'border-slate-300/60',
    text: 'text-slate-600 dark:text-slate-300',
    bg: 'bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900/50 dark:to-gray-800/30',
    ribbon: 'bg-gradient-to-r from-slate-500 to-slate-600',
  },
  gold: {
    gradient: 'from-yellow-400 via-amber-300 to-yellow-500',
    glow: 'shadow-yellow-400/50',
    border: 'border-yellow-300/60',
    text: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-950/50 dark:to-amber-900/30',
    ribbon: 'bg-gradient-to-r from-yellow-500 to-amber-500',
  },
  platinum: {
    gradient: 'from-purple-400 via-indigo-300 to-violet-500',
    glow: 'shadow-purple-400/50',
    border: 'border-purple-300/60',
    text: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-purple-950/50 dark:to-indigo-900/30',
    ribbon: 'bg-gradient-to-r from-purple-500 to-indigo-500',
  },
};

const sizeClasses = {
  xs: { container: 'w-12 h-12', icon: 16, wrapper: 'gap-1', text: 'text-[9px]' },
  sm: { container: 'w-14 h-14', icon: 20, wrapper: 'gap-1.5', text: 'text-[10px]' },
  md: { container: 'w-18 h-18', icon: 26, wrapper: 'gap-2', text: 'text-xs' },
  lg: { container: 'w-22 h-22', icon: 32, wrapper: 'gap-2', text: 'text-sm' },
};

export function BadgeCard({ 
  badge, 
  earned = false, 
  size = 'sm',
  showProgress = true,
  showDetails = true,
  onClick 
}: BadgeCardProps) {
  const { i18n, t } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  const name = isRTL && badge.name_ar ? badge.name_ar : badge.name;
  const IconComponent = icons[badge.icon_name as keyof typeof icons] || icons.Award;
  
  const isEarned = earned || 'earned_at' in badge;
  const isNew = 'is_new' in badge && badge.is_new;
  const progress = 'progress' in badge ? badge.progress : 100;
  const tier = tierStyles[badge.tier] || tierStyles.bronze;
  const sizeConfig = sizeClasses[size];

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex flex-col items-center p-2 rounded-xl transition-all duration-300',
        'hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/50',
        sizeConfig.wrapper,
        !isEarned && 'opacity-70 grayscale-[30%]'
      )}
    >
      {/* NEW indicator with sparkle */}
      {isNew && (
        <div className="absolute -top-1 end-0 z-10">
          <BadgePill 
            className={cn(
              'text-[9px] px-1.5 py-0 gap-0.5',
              'bg-gradient-to-r from-rose-500 to-pink-500 text-white border-0',
              'animate-pulse shadow-lg shadow-rose-500/30'
            )}
          >
            <Sparkles className="h-2.5 w-2.5" />
            {t('common.new', 'NEW')}
          </BadgePill>
        </div>
      )}

      {/* Premium Badge Container */}
      <div className="relative">
        {/* Outer glow effect for earned badges */}
        {isEarned && (
          <div className={cn(
            'absolute inset-0 rounded-full blur-md opacity-40 scale-110',
            `bg-gradient-to-br ${tier.gradient}`
          )} />
        )}

        {/* Hexagonal badge frame */}
        <div
          className={cn(
            'relative flex items-center justify-center rounded-2xl',
            'border-2 shadow-lg transition-all duration-300',
            sizeConfig.container,
            isEarned ? [
              `bg-gradient-to-br ${tier.gradient}`,
              tier.border,
              tier.glow,
              'group-hover:shadow-xl group-hover:scale-105'
            ] : [
              'bg-muted/80 border-dashed border-muted-foreground/30',
              'dark:bg-muted/40'
            ]
          )}
          style={{
            clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
          }}
        >
          {/* Inner embossed circle */}
          <div className={cn(
            'absolute inset-1 rounded-xl flex items-center justify-center',
            isEarned 
              ? 'bg-white/20 dark:bg-black/20 shadow-inner' 
              : 'bg-muted/50'
          )}>
            {isEarned ? (
              <IconComponent 
                size={sizeConfig.icon} 
                className="text-white drop-shadow-md"
                strokeWidth={2.5}
              />
            ) : (
              <Lock 
                size={sizeConfig.icon * 0.7} 
                className="text-muted-foreground/60"
              />
            )}
          </div>

          {/* Shimmer effect on hover for earned */}
          {isEarned && (
            <div className={cn(
              'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500',
              'bg-gradient-to-r from-transparent via-white/30 to-transparent',
              '-translate-x-full group-hover:translate-x-full transition-transform duration-700'
            )} />
          )}
        </div>

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
              strokeWidth="3"
              className="text-primary/20"
            />
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${progress * 2.89} 289`}
              strokeLinecap="round"
              className="text-primary transition-all duration-700"
            />
          </svg>
        )}

        {/* Tier ribbon */}
        {isEarned && size !== 'xs' && (
          <div className={cn(
            'absolute -bottom-1.5 start-1/2 -translate-x-1/2 rtl:translate-x-1/2',
            'px-2 py-0.5 rounded-full',
            'text-[8px] font-bold uppercase tracking-wider text-white',
            'shadow-sm',
            tier.ribbon
          )}>
            {badge.tier}
          </div>
        )}
      </div>

      {/* Badge Name */}
      {showDetails && (
        <span className={cn(
          'font-medium text-center line-clamp-2 max-w-[70px] leading-tight mt-1',
          sizeConfig.text,
          isEarned ? 'text-foreground' : 'text-muted-foreground'
        )}>
          {name}
        </span>
      )}

      {/* Points */}
      {showDetails && (
        <span className={cn(
          'font-bold tabular-nums',
          sizeConfig.text,
          tier.text
        )}>
          +{badge.points}
        </span>
      )}

      {/* Earned date or progress */}
      {showDetails && 'earned_at' in badge && badge.earned_at && (
        <span className={cn('text-muted-foreground', sizeConfig.text)}>
          {format(new Date(badge.earned_at), 'MMM d', { 
            locale: isRTL ? ar : enUS 
          })}
        </span>
      )}

      {showDetails && !isEarned && 'current' in badge && 'threshold' in badge && (
        <span className={cn('text-muted-foreground tabular-nums', sizeConfig.text)}>
          {badge.current}/{badge.threshold}
        </span>
      )}
    </button>
  );
}
