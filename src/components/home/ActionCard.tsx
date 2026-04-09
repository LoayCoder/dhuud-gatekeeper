import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CardColorScheme } from '@/config/home-actions';

interface ActionCardProps {
  labelKey: string;
  descriptionKey?: string;
  icon: LucideIcon;
  path: string;
  colorScheme: CardColorScheme;
}

const colorSchemeStyles: Record<CardColorScheme, {
  bg: string;
  iconBg: string;
  iconColor: string;
  hoverBg: string;
}> = {
  danger: {
    bg: 'bg-card border-s-4 border-s-destructive/70 dark:border-s-destructive dark:bg-destructive/5 hover:bg-destructive/5 dark:hover:bg-destructive/10',
    iconBg: 'bg-destructive/15 dark:bg-destructive/25',
    iconColor: 'text-destructive',
    hoverBg: 'group-hover:bg-destructive/20 dark:group-hover:bg-destructive/35',
  },
  warning: {
    bg: 'bg-card border-s-4 border-s-warning/70 dark:border-s-warning dark:bg-warning/5 hover:bg-warning/5 dark:hover:bg-warning/10',
    iconBg: 'bg-warning/15 dark:bg-warning/25',
    iconColor: 'text-warning',
    hoverBg: 'group-hover:bg-warning/20 dark:group-hover:bg-warning/35',
  },
  info: {
    bg: 'bg-card border-s-4 border-s-info/70 dark:border-s-info dark:bg-info/5 hover:bg-info/5 dark:hover:bg-info/10',
    iconBg: 'bg-info/15 dark:bg-info/25',
    iconColor: 'text-info',
    hoverBg: 'group-hover:bg-info/20 dark:group-hover:bg-info/35',
  },
  success: {
    bg: 'bg-card border-s-4 border-s-success/70 dark:border-s-success dark:bg-success/5 hover:bg-success/5 dark:hover:bg-success/10',
    iconBg: 'bg-success/15 dark:bg-success/25',
    iconColor: 'text-success',
    hoverBg: 'group-hover:bg-success/20 dark:group-hover:bg-success/35',
  },
  primary: {
    bg: 'bg-card border-s-4 border-s-primary/70 dark:border-s-primary dark:bg-primary/5 hover:bg-primary/5 dark:hover:bg-primary/10',
    iconBg: 'bg-primary/15 dark:bg-primary/25',
    iconColor: 'text-primary',
    hoverBg: 'group-hover:bg-primary/20 dark:group-hover:bg-primary/35',
  },
  default: {
    bg: 'bg-card border-s-4 border-s-muted-foreground/30 dark:border-s-muted-foreground/50 hover:bg-muted/50',
    iconBg: 'bg-muted dark:bg-muted/80',
    iconColor: 'text-muted-foreground',
    hoverBg: 'group-hover:bg-muted/80',
  },
};

export function ActionCard({
  labelKey,
  icon: Icon,
  path,
  colorScheme,
}: ActionCardProps) {
  const { t } = useTranslation();
  const styles = colorSchemeStyles[colorScheme];

  return (
    <Link
      to={path}
      className={cn(
        'group relative flex flex-col items-center justify-center gap-3 p-4',
        'rounded-xl border border-border/50 shadow-sm',
        'transition-all duration-200 ease-out',
        'hover:shadow-md hover:border-border',
        'active:scale-[0.98]',
        'touch-action-manipulation select-none',
        'min-h-[120px] sm:min-h-[140px]',
        styles.bg
      )}
    >
      {/* Icon container */}
      <div
        className={cn(
          'flex items-center justify-center',
          'w-12 h-12 sm:w-14 sm:h-14 rounded-xl',
          'transition-colors duration-200',
          styles.iconBg,
          styles.hoverBg
        )}
      >
        <Icon className={cn('w-6 h-6 sm:w-7 sm:h-7', styles.iconColor)} />
      </div>

      {/* Label */}
      <span className="text-sm sm:text-base font-medium text-foreground text-center leading-tight">
        {t(labelKey)}
      </span>
    </Link>
  );
}
