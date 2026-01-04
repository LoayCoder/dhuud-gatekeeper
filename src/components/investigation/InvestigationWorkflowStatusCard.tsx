import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  XCircle,
  ChevronDown,
  FileText,
  ClipboardCheck,
  UserCheck,
  Shield,
  UserPlus,
  Search,
  Lock,
  AlertTriangle,
  ArrowUpCircle,
  HardHat,
  FileCheck,
  RotateCcw,
  Ban
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { IncidentWithDetails } from "@/hooks/use-incidents";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";

interface WorkflowActor {
  full_name: string | null;
  timestamp: string | null;
}

interface WorkflowActors {
  submitted_by?: WorkflowActor;
  dept_rep?: WorkflowActor;
  expert_screener?: WorkflowActor;
  manager_approver?: WorkflowActor;
  hsse_manager?: WorkflowActor;
  investigator?: WorkflowActor;
  closure_approver?: WorkflowActor;
}

interface InvestigationWorkflowStatusCardProps {
  incident: IncidentWithDetails;
  workflowActors?: WorkflowActors;
}

type StepStatus = 'completed' | 'current' | 'pending' | 'skipped' | 'rejected';

interface WorkflowStep {
  key: string;
  label: string;
  icon: React.ReactNode;
  status: StepStatus;
  actorName?: string | null;
  timestamp?: string | null;
  description?: string;
}

