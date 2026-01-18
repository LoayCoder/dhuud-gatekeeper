/**
 * ApprovalStageIndicator
 * 
 * Visual step-by-step indicator showing all approval stages with current progress.
 * RTL-compliant with logical properties.
 */
import { User, Shield, ShieldCheck, Building, Check, X, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';

export type ApprovalStage = 'area_rep' | 'hsse' | 'security' | 'site_client';
export type ApprovalDecision = 'approved' | 'rejected' | 'escalated' | null;

interface CompletedStage {
  stage: ApprovalStage;
  decision: ApprovalDecision;
  approverName?: string;
  decisionAt?: string;
}

interface ApprovalStageIndicatorProps {
  currentStage: ApprovalStage | null;
  completedStages: CompletedStage[];
  variant?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
}

const APPROVAL_STAGES: Array<{ 
  key: ApprovalStage; 
  icon: typeof User; 
  labelKey: string; 
  defaultLabel: string;
}> = [
  { key: 'area_rep', icon: User, labelKey: 'visitors.approvals.areaRep', defaultLabel: 'Area Rep' },
  { key: 'hsse', icon: Shield, labelKey: 'visitors.approvals.hsse', defaultLabel: 'HSSE' },
  { key: 'security', icon: ShieldCheck, labelKey: 'visitors.approvals.security', defaultLabel: 'Security' },
  { key: 'site_client', icon: Building, labelKey: 'visitors.approvals.siteClient', defaultLabel: 'Site Client' },
];

const sizeClasses = {
  sm: { icon: 'h-4 w-4', circle: 'h-8 w-8', text: 'text-xs' },
  md: { icon: 'h-5 w-5', circle: 'h-10 w-10', text: 'text-sm' },
  lg: { icon: 'h-6 w-6', circle: 'h-12 w-12', text: 'text-base' },
};

export function ApprovalStageIndicator({
  currentStage,
  completedStages,
  variant = 'horizontal',
  size = 'md',
}: ApprovalStageIndicatorProps) {
  const { t } = useTranslation();
  const classes = sizeClasses[size];

  const getStageStatus = (stageKey: ApprovalStage) => {
    const completed = completedStages.find(s => s.stage === stageKey);
    if (completed) return completed;
    if (stageKey === currentStage) return { stage: stageKey, decision: null as ApprovalDecision };
    return null;
  };

  const getStageStyles = (stageKey: ApprovalStage) => {
    const status = getStageStatus(stageKey);
    
    if (!status) {
      // Future stage
      return {
        circle: 'bg-muted border-muted-foreground/30',
        icon: 'text-muted-foreground/50',
        connector: 'border-dashed border-muted-foreground/30',
      };
    }

    if (status.decision === 'approved') {
      return {
        circle: 'bg-green-500 border-green-600',
        icon: 'text-white',
        connector: 'border-solid border-green-500',
      };
    }

    if (status.decision === 'rejected') {
      return {
        circle: 'bg-destructive border-destructive',
        icon: 'text-white',
        connector: 'border-solid border-destructive',
      };
    }

    if (status.decision === 'escalated') {
      return {
        circle: 'bg-blue-500 border-blue-600',
        icon: 'text-white',
        connector: 'border-solid border-blue-500',
      };
    }

    // Current pending stage
    return {
      circle: 'bg-amber-500 border-amber-600 animate-pulse',
      icon: 'text-white',
      connector: 'border-dashed border-amber-500',
    };
  };

  const renderStageIcon = (stageKey: ApprovalStage, StageIcon: typeof User) => {
    const status = getStageStatus(stageKey);
    
    if (status?.decision === 'approved') {
      return <Check className={classes.icon} />;
    }
    if (status?.decision === 'rejected') {
      return <X className={classes.icon} />;
    }
    if (status?.decision === null && stageKey === currentStage) {
      return <Clock className={classes.icon} />;
    }
    return <StageIcon className={classes.icon} />;
  };

  const isVertical = variant === 'vertical';

  return (
    <TooltipProvider>
      <div className={cn(
        'flex',
        isVertical ? 'flex-col gap-2' : 'flex-row items-center gap-1'
      )}>
        {APPROVAL_STAGES.map((stage, index) => {
          const styles = getStageStyles(stage.key);
          const status = getStageStatus(stage.key);
          const isLast = index === APPROVAL_STAGES.length - 1;

          return (
            <div key={stage.key} className={cn(
              'flex items-center',
              isVertical ? 'flex-row gap-3' : 'flex-col gap-1'
            )}>
              <div className={cn(
                'flex items-center',
                !isVertical && 'flex-col'
              )}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      'flex items-center justify-center rounded-full border-2',
                      classes.circle,
                      styles.circle
                    )}>
                      <span className={styles.icon}>
                        {renderStageIcon(stage.key, stage.icon)}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-start">
                      <p className="font-medium">{t(stage.labelKey, stage.defaultLabel)}</p>
                      {status?.approverName && (
                        <p className="text-muted-foreground">
                          {status.approverName}
                        </p>
                      )}
                      {status?.decisionAt && (
                        <p className="text-muted-foreground text-xs">
                          {format(new Date(status.decisionAt), 'PPp')}
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>

                {/* Stage label - only show on vertical or large horizontal */}
                {(isVertical || size === 'lg') && (
                  <span className={cn(
                    'font-medium text-muted-foreground',
                    classes.text,
                    isVertical ? 'ms-3' : 'mt-1'
                  )}>
                    {t(stage.labelKey, stage.defaultLabel)}
                  </span>
                )}
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className={cn(
                  'border-t-2',
                  styles.connector,
                  isVertical ? 'h-4 w-0 border-s-2 border-t-0 ms-4' : 'w-8 flex-shrink-0'
                )} />
              )}
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
