import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { ContractorWorker, useApproveWorker, useRejectWorker } from "@/hooks/contractor-management/use-contractor-workers";

interface WorkerApprovalQueueProps {
  workers: ContractorWorker[];
}

export function WorkerApprovalQueue({ workers }: WorkerApprovalQueueProps) {
  const { t } = useTranslation();
  const approveWorker = useApproveWorker();
  const rejectWorker = useRejectWorker();

  if (workers.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">{t("contractors.workers.noPendingApprovals", "No pending approvals")}</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {workers.map((worker) => (
        <Card key={worker.id}>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold">{worker.full_name}</h3>
                <p className="text-sm text-muted-foreground">{worker.company?.company_name}</p>
              </div>
              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">{t("contractors.workers.nationalId", "ID")}:</span> {worker.national_id}</p>
                <p><span className="text-muted-foreground">{t("contractors.workers.nationality", "Nationality")}:</span> {worker.nationality || "-"}</p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" className="flex-1" onClick={() => approveWorker.mutate(worker.id)} disabled={approveWorker.isPending}>
                  <Check className="h-4 w-4 me-1" /> {t("common.approve", "Approve")}
                </Button>
                <Button size="sm" variant="destructive" className="flex-1" onClick={() => rejectWorker.mutate({ workerId: worker.id, reason: "Rejected" })} disabled={rejectWorker.isPending}>
                  <X className="h-4 w-4 me-1" /> {t("common.reject", "Reject")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
