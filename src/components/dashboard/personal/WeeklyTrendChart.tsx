import { cn } from '@/lib/utils';

interface WeeklyTrendChartProps {
  data: number[];
  className?: string;
  color?: 'primary' | 'success' | 'warning' | 'destructive' | 'info';
  height?: number;
}

const colorClasses = {
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
  info: 'text-info',
};

const fillClasses = {
  primary: 'fill-primary/20',
  success: 'fill-success/20',
  warning: 'fill-warning/20',
  destructive: 'fill-destructive/20',
  info: 'fill-info/20',
};

export function WeeklyTrendChart({ 
  data, 
  className, 
  color = 'primary',
  height = 40 
}: WeeklyTrendChartProps) {
  if (!data || data.length === 0) {
    return null;
  }

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  
  const width = 100;
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });

  const pathD = `M${points.join(' L')}`;
  
  // Create area fill path
  const areaD = `M0,${height} L${points.join(' L')} L${width},${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn('w-full', className)}
      style={{ height }}
      preserveAspectRatio="none"
    >
      {/* Area fill */}
      <path
        d={areaD}
        className={fillClasses[color]}
      />
      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={colorClasses[color]}
      />
      {/* Current point */}
      <circle
        cx={width}
        cy={height - ((data[data.length - 1] - min) / range) * (height - 4) - 2}
        r="2"
        className={cn('fill-current', colorClasses[color])}
      />
    </svg>
  );
}
