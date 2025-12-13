import { Card, CardContent } from "@/components/ui/card";
import { TrendBadge } from "./TrendBadge";
import { KPISparkline } from "./KPISparkline";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface KPITrendCardProps {
  title: string;
  value: number | string;
  previousValue?: number;
  target?: number;
  sparklineData?: { value: number }[];
  trend?: 'up' | 'down' | 'stable';
  invertColors?: boolean;
  icon?: LucideIcon;
  iconColor?: string;
  isLoading?: boolean;
  suffix?: string;
  periodLabel?: string;
}

export function KPITrendCard({
  title,
  value,
  previousValue,
  target,
  sparklineData,
  trend,
  invertColors = true,
  icon: Icon,
  iconColor = "text-primary",
  isLoading,
  suffix = "",
  periodLabel,
}: KPITrendCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-6 w-20" />
        </CardContent>
      </Card>
    );
  }

  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;
  const numericPrevious = previousValue ?? numericValue;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {Icon && <Icon className={cn("h-4 w-4", iconColor)} />}
              <p className="text-xs font-medium text-muted-foreground truncate">
                {title}
              </p>
            </div>
            
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {typeof value === 'number' && !isNaN(value) ? value.toFixed(2) : (value ?? '0')}
                {suffix}
              </span>
              {target !== undefined && (
                <span className="text-xs text-muted-foreground">
                  / {target}{suffix}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2 mt-1">
              <TrendBadge 
                current={numericValue} 
                previous={numericPrevious} 
                invertColors={invertColors} 
              />
              {periodLabel && (
                <span className="text-[10px] text-muted-foreground">
                  {periodLabel}
                </span>
              )}
            </div>
          </div>
          
          {sparklineData && sparklineData.length > 0 && (
            <KPISparkline 
              data={sparklineData} 
              trend={trend}
              invertColors={invertColors}
              height={32}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
