import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, Ban, Cog } from 'lucide-react';
import type { SessionPartsProgress } from '@/features/incidents/hooks/use-inspection-sessions/use-session-parts-progress';

interface SessionProgressCardProps {
  total: number;
  inspected: number;
  passed: number;
  failed: number;
  notAccessible: number;
  compliancePercentage: number | null;
  partsProgress?: SessionPartsProgress | null;
}

export function SessionProgressCard({
  total,
  inspected,
  passed,
  failed,
  notAccessible,
  compliancePercentage,
  partsProgress,
}: SessionProgressCardProps) {
  const { t } = useTranslation();
  
  const progressPercent = total > 0 ? Math.round((inspected / total) * 100) : 0;
  const remaining = total - inspected;
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{t('inspectionSessions.progress')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Asset Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t('inspectionSessions.progressCount', { inspected, total })}
            </span>
            <span className="font-medium">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-3" />
          {remaining > 0 && (
            <p className="text-xs text-muted-foreground">
              {t('inspectionSessions.remaining', { count: remaining })}
            </p>
          )}
        </div>

        {/* Parts Progress Bar */}
        {partsProgress && partsProgress.totalParts > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Cog className="h-3.5 w-3.5" />
                {t('inspectionSessions.partsProgress', { 
                  completed: partsProgress.completedParts, 
                  total: partsProgress.totalParts 
                })}
              </span>
              <span className="font-medium">{partsProgress.percentage}%</span>
            </div>
            <Progress 
              value={partsProgress.percentage} 
              className="h-2" 
              indicatorClassName={partsProgress.failedParts > 0 ? 'bg-warning' : undefined}
            />
            {partsProgress.failedParts > 0 && (
              <p className="text-xs text-destructive font-medium">
                ⚠ {t('inspectionSessions.partsFailedCount', { count: partsProgress.failedParts })}
              </p>
            )}
          </div>
        )}
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-success/10">
            <CheckCircle className="h-5 w-5 text-success" />
            <div>
              <p className="text-lg font-bold text-success">{passed}</p>
              <p className="text-xs text-muted-foreground">{t('inspectionSessions.passed')}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10">
            <XCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-lg font-bold text-destructive">{failed}</p>
              <p className="text-xs text-muted-foreground">{t('inspectionSessions.failed')}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 rounded-lg bg-warning/10">
            <Ban className="h-5 w-5 text-warning" />
            <div>
              <p className="text-lg font-bold text-warning">{notAccessible}</p>
              <p className="text-xs text-muted-foreground">{t('inspectionSessions.notAccessible')}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10">
            <AlertTriangle className="h-5 w-5 text-primary" />
            <div>
              <p className="text-lg font-bold text-primary">
                {compliancePercentage !== null ? `${compliancePercentage}%` : '-'}
              </p>
              <p className="text-xs text-muted-foreground">{t('inspectionSessions.complianceRate')}</p>
            </div>
          </div>
        </div>
        
        {/* Compliance Badge */}
        {compliancePercentage !== null && (
          <div className="pt-2">
            <Badge 
              variant={compliancePercentage >= 90 ? 'default' : compliancePercentage >= 70 ? 'secondary' : 'destructive'}
              className="w-full justify-center py-1"
            >
              {compliancePercentage >= 90 
                ? t('inspectionSessions.excellent')
                : compliancePercentage >= 70 
                  ? t('inspectionSessions.acceptable')
                  : t('inspectionSessions.needsAttention')
              }
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
