import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  ClipboardCheck, 
  RotateCcw, 
  XCircle, 
  UserCheck, 
  Shield,
  UserPlus,
  Search,
  CheckCircle,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { IncidentWithDetails } from "@/hooks/use-incidents";

interface WorkflowProgressBannerProps {
  incident: IncidentWithDetails;
}

type WorkflowStep = {
  key: string;
  label: string;
  icon: React.ReactNode;
  status: 'completed' | 'current' | 'pending' | 'skipped';
};

export function WorkflowProgressBanner({ incident }: WorkflowProgressBannerProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  
  const status = incident.status as string;
  
  // Define workflow steps based on current status
  const getWorkflowSteps = (): WorkflowStep[] => {
    const steps: WorkflowStep[] = [];
    
    // Step 1: Submitted
    steps.push({
      key: 'submitted',
      label: t('workflow.steps.submitted', 'Submitted'),
      icon: <FileText className="h-4 w-4" />,
      status: status === 'submitted' ? 'current' : 'completed',
    });
    
    // Step 2: Expert Screening
    if (['returned_to_reporter', 'expert_rejected', 'no_investigation_required'].includes(status)) {
      steps.push({
        key: 'screening',
        label: t('workflow.steps.screening', 'Expert Screening'),
        icon: <ClipboardCheck className="h-4 w-4" />,
        status: 'completed',
      });
      
      // Add the result step
      if (status === 'returned_to_reporter') {
        steps.push({
          key: 'returned',
          label: t('workflow.steps.returned', 'Returned'),
          icon: <RotateCcw className="h-4 w-4" />,
          status: 'current',
        });
      } else if (status === 'expert_rejected') {
        steps.push({
          key: 'rejected',
          label: t('workflow.steps.rejected', 'Rejected'),
          icon: <XCircle className="h-4 w-4" />,
          status: 'current',
        });
      } else if (status === 'no_investigation_required') {
        steps.push({
          key: 'closed',
          label: t('workflow.steps.closedNoInvestigation', 'Closed'),
          icon: <CheckCircle className="h-4 w-4" />,
          status: 'current',
        });
      }
    } else if (['pending_manager_approval', 'manager_rejected', 'hsse_manager_escalation', 'investigation_pending', 'investigation_in_progress', 'pending_closure', 'closed'].includes(status)) {
      steps.push({
        key: 'screening',
        label: t('workflow.steps.screening', 'Expert Screening'),
        icon: <ClipboardCheck className="h-4 w-4" />,
        status: 'completed',
      });
      
      // Step 3: Manager Approval
      if (status === 'pending_manager_approval') {
        steps.push({
          key: 'manager',
          label: t('workflow.steps.managerApproval', 'Manager Approval'),
          icon: <UserCheck className="h-4 w-4" />,
          status: 'current',
        });
      } else if (status === 'manager_rejected' || status === 'hsse_manager_escalation') {
        steps.push({
          key: 'manager',
          label: t('workflow.steps.managerApproval', 'Manager Approval'),
          icon: <UserCheck className="h-4 w-4" />,
          status: 'completed',
        });
        steps.push({
          key: 'escalation',
          label: t('workflow.steps.escalation', 'HSSE Manager'),
          icon: <Shield className="h-4 w-4" />,
          status: 'current',
        });
      } else {
        steps.push({
          key: 'manager',
          label: t('workflow.steps.managerApproval', 'Manager Approval'),
          icon: <UserCheck className="h-4 w-4" />,
          status: 'completed',
        });
        
        // Step 4: Investigator Assignment
        if (status === 'investigation_pending') {
          steps.push({
            key: 'assignment',
            label: t('workflow.steps.assignment', 'Assign Investigator'),
            icon: <UserPlus className="h-4 w-4" />,
            status: 'current',
          });
        } else {
          steps.push({
            key: 'assignment',
            label: t('workflow.steps.assignment', 'Assigned'),
            icon: <UserPlus className="h-4 w-4" />,
            status: 'completed',
          });
          
          // Step 5: Investigation
          if (status === 'investigation_in_progress') {
            steps.push({
              key: 'investigation',
              label: t('workflow.steps.investigation', 'Investigation'),
              icon: <Search className="h-4 w-4" />,
              status: 'current',
            });
          } else if (status === 'pending_closure') {
            steps.push({
              key: 'investigation',
              label: t('workflow.steps.investigation', 'Investigation'),
              icon: <Search className="h-4 w-4" />,
              status: 'completed',
            });
            steps.push({
              key: 'closure',
              label: t('workflow.steps.pendingClosure', 'Pending Closure'),
              icon: <Clock className="h-4 w-4" />,
              status: 'current',
            });
          } else if (status === 'closed') {
            steps.push({
              key: 'investigation',
              label: t('workflow.steps.investigation', 'Investigation'),
              icon: <Search className="h-4 w-4" />,
              status: 'completed',
            });
            steps.push({
              key: 'closed',
              label: t('workflow.steps.closed', 'Closed'),
              icon: <CheckCircle className="h-4 w-4" />,
              status: 'current',
            });
          }
        }
      }
    } else if (status === 'submitted') {
      steps.push({
        key: 'screening',
        label: t('workflow.steps.screening', 'Expert Screening'),
        icon: <ClipboardCheck className="h-4 w-4" />,
        status: 'pending',
      });
    }
    
    return steps;
  };
  
  const steps = getWorkflowSteps();

  return (
    <div 
      className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg overflow-x-auto" 
      dir={direction}
    >
      {steps.map((step, index) => (
        <div key={step.key} className="flex items-center">
          <Badge
            variant={step.status === 'current' ? 'default' : step.status === 'completed' ? 'secondary' : 'outline'}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap",
              step.status === 'completed' && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
              step.status === 'current' && "bg-primary text-primary-foreground",
              step.status === 'pending' && "bg-muted text-muted-foreground"
            )}
          >
            {step.icon}
            <span className="text-xs">{step.label}</span>
          </Badge>
          
          {index < steps.length - 1 && (
            <div className={cn(
              "w-4 h-0.5 mx-1",
              step.status === 'completed' ? "bg-green-500" : "bg-muted-foreground/30"
            )} />
          )}
        </div>
      ))}
    </div>
  );
}
