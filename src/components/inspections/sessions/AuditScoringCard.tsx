import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface AuditScoringCardProps {
  totalScore: number;
  maxScore: number;
  passingThreshold: number;
  ncCounts: {
    critical: number;
    major: number;
    minor: number;
  };
}

export function AuditScoringCard({ 
  totalScore, 
  maxScore, 
  passingThreshold,
  ncCounts 
}: AuditScoringCardProps) {
  const { t } = useTranslation();
  
  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
  const isPassing = percentage >= passingThreshold;
  const hasBlockingNC = ncCounts.critical > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          {t('audits.scoring.title')}
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
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score Display */}
        <div className="text-center py-4">
          <div className="text-4xl font-bold">
            {percentage.toFixed(1)}%
          </div>
          <div className="text-sm text-muted-foreground">
            {totalScore} / {maxScore} {t('audits.scoring.points')}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{t('audits.scoring.progress')}</span>
            <span>{t('audits.scoring.threshold')}: {passingThreshold}%</span>
          </div>
          <div className="relative">
            <Progress 
              value={percentage} 
              className="h-3"
            />
            {/* Threshold marker */}
            <div 
              className="absolute top-0 h-3 w-0.5 bg-foreground"
              style={{ left: `${passingThreshold}%` }}
            />
          </div>
        </div>

        {/* NC Summary */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          <div className="text-center p-2 rounded-lg bg-red-500/10">
            <div className="flex items-center justify-center gap-1">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="font-bold text-red-500">{ncCounts.critical}</span>
            </div>
            <div className="text-xs text-muted-foreground">{t('audits.scoring.critical')}</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-orange-500/10">
            <div className="flex items-center justify-center gap-1">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="font-bold text-orange-500">{ncCounts.major}</span>
            </div>
            <div className="text-xs text-muted-foreground">{t('audits.scoring.major')}</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-yellow-500/10">
            <div className="flex items-center justify-center gap-1">
              <CheckCircle className="h-4 w-4 text-yellow-500" />
              <span className="font-bold text-yellow-500">{ncCounts.minor}</span>
            </div>
            <div className="text-xs text-muted-foreground">{t('audits.scoring.minor')}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
