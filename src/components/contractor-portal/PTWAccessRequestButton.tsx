import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Shield, Clock, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface PTWAccessRequestButtonProps {
  workerId: string;
  companyId: string;
  ptwAccessStatus?: string | null;
  hasTrainingPTW: boolean;
}

export function PTWAccessRequestButton({
  workerId,
  companyId,
  ptwAccessStatus,
  hasTrainingPTW,
}: PTWAccessRequestButtonProps) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  if (!hasTrainingPTW) return null;

  const handleRequest = async () => {
    if (!profile?.tenant_id) return;
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase
        .from("ptw_access_requests")
        .insert({
          tenant_id: profile.tenant_id,
          worker_id: workerId,
          company_id: companyId,
          requested_by: user?.id || profile.id,
          status: "pending",
        })
        .throwOnError();

      await supabase
        .from("contractor_workers")
        .update({
          ptw_access_status: "pending",
          ptw_access_requested_at: new Date().toISOString(),
        })
        .eq("id", workerId)
        .throwOnError();

      queryClient.invalidateQueries({ queryKey: ["contractor-portal-workers"] });
      toast.success(t("contractors.workers.ptwRequestSent", "PTW access request sent for approval"));
    } catch (error: any) {
      toast.error(error.message || "Failed to send request");
    } finally {
      setIsLoading(false);
    }
  };

  if (ptwAccessStatus === "approved") {
    return (
      <Badge variant="default" className="bg-success text-success-foreground gap-1">
        <CheckCircle className="h-3 w-3" />
        {t("contractors.workers.ptwApproved", "PTW Approved")}
      </Badge>
    );
  }

  if (ptwAccessStatus === "pending") {
    return (
      <Badge variant="secondary" className="gap-1">
        <Clock className="h-3 w-3" />
        {t("contractors.workers.ptwPending", "PTW Pending")}
      </Badge>
    );
  }

  if (ptwAccessStatus === "rejected") {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        {t("contractors.workers.ptwRejected", "PTW Rejected")}
      </Badge>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleRequest}
      disabled={isLoading}
      className="gap-1"
    >
      <Shield className="h-3 w-3" />
      {isLoading
        ? t("common.requesting", "Requesting...")
        : t("contractors.workers.requestPTW", "Request PTW Access")}
    </Button>
  );
}
