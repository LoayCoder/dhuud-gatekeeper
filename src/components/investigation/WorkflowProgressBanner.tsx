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
  Clock,
  AlertTriangle,
  HardHat,
  FileCheck,
  Ban,
  ArrowUpCircle
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
  status: 'completed' | 'current' | 'pending' | 'skipped' | 'rejected';
};

export function WorkflowProgressBanner({ incident }: WorkflowProgressBannerProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  
  const status = incident.status as string;
  const isObservation = incident.event_type === 'observation';
  
  // Define workflow steps based on current status
  const getWorkflowSteps = (): WorkflowStep[] => {
    const steps: WorkflowStep[] = [];
    
    // Step 1: Submitted - always present
    steps.push({
      key: 'submitted',
      label: t('workflow.steps.submitted', 'Submitted'),
      icon: <FileText className="h-4 w-4" />,
      status: status === 'submitted' ? 'current' : 'completed',
    });
    
    // === OBSERVATION WORKFLOW ===
    if (isObservation) {
      // Step 2: Dept Rep Review
      if (status === 'pending_dept_rep_approval' || status === 'pending_dept_rep_mandatory_action') {
        steps.push({
          key: 'dept_rep',
          label: t('workflow.steps.deptRepReview', 'Dept Rep Review'),
          icon: <ClipboardCheck className="h-4 w-4" />,
          status: 'current',
        });
      } else if ([
        'observation_actions_pending', 
        'closed', 
        'pending_hsse_validation',
        'pending_hsse_manager_closure',
        'pending_final_closure',
        'pending_department_manager_violation_approval',
        'pending_contract_controller_violation_approval',
        'contractor_violation_finalized',
        'pending_hsse_rejection_review',
        'pending_hsse_escalation_review',
        'upgraded_to_incident'
      ].includes(status)) {
        steps.push({
          key: 'dept_rep',
          label: t('workflow.steps.deptRepReview', 'Dept Rep Review'),
          icon: <ClipboardCheck className="h-4 w-4" />,
          status: 'completed',
        });
      } else if (status === 'submitted') {
        steps.push({
          key: 'dept_rep',
          label: t('workflow.steps.deptRepReview', 'Dept Rep Review'),
          icon: <ClipboardCheck className="h-4 w-4" />,
          status: 'pending',
        });
      }
      
      // HSSE Escalation Review - when Dept Rep escalates
      if (status === 'pending_hsse_escalation_review') {
        steps.push({
          key: 'hsse_escalation_review',
          label: t('workflow.steps.hsseEscalationReview', 'HSSE Escalation Review'),
          icon: <Shield className="h-4 w-4" />,
          status: 'current',
        });
      } else if (status === 'upgraded_to_incident') {
        steps.push({
          key: 'hsse_escalation_review',
          label: t('workflow.steps.hsseEscalationReview', 'HSSE Escalation Review'),
          icon: <Shield className="h-4 w-4" />,
          status: 'completed',
        });
        steps.push({
          key: 'upgraded',
          label: t('workflow.steps.upgradedToIncident', 'Upgraded to Incident'),
          icon: <ArrowUpCircle className="h-4 w-4" />,
          status: 'current',
        });
      }
      
      // Contractor Violation Flow (if applicable)
      if (status === 'pending_department_manager_violation_approval') {
        steps.push({
          key: 'violation_dept_mgr',
          label: t('workflow.steps.violationDeptMgr', 'Violation Approval'),
          icon: <HardHat className="h-4 w-4" />,
          status: 'current',
        });
      } else if (status === 'pending_contract_controller_violation_approval') {
        steps.push({
          key: 'violation_dept_mgr',
          label: t('workflow.steps.violationDeptMgr', 'Violation Approval'),
          icon: <HardHat className="h-4 w-4" />,
          status: 'completed',
        });
        steps.push({
          key: 'contract_controller',
          label: t('workflow.steps.contractController', 'Contract Controller'),
          icon: <FileCheck className="h-4 w-4" />,
          status: 'current',
        });
      } else if (status === 'contractor_violation_finalized') {
        steps.push({
          key: 'violation_dept_mgr',
          label: t('workflow.steps.violationDeptMgr', 'Violation Approval'),
          icon: <HardHat className="h-4 w-4" />,
          status: 'completed',
        });
        steps.push({
          key: 'contract_controller',
          label: t('workflow.steps.contractController', 'Contract Controller'),
          icon: <FileCheck className="h-4 w-4" />,
          status: 'completed',
        });
        steps.push({
          key: 'violation_finalized',
          label: t('workflow.steps.violationFinalized', 'Violation Finalized'),
          icon: <AlertTriangle className="h-4 w-4" />,
          status: 'current',
        });
      }
      
      // Actions Pending
      if (status === 'observation_actions_pending') {
        steps.push({
          key: 'actions',
          label: t('workflow.steps.actionsPending', 'Actions Pending'),
          icon: <Clock className="h-4 w-4" />,
          status: 'current',
        });
      } else if ([
        'pending_hsse_validation', 
        'pending_hsse_manager_closure', 
        'pending_final_closure',
        'closed'
      ].includes(status) && !['pending_department_manager_violation_approval', 'pending_contract_controller_violation_approval', 'contractor_violation_finalized'].includes(status)) {
        steps.push({
          key: 'actions',
          label: t('workflow.steps.actionsPending', 'Actions Pending'),
          icon: <Clock className="h-4 w-4" />,
          status: 'completed',
        });
      }
      
      // HSSE Validation
      if (status === 'pending_hsse_validation') {
        steps.push({
          key: 'hsse_validation',
          label: t('workflow.steps.hsseValidation', 'HSSE Validation'),
          icon: <Shield className="h-4 w-4" />,
          status: 'current',
        });
      } else if (['pending_hsse_manager_closure', 'pending_final_closure', 'closed'].includes(status)) {
        steps.push({
          key: 'hsse_validation',
          label: t('workflow.steps.hsseValidation', 'HSSE Validation'),
          icon: <Shield className="h-4 w-4" />,
          status: 'completed',
        });
      }
      
      // HSSE Rejection Review
      if (status === 'pending_hsse_rejection_review') {
        steps.push({
          key: 'hsse_rejection_review',
          label: t('workflow.steps.hsseRejectionReview', 'Rejection Review'),
          icon: <RotateCcw className="h-4 w-4" />,
          status: 'current',
        });
      }
      
      // HSSE Manager Closure (L5)
      if (status === 'pending_hsse_manager_closure') {
        steps.push({
          key: 'hsse_manager_closure',
          label: t('workflow.steps.hsseManagerClosure', 'HSSE Manager'),
          icon: <Shield className="h-4 w-4" />,
          status: 'current',
        });
      } else if (['pending_final_closure', 'closed'].includes(status)) {
        // Only show if it was L5
        const severityLevel = (incident as { severity_level?: number }).severity_level;
        if (severityLevel === 5) {
          steps.push({
            key: 'hsse_manager_closure',
            label: t('workflow.steps.hsseManagerClosure', 'HSSE Manager'),
            icon: <Shield className="h-4 w-4" />,
            status: 'completed',
          });
        }
      }
      
      // Final Closure
      if (status === 'pending_final_closure') {
        steps.push({
          key: 'final_closure',
          label: t('workflow.steps.pendingFinalClosure', 'Pending Closure'),
          icon: <Clock className="h-4 w-4" />,
          status: 'current',
        });
      }
      
      // Closed
      if (status === 'closed') {
        steps.push({
          key: 'closed',
          label: t('workflow.steps.closed', 'Closed'),
          icon: <CheckCircle className="h-4 w-4" />,
          status: 'current',
        });
      }
      
    } else {
      // === INCIDENT WORKFLOW ===
      
      // Step 2: Dept Rep Incident Review
      if (status === 'pending_dept_rep_incident_review') {
        steps.push({
          key: 'dept_rep',
          label: t('workflow.steps.deptRepReview', 'Dept Rep Review'),
          icon: <ClipboardCheck className="h-4 w-4" />,
          status: 'current',
        });
      } else if ([
        'pending_expert_screening',
        'pending_manager_approval', 
        'manager_rejected', 
        'hsse_manager_escalation', 
        'investigation_pending', 
        'investigation_in_progress', 
        'pending_closure', 
        'investigation_closed',
        'closed',
        'dept_rep_rejected',
        'reporter_dispute',
        'pending_department_manager_violation_approval',
        'pending_contract_controller_violation_approval',
        'contractor_violation_finalized'
      ].includes(status)) {
        steps.push({
          key: 'dept_rep',
          label: t('workflow.steps.deptRepReview', 'Dept Rep Review'),
          icon: <ClipboardCheck className="h-4 w-4" />,
          status: 'completed',
        });
      } else if (status === 'submitted') {
        steps.push({
          key: 'dept_rep',
          label: t('workflow.steps.deptRepReview', 'Dept Rep Review'),
          icon: <ClipboardCheck className="h-4 w-4" />,
          status: 'pending',
        });
      }
      
      // Contractor Violation Flow for Incidents (if applicable)
      if (status === 'pending_department_manager_violation_approval') {
        steps.push({
          key: 'violation_dept_mgr',
          label: t('workflow.steps.violationDeptMgr', 'Violation Approval'),
          icon: <HardHat className="h-4 w-4" />,
          status: 'current',
        });
      } else if (status === 'pending_contract_controller_violation_approval') {
        steps.push({
          key: 'violation_dept_mgr',
          label: t('workflow.steps.violationDeptMgr', 'Violation Approval'),
          icon: <HardHat className="h-4 w-4" />,
          status: 'completed',
        });
        steps.push({
          key: 'contract_controller',
          label: t('workflow.steps.contractController', 'Contract Controller'),
          icon: <FileCheck className="h-4 w-4" />,
          status: 'current',
        });
      } else if (status === 'contractor_violation_finalized') {
        steps.push({
          key: 'violation_dept_mgr',
          label: t('workflow.steps.violationDeptMgr', 'Violation Approval'),
          icon: <HardHat className="h-4 w-4" />,
          status: 'completed',
        });
        steps.push({
          key: 'contract_controller',
          label: t('workflow.steps.contractController', 'Contract Controller'),
          icon: <FileCheck className="h-4 w-4" />,
          status: 'completed',
        });
        steps.push({
          key: 'violation_finalized',
          label: t('workflow.steps.violationFinalized', 'Violation Finalized'),
          icon: <AlertTriangle className="h-4 w-4" />,
          status: 'current',
        });
      }
      
      // Dept Rep Rejected / Reporter Dispute
      if (status === 'dept_rep_rejected') {
        steps.push({
          key: 'rejected',
          label: t('workflow.steps.deptRepRejected', 'Rejected'),
          icon: <Ban className="h-4 w-4" />,
          status: 'current',
        });
      } else if (status === 'reporter_dispute') {
        steps.push({
          key: 'dispute',
          label: t('workflow.steps.reporterDispute', 'Under Dispute'),
          icon: <AlertTriangle className="h-4 w-4" />,
          status: 'current',
        });
      }
      
      // Expert Screening - Return/Reject paths
      if (['returned_to_reporter', 'expert_rejected', 'no_investigation_required'].includes(status)) {
        steps.push({
          key: 'screening',
          label: t('workflow.steps.screening', 'Expert Screening'),
          icon: <ClipboardCheck className="h-4 w-4" />,
          status: 'completed',
        });
        
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
      } else if (['pending_manager_approval', 'manager_rejected', 'hsse_manager_escalation', 'investigation_pending', 'investigation_in_progress', 'pending_closure', 'investigation_closed', 'closed', 'confirmed_rejected'].includes(status)) {
        // Step 4: Manager Approval
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
        } else if (status === 'confirmed_rejected') {
          steps.push({
            key: 'manager',
            label: t('workflow.steps.managerApproval', 'Manager Approval'),
            icon: <UserCheck className="h-4 w-4" />,
            status: 'completed',
          });
          steps.push({
            key: 'confirmed_rejected',
            label: t('workflow.steps.confirmedRejected', 'Confirmed Rejected'),
            icon: <XCircle className="h-4 w-4" />,
            status: 'rejected',
          });
        } else {
          steps.push({
            key: 'manager',
            label: t('workflow.steps.managerApproval', 'Manager Approval'),
            icon: <UserCheck className="h-4 w-4" />,
            status: 'completed',
          });
          
          // Step 5: Investigator Assignment
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
            
            // Step 6: Investigation
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
            } else if (status === 'investigation_closed') {
              steps.push({
                key: 'investigation',
                label: t('workflow.steps.investigation', 'Investigation'),
                icon: <Search className="h-4 w-4" />,
                status: 'completed',
              });
              steps.push({
                key: 'investigation_closed',
                label: t('workflow.steps.investigationClosed', 'Investigation Closed'),
                icon: <CheckCircle className="h-4 w-4" />,
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
      }
    }
    
    return steps;
  };
  
  const steps = getWorkflowSteps();

  const getStepStyle = (stepStatus: WorkflowStep['status']) => {
    switch (stepStatus) {
      case 'completed':
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case 'current':
        return "bg-primary text-primary-foreground";
      case 'pending':
        return "bg-muted text-muted-foreground";
      case 'skipped':
        return "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500";
      case 'rejected':
        return "bg-destructive text-destructive-foreground";
      default:
        return "";
    }
  };

  const getConnectorStyle = (stepStatus: WorkflowStep['status']) => {
    switch (stepStatus) {
      case 'completed':
        return "bg-green-500";
      case 'rejected':
        return "bg-destructive";
      default:
        return "bg-muted-foreground/30";
    }
  };

  return (
    <div 
      className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg overflow-x-auto" 
      dir={direction}
    >
      {steps.map((step, index) => (
        <div key={step.key} className="flex items-center">
          <Badge
            variant={step.status === 'current' ? 'default' : step.status === 'rejected' ? 'destructive' : 'secondary'}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap",
              getStepStyle(step.status)
            )}
          >
            {step.icon}
            <span className="text-xs">{step.label}</span>
          </Badge>
          
          {index < steps.length - 1 && (
            <div className={cn(
              "w-4 h-0.5 mx-1",
              getConnectorStyle(step.status)
            )} />
          )}
        </div>
      ))}
    </div>
  );
}
