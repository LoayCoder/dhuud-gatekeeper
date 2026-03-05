/**
 * Unified Workflow Tracker
 * Single consistent timeline UI for all observations
 * Replaces separate contractor/department trackers with unified stages
 */

import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  ClipboardCheck, 
  Shield, 
  CheckCircle, 
  Lock,
  Clock,
  UserCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkflowStepNode, type StepStatus } from "./WorkflowStepNode";
import type { IncidentWithDetails } from '@/features/incidents';

interface WorkflowActor {
  full_name: string | null;
  timestamp: string | null;
}

interface WorkflowActors {
  submitted_by?: WorkflowActor;
  initial_reviewer?: WorkflowActor;
  expert_reviewer?: WorkflowActor;
  approver?: WorkflowActor;
  implementer?: WorkflowActor;
  closure_approver?: WorkflowActor;
}

interface UnifiedWorkflowTrackerProps {
  incident: IncidentWithDetails;
  workflowActors?: WorkflowActors;
  variant?: 'horizontal' | 'vertical' | 'compact';
}

interface WorkflowStep {
  key: string;
  label: string;
  subLabel?: string;
  icon: React.ReactNode;
  status: StepStatus;
  actorName?: string | null;
  timestamp?: string | null;
  description?: string;
}

// Unified status categories for determining step completion
const SUBMITTED_STATUSES = ['submitted'];
const REVIEW_STATUSES = [
  'pending_consultant_screening', 'expert_screening',
  'pending_dept_rep_approval', 'pending_dept_rep_review'
];
const EXPERT_REVIEW_STATUSES = ['pending_hsse_expert_review', 'pending_hsse_validation'];
const APPROVAL_STATUSES = [
  'pending_site_client_approval', 'pending_manager_approval',
  'pending_department_manager_approval'
];
const ACTION_STATUSES = [
  'pending_contractor_implementation', 'contractor_action_implementation',
  'pending_consultant_verification', 'observation_actions_pending',
  'pending_action_completion', 'pending_action_verification'
];
const CLOSED_STATUSES = ['closed', 'hsse_enforced'];

