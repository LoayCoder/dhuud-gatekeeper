import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, Clock, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface PTWRequest {
  id: string;
  worker_id: string;
  company_id: string;
  status: string;
  created_at: string;
  worker: { full_name: string; national_id: string; mobile_number: string; email: string | null } | null;
  company: { company_name: string } | null;
}

export function PTWAccessApprovalList() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [rejectDialog, setRejectDialog] = useState<{ id: string; workerName: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["ptw-access-requests", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from("ptw_access_requests")
        .select(`
          id, worker_id, company_id, status, created_at,
          worker:contractor_workers!ptw_access_requests_worker_id_fkey(full_name, national_id, mobile_number, email),
          company:contractor_companies!ptw_access_requests_company_id_fkey(company_name)
        `)
        .eq("tenant_id", profile.tenant_id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as PTWRequest[];
    },
    enabled: !!profile?.tenant_id,
  });

  const handleApprove = async (requestId: string, workerId: string) => {
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();

      await supabase
        .from("ptw_access_requests")
        .update({
          status: "approved",
          reviewed_by: user?.id,
          reviewed_at: now,
        })
        .eq("id", requestId)
        .throwOnError();

      await supabase
        .from("contractor_workers")
        .update({
          ptw_access_status: "approved",
          ptw_access_approved_by: user?.id,
          ptw_access_approved_at: now,
        })
        .eq("id", workerId)
        .throwOnError();

      queryClient.invalidateQueries({ queryKey: ["ptw-access-requests"] });
      toast.success(t("contractors.workers.ptwApprovedSuccess", "PTW access approved"));
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog) return;
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();

      await supabase
        .from("ptw_access_requests")
        .update({
          status: "rejected",
          reviewed_by: user?.id,
          reviewed_at: now,
          rejection_reason: rejectionReason,
        })
        .eq("id", rejectDialog.id)
        .throwOnError();

      // Also find the worker to update their status
      const { data: req } = await supabase
        .from("ptw_access_requests")
        .select("worker_id")
        .eq("id", rejectDialog.id)
        .single();

      if (req?.worker_id) {
        await supabase
          .from("contractor_workers")
          .update({ ptw_access_status: "rejected" })
          .eq("id", req.worker_id)
          .throwOnError();
      }

      queryClient.invalidateQueries({ queryKey: ["ptw-access-requests"] });
      toast.success(t("contractors.workers.ptwRejectedSuccess", "PTW access rejected"));
      setRejectDialog(null);
      setRejectionReason("");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">{t("common.loading", "Loading...")}</div>;
  }

  if (!requests?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
        {t("contractors.workers.noPTWRequests", "No pending PTW access requests")}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {requests.map((req) => (
          <Card key={req.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-medium">{req.worker?.full_name || "—"}</p>
                  <p className="text-sm text-muted-foreground">
                    {req.company?.company_name} • {req.worker?.national_id}
                  </p>
                  {req.worker?.mobile_number && (
                    <p className="text-sm text-muted-foreground">{req.worker.mobile_number}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(req.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleApprove(req.id, req.worker_id)}
                    disabled={isProcessing}
                    className="gap-1"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    {t("common.approve", "Approve")}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setRejectDialog({ id: req.id, workerName: req.worker?.full_name || "" })}
                    disabled={isProcessing}
                    className="gap-1"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    {t("common.reject", "Reject")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!rejectDialog} onOpenChange={(open) => !open && setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("contractors.workers.rejectPTW", "Reject PTW Access")} — {rejectDialog?.workerName}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder={t("contractors.workers.rejectionReason", "Reason for rejection...")}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isProcessing}>
              {t("common.confirm", "Confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
