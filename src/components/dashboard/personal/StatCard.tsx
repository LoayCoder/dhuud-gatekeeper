import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: number | string;
    icon: LucideIcon;
    description?: string;
    trend?: string;
    trendDirection?: 'up' | 'down' | 'neutral';
    alert?: boolean; // If true, shows red styling
    className?: string;
    onClick?: () => void;
}

export function StatCard({
    title,
    value,
    icon: Icon,
    description,
    trend,
    trendDirection,
    alert,
    className,
    onClick,
}: StatCardProps) {
    return (
        <Card
            className={cn(
                "group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer",
                alert
                    ? "border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900"
                    : "hover:border-primary/50",
                className
            )}
            onClick={onClick}
        >
            {/* Subtle background decoration */}
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />

            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
                    {title}
                </CardTitle>
                <div className={cn(
                    "p-2 rounded-full bg-muted/50 transition-colors group-hover:bg-primary/10",
                    alert && "bg-red-100 dark:bg-red-900/30"
                )}>
                    <Icon className={cn("h-4 w-4 text-muted-foreground", alert && "text-red-500")} />
                </div>
            </CardHeader>
            <CardContent className="relative z-10">
                <div className={cn("text-3xl font-bold tracking-tight", alert && "text-red-600 dark:text-red-400")}>
                    {value}
                </div>
                {(description || trend) && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                        {description}
                        {trend && (
                            <span className={cn(
                                "inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                                trendDirection === 'up' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                                trendDirection === 'down' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                                !trendDirection && "bg-muted text-muted-foreground"
                            )}>
                                {trend}
                            </span>
                        )}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
