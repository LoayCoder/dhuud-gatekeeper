/**
 * Observation Workflow Tracker
 * Visual component showing where an observation is in its lifecycle
 * Supports both Contractor and Normal observation paths
 */

import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  ClipboardCheck, 
  Shield, 
  UserCheck, 
  Clock, 
  CheckCircle, 
  Lock,
  HardHat,
  Building2,
  AlertTriangle,
  MessageSquare,
  ShieldCheck,
  GitBranch,
  ArrowDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkflowStepNode, type StepStatus } from "./WorkflowStepNode";
import type { IncidentWithDetails } from "@/hooks/use-incidents";

interface WorkflowActor {
  full_name: string | null;
  timestamp: string | null;
}

interface WorkflowActors {
  submitted_by?: WorkflowActor;
  dept_rep?: WorkflowActor;
  consultant?: WorkflowActor;
  expert_screener?: WorkflowActor;
  site_client?: WorkflowActor;
  contractor?: WorkflowActor;
  hsse_manager?: WorkflowActor;
  closure_approver?: WorkflowActor;
}

interface ObservationWorkflowTrackerProps {
  incident: IncidentWithDetails;
  workflowActors?: WorkflowActors;
  variant?: 'horizontal' | 'vertical' | 'compact';
  showSeverityRouting?: boolean;
}

interface WorkflowStep {
  key: string;
  label: string;
  icon: React.ReactNode;
  status: StepStatus;
  actorName?: string | null;
  timestamp?: string | null;
  description?: string;
}

