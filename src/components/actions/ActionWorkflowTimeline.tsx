import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { 
  ClipboardList, 
  PlayCircle, 
  FileCheck, 
  CheckCircle2,
  RotateCcw 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ActionWorkflowTimelineProps {
  currentStatus: string | null;
  returnCount?: number;
  className?: string;
}

const WORKFLOW_STAGES = [
  { key: 'assigned', icon: ClipboardList, labelKey: 'actions.timeline.assigned' },
  { key: 'in_progress', icon: PlayCircle, labelKey: 'actions.timeline.inProgress' },
  { key: 'pending_verification', icon: FileCheck, labelKey: 'actions.timeline.pendingVerification' },
  { key: 'closed', icon: CheckCircle2, labelKey: 'actions.timeline.closed' },
] as const;

// Map status to stage index
function getStageIndex(status: string | null): number {
  switch (status) {
    case 'assigned':
    case 'pending':
      return 0;
    case 'in_progress':
      return 1;
    case 'completed':
    case 'returned_for_correction':
      return 2;
    case 'verified':
    case 'closed':
      return 3;
    default:
      return 0;
  }
}

// Get stage styling based on position and closed state
function getStageStyle(index: number, currentIndex: number, isClosed: boolean): string {
  if (isClosed) {
    // All stages green when closed
    return 'bg-green-500 text-white';
  }
  if (index < currentIndex) {
    // Past stages - Blue
    return 'bg-blue-500 text-white';
  }
  if (index === currentIndex) {
    // Current stage - Orange
    return 'bg-orange-500 text-white';
  }
  // Future stages - Gray
  return 'bg-gray-200 text-gray-500';
}

// Get label styling based on position and closed state
function getLabelStyle(index: number, currentIndex: number, isClosed: boolean, isReturned: boolean): string {
  if (isClosed) {
    return 'text-green-600 dark:text-green-400';
  }
  if (isReturned && index === currentIndex) {
    return 'text-destructive';
  }
  if (index < currentIndex) {
    return 'text-blue-600 dark:text-blue-400';
  }
  if (index === currentIndex) {
    return 'text-orange-600 dark:text-orange-400';
  }
  return 'text-muted-foreground';
}

// Get connector line color
function getConnectorColor(index: number, currentIndex: number, isClosed: boolean): string {
  if (isClosed) {
    return 'bg-green-500';
  }
  if (index < currentIndex) {
    return 'bg-blue-500';
  }
  return 'bg-gray-200';
}

export function ActionWorkflowTimeline({ 
  currentStatus, 
  returnCount = 0,
  className 
}: ActionWorkflowTimelineProps) {
  const { t } = useTranslation();
  
  const currentIndex = getStageIndex(currentStatus);
  const isReturned = currentStatus === 'returned_for_correction';
  const isClosed = currentStatus === 'closed' || currentStatus === 'verified';

  return (
    <div className={cn('w-full', className)}>
      {/* Desktop horizontal view */}
      <div className="hidden sm:flex items-start justify-between relative px-4">
        {WORKFLOW_STAGES.map((stage, index) => {
          const Icon = stage.icon;
          const showReturnIndicator = isReturned && index === 2;
          
          return (
            <div key={stage.key} className="flex flex-col items-center gap-2 relative z-10 flex-1">
              {/* Connector line to next stage */}
              {index < WORKFLOW_STAGES.length - 1 && (
                <div 
                  className={cn(
                    'absolute top-4 h-0.5 rounded-full transition-colors duration-300',
                    getConnectorColor(index, currentIndex, isClosed)
                  )}
                  style={{
                    left: 'calc(50% + 16px)',
                    right: 'calc(-50% + 16px)',
                  }}
                />
              )}
              
              {/* Node */}
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300 relative',
                  getStageStyle(index, currentIndex, isClosed),
                  isReturned && index === currentIndex && 'bg-destructive text-destructive-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              
              {/* Label */}
              <span 
                className={cn(
                  'text-xs font-medium text-center max-w-[80px]',
                  getLabelStyle(index, currentIndex, isClosed, isReturned)
                )}
              >
                {t(stage.labelKey, stage.key)}
              </span>
              
              {/* Return indicator */}
              {showReturnIndicator && returnCount > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-1 mt-1">
                  <RotateCcw className="h-2.5 w-2.5" />
                  {returnCount}
                </Badge>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile vertical view */}
      <div className="sm:hidden flex flex-col gap-0">
        {WORKFLOW_STAGES.map((stage, index) => {
          const Icon = stage.icon;
          const showReturnIndicator = isReturned && index === 2;
          
          return (
            <div key={stage.key} className="flex items-start gap-3 relative">
              {/* Vertical connector line */}
              {index < WORKFLOW_STAGES.length - 1 && (
                <div 
                  className={cn(
                    'absolute start-3 top-6 w-0.5 h-6 rounded-full transition-colors duration-300',
                    getConnectorColor(index, currentIndex, isClosed)
                  )} 
                />
              )}
              
              {/* Node */}
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-300',
                  getStageStyle(index, currentIndex, isClosed),
                  isReturned && index === currentIndex && 'bg-destructive text-destructive-foreground'
                )}
              >
                <Icon className="h-3 w-3" />
              </div>
              
              {/* Label and return indicator */}
              <div className="flex items-center gap-2 pb-4 flex-1">
                <span 
                  className={cn(
                    'text-xs font-medium',
                    getLabelStyle(index, currentIndex, isClosed, isReturned)
                  )}
                >
                  {t(stage.labelKey, stage.key)}
                </span>
                
                {/* Return indicator */}
                {showReturnIndicator && returnCount > 0 && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-1">
                    <RotateCcw className="h-2.5 w-2.5" />
                    {returnCount}
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
