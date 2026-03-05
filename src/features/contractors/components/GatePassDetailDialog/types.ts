import { MaterialGatePass } from "@/features/contractors/hooks/use-material-gate-passes";
import { GatePassApproverProfile } from "@/features/contractors/hooks/use-gate-pass-details";

export interface GatePassDetailDialogProps {
  pass: MaterialGatePass | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActionSuccess?: () => void;
}

export interface TimelineEvent {
  type: string;
  label: string;
  timestamp: string;
  actor?: GatePassApproverProfile | null;
  notes?: string | null;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}
