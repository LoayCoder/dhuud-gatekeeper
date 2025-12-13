import { cn } from '@/lib/utils';

interface KPIGaugeChartProps {
  value: number;
  maxValue: number;
  label: string;
  unit?: string;
  status?: 'success' | 'warning' | 'critical' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
}

export function KPIGaugeChart({
  value,
  maxValue,
  label,
  unit = '',
  status = 'neutral',
  size = 'md',
}: KPIGaugeChartProps) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const rotation = (percentage / 100) * 180;

  const sizeClasses = {
    sm: 'w-24 h-12',
    md: 'w-32 h-16',
    lg: 'w-40 h-20',
  };

  const statusColors = {
    success: 'text-emerald-500',
    warning: 'text-amber-500',
    critical: 'text-destructive',
    neutral: 'text-primary',
  };

  const strokeColors = {
    success: 'stroke-emerald-500',
    warning: 'stroke-amber-500',
    critical: 'stroke-destructive',
    neutral: 'stroke-primary',
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={cn('relative', sizeClasses[size])}>
        <svg
          viewBox="0 0 100 50"
          className="w-full h-full"
        >
          {/* Background arc */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            strokeWidth="8"
            className="stroke-muted"
          />
          {/* Value arc */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            className={strokeColors[status]}
            strokeDasharray={`${(percentage / 100) * 126} 126`}
          />
          {/* Needle */}
          <line
            x1="50"
            y1="50"
            x2="50"
            y2="15"
            strokeWidth="2"
            className={strokeColors[status]}
            transform={`rotate(${rotation - 90}, 50, 50)`}
          />
          {/* Center circle */}
          <circle
            cx="50"
            cy="50"
            r="4"
            className={`fill-current ${statusColors[status]}`}
          />
        </svg>
      </div>
      <div className="text-center">
        <span className={cn('text-lg font-bold', statusColors[status])}>
          {value.toFixed(2)}
          {unit}
        </span>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
