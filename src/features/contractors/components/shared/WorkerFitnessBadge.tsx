import { Badge } from "@/components/ui/badge";

interface WorkerFitnessBadgeProps {
  status?: string | null;
}

export function WorkerFitnessBadge({ status }: WorkerFitnessBadgeProps) {
  if (!status || status === "pending" || status === "pending_medical") {
    return <Badge variant="outline" className="text-warning border-warning/30">Pending</Badge>;
  }
  if (status === "fit") {
    return <Badge variant="outline" className="text-success border-success/30">Fit</Badge>;
  }
  return <Badge variant="destructive">{status}</Badge>;
}
