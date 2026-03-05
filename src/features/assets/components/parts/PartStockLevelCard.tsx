import { cn } from '@/lib/utils';

interface PartStockLevelCardProps {
  current: number;
  min: number;
  max: number;
  reorderPoint: number;
}

export function PartStockLevelCard({ current, min, max, reorderPoint }: PartStockLevelCardProps) {
  const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  const reorderPercentage = max > 0 ? (reorderPoint / max) * 100 : 0;
  
  const isCritical = current <= min;
  const isLow = current <= reorderPoint && current > min;
  const isHealthy = current > reorderPoint;

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'font-medium tabular-nums',
          isCritical && 'text-destructive',
          isLow && 'text-amber-600',
          isHealthy && 'text-foreground'
        )}
      >
        {current}
      </span>
      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden relative">
        {/* Reorder point marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-10"
          style={{ left: `${reorderPercentage}%` }}
        />
        {/* Stock level bar */}
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isCritical && 'bg-destructive',
            isLow && 'bg-amber-500',
            isHealthy && 'bg-emerald-500'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
