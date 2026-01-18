/**
 * VisitorApprovalWorkflow
 * 
 * Complete workflow view showing full approval history for a visit request.
 * RTL-compliant with logical properties.
 */
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { User, Shield, ShieldCheck, Building, Check, X, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useVisitApprovalHistory } from '@/hooks/use-visitor-approvals';
import { ApprovalStageIndicator, ApprovalStage, ApprovalDecision } from './ApprovalStageIndicator';

interface VisitorApprovalWorkflowProps {
  visitRequestId: string;
  showActions?: boolean;
  compact?: boolean;
}

const stageIcons: Record<ApprovalStage, typeof User> = {
  area_rep: User,
  hsse: Shield,
  security: ShieldCheck,
  site_client: Building,
};

const stageLabels: Record<ApprovalStage, string> = {
  area_rep: 'Area Representative',
  hsse: 'HSSE Review',
  security: 'Security Check',
  site_client: 'Site Client Approval',
};

const decisionColors = {
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  escalated: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
};

const decisionIcons = {
  approved: Check,
  rejected: X,
  escalated: AlertTriangle,
  pending: Clock,
};

export function VisitorApprovalWorkflow({
  visitRequestId,
  compact = false,
}: VisitorApprovalWorkflowProps) {
  const { t } = useTranslation();
  const { data: approvals, isLoading, error } = useVisitApprovalHistory(visitRequestId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t('common.error', 'Error loading data')}
        </CardContent>
      </Card>
    );
  }

  if (!approvals || approvals.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t('visitors.approvals.noApprovals', 'No approval workflow initiated')}
        </CardContent>
      </Card>
    );
  }

  // Build completed stages for indicator
  const completedStages = approvals
    .filter(a => a.decision)
    .map(a => ({
      stage: a.approval_stage as ApprovalStage,
      decision: a.decision as ApprovalDecision,
      approverName: undefined, // Would need to join profiles
      decisionAt: a.decision_at || undefined,
    }));

  // Find current pending stage
  const pendingApproval = approvals.find(a => !a.decision);
  const currentStage = pendingApproval?.approval_stage as ApprovalStage | null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {t('visitors.approvals.workflowTitle', 'Approval Workflow')}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Stage Indicator */}
        <ApprovalStageIndicator
          currentStage={currentStage}
          completedStages={completedStages}
          variant={compact ? 'horizontal' : 'horizontal'}
          size={compact ? 'sm' : 'md'}
        />

        {/* Timeline of approvals */}
        {!compact && (
          <div className="space-y-4 mt-6">
            <h4 className="text-sm font-medium text-muted-foreground">
              {t('visitors.approvals.history', 'Approval History')}
            </h4>
            
            <div className="relative ps-6 space-y-4">
              {/* Vertical line */}
              <div className="absolute start-2 top-2 bottom-2 w-0.5 bg-border" />

              {approvals.map((approval) => {
                const stage = approval.approval_stage as ApprovalStage;
                const StageIcon = stageIcons[stage];
                const decision = approval.decision as ApprovalDecision | null;
                const DecisionIcon = decision ? decisionIcons[decision] : decisionIcons.pending;
                const colorClass = decision ? decisionColors[decision] : decisionColors.pending;

                return (
                  <div key={approval.id} className="relative flex gap-4">
                    {/* Timeline dot */}
                    <div className="absolute start-[-18px] top-1 h-4 w-4 rounded-full border-2 border-background bg-muted flex items-center justify-center">
                      <div className={`h-2 w-2 rounded-full ${decision === 'approved' ? 'bg-green-500' : decision === 'rejected' ? 'bg-destructive' : 'bg-amber-500'}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <StageIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {t(`visitors.approvals.${stage}`, stageLabels[stage])}
                          </span>
                        </div>
                        
                        <Badge className={colorClass}>
                          <DecisionIcon className="h-3 w-3 me-1" />
                          {decision 
                            ? t(`visitors.approvals.${decision}`, decision) 
                            : t('visitors.approvals.pending', 'Pending')}
                        </Badge>
                      </div>

                      {approval.decision_at && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(approval.decision_at), 'PPp')}
                        </p>
                      )}

                      {approval.notes && (
                        <p className="text-sm mt-2 text-muted-foreground italic">
                          "{approval.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
