import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Search, 
  Clock, 
  CheckCircle2, 
  Lock,
  UserCheck,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface IncidentWorkflowCardProps {
  status: string | null;
  eventType: string;
  assignedTo?: string;
  nextAction?: string;
}

interface WorkflowStep {
  key: string;
  icon: React.ElementType;
  label: string;
}

const INCIDENT_WORKFLOW: WorkflowStep[] = [
  { key: 'submitted', icon: FileText, label: 'Submitted' },
  { key: 'expert_screening', icon: Search, label: 'Expert Screening' },
  { key: 'investigation_in_progress', icon: Clock, label: 'Investigation' },
  { key: 'pending_closure', icon: UserCheck, label: 'Pending Closure' },
  { key: 'closed', icon: Lock, label: 'Closed' },
];

const OBSERVATION_WORKFLOW: WorkflowStep[] = [
  { key: 'submitted', icon: FileText, label: 'Submitted' },
  { key: 'pending_manager_approval', icon: UserCheck, label: 'Manager Review' },
  { key: 'expert_screening', icon: Search, label: 'HSSE Review' },
  { key: 'pending_final_closure', icon: Clock, label: 'Final Closure' },
  { key: 'closed', icon: Lock, label: 'Closed' },
];

const getStepStatus = (
  stepKey: string, 
  currentStatus: string | null, 
  workflow: WorkflowStep[]
): 'completed' | 'current' | 'pending' => {
  if (!currentStatus) return 'pending';
  
  const currentIndex = workflow.findIndex(s => s.key === currentStatus);
  const stepIndex = workflow.findIndex(s => s.key === stepKey);
  
  // Handle special statuses that map to workflow steps
  const statusMappings: Record<string, string> = {
    'pending_review': 'submitted',
    'investigation_pending': 'expert_screening',
    'investigation_closed': 'pending_closure',
    'pending_dept_rep_approval': 'pending_manager_approval',
    'hsse_manager_escalation': 'pending_manager_approval',
    'observation_actions_pending': 'expert_screening',
    'no_investigation_required': 'closed',
  };
  
  const mappedStatus = statusMappings[currentStatus] || currentStatus;
  const mappedIndex = workflow.findIndex(s => s.key === mappedStatus);
  
  if (stepIndex < mappedIndex) return 'completed';
  if (stepKey === mappedStatus || stepKey === currentStatus) return 'current';
  return 'pending';
};

export function IncidentWorkflowCard({
  status,
  eventType,
  assignedTo,
  nextAction,
}: IncidentWorkflowCardProps) {
  const { t } = useTranslation();

  const workflow = eventType === 'observation' ? OBSERVATION_WORKFLOW : INCIDENT_WORKFLOW;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          {t('incidents.detail.workflowStatus', 'Workflow Status')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Workflow Steps */}
        <div className="space-y-2">
          {workflow.map((step, index) => {
            const stepStatus = getStepStatus(step.key, status, workflow);
            const Icon = step.icon;
            
            return (
              <div key={step.key} className="flex items-center gap-3">
                {/* Step Indicator */}
                <div 
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all",
                    stepStatus === 'completed' && "bg-primary text-primary-foreground",
                    stepStatus === 'current' && "bg-primary/20 text-primary ring-2 ring-primary ring-offset-2",
                    stepStatus === 'pending' && "bg-muted text-muted-foreground"
                  )}
                >
                  {stepStatus === 'completed' ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>

                {/* Step Label */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium truncate",
                    stepStatus === 'current' && "text-primary",
                    stepStatus === 'pending' && "text-muted-foreground"
                  )}>
                    {t(`incidents.workflow.${step.key}`, step.label)}
                  </p>
                </div>

                {/* Current Badge */}
                {stepStatus === 'current' && (
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {t('common.current', 'Current')}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>

        {/* Next Action */}
        {(nextAction || assignedTo) && (
          <div className="pt-3 border-t space-y-2">
            {nextAction && (
              <div className="flex items-start gap-2 text-sm">
                <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t('incidents.detail.nextAction', 'Next Action')}
                  </p>
                  <p className="font-medium">{nextAction}</p>
                </div>
              </div>
            )}
            {assignedTo && (
              <div className="flex items-start gap-2 text-sm">
                <UserCheck className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t('incidents.assignedTo', 'Assigned To')}
                  </p>
                  <p className="font-medium">{assignedTo}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
