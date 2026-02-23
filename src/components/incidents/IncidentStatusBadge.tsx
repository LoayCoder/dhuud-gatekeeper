import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatStatusLabel } from '@/lib/incident-status-colors';
import {
  FileText,
  Search,
  Clock,
  AlertTriangle,
  RotateCcw,
  XCircle,
  CheckCircle2,
  Lock,
  UserCheck,
  ArrowUpCircle,
  ClipboardCheck,
  FileCheck,
  Timer,
  ShieldCheck,
  Gavel // Assuming Gavel might be available, if not I'll fallback or check imports. Wait, Gavel is not imported. I'll stick to imported ones or add it if I knew it existed. I'll stick to imported.
} from 'lucide-react';

interface IncidentStatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, {
  icon: React.ElementType;
  colorClass: string;
}> = {
  // --- Draft ---
  draft: {
    icon: FileText,
    colorClass: 'bg-muted text-muted-foreground border-border'
  },

  // --- Screening ---
  submitted: {
    icon: FileText,
    colorClass: 'bg-info/10 text-info border-info/30'
  },
  pending_review: {
    icon: Clock,
    colorClass: 'bg-info/10 text-info border-info/30'
  },
  expert_screening: {
    icon: Search,
    colorClass: 'bg-info/10 text-info border-info/30'
  },
  pending_expert_screening: {
    icon: Search,
    colorClass: 'bg-info/10 text-info border-info/30'
  },
  pending_dept_rep_approval: {
    icon: ClipboardCheck,
    colorClass: 'bg-warning/10 text-warning border-warning/30'
  },
  pending_contractor_screening: {
    icon: UserCheck,
    colorClass: 'bg-warning/10 text-warning border-warning/30'
  },
  pending_consultant_screening: {
    icon: UserCheck,
    colorClass: 'bg-warning/10 text-warning border-warning/30'
  },
  pending_site_client_approval: {
    icon: UserCheck,
    colorClass: 'bg-warning/10 text-warning border-warning/30'
  },
  pending_contractor_implementation: {
    icon: ClipboardCheck,
    colorClass: 'bg-warning/10 text-warning border-warning/30'
  },

  // --- Rejection/Return ---
  returned_to_reporter: {
    icon: RotateCcw,
    colorClass: 'bg-warning/10 text-warning border-warning/30'
  },
  expert_rejected: {
    icon: XCircle,
    colorClass: 'bg-destructive/10 text-destructive border-destructive/30'
  },
  manager_rejected: {
    icon: XCircle,
    colorClass: 'bg-destructive/10 text-destructive border-destructive/30'
  },
  dept_rep_rejected: {
    icon: XCircle,
    colorClass: 'bg-destructive/10 text-destructive border-destructive/30'
  },
  pending_manager_approval: {
    icon: UserCheck,
    colorClass: 'bg-warning/10 text-warning border-warning/30'
  },
  hsse_manager_escalation: {
    icon: ArrowUpCircle,
    colorClass: 'bg-warning/10 text-warning border-warning/30'
  },
  pending_no_investigation_approval: {
    icon: FileCheck,
    colorClass: 'bg-warning/10 text-warning border-warning/30'
  },
  pending_escalation_approval: {
    icon: ArrowUpCircle,
    colorClass: 'bg-warning/10 text-warning border-warning/30'
  },

  // --- Investigation ---
  investigation_pending: {
    icon: Timer,
    colorClass: 'bg-info/10 text-info border-info/30'
  },
  investigation_in_progress: {
    icon: Search,
    colorClass: 'bg-info/10 text-info border-info/30'
  },
  under_investigation: {
    icon: Search,
    colorClass: 'bg-info/10 text-info border-info/30'
  },
  pending_investigator_assignment: {
    icon: UserCheck,
    colorClass: 'bg-info/10 text-info border-info/30'
  },
  pending_witness_review: {
    icon: FileText,
    colorClass: 'bg-info/10 text-info border-info/30'
  },
  pending_rca_locking: {
    icon: Lock,
    colorClass: 'bg-info/10 text-info border-info/30'
  },
  pending_hsse_validation: {
    icon: ShieldCheck,
    colorClass: 'bg-success/10 text-success border-success/30'
  },

  // --- Governance ---
  pending_legal_review: {
    icon: FileText,
    colorClass: 'bg-destructive/10 text-destructive border-destructive/30'
  },
  dispute_resolution: {
    icon: AlertTriangle,
    colorClass: 'bg-destructive/10 text-destructive border-destructive/30'
  },
  pending_contractor_dispute_review: {
    icon: AlertTriangle,
    colorClass: 'bg-destructive/10 text-destructive border-destructive/30'
  },
  pending_violation_approval: {
    icon: FileCheck,
    colorClass: 'bg-destructive/10 text-destructive border-destructive/30'
  },
  pending_fine_calculation: {
    icon: FileText,
    colorClass: 'bg-destructive/10 text-destructive border-destructive/30'
  },
  osha_reportable: {
    icon: AlertTriangle,
    colorClass: 'bg-destructive/10 text-destructive border-destructive/30'
  },

  // --- Action Management ---
  observation_actions_pending: {
    icon: Timer,
    colorClass: 'bg-pending/10 text-pending border-pending/30'
  },
  pending_action_completion: {
    icon: Timer,
    colorClass: 'bg-pending/10 text-pending border-pending/30'
  },
  pending_action_verification: {
    icon: CheckCircle2,
    colorClass: 'bg-pending/10 text-pending border-pending/30'
  },
  monitoring_30_day: {
    icon: Clock,
    colorClass: 'bg-pending/10 text-pending border-pending/30'
  },
  monitoring_60_day: {
    icon: Clock,
    colorClass: 'bg-pending/10 text-pending border-pending/30'
  },
  monitoring_90_day: {
    icon: Clock,
    colorClass: 'bg-pending/10 text-pending border-pending/30'
  },

  // --- Closure ---
  pending_closure: {
    icon: FileCheck,
    colorClass: 'bg-pending/10 text-pending border-pending/30'
  },
  investigation_closed: {
    icon: ShieldCheck,
    colorClass: 'bg-success/10 text-success border-success/30'
  },
  pending_final_closure: {
    icon: FileCheck,
    colorClass: 'bg-pending/10 text-pending border-pending/30'
  },

  // --- Closed ---
  closed: {
    icon: Lock,
    colorClass: 'bg-muted text-muted-foreground border-border'
  },
  rejected_invalid: {
    icon: XCircle,
    colorClass: 'bg-muted text-muted-foreground border-border'
  },
  no_investigation_required: {
    icon: CheckCircle2,
    colorClass: 'bg-muted text-muted-foreground border-border'
  },
  closed_rejected_approved_by_hsse: {
    icon: CheckCircle2,
    colorClass: 'bg-muted text-muted-foreground border-border'
  }
};

export function IncidentStatusBadge({ status, className }: IncidentStatusBadgeProps) {
  const { t } = useTranslation();

  const config = statusConfig[status] || {
    icon: FileText,
    colorClass: 'bg-muted text-muted-foreground border-border'
  };

  const Icon = config.icon;
  // C19: Use formatStatusLabel for Title Case fallback instead of raw snake_case
  const label = t(`incidents.status.${status}`, { defaultValue: formatStatusLabel(status) });

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 font-medium border",
        config.colorClass,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}
