import { cn } from '@/lib/utils';
import { Shield, AlertTriangle } from 'lucide-react';

interface DaysSinceCounterProps {
  days: number;
  label: string;
  milestone?: number;
}

export function DaysSinceCounter({ days, label, milestone = 100 }: DaysSinceCounterProps) {
  const isAchievement = days >= milestone;
  const progress = Math.min((days / milestone) * 100, 100);

  return (
    <div className="relative overflow-hidden rounded-xl border bg-card p-6 text-center">
      {/* Background gradient based on status */}
      <div
        className={cn(
          'absolute inset-0 opacity-10',
          isAchievement
            ? 'bg-gradient-to-br from-emerald-500 to-emerald-700'
            : 'bg-gradient-to-br from-primary to-primary/70'
        )}
      />

      <div className="relative z-10">
        {/* Icon */}
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          {days === 999 ? (
            <Shield className="h-6 w-6 text-emerald-500" />
          ) : days < 30 ? (
            <AlertTriangle className="h-6 w-6 text-amber-500" />
          ) : (
            <Shield className="h-6 w-6 text-primary" />
          )}
        </div>

        {/* Counter */}
        <div className="mb-2">
          <span
            className={cn(
              'text-5xl font-bold tabular-nums',
              days === 999
                ? 'text-emerald-500'
                : days < 30
                  ? 'text-amber-500'
                  : 'text-foreground'
            )}
          >
            {days === 999 ? '∞' : days}
          </span>
        </div>

        {/* Label */}
        <p className="text-sm font-medium text-muted-foreground">{label}</p>

        {/* Progress bar to next milestone */}
        {days !== 999 && (
          <div className="mt-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full transition-all duration-500',
                  isAchievement ? 'bg-emerald-500' : 'bg-primary'
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {isAchievement
                ? `${milestone}-day milestone achieved!`
                : `${milestone - days} days to ${milestone}-day milestone`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