export function ObservationWorkflowTracker({
  incident,
  workflowActors,
  variant = 'horizontal',
  showSeverityRouting = true,
}: ObservationWorkflowTrackerProps) {
  const { t } = useTranslation();
  
  const status = incident.status as string;
  const isContractor = !!incident.related_contractor_company_id;
  const severity = (incident as any).severity_v2 || (incident as any).severity_level;
  
  // Parse severity level number
  const getSeverityLevel = (): number => {
    if (typeof severity === 'number') return severity;
    if (typeof severity === 'string') {
      const match = severity.match(/level_?(\d)/i);
      if (match) return parseInt(match[1], 10);
    }
    return 0;
  };
  
  const severityLevel = getSeverityLevel();
  const isLevel3Plus = severityLevel >= 3;
  const isLevel5 = severityLevel === 5;

  // Build workflow steps based on path type and current status
  const getContractorWorkflowSteps = (): WorkflowStep[] => {
    const steps: WorkflowStep[] = [];
    
    // Step 1: Submitted
    steps.push({
      key: 'submitted',
      label: t('workflow.tracker.steps.submitted', 'Submitted'),
      icon: <FileText className="h-4 w-4" />,
      status: status === 'submitted' ? 'current' : 'completed',
      actorName: workflowActors?.submitted_by?.full_name,
      timestamp: incident.created_at,
    });
    
    // Step 2: Consultant Screening
    // Use timestamp-based completion check - only marked complete if actually screened
    const consultantScreenedAt = (incident as any).consultant_screened_at;
    const consultantCompleted = consultantScreenedAt != null;
    
    steps.push({
      key: 'consultant_screening',
      label: t('workflow.tracker.steps.consultantScreening', 'Consultant Screening'),
      icon: <HardHat className="h-4 w-4" />,
      status: status === 'pending_consultant_screening' ? 'current' : 
              consultantCompleted ? 'completed' : 'pending',
      actorName: workflowActors?.consultant?.full_name,
      timestamp: consultantScreenedAt,
      description: status === 'pending_consultant_screening' 
        ? t('workflow.tracker.descriptions.consultantReviewing', 'Consultant reviewing observation')
        : undefined,
    });
    
    // Step 2.5: Dept Rep Review (if in dept rep approval flow)
    const deptRepStatuses = ['pending_dept_rep_approval', 'pending_dept_rep_review'];
    const deptRepAcknowledgedAt = (incident as any).dept_rep_acknowledged_at;
    const deptRepCompleted = deptRepAcknowledgedAt != null;
    
    if (deptRepStatuses.includes(status) || deptRepCompleted) {
      steps.push({
        key: 'dept_rep_review',
        label: t('workflow.tracker.steps.deptRepReview', 'Dept Rep Review'),
        icon: <ClipboardCheck className="h-4 w-4" />,
        status: deptRepStatuses.includes(status) ? 'current' : 
                deptRepCompleted ? 'completed' : 'pending',
        actorName: workflowActors?.dept_rep?.full_name,
        timestamp: deptRepAcknowledgedAt,
      });
    }
    
    // Step 3: HSSE Expert Review (Level 3+ only)
    if (isLevel3Plus || status === 'pending_hsse_expert_review') {
      // Use timestamp-based check for HSSE expert completion
      const hsseReviewedAt = (incident as any).hsse_expert_reviewed_at || (incident as any).expert_screened_at;
      const hsseCompleted = hsseReviewedAt != null;
      
      steps.push({
        key: 'hsse_expert_review',
        label: t('workflow.tracker.steps.hsseExpertReview', 'HSSE Expert Review'),
        icon: <Shield className="h-4 w-4" />,
        status: status === 'pending_hsse_expert_review' ? 'current' : 
                hsseCompleted ? 'completed' : 'pending',
        actorName: workflowActors?.expert_screener?.full_name,
        timestamp: hsseReviewedAt,
        description: isLevel3Plus 
          ? t('workflow.tracker.descriptions.level3PlusRequired', 'Required for Level 3+ severity')
          : undefined,
      });
    }
    
    // Step 4: Site Client Approval
    const siteClientStatuses = ['pending_site_client_approval', 'pending_site_client_action_approval'];
    // Use timestamp-based check for site client approval
    const siteClientApprovedAt = (incident as any).site_client_approved_at;
    const siteClientCompleted = siteClientApprovedAt != null;
    
    steps.push({
      key: 'site_client_approval',
      label: t('workflow.tracker.steps.siteClientApproval', 'Site Client Approval'),
      icon: <Building2 className="h-4 w-4" />,
      status: siteClientStatuses.includes(status) ? 'current' : 
              siteClientCompleted ? 'completed' : 'pending',
      actorName: workflowActors?.site_client?.full_name,
      timestamp: siteClientApprovedAt,
    });
    
    // Step 5: Contractor Implementation
    const implementationStatuses = ['contractor_action_implementation', 'pending_contractor_action'];
    // Use timestamp-based check for contractor implementation
    const contractorImplementedAt = (incident as any).contractor_actions_completed_at || (incident as any).contractor_implemented_at;
    const implementationCompleted = contractorImplementedAt != null;
    
    steps.push({
      key: 'contractor_implementation',
      label: t('workflow.tracker.steps.contractorImplementation', 'Contractor Implementation'),
      icon: <Clock className="h-4 w-4" />,
      status: implementationStatuses.includes(status) ? 'current' : 
              implementationCompleted ? 'completed' : 'pending',
      actorName: workflowActors?.contractor?.full_name,
      timestamp: contractorImplementedAt,
    });
    
    // Step 6: Consultant Verification
    const verificationStatuses = ['pending_consultant_verification'];
    const verificationCompleted = ['closed', 'hsse_enforced'].includes(status);
    
    steps.push({
      key: 'consultant_verification',
      label: t('workflow.tracker.steps.consultantVerification', 'Consultant Verification'),
      icon: <ClipboardCheck className="h-4 w-4" />,
      status: verificationStatuses.includes(status) ? 'current' : 
              verificationCompleted ? 'completed' : 'pending',
      actorName: workflowActors?.consultant?.full_name,
    });
    
    // Handle Action Dispute step (if in dispute)
    if (status === 'pending_action_dispute_review') {
      steps.push({
        key: 'action_dispute',
        label: t('workflow.tracker.steps.actionDispute', 'Action Dispute'),
        icon: <MessageSquare className="h-4 w-4" />,
        status: 'current',
        description: t('workflow.tracker.descriptions.disputeUnderReview', 'Dispute under consultant review'),
      });
    }
    
    // Final Step: Closed / Enforced
    if (status === 'hsse_enforced') {
      steps.push({
        key: 'hsse_enforced',
        label: t('workflow.tracker.steps.hsseEnforced', 'HSSE Enforced'),
        icon: <ShieldCheck className="h-4 w-4" />,
        status: 'enforced',
        actorName: workflowActors?.hsse_manager?.full_name,
        timestamp: (incident as any).hsse_enforced_at,
        description: t('workflow.tracker.descriptions.finalDecision', 'Final decision - no appeals'),
      });
    } else if (status === 'closed') {
      steps.push({
        key: 'closed',
        label: t('workflow.tracker.steps.closed', 'Closed'),
        icon: <Lock className="h-4 w-4" />,
        status: 'completed',
        actorName: workflowActors?.closure_approver?.full_name,
      });
    } else if (!['pending_action_dispute_review'].includes(status)) {
      steps.push({
        key: 'closed',
        label: t('workflow.tracker.steps.closed', 'Closed'),
        icon: <Lock className="h-4 w-4" />,
        status: 'pending',
      });
    }
    
    return steps;
  };

  const getNormalWorkflowSteps = (): WorkflowStep[] => {
    const steps: WorkflowStep[] = [];
    
    // Step 1: Submitted
    steps.push({
      key: 'submitted',
      label: t('workflow.tracker.steps.submitted', 'Submitted'),
      icon: <FileText className="h-4 w-4" />,
      status: status === 'submitted' ? 'current' : 'completed',
      actorName: workflowActors?.submitted_by?.full_name,
      timestamp: incident.created_at,
    });
    
    // Step 2: Dept Rep Review
    const deptRepCompleted = ![
      'submitted', 
      'pending_dept_rep_review'
    ].includes(status);
    
    steps.push({
      key: 'dept_rep_review',
      label: t('workflow.tracker.steps.deptRepReview', 'Dept Rep Review'),
      icon: <ClipboardCheck className="h-4 w-4" />,
      status: status === 'pending_dept_rep_review' ? 'current' : 
              deptRepCompleted ? 'completed' : 'pending',
      actorName: workflowActors?.dept_rep?.full_name,
      timestamp: (incident as any).dept_rep_acknowledged_at,
    });
    
    // Step 3: HSSE Expert Review (Level 3+ only)
    if (isLevel3Plus || status === 'pending_hsse_expert_review') {
      const hsseCompleted = ![
        'submitted',
        'pending_dept_rep_review',
        'pending_hsse_expert_review'
      ].includes(status);
      
      steps.push({
        key: 'hsse_expert_review',
        label: t('workflow.tracker.steps.hsseExpertReview', 'HSSE Expert Review'),
        icon: <Shield className="h-4 w-4" />,
        status: status === 'pending_hsse_expert_review' ? 'current' : 
                hsseCompleted && isLevel3Plus ? 'completed' : 'pending',
        actorName: workflowActors?.expert_screener?.full_name,
        description: isLevel3Plus 
          ? t('workflow.tracker.descriptions.level3PlusRequired', 'Required for Level 3+ severity')
          : undefined,
      });
    }
    
    // Step 4: Actions Pending (if applicable)
    const actionsStatuses = ['observation_actions_pending', 'pending_hsse_validation'];
    const actionsCompleted = ['closed', 'hsse_enforced', 'pending_hsse_manager_closure', 'pending_final_closure'].includes(status);
    
    if (actionsStatuses.includes(status) || actionsCompleted) {
      steps.push({
        key: 'actions_pending',
        label: t('workflow.tracker.steps.actionsPending', 'Actions Pending'),
        icon: <Clock className="h-4 w-4" />,
        status: actionsStatuses.includes(status) ? 'current' : 
                actionsCompleted ? 'completed' : 'pending',
      });
    }
    
    // HSSE Manager step for Level 5
    if (isLevel5 || status === 'pending_hsse_manager_closure') {
      const hsseManagerCompleted = ['closed', 'hsse_enforced'].includes(status);
      
      steps.push({
        key: 'hsse_manager_closure',
        label: t('workflow.tracker.steps.hsseManagerClosure', 'HSSE Manager Closure'),
        icon: <Shield className="h-4 w-4" />,
        status: status === 'pending_hsse_manager_closure' ? 'current' : 
                hsseManagerCompleted ? 'completed' : 'pending',
        actorName: workflowActors?.hsse_manager?.full_name,
        description: t('workflow.tracker.descriptions.level5Required', 'Required for Level 5 severity'),
      });
    }
    
    // Final Step: Closed / Enforced
    if (status === 'hsse_enforced') {
      steps.push({
        key: 'hsse_enforced',
        label: t('workflow.tracker.steps.hsseEnforced', 'HSSE Enforced'),
        icon: <ShieldCheck className="h-4 w-4" />,
        status: 'enforced',
        actorName: workflowActors?.hsse_manager?.full_name,
        timestamp: (incident as any).hsse_enforced_at,
        description: t('workflow.tracker.descriptions.finalDecision', 'Final decision - no appeals'),
      });
    } else if (status === 'closed') {
      steps.push({
        key: 'closed',
        label: t('workflow.tracker.steps.closed', 'Closed'),
        icon: <Lock className="h-4 w-4" />,
        status: 'completed',
        actorName: workflowActors?.closure_approver?.full_name,
      });
    } else {
      steps.push({
        key: 'closed',
        label: t('workflow.tracker.steps.closed', 'Closed'),
        icon: <Lock className="h-4 w-4" />,
        status: 'pending',
      });
    }
    
    return steps;
  };

  const steps = isContractor ? getContractorWorkflowSteps() : getNormalWorkflowSteps();
  const currentStepIndex = steps.findIndex(s => s.status === 'current');
  const completedSteps = steps.filter(s => s.status === 'completed').length;

  // Severity routing badge
  const getSeverityRoutingBadge = () => {
    if (!showSeverityRouting || severityLevel === 0) return null;
    
    if (severityLevel <= 2) {
      return (
        <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200">
          <GitBranch className="h-3 w-3 me-1" />
          {t('workflow.tracker.routing.level12', 'Direct Path')}
        </Badge>
      );
    } else if (severityLevel <= 4) {
      return (
        <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200">
          <Shield className="h-3 w-3 me-1" />
          {t('workflow.tracker.routing.level34', 'HSSE Required')}
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200">
          <AlertTriangle className="h-3 w-3 me-1" />
          {t('workflow.tracker.routing.level5', 'Manager Required')}
        </Badge>
      );
    }
  };

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
              isContractor ? "bg-amber-100 dark:bg-amber-900/30" : "bg-blue-100 dark:bg-blue-900/30"
            )}>
              {isContractor 
                ? <HardHat className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                : <ClipboardCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              }
            </div>
            <div>
              <CardTitle className="text-lg">
                {t('workflow.tracker.title', 'Workflow Progress')}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isContractor 
                  ? t('workflow.tracker.contractorPath', 'Contractor Observation Path')
                  : t('workflow.tracker.normalPath', 'Standard Observation Path')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getSeverityRoutingBadge()}
            <Badge variant="outline" className="text-xs">
              {t('workflow.tracker.completedSteps', '{{completed}} of {{total}} completed', {
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
                description={step.description}
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
                description={step.description}
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
