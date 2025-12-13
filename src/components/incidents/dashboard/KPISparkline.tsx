import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

interface KPISparklineProps {
  data: { value: number }[];
  trend?: 'up' | 'down' | 'stable';
  invertColors?: boolean; // true = down is good (e.g., incidents)
  height?: number;
  className?: string;
}

export function KPISparkline({ 
  data, 
  trend, 
  invertColors = true,
  height = 24,
  className 
}: KPISparklineProps) {
  if (!data || data.length === 0) return null;

  // Determine color based on trend direction and whether lower is better
  const getColor = () => {
    if (!trend || trend === 'stable') return 'hsl(var(--muted-foreground))';
    
    const isPositive = invertColors ? trend === 'down' : trend === 'up';
    return isPositive 
      ? 'hsl(142.1 76.2% 36.3%)' // green-600
      : 'hsl(0 84.2% 60.2%)'; // red-500
  };

  const color = getColor();
  const gradientId = `sparkline-gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={cn("w-20", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
