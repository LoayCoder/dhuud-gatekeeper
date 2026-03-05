import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitBranch, ArrowRight, AlertCircle, Layers, Target } from "lucide-react";
import { CauseFlowData } from "@/hooks/use-rca-analytics";

interface CauseFlowDiagramProps {
  data: CauseFlowData;
  isLoading?: boolean;
}

const columnConfig = {
  immediate: { 
    title: 'Immediate Causes', 
    icon: AlertCircle, 
    color: 'bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-400',
    badgeColor: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300'
  },
  underlying: { 
    title: 'Underlying Causes', 
    icon: Layers, 
    color: 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400',
    badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
  },
  root: { 
    title: 'Root Causes', 
    icon: Target, 
    color: 'bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-400',
    badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300'
  }
};

export function CauseFlowDiagram({ data, isLoading }: CauseFlowDiagramProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            {t('hsseDashboard.causeFlow.title', 'Cause Flow Analysis')}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[380px] animate-pulse bg-muted/30 rounded" />
      </Card>
    );
  }

  const hasData = data.immediate_causes.length > 0 || data.underlying_causes.length > 0 || data.root_causes.length > 0;

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            {t('hsseDashboard.causeFlow.title', 'Cause Flow Analysis')}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[380px] flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <GitBranch className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{t('hsseDashboard.causeFlow.noData', 'No cause flow data available')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(
    ...data.immediate_causes.map(c => c.count),
    ...data.underlying_causes.map(c => c.count),
    ...data.root_causes.map(c => c.count),
    1
  );

  const renderColumn = (
    causes: { text: string; count: number }[], 
    config: typeof columnConfig.immediate,
    key: string
  ) => {
    const Icon = config.icon;
    
    return (
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-3">
          <Icon className="h-4 w-4 shrink-0" />
          <h4 className="font-medium text-sm truncate">
            {t(`hsseDashboard.causeFlow.${key}`, config.title)}
          </h4>
        </div>
        <div className="space-y-2">
          {causes.slice(0, 5).map((cause, idx) => {
            const widthPercent = Math.max((cause.count / maxCount) * 100, 20);
            
            return (
              <div 
                key={idx}
                className={`relative p-2 rounded-lg border ${config.color} overflow-hidden`}
              >
                {/* Background bar showing relative frequency */}
                <div 
                  className="absolute inset-y-0 start-0 opacity-20 bg-current rounded-s-lg"
                  style={{ width: `${widthPercent}%` }}
                />
                
                <div className="relative flex items-center justify-between gap-2">
                  <span className="text-xs font-medium truncate flex-1">
                    {cause.text}
                  </span>
                  <Badge variant="secondary" className={`shrink-0 text-xs ${config.badgeColor}`}>
                    {cause.count}
                  </Badge>
                </div>
              </div>
            );
          })}
          
          {causes.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-4">
              {t('hsseDashboard.causeFlow.noCauses', 'No data')}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-primary" />
          {t('hsseDashboard.causeFlow.title', 'Cause Flow Analysis')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('hsseDashboard.causeFlow.subtitle', 'Progression from immediate to root causes')}
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex items-stretch gap-2">
          {/* Immediate Causes Column */}
          {renderColumn(data.immediate_causes, columnConfig.immediate, 'immediate')}
          
          {/* Arrow */}
          <div className="flex items-center justify-center px-1 text-muted-foreground">
            <ArrowRight className="h-5 w-5 rtl:rotate-180" />
          </div>
          
          {/* Underlying Causes Column */}
          {renderColumn(data.underlying_causes, columnConfig.underlying, 'underlying')}
          
          {/* Arrow */}
          <div className="flex items-center justify-center px-1 text-muted-foreground">
            <ArrowRight className="h-5 w-5 rtl:rotate-180" />
          </div>
          
          {/* Root Causes Column */}
          {renderColumn(data.root_causes, columnConfig.root, 'root')}
        </div>
        
        {/* Flow connections summary */}
        {data.flows.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-xs font-medium text-muted-foreground mb-2">
              {t('hsseDashboard.causeFlow.topConnections', 'Top Cause Connections')}
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {data.flows.slice(0, 6).map((flow, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {flow.from.substring(0, 12)} → {flow.to.substring(0, 12)} ({flow.count})
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