export function UnifiedWorkflowTracker({
  incident,
  workflowActors,
  variant = 'horizontal',
}: UnifiedWorkflowTrackerProps) {
  const { t } = useTranslation();
  
  const status = incident.status as string;
  const isContractor = !!incident.related_contractor_company_id;
  const severity = (incident as unknown).severity_v2 || (incident as unknown).severity_level;
  
  // Contractor observations: no Expert Review step (HSSE is only via manual escalation)
  // Non-contractor observations: Expert Review may still be shown for L3+
  const getSeverityLevel = (): number => {
    if (typeof severity === 'number') return severity;
    if (typeof severity === 'string') {
      const match = severity.match(/level_?(\d)/i);
      if (match) return parseInt(match[1], 10);
    }
    return 1;
  };
  
  const severityLevel = getSeverityLevel();
  // Only show Expert Review step for NON-contractor L3+ observations
  const showExpertReviewStep = !isContractor && severityLevel >= 3;

  // Determine step status based on current incident status
  const getStepStatus = (stepStatuses: string[], nextSteps: string[][]): StepStatus => {
    if (stepStatuses.includes(status)) return 'current';
    
    // If we're past this step (current status is in a later stage)
    const allLaterStatuses = nextSteps.flat();
    if (allLaterStatuses.includes(status) || CLOSED_STATUSES.includes(status)) {
      return 'completed';
    }
    
    return 'pending';
  };

  // Build unified workflow steps
  const getUnifiedSteps = (): WorkflowStep[] => {
    const steps: WorkflowStep[] = [];
    
    // Step 1: Submitted (always present)
    steps.push({
      key: 'submitted',
      label: t('workflow.unified.submitted', 'Submitted'),
      icon: <FileText className="h-4 w-4" />,
      status: SUBMITTED_STATUSES.includes(status) ? 'current' : 'completed',
      actorName: workflowActors?.submitted_by?.full_name,
      timestamp: incident.created_at,
    });
    
    // Step 2: Initial Review (Consultant for contractor, Dept Rep for others)
    const reviewerRole = isContractor 
      ? t('workflow.unified.consultantReview', 'Consultant')
      : t('workflow.unified.deptRepReview', 'Dept Rep');
    
    steps.push({
      key: 'initial_review',
      label: t('workflow.unified.initialReview', 'Initial Review'),
      subLabel: reviewerRole,
      icon: <ClipboardCheck className="h-4 w-4" />,
      status: getStepStatus(REVIEW_STATUSES, [EXPERT_REVIEW_STATUSES, APPROVAL_STATUSES, ACTION_STATUSES, CLOSED_STATUSES]),
      actorName: workflowActors?.initial_reviewer?.full_name,
      timestamp: workflowActors?.initial_reviewer?.timestamp,
    });
    
    // Step 3: Expert Review (only for NON-contractor L3+ observations or if already in that status)
    // Contractor observations skip this - HSSE is only via manual escalation button
    if (showExpertReviewStep || EXPERT_REVIEW_STATUSES.includes(status)) {
      steps.push({
        key: 'expert_review',
        label: t('workflow.unified.expertReview', 'Expert Review'),
        subLabel: t('workflow.unified.hsseExpert', 'HSSE'),
        icon: <Shield className="h-4 w-4" />,
        status: getStepStatus(EXPERT_REVIEW_STATUSES, [APPROVAL_STATUSES, ACTION_STATUSES, CLOSED_STATUSES]),
        actorName: workflowActors?.expert_reviewer?.full_name,
        timestamp: workflowActors?.expert_reviewer?.timestamp,
        description: t('workflow.unified.level3Required', 'Required for L3+'),
      });
    }
    
    // Step 4: Approval (Site Client for contractor, Manager for others)
    const approverRole = isContractor
      ? t('workflow.unified.siteClient', 'Site Client')
      : t('workflow.unified.manager', 'Manager');
    
    // Only show if we reach this stage
    const showApprovalStep = APPROVAL_STATUSES.includes(status) || 
                             ACTION_STATUSES.includes(status) ||
                             CLOSED_STATUSES.includes(status) ||
                             (isContractor && !SUBMITTED_STATUSES.includes(status) && !REVIEW_STATUSES.includes(status));
    
    if (showApprovalStep || isContractor) {
      steps.push({
        key: 'approval',
        label: t('workflow.unified.approval', 'Approval'),
        subLabel: approverRole,
        icon: <UserCheck className="h-4 w-4" />,
        status: getStepStatus(APPROVAL_STATUSES, [ACTION_STATUSES, CLOSED_STATUSES]),
        actorName: workflowActors?.approver?.full_name,
        timestamp: workflowActors?.approver?.timestamp,
      });
    }
    
    // Step 5: Actions & Verification
    steps.push({
      key: 'actions',
      label: t('workflow.unified.actions', 'Actions'),
      icon: <Clock className="h-4 w-4" />,
      status: getStepStatus(ACTION_STATUSES, [CLOSED_STATUSES]),
      actorName: workflowActors?.implementer?.full_name,
    });
    
    // Step 6: Closed
    steps.push({
      key: 'closed',
      label: status === 'hsse_enforced' 
        ? t('workflow.unified.enforced', 'Enforced')
        : t('workflow.unified.closed', 'Closed'),
      icon: status === 'hsse_enforced' ? <Shield className="h-4 w-4" /> : <Lock className="h-4 w-4" />,
      status: CLOSED_STATUSES.includes(status) 
        ? (status === 'hsse_enforced' ? 'enforced' : 'completed')
        : 'pending',
      actorName: workflowActors?.closure_approver?.full_name,
    });
    
    return steps;
  };

  const steps = getUnifiedSteps();
  const completedSteps = steps.filter(s => s.status === 'completed' || s.status === 'enforced').length;
  const currentStepIndex = steps.findIndex(s => s.status === 'current');

  // Get current responsible role
  const getCurrentRole = (): string | null => {
    if (REVIEW_STATUSES.includes(status)) {
      return isContractor ? t('roles.contractor_consultant', 'Contractor Consultant') : t('roles.department_representative', 'Dept Rep');
    }
    if (EXPERT_REVIEW_STATUSES.includes(status)) {
      return t('roles.hsse_expert', 'HSSE Expert');
    }
    if (APPROVAL_STATUSES.includes(status)) {
      return isContractor ? t('roles.site_client', 'Site Client') : t('roles.manager', 'Manager');
    }
    if (ACTION_STATUSES.includes(status)) {
      return isContractor ? t('roles.contractor', 'Contractor') : t('roles.action_owner', 'Action Owner');
    }
    return null;
  };

  const currentRole = getCurrentRole();

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {steps.map((step, index) => (
          <WorkflowStepNode
            key={step.key}
            label={step.label}
            status={step.status}
            icon={step.icon}
            isLast={index === steps.length - 1}
            variant="compact"
          />
        ))}
      </div>
    );
  }

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/20 border-b pb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2.5 rounded-xl",
              "bg-primary/10"
            )}>
              <ClipboardCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {t('workflow.unified.title', 'Observation Progress')}
              </CardTitle>
              {currentRole && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t('workflow.unified.currentlyWith', 'Currently with')}: <span className="font-medium text-foreground">{currentRole}</span>
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isContractor && (
              <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200">
                {t('workflow.unified.contractorTag', 'Contractor')}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {t('workflow.unified.progress', '{{completed}} of {{total}}', {
                completed: completedSteps,
                total: steps.length
              })}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        {variant === 'horizontal' ? (
          <div className="flex items-start justify-center overflow-x-auto py-2">
            {steps.map((step, index) => (
              <WorkflowStepNode
                key={step.key}
                label={step.label}
                description={step.subLabel || step.description}
                status={step.status}
                icon={step.icon}
                actorName={step.actorName}
                timestamp={step.timestamp}
                isLast={index === steps.length - 1}
                variant="horizontal"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-0">
            {steps.map((step, index) => (
              <WorkflowStepNode
                key={step.key}
                label={step.label}
                description={step.subLabel || step.description}
                status={step.status}
                icon={step.icon}
                actorName={step.actorName}
                timestamp={step.timestamp}
                isLast={index === steps.length - 1}
                variant="vertical"
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

