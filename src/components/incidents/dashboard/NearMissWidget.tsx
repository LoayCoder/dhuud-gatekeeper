import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, TrendingDown, Minus, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface NearMissWidgetProps {
  nearMissCount: number;
  incidentCount: number;
  previousNearMissCount?: number;
}

export function NearMissWidget({ nearMissCount, incidentCount, previousNearMissCount }: NearMissWidgetProps) {
  const { t } = useTranslation();

  // Heinrich's ratio should ideally be ~300:29:1 (near miss:minor injury:major)
  // We'll check if near miss reporting is healthy (>10:1 ratio)
  const ratio = incidentCount > 0 ? (nearMissCount / incidentCount) : nearMissCount;
  const isHealthyRatio = ratio >= 10;
  const isWarningRatio = ratio >= 5 && ratio < 10;
  const isPoorRatio = ratio < 5;

  // Trend calculation
  const trend: 'up' | 'down' | 'stable' = previousNearMissCount !== undefined
    ? nearMissCount > previousNearMissCount ? 'up' : nearMissCount < previousNearMissCount ? 'down' : 'stable'
    : 'stable';

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return TrendingUp;
      case 'down': return TrendingDown;
      default: return Minus;
    }
  };

  const TrendIcon = getTrendIcon();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Eye className="h-4 w-4" />
          {t('dashboard.nearMissReporting', 'Near Miss Reporting')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Main Stats */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold">{nearMissCount}</div>
              <div className="text-xs text-muted-foreground">
                {t('dashboard.nearMissesReported', 'Near misses reported')}
              </div>
            </div>
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-xs",
              isHealthyRatio && "bg-green-500/10 text-green-500",
              isWarningRatio && "bg-yellow-500/10 text-yellow-500",
              isPoorRatio && "bg-destructive/10 text-destructive"
            )}>
              <TrendIcon className="h-3 w-3" />
              <span>{ratio.toFixed(1)}:1</span>
            </div>
          </div>

          {/* Ratio Indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t('dashboard.nearMissRatio', 'Near Miss to Incident Ratio')}
              </span>
              <Badge variant={isHealthyRatio ? "default" : isWarningRatio ? "secondary" : "destructive"}>
                {ratio.toFixed(1)}:1
              </Badge>
            </div>
            
            {/* Visual bar showing ratio health */}
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all",
                  isHealthyRatio && "bg-green-500",
                  isWarningRatio && "bg-yellow-500",
                  isPoorRatio && "bg-destructive"
                )}
                style={{ width: `${Math.min(ratio * 10, 100)}%` }}
              />
            </div>
            
            <p className="text-xs text-muted-foreground">
              {isHealthyRatio && t('dashboard.healthyRatio', 'Healthy ratio indicates good reporting culture')}
              {isWarningRatio && t('dashboard.warningRatio', 'Ratio could indicate under-reporting of near misses')}
              {isPoorRatio && (
                <span className="flex items-center gap-1 text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  {t('dashboard.poorRatio', 'Low ratio suggests near misses may be under-reported')}
                </span>
              )}
            </p>
          </div>

          {/* Mini breakdown */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t">
            <div className="text-center p-2 bg-muted/50 rounded">
              <div className="text-lg font-semibold">{nearMissCount}</div>
              <div className="text-xs text-muted-foreground">{t('dashboard.nearMisses', 'Near Misses')}</div>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded">
              <div className="text-lg font-semibold">{incidentCount}</div>
              <div className="text-xs text-muted-foreground">{t('dashboard.actualIncidents', 'Incidents')}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
