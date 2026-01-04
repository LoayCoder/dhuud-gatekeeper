import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Shield } from 'lucide-react';
import { getSeverityBadgeVariant } from '@/lib/hsse-severity-levels';
import { cn } from '@/lib/utils';

interface IncidentRiskPanelProps {
  actualSeverity: string | null;
  potentialSeverity?: string | null;
  eventType: string;
}

const SEVERITY_LEVELS = ['level_1', 'level_2', 'level_3', 'level_4', 'level_5'];

const getSeverityIndex = (severity: string | null): number => {
  if (!severity) return -1;
  return SEVERITY_LEVELS.indexOf(severity);
};

const getSeverityColor = (severity: string | null, isActive: boolean): string => {
  if (!isActive) return 'bg-muted';
  switch (severity) {
    case 'level_5': return 'bg-destructive';
    case 'level_4': return 'bg-orange-500';
    case 'level_3': return 'bg-amber-500';
    case 'level_2': return 'bg-yellow-500';
    case 'level_1': return 'bg-green-500';
    default: return 'bg-muted';
  }
};

export function IncidentRiskPanel({
  actualSeverity,
  potentialSeverity,
  eventType,
}: IncidentRiskPanelProps) {
  const { t } = useTranslation();

  const actualIndex = getSeverityIndex(actualSeverity);
  const potentialIndex = getSeverityIndex(potentialSeverity || null);
  
  const hasPotential = potentialSeverity && potentialSeverity !== actualSeverity;
  const severityTrend = hasPotential 
    ? (potentialIndex > actualIndex ? 'higher' : 'lower')
    : 'same';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          {t('incidents.detail.riskAssessment', 'Risk Assessment')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Actual Severity */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            {t('severity.actualSeverity', 'Actual Severity')}
          </p>
          <div className="flex items-center gap-3">
            {actualSeverity ? (
              <Badge 
                variant={getSeverityBadgeVariant(actualSeverity)}
                className="text-sm px-3 py-1.5"
              >
                <AlertTriangle className="h-3.5 w-3.5 me-1.5" />
                {t(`severity.${actualSeverity}.label`)}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-sm">
                {t('common.notAssessed', 'Not Assessed')}
              </Badge>
            )}
          </div>
        </div>

        {/* Potential Severity (if different) */}
        {hasPotential && (
          <div>
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              {t('severity.potentialSeverity', 'Potential Severity')}
              {severityTrend === 'higher' ? (
                <TrendingUp className="h-3 w-3 text-destructive" />
              ) : (
                <TrendingDown className="h-3 w-3 text-green-500" />
              )}
            </p>
            <Badge 
              variant="outline"
              className={cn(
                "text-sm px-3 py-1.5 border-dashed",
                severityTrend === 'higher' && "border-destructive/50 text-destructive"
              )}
            >
              {t(`severity.${potentialSeverity}.label`)}
            </Badge>
          </div>
        )}

        {/* Severity Scale Visual */}
        <div className="pt-2">
          <p className="text-xs text-muted-foreground mb-2">
            {t('incidents.detail.severityScale', 'Severity Scale')}
          </p>
          <div className="flex gap-1">
            {SEVERITY_LEVELS.map((level, index) => {
              const isActual = level === actualSeverity;
              const isPotential = level === potentialSeverity;
              
              return (
                <div key={level} className="flex-1 space-y-1">
                  <div 
                    className={cn(
                      "h-2 rounded-full transition-all",
                      getSeverityColor(level, index <= actualIndex),
                      isActual && "ring-2 ring-offset-1 ring-foreground"
                    )}
                  />
                  {(isActual || isPotential) && (
                    <div className="text-center">
                      {isActual && (
                        <div className="w-2 h-2 rounded-full bg-foreground mx-auto" />
                      )}
                      {isPotential && !isActual && (
                        <div className="w-2 h-2 rounded-full border-2 border-dashed border-muted-foreground mx-auto" />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
            <span>{t('severity.level_1.short', 'L1')}</span>
            <span>{t('severity.level_5.short', 'L5')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
