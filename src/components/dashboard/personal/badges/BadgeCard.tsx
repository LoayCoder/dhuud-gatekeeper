import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { icons, Lock, Shield, FileText, CheckCircle, Award, Star, CalendarCheck, ClipboardList, Eye, Flag, AlertTriangle } from 'lucide-react';
import type { EarnedBadge, AvailableBadge } from '@/hooks/use-my-badges';

interface BadgeCardProps {
  badge: EarnedBadge | AvailableBadge;
  earned?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  showDetails?: boolean;
  onClick?: () => void;
}

// Professional tier styles - muted, enterprise-grade
const tierStyles = {
  bronze: {
    bg: 'bg-stone-50 dark:bg-stone-900/40',
    border: 'border-stone-200 dark:border-stone-700',
    iconBg: 'bg-stone-100 dark:bg-stone-800',
    icon: 'text-stone-600 dark:text-stone-400',
    accent: 'text-stone-500 dark:text-stone-400',
    tierText: 'text-stone-600 dark:text-stone-400',
  },
  silver: {
    bg: 'bg-slate-50 dark:bg-slate-900/40',
    border: 'border-slate-200 dark:border-slate-700',
    iconBg: 'bg-slate-100 dark:bg-slate-800',
    icon: 'text-slate-600 dark:text-slate-400',
    accent: 'text-slate-500 dark:text-slate-400',
    tierText: 'text-slate-600 dark:text-slate-400',
  },
  gold: {
    bg: 'bg-amber-50/70 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    iconBg: 'bg-amber-100 dark:bg-amber-900/50',
    icon: 'text-amber-700 dark:text-amber-400',
    accent: 'text-amber-600 dark:text-amber-400',
    tierText: 'text-amber-700 dark:text-amber-400',
  },
  platinum: {
    bg: 'bg-indigo-50/70 dark:bg-indigo-950/30',
    border: 'border-indigo-200 dark:border-indigo-800',
    iconBg: 'bg-indigo-100 dark:bg-indigo-900/50',
    icon: 'text-indigo-700 dark:text-indigo-400',
    accent: 'text-indigo-600 dark:text-indigo-400',
    tierText: 'text-indigo-700 dark:text-indigo-400',
  },
};

// Professional icon mapping
const professionalIcons: Record<string, React.ElementType> = {
  Shield: Shield,
  Eye: Eye,
  AlertTriangle: AlertTriangle,
  FileText: FileText,
  ClipboardList: ClipboardList,
  CheckCircle: CheckCircle,
  CalendarCheck: CalendarCheck,
  Award: Award,
  Star: Star,
  Flag: Flag,
};

const sizeClasses = {
  xs: { container: 'w-10 h-10', icon: 14, wrapper: 'gap-0.5', text: 'text-[8px]', padding: 'p-1.5' },
  sm: { container: 'w-12 h-12', icon: 18, wrapper: 'gap-1', text: 'text-[10px]', padding: 'p-2' },
  md: { container: 'w-14 h-14', icon: 22, wrapper: 'gap-1.5', text: 'text-xs', padding: 'p-2.5' },
  lg: { container: 'w-18 h-18', icon: 28, wrapper: 'gap-2', text: 'text-sm', padding: 'p-3' },
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
  
  // Get icon - prefer professional icons, fall back to lucide
  const IconComponent = professionalIcons[badge.icon_name as keyof typeof professionalIcons] 
    || icons[badge.icon_name as keyof typeof icons] 
    || Award;
  
  const isEarned = earned || 'earned_at' in badge;
  const isNew = 'is_new' in badge && badge.is_new;
  const progress = 'progress' in badge ? badge.progress : 100;
  const tier = tierStyles[badge.tier] || tierStyles.bronze;
  const sizeConfig = sizeClasses[size];

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex flex-col items-center rounded-xl transition-all duration-200',
        sizeConfig.wrapper,
        sizeConfig.padding,
        'hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        !isEarned && 'opacity-60'
      )}
    >
      {/* NEW indicator - subtle dot */}
      {isNew && (
        <div className="absolute -top-0.5 end-0 z-10">
          <span className="flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
        </div>
      )}

      {/* Professional Badge Container */}
      <div className="relative">
        {/* Clean circular/rounded badge */}
        <div
          className={cn(
            'relative flex items-center justify-center rounded-xl',
            'border transition-all duration-200',
            sizeConfig.container,
            isEarned ? [
              tier.bg,
              tier.border,
              'group-hover:shadow-md group-hover:scale-105'
            ] : [
              'bg-muted/60 border-dashed border-muted-foreground/30',
              'dark:bg-muted/30'
            ]
          )}
        >
          {/* Icon */}
          <div className={cn(
            'flex items-center justify-center rounded-lg',
            isEarned ? tier.iconBg : 'bg-transparent'
          )}>
            {isEarned ? (
              <IconComponent 
                size={sizeConfig.icon} 
                className={cn(tier.icon)}
                strokeWidth={1.75}
              />
            ) : (
              <Lock 
                size={sizeConfig.icon * 0.7} 
                className="text-muted-foreground/50"
                strokeWidth={1.5}
              />
            )}
          </div>
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
              strokeWidth="2"
              className="text-muted/40"
            />
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray={`${progress * 2.89} 289`}
              strokeLinecap="round"
              className="text-primary/60"
            />
          </svg>
        )}

        {/* Subtle tier indicator */}
        {isEarned && size !== 'xs' && (
          <div className={cn(
            'absolute -bottom-1 start-1/2 -translate-x-1/2 rtl:translate-x-1/2',
            'px-1.5 py-0 rounded text-[7px] font-medium uppercase tracking-wide',
            'bg-background border shadow-sm',
            tier.tierText
          )}>
            {badge.tier}
          </div>
        )}
      </div>

      {/* Badge Name */}
      {showDetails && (
        <span className={cn(
          'font-medium text-center line-clamp-2 max-w-[72px] leading-tight mt-1.5',
          sizeConfig.text,
          isEarned ? 'text-foreground' : 'text-muted-foreground'
        )}>
          {name}
        </span>
      )}

      {/* Points */}
      {showDetails && (
        <span className={cn(
          'font-semibold tabular-nums',
          sizeConfig.text,
          tier.accent
        )}>
          +{badge.points}
        </span>
      )}

      {/* Earned date */}
      {showDetails && 'earned_at' in badge && badge.earned_at && (
        <span className={cn('text-muted-foreground', sizeConfig.text)}>
          {format(new Date(badge.earned_at), 'MMM d', { 
            locale: isRTL ? ar : enUS 
          })}
        </span>
      )}

      {/* Progress for locked badges */}
      {showDetails && !isEarned && 'current' in badge && 'threshold' in badge && (
        <span className={cn('text-muted-foreground tabular-nums', sizeConfig.text)}>
          {badge.current}/{badge.threshold}
        </span>
      )}
    </button>
  );
}
