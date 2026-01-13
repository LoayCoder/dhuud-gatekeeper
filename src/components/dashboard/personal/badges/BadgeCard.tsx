import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { icons, Check, Circle } from 'lucide-react';
import { Badge as BadgePill } from '@/components/ui/badge';
import type { EarnedBadge, AvailableBadge } from '@/hooks/use-my-badges';
import { Progress } from '@/components/ui/progress';

interface BadgeCardProps {
  badge: EarnedBadge | AvailableBadge;
  earned?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  showDetails?: boolean;
  onClick?: () => void;
}

// Enterprise-grade muted tier colors
const tierStyles = {
  bronze: {
    bg: 'bg-muted/50',
    border: 'border-border',
    icon: 'text-muted-foreground',
    label: 'text-muted-foreground',
    badge: 'bg-muted text-muted-foreground',
  },
  silver: {
    bg: 'bg-muted/60',
    border: 'border-border',
    icon: 'text-foreground/70',
    label: 'text-foreground/70',
    badge: 'bg-secondary text-secondary-foreground',
  },
  gold: {
    bg: 'bg-muted/70',
    border: 'border-border',
    icon: 'text-foreground/80',
    label: 'text-foreground/80',
    badge: 'bg-secondary text-secondary-foreground',
  },
  platinum: {
    bg: 'bg-muted/80',
    border: 'border-border',
    icon: 'text-foreground',
    label: 'text-foreground',
    badge: 'bg-primary/10 text-primary',
  },
};

const sizeClasses = {
  xs: { container: 'p-2', icon: 14, text: 'text-xs', gap: 'gap-1.5' },
  sm: { container: 'p-3', icon: 16, text: 'text-xs', gap: 'gap-2' },
  md: { container: 'p-4', icon: 18, text: 'text-sm', gap: 'gap-3' },
  lg: { container: 'p-5', icon: 20, text: 'text-sm', gap: 'gap-3' },
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
  const description = isRTL && badge.description_ar ? badge.description_ar : badge.description;
  const IconComponent = icons[badge.icon_name as keyof typeof icons] || icons.Circle;
  
  const isEarned = earned || 'earned_at' in badge;
  const progress = 'progress' in badge ? badge.progress : 100;
  const tier = tierStyles[badge.tier] || tierStyles.bronze;
  const sizeConfig = sizeClasses[size];

  return (
    <div
      role={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'relative flex flex-col rounded-lg border transition-colors',
        tier.bg,
        tier.border,
        sizeConfig.container,
        sizeConfig.gap,
        onClick && 'cursor-pointer hover:bg-muted/80',
        !isEarned && 'opacity-60'
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className={cn(
            'flex items-center justify-center rounded-md border',
            'h-9 w-9 bg-background',
            tier.border
          )}>
            <IconComponent 
              size={sizeConfig.icon} 
              className={tier.icon}
              strokeWidth={1.5}
            />
          </div>
          
          {/* Name and tier */}
          {showDetails && (
            <div className="min-w-0">
              <p className={cn('font-medium truncate', sizeConfig.text, tier.label)}>
                {name}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn('text-xs capitalize text-muted-foreground')}>
                  {badge.tier}
                </span>
                {isEarned && (
                  <Check className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Points */}
        {showDetails && (
          <span className={cn('text-xs tabular-nums text-muted-foreground')}>
            {badge.points} pts
          </span>
        )}
      </div>

      {/* Description */}
      {showDetails && description && (
        <p className="text-xs text-muted-foreground line-clamp-2">
          {description}
        </p>
      )}

      {/* Progress for unearned badges */}
      {!isEarned && showProgress && 'current' in badge && 'threshold' in badge && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t('common.progress', 'Progress')}</span>
            <span className="tabular-nums">{badge.current}/{badge.threshold}</span>
          </div>
          <Progress value={progress} className="h-1" />
        </div>
      )}

      {/* Earned date */}
      {showDetails && 'earned_at' in badge && badge.earned_at && (
        <p className="text-xs text-muted-foreground">
          {t('badges.earned', 'Earned')} {format(new Date(badge.earned_at), 'MMM d, yyyy', { 
            locale: isRTL ? ar : enUS 
          })}
        </p>
      )}
    </div>
  );
}
