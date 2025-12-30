import {
  FileText,
  CheckCircle,
  ClipboardCheck,
  RotateCcw,
  XCircle,
  FileX,
  UserCheck,
  ListTodo,
  Shield,
  Clock,
  CheckCircle2,
  LucideIcon,
} from 'lucide-react';
import { SeverityLevelV2 } from '@/lib/hsse-severity-levels';

export type WorkflowRole = 
  | 'reporter' 
  | 'hsse_expert' 
  | 'dept_rep' 
  | 'hsse_manager' 
  | 'action_owner';

export type WorkflowStageStatus = 
  | 'completed' 
  | 'current' 
  | 'pending' 
  | 'skipped';

export type WorkflowPathType = 
  | 'close_on_spot' 
  | 'hsse_review' 
  | 'manager_closure';

export interface WorkflowStage {
  key: string;
  labelKey: string;
  icon: LucideIcon;
  role: WorkflowRole;
  statusMappings: string[]; // Database statuses that map to this stage
  severityPaths: ('1-2' | '3-4' | '5')[]; // Which severity paths include this stage
}

export const WORKFLOW_STAGES: WorkflowStage[] = [
  {
    key: 'submitted',
    labelKey: 'workflow.stages.submitted',
    icon: FileText,
    role: 'reporter',
    statusMappings: ['submitted'],
    severityPaths: ['1-2', '3-4', '5'],
  },
  {
    key: 'close_on_spot',
    labelKey: 'workflow.stages.closeOnSpot',
    icon: CheckCircle,
    role: 'reporter',
    statusMappings: ['closed'],
    severityPaths: ['1-2'],
  },
  {
    key: 'expert_screening',
    labelKey: 'workflow.stages.expertScreening',
    icon: ClipboardCheck,
    role: 'hsse_expert',
    statusMappings: ['expert_screening'],
    severityPaths: ['3-4', '5'],
  },
  {
    key: 'returned',
    labelKey: 'workflow.stages.returned',
    icon: RotateCcw,
    role: 'reporter',
    statusMappings: ['returned_to_reporter'],
    severityPaths: ['3-4', '5'],
  },
  {
    key: 'rejected',
    labelKey: 'workflow.stages.rejected',
    icon: XCircle,
    role: 'hsse_expert',
    statusMappings: ['expert_rejected'],
    severityPaths: ['3-4', '5'],
  },
  {
    key: 'no_investigation',
    labelKey: 'workflow.stages.noInvestigation',
    icon: FileX,
    role: 'hsse_expert',
    statusMappings: ['no_investigation_required'],
    severityPaths: ['3-4', '5'],
  },
  {
    key: 'dept_approval',
    labelKey: 'workflow.stages.deptApproval',
    icon: UserCheck,
    role: 'dept_rep',
    statusMappings: ['pending_dept_rep_approval'],
    severityPaths: ['3-4', '5'],
  },
  {
    key: 'actions_pending',
    labelKey: 'workflow.stages.actionsPending',
    icon: ListTodo,
    role: 'action_owner',
    statusMappings: ['observation_actions_pending'],
    severityPaths: ['3-4', '5'],
  },
  {
    key: 'hsse_validation',
    labelKey: 'workflow.stages.hsseValidation',
    icon: Shield,
    role: 'hsse_expert',
    statusMappings: ['pending_hsse_validation'],
    severityPaths: ['3-4', '5'],
  },
  {
    key: 'pending_final',
    labelKey: 'workflow.stages.pendingFinal',
    icon: Clock,
    role: 'hsse_manager',
    statusMappings: ['pending_final_closure'],
    severityPaths: ['5'],
  },
  {
    key: 'closed',
    labelKey: 'workflow.stages.closed',
    icon: CheckCircle2,
    role: 'hsse_expert',
    statusMappings: ['closed'],
    severityPaths: ['3-4', '5'],
  },
];

export const ROLE_COLORS: Record<WorkflowRole, { bg: string; text: string; border: string }> = {
  reporter: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/20',
  },
  hsse_expert: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-500/20',
  },
  dept_rep: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-500/20',
  },
  hsse_manager: {
    bg: 'bg-red-500/10',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-500/20',
  },
  action_owner: {
    bg: 'bg-green-500/10',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-500/20',
  },
};

export const STATUS_COLORS: Record<WorkflowStageStatus, { bg: string; border: string; icon: string }> = {
  completed: {
    bg: 'bg-green-500/10',
    border: 'border-green-500',
    icon: 'text-green-500',
  },
  current: {
    bg: 'bg-primary/10',
    border: 'border-primary',
    icon: 'text-primary',
  },
  pending: {
    bg: 'bg-muted/50',
    border: 'border-muted-foreground/30',
    icon: 'text-muted-foreground/50',
  },
  skipped: {
    bg: 'bg-muted/30',
    border: 'border-muted-foreground/20 border-dashed',
    icon: 'text-muted-foreground/30',
  },
};

export function getSeverityPath(severity: SeverityLevelV2 | null): '1-2' | '3-4' | '5' {
  if (!severity) return '3-4';
  const level = parseInt(severity.replace('level_', ''));
  if (level <= 2) return '1-2';
  if (level <= 4) return '3-4';
  return '5';
}

export function getPathType(severity: SeverityLevelV2 | null): WorkflowPathType {
  const path = getSeverityPath(severity);
  if (path === '1-2') return 'close_on_spot';
  if (path === '5') return 'manager_closure';
  return 'hsse_review';
}

export function getStagesForPath(
  severity: SeverityLevelV2 | null,
  closedOnSpot: boolean
): WorkflowStage[] {
  const path = getSeverityPath(severity);
  
  if (path === '1-2') {
    // Close on spot path: submitted -> close_on_spot
    return WORKFLOW_STAGES.filter(
      stage => stage.key === 'submitted' || stage.key === 'close_on_spot'
    );
  }
  
  // Main flow for Level 3-5 (excluding terminal states like returned/rejected)
  const mainFlow = [
    'submitted',
    'expert_screening',
    'dept_approval',
    'actions_pending',
    'hsse_validation',
  ];
  
  if (path === '5') {
    mainFlow.push('pending_final');
  }
  
  mainFlow.push('closed');
  
  return WORKFLOW_STAGES.filter(stage => mainFlow.includes(stage.key));
}

export function getStageStatus(
  stage: WorkflowStage,
  currentStatus: string | null,
  severity: SeverityLevelV2 | null,
  closedOnSpot: boolean
): WorkflowStageStatus {
  if (!currentStatus) return 'pending';
  
  const pathStages = getStagesForPath(severity, closedOnSpot);
  const currentStageIndex = pathStages.findIndex(s => 
    s.statusMappings.includes(currentStatus)
  );
  const thisStageIndex = pathStages.findIndex(s => s.key === stage.key);
  
  // If this stage is not in the current path
  if (thisStageIndex === -1) return 'skipped';
  
  // Current stage
  if (stage.statusMappings.includes(currentStatus)) return 'current';
  
  // Check if we're at a terminal state
  const terminalStatuses = ['closed', 'expert_rejected', 'returned_to_reporter', 'no_investigation_required'];
  if (terminalStatuses.includes(currentStatus)) {
    if (currentStatus === 'closed' && stage.key === 'closed') return 'current';
    if (thisStageIndex < currentStageIndex || currentStageIndex === -1) return 'completed';
  }
  
  // Completed stages (before current)
  if (currentStageIndex > -1 && thisStageIndex < currentStageIndex) return 'completed';
  
  // Pending stages (after current)
  return 'pending';
}
