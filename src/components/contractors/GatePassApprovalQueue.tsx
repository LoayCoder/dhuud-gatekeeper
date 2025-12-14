import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { MaterialGatePass, useApproveGatePass, useRejectGatePass } from "@/hooks/contractor-management/use-material-gate-passes";

interface GatePassApprovalQueueProps {
  passes: MaterialGatePass[];
}

export function GatePassApprovalQueue({ passes }: GatePassApprovalQueueProps) {
  const { t } = useTranslation();
  const approvePass = useApproveGatePass();
  const rejectPass = useRejectGatePass();

  if (passes.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">{t("contractors.gatePasses.noPendingApprovals", "No pending approvals")}</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {passes.map((pass) => (
        <Card key={pass.id}>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold font-mono">{pass.pass_number}</h3>
                <p className="text-sm text-muted-foreground">{pass.project?.project_name}</p>
              </div>
              <p className="text-sm">{pass.material_description}</p>
              <div className="flex gap-2 pt-2">
                <Button size="sm" className="flex-1" onClick={() => approvePass.mutate({ passId: pass.id, approvalType: pass.status === "pending_pm_approval" ? "pm" : "safety" })}>
                  <Check className="h-4 w-4 me-1" /> {t("common.approve", "Approve")}
                </Button>
                <Button size="sm" variant="destructive" className="flex-1" onClick={() => rejectPass.mutate({ passId: pass.id, reason: "Rejected" })}>
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
