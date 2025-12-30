import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SeverityLevelV2, getSeverityConfig } from '@/lib/hsse-severity-levels';
import { WorkflowNode } from './WorkflowNode';
import { WorkflowConnector } from './WorkflowConnector';
import {
  getStagesForPath,
  getStageStatus,
  getPathType,
  WorkflowStageStatus,
} from './workflow-config';

interface ObservationWorkflowDiagramProps {
  currentStatus: string | null;
  severity: SeverityLevelV2 | null;
  closedOnSpot?: boolean;
  showLegend?: boolean;
  compact?: boolean;
  className?: string;
}

export function ObservationWorkflowDiagram({
  currentStatus,
  severity,
  closedOnSpot = false,
  showLegend = true,
  compact = false,
  className,
}: ObservationWorkflowDiagramProps) {
  const { t } = useTranslation();
  const pathType = getPathType(severity);
  const stages = getStagesForPath(severity, closedOnSpot);
  const severityConfig = getSeverityConfig(severity);

  // Get status for each stage
  const stageStatuses: WorkflowStageStatus[] = stages.map(stage =>
    getStageStatus(stage, currentStatus, severity, closedOnSpot)
  );

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold">
            {t('workflow.diagram.title')}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {/* Severity Badge */}
            {severityConfig && (
              <Badge
                variant="outline"
                className={cn(
                  'text-xs font-medium',
                  severityConfig.bgColor.replace('bg-', 'bg-') + '/10',
                  severityConfig.textColor
                )}
              >
                {t(`severity.${severity}`)}
              </Badge>
            )}
            
            {/* Path Type Badge */}
            <Badge variant="secondary" className="text-xs">
              {t(`workflow.path.${pathType}`)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Workflow Diagram - Horizontal on desktop, Vertical on mobile */}
        <div className="flex flex-col gap-4">
          {/* Desktop: Horizontal Layout */}
          <div className="hidden items-start justify-between md:flex">
            {stages.map((stage, index) => (
              <div key={stage.key} className="flex flex-1 items-center">
                <WorkflowNode
                  stage={stage}
                  status={stageStatuses[index]}
                  index={index}
                  compact={compact}
                />
                
                {index < stages.length - 1 && (
                  <WorkflowConnector
                    fromStatus={stageStatuses[index]}
                    toStatus={stageStatuses[index + 1]}
                    index={index}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Mobile: Vertical Layout */}
          <div className="flex flex-col items-center gap-0 md:hidden">
            {stages.map((stage, index) => (
              <div key={stage.key} className="flex flex-col items-center">
                <WorkflowNode
                  stage={stage}
                  status={stageStatuses[index]}
                  index={index}
                  compact={true}
                />
                
                {index < stages.length - 1 && (
                  <WorkflowConnector
                    fromStatus={stageStatuses[index]}
                    toStatus={stageStatuses[index + 1]}
                    index={index}
                    isVertical={true}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        {showLegend && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 border-t pt-4">
            <LegendItem
              status="completed"
              label={t('workflow.legend.completed')}
            />
            <LegendItem
              status="current"
              label={t('workflow.legend.current')}
            />
            <LegendItem
              status="pending"
              label={t('workflow.legend.pending')}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LegendItem({ status, label }: { status: WorkflowStageStatus; label: string }) {
  const statusStyles: Record<WorkflowStageStatus, string> = {
    completed: 'bg-green-500',
    current: 'bg-primary animate-pulse',
    pending: 'bg-muted-foreground/30',
    skipped: 'bg-muted-foreground/20 border-dashed border',
  };

  return (
    <div className="flex items-center gap-2">
      <div className={cn('h-3 w-3 rounded-full', statusStyles[status])} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
