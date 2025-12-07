import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, AlertTriangle, MinusCircle, Target, Shield } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { AuditProgress, NCCounts } from '@/hooks/use-audit-sessions';
import { cn } from '@/lib/utils';

interface AuditProgressCardProps {
  progress: AuditProgress | null;
  ncCounts: NCCounts | null;
  standardReference?: string | null;
}

export function AuditProgressCard({ progress, ncCounts, standardReference }: AuditProgressCardProps) {
  const { t } = useTranslation();
  
  if (!progress) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          {t('common.loading')}...
        </CardContent>
      </Card>
    );
  }
  
  const { percentage, passingThreshold, isPassing, hasBlockingNC, weightedScore, maxScore } = progress;
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('audits.auditScore')}
          </div>
          <Badge 
            variant={hasBlockingNC ? 'destructive' : isPassing ? 'default' : 'secondary'}
            className="text-sm"
          >
            {hasBlockingNC 
              ? t('audits.scoring.blocked') 
              : isPassing 
                ? t('audits.scoring.passed') 
                : t('audits.scoring.failed')
            }
          </Badge>
        </CardTitle>
        {standardReference && (
          <Badge variant="outline" className="w-fit">
            {standardReference}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score Display */}
        <div className="text-center py-4">
          <Tooltip>
            <TooltipTrigger>
              <div className={cn(
                "text-4xl font-bold",
                hasBlockingNC ? "text-destructive" : isPassing ? "text-green-500" : "text-orange-500"
              )}>
                {percentage.toFixed(1)}%
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('audits.weightedScore')}: {weightedScore.toFixed(1)} / {maxScore.toFixed(1)}</p>
            </TooltipContent>
          </Tooltip>
          <div className="text-sm text-muted-foreground">
            {weightedScore.toFixed(0)} / {maxScore.toFixed(0)} {t('audits.scoring.points')}
          </div>
        </div>

        {/* Progress Bar with Threshold */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{t('audits.scoring.progress')}</span>
            <span className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              {t('audits.scoring.threshold')}: {passingThreshold}%
            </span>
          </div>
          <div className="relative">
            <Progress 
              value={percentage} 
              className={cn(
                "h-3",
                hasBlockingNC ? "[&>div]:bg-destructive" : isPassing ? "[&>div]:bg-green-500" : "[&>div]:bg-orange-500"
              )}
            />
            {/* Threshold marker */}
            <div 
              className="absolute top-0 h-3 w-0.5 bg-foreground"
              style={{ left: `${passingThreshold}%` }}
            />
          </div>
        </div>

        {/* Response Stats */}
        <div className="grid grid-cols-4 gap-2 pt-2 border-t">
          <div className="text-center p-2">
            <div className="flex items-center justify-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="font-bold">{progress.conforming}</span>
            </div>
            <div className="text-xs text-muted-foreground">{t('audits.conforming')}</div>
          </div>
          <div className="text-center p-2">
            <div className="flex items-center justify-center gap-1">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="font-bold">{progress.nonConforming}</span>
            </div>
            <div className="text-xs text-muted-foreground">{t('audits.nonConformingShort')}</div>
          </div>
          <div className="text-center p-2">
            <div className="flex items-center justify-center gap-1">
              <MinusCircle className="h-4 w-4 text-muted-foreground" />
              <span className="font-bold">{progress.na}</span>
            </div>
            <div className="text-xs text-muted-foreground">{t('audits.na')}</div>
          </div>
          <div className="text-center p-2">
            <div className="flex items-center justify-center gap-1">
              <span className="font-bold">{progress.responded}/{progress.total}</span>
            </div>
            <div className="text-xs text-muted-foreground">{t('audits.completed')}</div>
          </div>
        </div>

        {/* NC Summary */}
        {ncCounts && ncCounts.total > 0 && (
          <div className="grid grid-cols-3 gap-2 pt-2 border-t">
            <div className="text-center p-2 rounded-lg bg-red-500/10">
              <div className="flex items-center justify-center gap-1">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="font-bold text-red-500">{ncCounts.critical}</span>
              </div>
              <div className="text-xs text-muted-foreground">{t('audits.nc.critical')}</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-orange-500/10">
              <div className="flex items-center justify-center gap-1">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="font-bold text-orange-500">{ncCounts.major}</span>
              </div>
              <div className="text-xs text-muted-foreground">{t('audits.nc.major')}</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-yellow-500/10">
              <div className="flex items-center justify-center gap-1">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="font-bold text-yellow-500">{ncCounts.minor}</span>
              </div>
              <div className="text-xs text-muted-foreground">{t('audits.nc.minor')}</div>
            </div>
          </div>
        )}

        {/* Critical NC Warning */}
        {hasBlockingNC && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">{t('audits.criticalNCWarning')}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
