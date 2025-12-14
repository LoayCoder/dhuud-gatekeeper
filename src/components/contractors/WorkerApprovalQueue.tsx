import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Eye, Phone, Globe } from "lucide-react";
import { format } from "date-fns";
import { ContractorWorker, useApproveWorker } from "@/hooks/contractor-management/use-contractor-workers";
import { WorkerRejectionDialog } from "./WorkerRejectionDialog";
import { WorkerDetailDialog } from "./WorkerDetailDialog";

interface WorkerApprovalQueueProps {
  workers: ContractorWorker[];
}

export function WorkerApprovalQueue({ workers }: WorkerApprovalQueueProps) {
  const { t } = useTranslation();
  const approveWorker = useApproveWorker();
  const [rejectWorker, setRejectWorker] = useState<ContractorWorker | null>(null);
  const [viewWorker, setViewWorker] = useState<ContractorWorker | null>(null);

  if (workers.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t("contractors.workers.noPendingApprovals", "No pending approvals")}
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {workers.map((worker) => (
          <Card key={worker.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{worker.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{worker.company?.company_name}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setViewWorker(worker)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="text-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {worker.national_id}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span dir="ltr" className="text-xs">{worker.mobile_number}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Globe className="h-3 w-3" />
                    <span className="text-xs">{worker.nationality || "-"}</span>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  {t("common.submitted", "Submitted")}: {format(new Date(worker.created_at), "PP")}
                </p>
                
                <div className="flex gap-2 pt-2">
                  <Button 
                    size="sm" 
                    className="flex-1" 
                    onClick={() => approveWorker.mutate(worker.id)} 
                    disabled={approveWorker.isPending}
                  >
                    <Check className="h-4 w-4 me-1" /> 
                    {t("common.approve", "Approve")}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    className="flex-1" 
                    onClick={() => setRejectWorker(worker)}
                  >
                    <X className="h-4 w-4 me-1" /> 
                    {t("common.reject", "Reject")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <WorkerRejectionDialog
        open={!!rejectWorker}
        onOpenChange={(open) => !open && setRejectWorker(null)}
        worker={rejectWorker}
      />

      <WorkerDetailDialog
        open={!!viewWorker}
        onOpenChange={(open) => !open && setViewWorker(null)}
        worker={viewWorker}
      />
    </>
  );
}
