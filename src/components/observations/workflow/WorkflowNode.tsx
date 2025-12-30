import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  WorkflowStage,
  WorkflowStageStatus,
  ROLE_COLORS,
  STATUS_COLORS,
} from './workflow-config';

interface WorkflowNodeProps {
  stage: WorkflowStage;
  status: WorkflowStageStatus;
  index: number;
  compact?: boolean;
}

export function WorkflowNode({ stage, status, index, compact = false }: WorkflowNodeProps) {
  const { t } = useTranslation();
  const Icon = stage.icon;
  const roleColors = ROLE_COLORS[stage.role];
  const statusColors = STATUS_COLORS[status];

  const nodeContent = (
    <div
      className={cn(
        'flex flex-col items-center gap-2',
        'animate-node-enter',
        compact ? 'min-w-[60px]' : 'min-w-[100px]'
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Node Circle */}
      <div
        className={cn(
          'relative flex items-center justify-center rounded-full border-2 transition-all duration-300',
          compact ? 'h-10 w-10' : 'h-14 w-14',
          statusColors.bg,
          statusColors.border,
          status === 'current' && 'animate-workflow-pulse'
        )}
      >
        <Icon
          className={cn(
            'transition-colors duration-300',
            compact ? 'h-5 w-5' : 'h-6 w-6',
            statusColors.icon
          )}
        />
        
        {/* Completed checkmark overlay */}
        {status === 'completed' && (
          <div className="absolute -end-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white">
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Stage Label */}
      {!compact && (
        <span
          className={cn(
            'text-center text-xs font-medium leading-tight',
            status === 'current' && 'text-primary',
            status === 'completed' && 'text-green-600 dark:text-green-400',
            status === 'pending' && 'text-muted-foreground',
            status === 'skipped' && 'text-muted-foreground/50'
          )}
        >
          {t(stage.labelKey)}
        </span>
      )}

      {/* Role Badge */}
      <Badge
        variant="outline"
        className={cn(
          'text-[10px] font-medium',
          roleColors.bg,
          roleColors.text,
          roleColors.border,
          compact && 'px-1 py-0'
        )}
      >
        {t(`workflow.roles.${stage.role}`)}
      </Badge>
    </div>
  );

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{nodeContent}</TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="font-medium">{t(stage.labelKey)}</p>
            <p className="text-xs text-muted-foreground">
              {t(`workflow.roles.${stage.role}`)}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return nodeContent;
}
