import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATUS_VARIANTS, type StatusVariant } from '@/styles/design-tokens';

/**
 * StatusBadge - Unified semantic status indicator
 * 
 * Status types and their meanings:
 * - informational: Soft Blue - General info, active states
 * - pending: Soft Orange - Awaiting action, warnings
 * - critical: Soft Red - Urgent, overdue, danger
 * - completed: Soft Green - Done, success, approved
 * - neutral: Gray - Draft, cancelled, default
 */

export type StatusType = StatusVariant;

interface StatusBadgeProps {
  /** Status type determines the color scheme */
  status: StatusType;
  /** Badge content */
  children: React.ReactNode;
  /** Optional icon */
  icon?: LucideIcon;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional className */
  className?: string;
  /** Make it a dot indicator only */
  dotOnly?: boolean;
}

const sizeClasses = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-xs px-2 py-1',
  lg: 'text-sm px-2.5 py-1',
};

const dotSizeClasses = {
  sm: 'h-1.5 w-1.5',
  md: 'h-2 w-2',
  lg: 'h-2.5 w-2.5',
};

const iconSizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
  lg: 'h-4 w-4',
};

export function StatusBadge({
  status,
  children,
  icon: Icon,
  size = 'md',
  className,
  dotOnly = false,
}: StatusBadgeProps) {
  const variant = STATUS_VARIANTS[status];

  if (dotOnly) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5',
          className
        )}
      >
        <span
          className={cn(
            'rounded-full flex-shrink-0',
            dotSizeClasses[size],
            status === 'informational' && 'bg-info',
            status === 'pending' && 'bg-warning',
            status === 'critical' && 'bg-destructive',
            status === 'completed' && 'bg-success',
            status === 'neutral' && 'bg-muted-foreground'
          )}
        />
        <span className="text-foreground">{children}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border font-medium',
        sizeClasses[size],
        variant.badge,
        className
      )}
    >
      {Icon && <Icon className={cn(iconSizeClasses[size], 'flex-shrink-0')} />}
      {children}
    </span>
  );
}

/**
 * StatusDot - Simple dot indicator for inline status
 */
interface StatusDotProps {
  status: StatusType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  pulse?: boolean;
}

export function StatusDot({
  status,
  size = 'md',
  className,
  pulse = false,
}: StatusDotProps) {
  return (
    <span
      className={cn(
        'inline-block rounded-full flex-shrink-0',
        dotSizeClasses[size],
        status === 'informational' && 'bg-info',
        status === 'pending' && 'bg-warning',
        status === 'critical' && 'bg-destructive',
        status === 'completed' && 'bg-success',
        status === 'neutral' && 'bg-muted-foreground',
        pulse && 'animate-pulse',
        className
      )}
    />
  );
}

export default StatusBadge;
