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
  // Initial submission stages
  submitted: {
    icon: FileText,
    colorClass: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
  },
  pending_review: {
    icon: Clock,
    colorClass: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
  },
  expert_screening: {
    icon: Search,
    colorClass: 'bg-cyan-100 text-cyan-700 border-cyan-300 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800'
  },
  
  // Return/Rejection stages (needs attention)
  returned_to_reporter: {
    icon: RotateCcw,
    colorClass: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
  },
  expert_rejected: {
    icon: XCircle,
    colorClass: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
  },
  manager_rejected: {
    icon: XCircle,
    colorClass: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
  },
  
  // Approval stages
  pending_manager_approval: {
    icon: UserCheck,
    colorClass: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800'
  },
  hsse_manager_escalation: {
    icon: ArrowUpCircle,
    colorClass: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800'
  },
  pending_dept_rep_approval: {
    icon: ClipboardCheck,
    colorClass: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800'
  },
  
  // Investigation stages
  investigation_pending: {
    icon: Timer,
    colorClass: 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800'
  },
  investigation_in_progress: {
    icon: Search,
    colorClass: 'bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800'
  },
  
  // Closure workflow stages
  pending_closure: {
    icon: FileCheck,
    colorClass: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800'
  },
  investigation_closed: {
    icon: ShieldCheck,
    colorClass: 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800'
  },
  pending_final_closure: {
    icon: FileCheck,
    colorClass: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800'
  },
  
  // Completed stages
  closed: {
    icon: Lock,
    colorClass: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600'
  },
  no_investigation_required: {
    icon: CheckCircle2,
    colorClass: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600'
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
