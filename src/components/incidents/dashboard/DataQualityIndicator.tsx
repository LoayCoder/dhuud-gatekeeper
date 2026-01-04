import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, Info, Database } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface DataQualityIndicatorProps {
  incidents: any[];
  observations: any[];
  actions: any[];
}

interface QualityMetric {
  label: string;
  completeness: number;
  missingFields: string[];
}

export function DataQualityIndicator({ incidents, observations, actions }: DataQualityIndicatorProps) {
  const { t } = useTranslation();

  // Calculate data quality metrics
  const calculateQuality = (): { overall: number; metrics: QualityMetric[] } => {
    const metrics: QualityMetric[] = [];

    // Incidents quality
    if (incidents.length > 0) {
      const missingRootCause = incidents.filter(i => !i.root_cause && i.status === 'closed').length;
      const missingLocation = incidents.filter(i => !i.location_id && !i.gps_lat).length;
      const missingSeverity = incidents.filter(i => !i.severity).length;
      
      const incidentMissing: string[] = [];
      if (missingRootCause > 0) incidentMissing.push(`${missingRootCause} missing root cause`);
      if (missingLocation > 0) incidentMissing.push(`${missingLocation} missing location`);
      if (missingSeverity > 0) incidentMissing.push(`${missingSeverity} missing severity`);
      
      const incidentCompleteness = Math.max(0, 100 - ((missingRootCause + missingLocation + missingSeverity) / (incidents.length * 3) * 100));
      
      metrics.push({
        label: t('dashboard.incidents', 'Incidents'),
        completeness: Math.round(incidentCompleteness),
        missingFields: incidentMissing,
      });
    }

    // Observations quality
    if (observations.length > 0) {
      const missingCategory = observations.filter(o => !o.observation_type).length;
      const missingDescription = observations.filter(o => !o.description || o.description.length < 20).length;
      
      const obsMissing: string[] = [];
      if (missingCategory > 0) obsMissing.push(`${missingCategory} missing category`);
      if (missingDescription > 0) obsMissing.push(`${missingDescription} weak descriptions`);
      
      const obsCompleteness = Math.max(0, 100 - ((missingCategory + missingDescription) / (observations.length * 2) * 100));
      
      metrics.push({
        label: t('dashboard.observations', 'Observations'),
        completeness: Math.round(obsCompleteness),
        missingFields: obsMissing,
      });
    }

    // Actions quality
    if (actions.length > 0) {
      const missingDueDate = actions.filter(a => !a.due_date).length;
      const missingAssignee = actions.filter(a => !a.assigned_to).length;
      const missingPriority = actions.filter(a => !a.priority).length;
      
      const actionMissing: string[] = [];
      if (missingDueDate > 0) actionMissing.push(`${missingDueDate} missing due date`);
      if (missingAssignee > 0) actionMissing.push(`${missingAssignee} unassigned`);
      if (missingPriority > 0) actionMissing.push(`${missingPriority} missing priority`);
      
      const actionCompleteness = Math.max(0, 100 - ((missingDueDate + missingAssignee + missingPriority) / (actions.length * 3) * 100));
      
      metrics.push({
        label: t('dashboard.actions', 'Actions'),
        completeness: Math.round(actionCompleteness),
        missingFields: actionMissing,
      });
    }

    const overall = metrics.length > 0 
      ? Math.round(metrics.reduce((sum, m) => sum + m.completeness, 0) / metrics.length)
      : 100;

    return { overall, metrics };
  };

  const { overall, metrics } = calculateQuality();

  const getQualityColor = (value: number) => {
    if (value >= 90) return 'text-green-500';
    if (value >= 70) return 'text-yellow-500';
    return 'text-destructive';
  };

  const getQualityIcon = (value: number) => {
    if (value >= 90) return CheckCircle;
    if (value >= 70) return Info;
    return AlertTriangle;
  };

  const QualityIcon = getQualityIcon(overall);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full",
                  overall >= 90 ? "bg-green-500/10" : overall >= 70 ? "bg-yellow-500/10" : "bg-destructive/10"
                )}>
                  <QualityIcon className={cn("h-5 w-5", getQualityColor(overall))} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {t('dashboard.dataQuality', 'Data Quality')}
                    </span>
                    <Badge variant={overall >= 90 ? "default" : overall >= 70 ? "secondary" : "destructive"}>
                      {overall}%
                    </Badge>
                  </div>
                  <Progress value={overall} className="h-1.5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-3 p-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Database className="h-4 w-4" />
              {t('dashboard.dataQualityDetails', 'Data Quality Details')}
            </div>
            {metrics.map((metric) => (
              <div key={metric.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{metric.label}</span>
                  <span className={getQualityColor(metric.completeness)}>
                    {metric.completeness}%
                  </span>
                </div>
                {metric.missingFields.length > 0 && (
                  <ul className="text-xs text-muted-foreground">
                    {metric.missingFields.map((field, idx) => (
                      <li key={idx}>• {field}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            {overall < 90 && (
              <p className="text-xs text-muted-foreground pt-2 border-t">
                {t('dashboard.dataQualityWarning', 'AI analysis accuracy may be affected by incomplete data.')}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
