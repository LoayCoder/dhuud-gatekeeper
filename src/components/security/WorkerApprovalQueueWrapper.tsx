import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HardHat } from "lucide-react";
import { WorkerApprovalQueue } from "@/components/contractors/WorkerApprovalQueue";
import { usePendingWorkerApprovals } from "@/hooks/contractor-management/use-contractor-workers";
import { Skeleton } from "@/components/ui/skeleton";

export function WorkerApprovalQueueWrapper() {
  const { t } = useTranslation();
  const { data: workers = [], isLoading } = usePendingWorkerApprovals();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardHat className="h-5 w-5" />
            {t("contractors.workers.pendingApprovals", "Pending Worker Approvals")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardHat className="h-5 w-5" />
          {t("contractors.workers.pendingApprovals", "Pending Worker Approvals")}
          <Badge variant="secondary" className="ms-2">{workers.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <WorkerApprovalQueue workers={workers} />
      </CardContent>
    </Card>
  );
}
