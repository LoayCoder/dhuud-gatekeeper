import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Ban,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSecurityScore } from '@/hooks/use-security-score';
import { Skeleton } from '@/components/ui/skeleton';

interface SecurityScoreCardProps {
  compact?: boolean;
  className?: string;
}

export function SecurityScoreCard({ compact = false, className }: SecurityScoreCardProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const { data: metrics, isLoading } = useSecurityScore();

  if (isLoading) {
    return (
      <Card className={cn(className)}>
        <CardContent className="pt-6">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  const TrendIcon = metrics.trend === 'up' ? TrendingUp : metrics.trend === 'down' ? TrendingDown : Minus;
  const trendColor = metrics.trend === 'up' ? 'text-green-500' : metrics.trend === 'down' ? 'text-destructive' : 'text-muted-foreground';

  const scoreColor = 
    metrics.score >= 95 ? 'text-green-500' :
    metrics.score >= 90 ? 'text-amber-500' :
    'text-destructive';

  if (compact) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', scoreColor === 'text-green-500' ? 'bg-green-500/10' : scoreColor === 'text-amber-500' ? 'bg-amber-500/10' : 'bg-destructive/10')}>
                <Shield className={cn('h-5 w-5', scoreColor)} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {isRTL ? 'درجة الأمان' : 'Security Score'}
                </p>
                <div className="flex items-center gap-2">
                  <span className={cn('text-2xl font-bold', scoreColor)}>
                    {metrics.score}
                  </span>
                  <TrendIcon className={cn('h-4 w-4', trendColor)} />
                </div>
              </div>
            </div>
            {metrics.activeEmergencies > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                <AlertTriangle className="h-3 w-3 me-1" />
                {metrics.activeEmergencies}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const metricItems = [
    {
      label: isRTL ? 'تطبيق القائمة السوداء' : 'Blacklist Enforcement',
      value: metrics.blacklistEnforcement,
      icon: Ban,
    },
    {
      label: isRTL ? 'امتثال صلاحية QR' : 'QR Expiry Compliance',
      value: metrics.qrExpiryCompliance,
      icon: CheckCircle2,
    },
    {
      label: isRTL ? 'سرعة الموافقات' : 'Approval Turnaround',
      value: metrics.approvalTurnaround,
      icon: Clock,
    },
    {
      label: isRTL ? 'استجابة الطوارئ' : 'Emergency Response',
      value: metrics.emergencyResponseTime,
      icon: AlertTriangle,
    },
  ];

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Shield className={cn('h-5 w-5', scoreColor)} />
            {isRTL ? 'درجة الأمان' : 'Security Score'}
          </span>
          <div className="flex items-center gap-2">
            <span className={cn('text-3xl font-bold', scoreColor)}>
              {metrics.score}
            </span>
            <TrendIcon className={cn('h-5 w-5', trendColor)} />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress 
          value={metrics.score} 
          className="h-2"
        />
        
        {metrics.activeEmergencies > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="h-4 w-4 text-destructive animate-pulse" />
            <span className="text-sm text-destructive font-medium">
              {isRTL 
                ? `${metrics.activeEmergencies} حالات طوارئ نشطة`
                : `${metrics.activeEmergencies} active emergencies`}
            </span>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {metricItems.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <item.icon className={cn(
                'h-4 w-4',
                item.value >= 90 ? 'text-green-500' : item.value >= 70 ? 'text-amber-500' : 'text-destructive'
              )} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground truncate">{item.label}</span>
                  <span className={cn(
                    'text-xs font-medium',
                    item.value >= 90 ? 'text-green-500' : item.value >= 70 ? 'text-amber-500' : 'text-destructive'
                  )}>
                    {item.value}%
                  </span>
                </div>
                <Progress value={item.value} className="h-1 mt-1" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