export function InvestigationWorkflowStatusCard({ 
  incident,
  workflowActors 
}: InvestigationWorkflowStatusCardProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const isRTL = direction === 'rtl';
  
  const status = incident.status as string;
  const isObservation = incident.event_type === 'observation';

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return format(date, 'MMM d, yyyy HH:mm', { 
        locale: isRTL ? ar : enUS 
      });
    } catch {
      return null;
    }
  };

  // Build workflow steps based on current status
  const getWorkflowSteps = (): WorkflowStep[] => {
    const steps: WorkflowStep[] = [];
    
    // Step 1: Submitted - always present
    steps.push({
      key: 'submitted',
      label: t('workflow.steps.submitted', 'Report Submitted'),
      icon: <FileText className="h-5 w-5" />,
      status: status === 'submitted' ? 'current' : 'completed',
      actorName: workflowActors?.submitted_by?.full_name || t('workflow.actors.reporter', 'Reporter'),
      timestamp: incident.created_at,
      description: t('workflow.descriptions.submitted', 'Initial report created')
    });
    
    if (isObservation) {
      // === OBSERVATION WORKFLOW ===
      
      // Step 2: Dept Rep Review
      const deptRepCompleted = [
        'observation_actions_pending', 
        'closed', 
        'pending_hsse_validation',
        'pending_hsse_manager_closure',
        'pending_final_closure',
        'upgraded_to_incident'
      ].includes(status);
      
      steps.push({
        key: 'dept_rep',
        label: t('workflow.steps.deptRepReview', 'Department Rep Review'),
        icon: <ClipboardCheck className="h-5 w-5" />,
        status: status === 'pending_dept_rep_approval' ? 'current' : 
                deptRepCompleted ? 'completed' : 'pending',
        actorName: workflowActors?.dept_rep?.full_name,
        timestamp: workflowActors?.dept_rep?.timestamp,
        description: status === 'pending_dept_rep_approval' 
          ? t('workflow.descriptions.awaitingDeptRep', 'Awaiting department representative review')
          : deptRepCompleted ? t('workflow.descriptions.deptRepApproved', 'Reviewed and approved') : undefined
      });

      // Check for upgrade to incident
      if (status === 'upgraded_to_incident') {
        steps.push({
          key: 'upgraded',
          label: t('workflow.steps.upgradedToIncident', 'Upgraded to Incident'),
          icon: <ArrowUpCircle className="h-5 w-5" />,
          status: 'current',
          description: t('workflow.descriptions.upgraded', 'Escalated to full incident investigation')
        });
      }
      
      // Actions Pending
      if (['observation_actions_pending', 'pending_hsse_validation', 'pending_hsse_manager_closure', 'pending_final_closure', 'closed'].includes(status)) {
        steps.push({
          key: 'actions',
          label: t('workflow.steps.actionExecution', 'Action Execution'),
          icon: <Clock className="h-5 w-5" />,
          status: status === 'observation_actions_pending' ? 'current' : 'completed',
          description: status === 'observation_actions_pending' 
            ? t('workflow.descriptions.actionsInProgress', 'Corrective actions being executed')
            : t('workflow.descriptions.actionsComplete', 'All actions completed')
        });
      }
      
      // HSSE Validation
      if (['pending_hsse_validation', 'pending_hsse_manager_closure', 'pending_final_closure', 'closed'].includes(status)) {
        steps.push({
          key: 'hsse_validation',
          label: t('workflow.steps.hsseValidation', 'HSSE Validation'),
          icon: <Shield className="h-5 w-5" />,
          status: status === 'pending_hsse_validation' ? 'current' : 'completed',
          actorName: workflowActors?.hsse_manager?.full_name,
          timestamp: workflowActors?.hsse_manager?.timestamp,
          description: status === 'pending_hsse_validation'
            ? t('workflow.descriptions.awaitingHSSE', 'Awaiting HSSE validation')
            : t('workflow.descriptions.hsseValidated', 'Validated by HSSE')
        });
      }
      
      // Closed
      if (status === 'closed') {
        steps.push({
          key: 'closed',
          label: t('workflow.steps.closed', 'Closed'),
          icon: <Lock className="h-5 w-5" />,
          status: 'current',
          actorName: workflowActors?.closure_approver?.full_name,
          timestamp: workflowActors?.closure_approver?.timestamp,
          description: t('workflow.descriptions.closed', 'Observation closed successfully')
        });
      }
      
    } else {
      // === INCIDENT WORKFLOW ===
      
      // Step 2: Dept Rep Incident Review
      const deptRepIncidentCompleted = [
        'pending_expert_screening',
        'pending_manager_approval', 
        'manager_rejected', 
        'hsse_manager_escalation', 
        'investigation_pending', 
        'investigation_in_progress', 
        'pending_closure', 
        'investigation_closed',
        'closed'
      ].includes(status);
      
      steps.push({
        key: 'dept_rep',
        label: t('workflow.steps.deptRepReview', 'Department Rep Review'),
        icon: <ClipboardCheck className="h-5 w-5" />,
        status: status === 'pending_dept_rep_incident_review' ? 'current' : 
                deptRepIncidentCompleted ? 'completed' : 
                status === 'dept_rep_rejected' ? 'rejected' : 'pending',
        actorName: workflowActors?.dept_rep?.full_name,
        timestamp: workflowActors?.dept_rep?.timestamp,
        description: status === 'pending_dept_rep_incident_review' 
          ? t('workflow.descriptions.awaitingDeptRep', 'Awaiting department representative review')
          : deptRepIncidentCompleted ? t('workflow.descriptions.deptRepApproved', 'Reviewed and forwarded') : undefined
      });

      // Check for rejection path
      if (status === 'dept_rep_rejected') {
        steps.push({
          key: 'rejected',
          label: t('workflow.steps.rejected', 'Rejected'),
          icon: <Ban className="h-5 w-5" />,
          status: 'rejected',
          description: t('workflow.descriptions.rejected', 'Report rejected by department rep')
        });
        return steps;
      }
      
      if (status === 'returned_to_reporter') {
        steps.push({
          key: 'returned',
          label: t('workflow.steps.returned', 'Returned for Correction'),
          icon: <RotateCcw className="h-5 w-5" />,
          status: 'current',
          description: t('workflow.descriptions.returned', 'Returned to reporter for additional information')
        });
        return steps;
      }
      
      // Step 3: Manager Approval
      const managerCompleted = [
        'investigation_pending', 
        'investigation_in_progress', 
        'pending_closure', 
        'investigation_closed',
        'closed'
      ].includes(status);
      
      if (deptRepIncidentCompleted || status === 'pending_manager_approval' || status === 'manager_rejected' || status === 'hsse_manager_escalation') {
        steps.push({
          key: 'manager',
          label: t('workflow.steps.managerApproval', 'Manager Approval'),
          icon: <UserCheck className="h-5 w-5" />,
          status: status === 'pending_manager_approval' ? 'current' : 
                  status === 'manager_rejected' || status === 'hsse_manager_escalation' ? 'completed' :
                  managerCompleted ? 'completed' : 'pending',
          actorName: workflowActors?.manager_approver?.full_name,
          timestamp: workflowActors?.manager_approver?.timestamp,
          description: status === 'pending_manager_approval' 
            ? t('workflow.descriptions.awaitingManager', 'Awaiting manager approval')
            : managerCompleted ? t('workflow.descriptions.managerApproved', 'Approved by manager') : undefined
        });
      }
      
      // HSSE Escalation (if manager rejected)
      if (status === 'manager_rejected' || status === 'hsse_manager_escalation') {
        steps.push({
          key: 'escalation',
          label: t('workflow.steps.hsseEscalation', 'HSSE Manager Review'),
          icon: <Shield className="h-5 w-5" />,
          status: 'current',
          actorName: workflowActors?.hsse_manager?.full_name,
          description: t('workflow.descriptions.awaitingHSSEManager', 'Escalated to HSSE Manager for decision')
        });
      }
      
      // Step 4: Investigator Assignment
      if (managerCompleted || status === 'investigation_pending') {
        const investigatorAssigned = ['investigation_in_progress', 'pending_closure', 'investigation_closed', 'closed'].includes(status);
        
        steps.push({
          key: 'assignment',
          label: t('workflow.steps.investigatorAssignment', 'Investigator Assignment'),
          icon: <UserPlus className="h-5 w-5" />,
          status: status === 'investigation_pending' ? 'current' : 
                  investigatorAssigned ? 'completed' : 'pending',
          actorName: investigatorAssigned ? workflowActors?.investigator?.full_name : undefined,
          description: status === 'investigation_pending' 
            ? t('workflow.descriptions.awaitingAssignment', 'Awaiting investigator assignment')
            : investigatorAssigned ? t('workflow.descriptions.investigatorAssigned', 'Investigator assigned') : undefined
        });
      }
      
      // Step 5: Investigation
      if (['investigation_in_progress', 'pending_closure', 'investigation_closed', 'closed'].includes(status)) {
        steps.push({
          key: 'investigation',
          label: t('workflow.steps.investigation', 'Investigation'),
          icon: <Search className="h-5 w-5" />,
          status: status === 'investigation_in_progress' ? 'current' : 'completed',
          actorName: workflowActors?.investigator?.full_name,
          description: status === 'investigation_in_progress' 
            ? t('workflow.descriptions.investigationInProgress', 'Investigation in progress')
            : t('workflow.descriptions.investigationComplete', 'Investigation completed')
        });
      }
      
      // Step 6: Closure
      if (['pending_closure', 'investigation_closed', 'closed'].includes(status)) {
        steps.push({
          key: 'closure',
          label: t('workflow.steps.closure', 'Closure'),
          icon: <Lock className="h-5 w-5" />,
          status: status === 'pending_closure' ? 'current' : 
                  status === 'investigation_closed' || status === 'closed' ? 'completed' : 'pending',
          actorName: workflowActors?.closure_approver?.full_name,
          timestamp: workflowActors?.closure_approver?.timestamp,
          description: status === 'pending_closure' 
            ? t('workflow.descriptions.awaitingClosure', 'Awaiting closure approval')
            : t('workflow.descriptions.closureApproved', 'Closed')
        });
      }
    }
    
    return steps;
  };

  const steps = getWorkflowSteps();
  const currentStepIndex = steps.findIndex(s => s.status === 'current');

  const getStepIcon = (step: WorkflowStep, index: number) => {
    switch (step.status) {
      case 'completed':
        return (
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-2 border-green-500">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        );
      case 'current':
        return (
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary border-2 border-primary animate-pulse">
            {step.icon}
          </div>
        );
      case 'rejected':
        return (
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10 text-destructive border-2 border-destructive">
            <XCircle className="h-5 w-5" />
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted text-muted-foreground border-2 border-muted-foreground/30">
            <Circle className="h-5 w-5" />
          </div>
        );
    }
  };

  const getStatusBadge = (step: WorkflowStep) => {
    switch (step.status) {
      case 'completed':
        return (
          <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
            {t('workflow.status.completed', 'Completed')}
          </Badge>
        );
      case 'current':
        return (
          <Badge className="bg-primary text-primary-foreground">
            {t('workflow.status.inProgress', 'In Progress')}
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            {t('workflow.status.rejected', 'Rejected')}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            {t('workflow.status.pending', 'Pending')}
          </Badge>
        );
    }
  };

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/20 border-b pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <ClipboardCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {t('investigation.workflow.title', 'Workflow Status')}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isObservation 
                  ? t('investigation.workflow.observationWorkflow', 'Observation workflow progress')
                  : t('investigation.workflow.incidentWorkflow', 'Incident investigation workflow')}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {t('investigation.workflow.step', 'Step')} {currentStepIndex + 1} / {steps.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {steps.map((step, index) => (
            <div 
              key={step.key}
              className={cn(
                "flex items-start gap-4 p-5 transition-colors",
                step.status === 'current' && "bg-primary/5",
                step.status === 'completed' && "bg-muted/30",
                step.status === 'rejected' && "bg-destructive/5"
              )}
            >
              {/* Step Icon */}
              <div className="relative flex flex-col items-center">
                {getStepIcon(step, index)}
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className={cn(
                    "absolute top-12 w-0.5 h-8",
                    step.status === 'completed' ? "bg-green-500" : "bg-muted-foreground/20"
                  )} />
                )}
              </div>
              
              {/* Step Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className={cn(
                      "font-semibold",
                      step.status === 'current' && "text-primary",
                      step.status === 'completed' && "text-foreground",
                      step.status === 'rejected' && "text-destructive",
                      step.status === 'pending' && "text-muted-foreground"
                    )}>
                      {step.label}
                    </h4>
                    
                    {step.description && (
                      <p className="text-sm text-muted-foreground">
                        {step.description}
                      </p>
                    )}
                    
                    {/* Actor Info */}
                    {(step.status === 'completed' || step.status === 'current') && step.actorName && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center text-xs font-bold text-secondary">
                          {step.actorName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium">{step.actorName}</span>
                        {step.timestamp && (
                          <span className="text-xs text-muted-foreground">
                            • {formatDate(step.timestamp)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Status Badge */}
                  <div className="shrink-0">
                    {getStatusBadge(step)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
