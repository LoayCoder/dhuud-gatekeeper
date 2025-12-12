import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { 
  ClipboardList, 
  PlayCircle, 
  FileCheck, 
  ShieldCheck, 
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
  { key: 'completed', icon: FileCheck, labelKey: 'actions.timeline.pendingVerification' },
  { key: 'verified', icon: ShieldCheck, labelKey: 'actions.timeline.verified' },
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
      return 3;
    case 'closed':
      return 4;
    default:
      return 0;
  }
}

export function ActionWorkflowTimeline({ 
  currentStatus, 
  returnCount = 0,
  className 
}: ActionWorkflowTimelineProps) {
  const { t } = useTranslation();
  
  const currentIndex = getStageIndex(currentStatus);
  const isReturned = currentStatus === 'returned_for_correction';

  return (
    <div className={cn('w-full', className)}>
      {/* Desktop horizontal view */}
      <div className="hidden sm:flex items-center justify-between relative">
        {/* Connecting line */}
        <div className="absolute inset-x-0 top-4 h-0.5 bg-muted mx-8" />
        
        {/* Progress line */}
        <div 
          className="absolute top-4 h-0.5 bg-primary mx-8 transition-all duration-500"
          style={{ 
            width: `calc(${(currentIndex / (WORKFLOW_STAGES.length - 1)) * 100}% - 4rem)`,
            left: '2rem'
          }}
        />
        
        {WORKFLOW_STAGES.map((stage, index) => {
          const Icon = stage.icon;
          const isPast = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;
          const showReturnIndicator = isReturned && index === 2; // Show on "completed" stage
          
          return (
            <div key={stage.key} className="flex flex-col items-center gap-2 relative z-10">
              {/* Node */}
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300',
                  isPast && 'bg-green-500 text-white',
                  isCurrent && !isReturned && 'bg-primary text-primary-foreground ring-4 ring-primary/20 animate-pulse',
                  isCurrent && isReturned && 'bg-destructive text-destructive-foreground ring-4 ring-destructive/20',
                  isFuture && 'bg-muted text-muted-foreground border-2 border-muted-foreground/30'
                )}
              >
                {isPast ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              
              {/* Label */}
              <span 
                className={cn(
                  'text-xs font-medium text-center max-w-[80px]',
                  isPast && 'text-green-600 dark:text-green-400',
                  isCurrent && !isReturned && 'text-primary',
                  isCurrent && isReturned && 'text-destructive',
                  isFuture && 'text-muted-foreground'
                )}
              >
                {t(stage.labelKey, stage.key)}
              </span>
              
              {/* Return indicator */}
              {showReturnIndicator && returnCount > 0 && (
                <div className="absolute -bottom-6 flex items-center gap-1">
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-1">
                    <RotateCcw className="h-2.5 w-2.5" />
                    {returnCount}
                  </Badge>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile vertical view */}
      <div className="sm:hidden flex flex-col gap-1">
        {WORKFLOW_STAGES.map((stage, index) => {
          const Icon = stage.icon;
          const isPast = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;
          const showReturnIndicator = isReturned && index === 2;
          
          return (
            <div key={stage.key} className="flex items-center gap-3 relative">
              {/* Connecting line */}
              {index < WORKFLOW_STAGES.length - 1 && (
                <div 
                  className={cn(
                    'absolute start-3 top-6 w-0.5 h-5',
                    index < currentIndex ? 'bg-green-500' : 'bg-muted'
                  )} 
                />
              )}
              
              {/* Node */}
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300',
                  isPast && 'bg-green-500 text-white',
                  isCurrent && !isReturned && 'bg-primary text-primary-foreground ring-2 ring-primary/20',
                  isCurrent && isReturned && 'bg-destructive text-destructive-foreground ring-2 ring-destructive/20',
                  isFuture && 'bg-muted text-muted-foreground border border-muted-foreground/30'
                )}
              >
                {isPast ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <Icon className="h-3 w-3" />
                )}
              </div>
              
              {/* Label */}
              <span 
                className={cn(
                  'text-xs font-medium flex-1',
                  isPast && 'text-green-600 dark:text-green-400',
                  isCurrent && !isReturned && 'text-primary',
                  isCurrent && isReturned && 'text-destructive',
                  isFuture && 'text-muted-foreground'
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
          );
        })}
      </div>
    </div>
  );
}
