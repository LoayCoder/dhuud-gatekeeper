import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import { WorkflowStageStatus } from './workflow-config';

interface WorkflowConnectorProps {
  fromStatus: WorkflowStageStatus;
  toStatus: WorkflowStageStatus;
  index: number;
  isVertical?: boolean;
}

export function WorkflowConnector({
  fromStatus,
  toStatus,
  index,
  isVertical = false,
}: WorkflowConnectorProps) {
  const isCompleted = fromStatus === 'completed';
  const isCurrent = fromStatus === 'current';
  const isSkipped = fromStatus === 'skipped' || toStatus === 'skipped';

  if (isVertical) {
    return (
      <div
        className={cn(
          'relative mx-auto flex h-8 w-0.5 items-center justify-center',
          isCompleted && 'bg-green-500',
          isCurrent && 'bg-primary',
          !isCompleted && !isCurrent && 'bg-muted-foreground/30',
          isSkipped && 'bg-muted-foreground/20'
        )}
        style={{ animationDelay: `${index * 100 + 50}ms` }}
      >
        {/* Animated progress fill */}
        {isCurrent && (
          <div className="absolute inset-0 origin-top animate-workflow-progress bg-primary" />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative flex flex-1 items-center justify-center px-1',
        'animate-fade-in'
      )}
      style={{ animationDelay: `${index * 100 + 50}ms` }}
    >
      {/* Line */}
      <div
        className={cn(
          'h-0.5 flex-1 transition-colors duration-300',
          isCompleted && 'bg-green-500',
          isCurrent && 'bg-primary',
          !isCompleted && !isCurrent && 'bg-muted-foreground/30',
          isSkipped && 'bg-muted-foreground/20 border-dashed border-t-2 border-muted-foreground/20 bg-transparent'
        )}
      />
      
      {/* Arrow */}
      <ChevronRight
        className={cn(
          'h-4 w-4 shrink-0 rtl:rotate-180',
          isCompleted && 'text-green-500',
          isCurrent && 'text-primary',
          !isCompleted && !isCurrent && 'text-muted-foreground/30',
          isSkipped && 'text-muted-foreground/20'
        )}
      />
      
      {/* Line continuation */}
      <div
        className={cn(
          'h-0.5 flex-1 transition-colors duration-300',
          isCompleted && 'bg-green-500',
          isCurrent && 'bg-primary',
          !isCompleted && !isCurrent && 'bg-muted-foreground/30',
          isSkipped && 'bg-muted-foreground/20 border-dashed border-t-2 border-muted-foreground/20 bg-transparent'
        )}
      />
    </div>
  );
}
