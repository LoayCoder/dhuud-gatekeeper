import { useTranslation } from 'react-i18next';
import { TrendingUp, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useInspectionStats } from '@/hooks/use-inspections';

export function InspectionStatsCard() {
  const { t } = useTranslation();
  
  const { data: stats, isLoading } = useInspectionStats();
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }
  
  if (!stats || stats.total === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {t('inspections.complianceRate')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('inspections.noInspections')}
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          {t('inspections.complianceRate')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-3xl font-bold">{stats.complianceRate}%</span>
          <span className="text-sm text-muted-foreground">
            {stats.passed} / {stats.total} {t('inspections.passed')}
          </span>
        </div>
        
        <Progress value={stats.complianceRate} className="h-2" />
        
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-600 mx-auto mb-1" />
            <p className="text-sm font-medium">{stats.passed}</p>
            <p className="text-xs text-muted-foreground">{t('inspections.results.pass')}</p>
          </div>
          <div className="p-2 rounded-lg bg-yellow-500/10">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mx-auto mb-1" />
            <p className="text-sm font-medium">{stats.partial}</p>
            <p className="text-xs text-muted-foreground">{t('inspections.results.partial')}</p>
          </div>
          <div className="p-2 rounded-lg bg-red-500/10">
            <XCircle className="h-4 w-4 text-red-600 mx-auto mb-1" />
            <p className="text-sm font-medium">{stats.failed}</p>
            <p className="text-xs text-muted-foreground">{t('inspections.results.fail')}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
