import React from 'react';
import { LucideIcon, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge, type StatusType } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';

/**
 * ActionSummaryCard - Core card pattern for the HSSE system
 * 
 * Design principles:
 * - One message (title + optional description)
 * - One status indicator (badge or icon)
 * - One action (button or link)
 * - Horizontal layout with soft background tint
 * - No stacked badges or dense content
 */

interface ActionSummaryCardProps {
  /** Main title/message */
  title: string;
  /** Optional description */
  description?: string;
  /** Status type for the badge */
  status?: StatusType;
  /** Status label text */
  statusLabel?: string;
  /** Custom status icon */
  statusIcon?: LucideIcon;
  /** Left icon */
  icon?: LucideIcon;
  /** Icon background color class */
  iconBgClass?: string;
  /** Icon color class */
  iconColorClass?: string;
  /** Action button label */
  actionLabel?: string;
  /** Action callback */
  onAction?: () => void;
  /** Make the entire card clickable */
  onClick?: () => void;
  /** Additional metadata to display */
  metadata?: string;
  /** Value/count to display prominently */
  value?: string | number;
  /** Value suffix (e.g., "days", "items") */
  valueSuffix?: string;
  /** Additional className */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

export function ActionSummaryCard({
  title,
  description,
  status,
  statusLabel,
  statusIcon,
  icon: Icon,
  iconBgClass = 'bg-primary/10',
  iconColorClass = 'text-primary',
  actionLabel,
  onAction,
  onClick,
  metadata,
  value,
  valueSuffix,
  className,
  disabled = false,
}: ActionSummaryCardProps) {
  const isClickable = !!onClick && !disabled;
  const hasAction = !!actionLabel && !!onAction;

  const cardContent = (
    <>
      {/* Left Section: Icon + Content */}
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {Icon && (
          <div className={cn('flex-shrink-0 p-2 rounded-lg', iconBgClass)}>
            <Icon className={cn('h-5 w-5', iconColorClass)} />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-medium text-foreground truncate">
              {title}
            </h3>
            {status && statusLabel && (
              <StatusBadge status={status} icon={statusIcon}>
                {statusLabel}
              </StatusBadge>
            )}
          </div>
          
          {description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {description}
            </p>
          )}
          
          {metadata && (
            <p className="text-xs text-muted-foreground mt-1">
              {metadata}
            </p>
          )}
        </div>
      </div>

      {/* Right Section: Value + Action */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {value !== undefined && (
          <div className="text-end">
            <span className="text-lg font-semibold text-foreground">{value}</span>
            {valueSuffix && (
              <span className="text-xs text-muted-foreground ms-1">{valueSuffix}</span>
            )}
          </div>
        )}
        
        {hasAction && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onAction();
            }}
            disabled={disabled}
            className="flex-shrink-0"
          >
            {actionLabel}
            <ChevronRight className="h-4 w-4 ms-1 rtl:rotate-180" />
          </Button>
        )}
        
        {isClickable && !hasAction && (
          <ChevronRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
        )}
      </div>
    </>
  );

  const baseClasses = cn(
    'flex items-center justify-between gap-4 p-4',
    'rounded-lg border bg-card shadow-sm',
    'transition-all duration-200',
    isClickable && 'cursor-pointer hover:shadow-md hover:border-primary/20',
    disabled && 'opacity-50 cursor-not-allowed',
    className
  );

  if (isClickable) {
    return (
      <button
        type="button"
        className={cn(baseClasses, 'w-full text-start')}
        onClick={onClick}
        disabled={disabled}
      >
        {cardContent}
      </button>
    );
  }

  return (
    <div className={baseClasses}>
      {cardContent}
    </div>
  );
}

export default ActionSummaryCard;
