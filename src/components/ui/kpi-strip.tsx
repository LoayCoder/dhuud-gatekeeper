import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusDot, type StatusType } from '@/components/ui/status-badge';

/**
 * KPIStrip - Standardized horizontal KPI display
 * 
 * Design principles:
 * - 4-5 KPI blocks maximum
 * - Calm, neutral styling
 * - No alert overload
 * - Click-to-filter functionality (optional)
 */

interface KPIItem {
  /** Unique key for the KPI */
  key: string;
  /** Label for the KPI */
  label: string;
  /** Value to display */
  value: number | string;
  /** Optional icon */
  icon?: LucideIcon;
  /** Status type for color coding */
  status?: StatusType;
  /** Click handler for filtering */
  onClick?: () => void;
  /** Whether this KPI is currently selected/active */
  isActive?: boolean;
  /** Trend indicator (up/down/neutral) */
  trend?: 'up' | 'down' | 'neutral';
  /** Trend value (e.g., "+5%") */
  trendValue?: string;
}

interface KPIStripProps {
  /** Array of KPI items to display */
  items: KPIItem[];
  /** Additional className */
  className?: string;
  /** Compact mode for smaller displays */
  compact?: boolean;
}

export function KPIStrip({ items, className, compact = false }: KPIStripProps) {
  return (
    <div
      className={cn(
        'grid gap-3',
        items.length <= 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
        className
      )}
    >
      {items.map((item) => (
        <KPICard key={item.key} item={item} compact={compact} />
      ))}
    </div>
  );
}

interface KPICardProps {
  item: KPIItem;
  compact?: boolean;
}

function KPICard({ item, compact = false }: KPICardProps) {
  const { label, value, icon: Icon, status, onClick, isActive, trend, trendValue } = item;
  const isClickable = !!onClick;

  const content = (
    <div
      className={cn(
        'rounded-lg border bg-card transition-all duration-200',
        compact ? 'p-3' : 'p-4',
        isClickable && 'cursor-pointer hover:shadow-md hover:border-primary/20',
        isActive && 'ring-2 ring-primary border-primary'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-muted-foreground truncate',
            compact ? 'text-xs' : 'text-xs sm:text-sm'
          )}>
            {label}
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={cn(
              'font-semibold text-foreground',
              compact ? 'text-xl' : 'text-2xl'
            )}>
              {value}
            </span>
            {trendValue && (
              <span className={cn(
                'text-xs font-medium',
                trend === 'up' && 'text-success',
                trend === 'down' && 'text-destructive',
                trend === 'neutral' && 'text-muted-foreground'
              )}>
                {trendValue}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          {status && <StatusDot status={status} size="md" />}
          {Icon && (
            <div className={cn(
              'rounded-lg',
              compact ? 'p-1.5' : 'p-2',
              status === 'critical' ? 'bg-destructive/10' :
              status === 'pending' ? 'bg-warning/10' :
              status === 'completed' ? 'bg-success/10' :
              status === 'informational' ? 'bg-info/10' :
              'bg-muted'
            )}>
              <Icon className={cn(
                compact ? 'h-4 w-4' : 'h-5 w-5',
                status === 'critical' ? 'text-destructive' :
                status === 'pending' ? 'text-warning' :
                status === 'completed' ? 'text-success' :
                status === 'informational' ? 'text-info' :
                'text-muted-foreground'
              )} />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (isClickable) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="text-start w-full"
      >
        {content}
      </button>
    );
  }

  return content;
}

/**
 * KPIValue - Simple inline KPI display
 */
interface KPIValueProps {
  label: string;
  value: number | string;
  status?: StatusType;
  className?: string;
}

export function KPIValue({ label, value, status, className }: KPIValueProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {status && <StatusDot status={status} size="sm" />}
      <span className="text-xs text-muted-foreground">{label}:</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

export default KPIStrip;
