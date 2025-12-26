import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

export interface KPICardProps {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  trendLabel?: string;
  variant?: 'default' | 'warning' | 'danger' | 'success';
  onClick?: () => void;
}

export function KPICard({ 
  title, 
  value, 
  icon: Icon, 
  trend,
  trendLabel,
  variant = 'default',
  onClick,
}: KPICardProps) {
  const bgClass = variant === 'danger' 
    ? 'bg-gradient-to-br from-destructive/15 to-destructive/5 border-destructive/30' 
    : variant === 'warning' 
      ? 'bg-gradient-to-br from-warning/20 to-warning/5 border-warning/30'
      : variant === 'success'
        ? 'bg-gradient-to-br from-chart-3/20 to-chart-3/5 border-chart-3/30'
        : 'bg-gradient-to-br from-card to-muted/30';

  const Component = onClick ? 'button' : 'div';

  return (
    <Card className={`${bgClass} ${onClick ? 'cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]' : ''}`}>
      <Component onClick={onClick} className="w-full">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="text-start">
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold mt-1">{value}</p>
              {trend !== undefined && (
                <div className="flex items-center gap-1 mt-1">
                  {trend >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-destructive" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-chart-3" />
                  )}
                  <span className={`text-xs ${trend >= 0 ? 'text-destructive' : 'text-chart-3'}`}>
                    {Math.abs(trend)}% {trendLabel}
                  </span>
                </div>
              )}
            </div>
            <div className={`p-2.5 rounded-xl shadow-sm ${
              variant === 'danger' ? 'bg-destructive/20' : 
              variant === 'warning' ? 'bg-warning/20' : 
              variant === 'success' ? 'bg-chart-3/20' :
              'bg-primary/10'
            }`}>
              <Icon className={`h-5 w-5 ${
                variant === 'danger' ? 'text-destructive' : 
                variant === 'warning' ? 'text-warning' : 
                variant === 'success' ? 'text-chart-3' :
                'text-primary'
              }`} />
            </div>
          </div>
        </CardContent>
      </Component>
    </Card>
  );
}
