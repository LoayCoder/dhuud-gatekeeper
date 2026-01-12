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
    bg: 'bg-card hover:bg-destructive/5 dark:hover:bg-destructive/10',
    iconBg: 'bg-destructive/10 dark:bg-destructive/20',
    iconColor: 'text-destructive',
    hoverBg: 'group-hover:bg-destructive/15 dark:group-hover:bg-destructive/25',
  },
  warning: {
    bg: 'bg-card hover:bg-warning/5 dark:hover:bg-warning/10',
    iconBg: 'bg-warning/10 dark:bg-warning/20',
    iconColor: 'text-warning',
    hoverBg: 'group-hover:bg-warning/15 dark:group-hover:bg-warning/25',
  },
  info: {
    bg: 'bg-card hover:bg-info/5 dark:hover:bg-info/10',
    iconBg: 'bg-info/10 dark:bg-info/20',
    iconColor: 'text-info',
    hoverBg: 'group-hover:bg-info/15 dark:group-hover:bg-info/25',
  },
  success: {
    bg: 'bg-card hover:bg-success/5 dark:hover:bg-success/10',
    iconBg: 'bg-success/10 dark:bg-success/20',
    iconColor: 'text-success',
    hoverBg: 'group-hover:bg-success/15 dark:group-hover:bg-success/25',
  },
  primary: {
    bg: 'bg-card hover:bg-primary/5 dark:hover:bg-primary/10',
    iconBg: 'bg-primary/10 dark:bg-primary/20',
    iconColor: 'text-primary',
    hoverBg: 'group-hover:bg-primary/15 dark:group-hover:bg-primary/25',
  },
  default: {
    bg: 'bg-card hover:bg-muted/50',
    iconBg: 'bg-muted',
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
