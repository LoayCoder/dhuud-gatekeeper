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
  const variantStyles = {
    danger: {
      container: 'bg-destructive/5 border-destructive/20',
      iconBg: 'bg-destructive/10',
      iconColor: 'text-destructive',
    },
    warning: {
      container: 'bg-warning/5 border-warning/20',
      iconBg: 'bg-warning/10',
      iconColor: 'text-warning',
    },
    success: {
      container: 'bg-success/5 border-success/20',
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
    },
    default: {
      container: 'bg-card border-border',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
  };

  const styles = variantStyles[variant];
  const Component = onClick ? 'button' : 'div';

  return (
    <Card className={`${styles.container} ${onClick ? 'cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]' : ''}`}>
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
                    <TrendingDown className="h-3 w-3 text-success" />
                  )}
                  <span className={`text-xs ${trend >= 0 ? 'text-destructive' : 'text-success'}`}>
                    {Math.abs(trend)}% {trendLabel}
                  </span>
                </div>
              )}
            </div>
            <div className={`p-2.5 rounded-xl shadow-sm ${styles.iconBg}`}>
              <Icon className={`h-5 w-5 ${styles.iconColor}`} />
            </div>
          </div>
        </CardContent>
      </Component>
    </Card>
  );
}
