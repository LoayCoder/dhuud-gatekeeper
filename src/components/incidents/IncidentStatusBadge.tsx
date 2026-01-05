import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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
  ShieldCheck
} from 'lucide-react';

interface IncidentStatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, {
  icon: React.ElementType;
  colorClass: string;
}> = {
  // Initial submission stages - Info
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
  
  // Return/Rejection stages - Destructive
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
  
  // Approval stages - Warning
  pending_manager_approval: {
    icon: UserCheck,
    colorClass: 'bg-warning/10 text-warning border-warning/30'
  },
  hsse_manager_escalation: {
    icon: ArrowUpCircle,
    colorClass: 'bg-warning/10 text-warning border-warning/30'
  },
  pending_dept_rep_approval: {
    icon: ClipboardCheck,
    colorClass: 'bg-warning/10 text-warning border-warning/30'
  },
  
  // Observation with pending actions - Pending
  observation_actions_pending: {
    icon: Timer,
    colorClass: 'bg-pending/10 text-pending border-pending/30'
  },
  
  // Investigation stages - Info variant
  investigation_pending: {
    icon: Timer,
    colorClass: 'bg-info/10 text-info border-info/30'
  },
  investigation_in_progress: {
    icon: Search,
    colorClass: 'bg-info/10 text-info border-info/30'
  },
  
  // Closure workflow stages - Pending
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
  
  // Completed stages - Success/Muted
  closed: {
    icon: Lock,
    colorClass: 'bg-muted text-muted-foreground border-border'
  },
  no_investigation_required: {
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
  const label = t(`incidents.status.${status}`, { defaultValue: status.replace(/_/g, ' ') });
  
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
