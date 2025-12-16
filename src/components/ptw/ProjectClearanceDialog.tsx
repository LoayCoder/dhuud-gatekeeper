import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePTWProjectClearances, useApproveClearanceCheck, useRejectClearanceCheck } from "@/hooks/ptw";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  Shield, 
  Users, 
  Briefcase,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ProjectClearanceDialogProps {
  projectId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  documentation: FileText,
  safety: Shield,
  personnel: Users,
  insurance: Briefcase,
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-500",
  approved: "bg-green-500",
  rejected: "bg-red-500",
};

export function ProjectClearanceDialog({ projectId, open, onOpenChange }: ProjectClearanceDialogProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar" || i18n.language === "ur";
  
  const { data: clearances, isLoading } = usePTWProjectClearances(projectId || undefined);
  const approveMutation = useApproveClearanceCheck();
  const rejectMutation = useRejectClearanceCheck();
  
  const [selectedCheckId, setSelectedCheckId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const approvedCount = clearances?.filter(c => c.status === "approved").length || 0;
  const totalCount = clearances?.length || 0;
  const progress = totalCount > 0 ? (approvedCount / totalCount) * 100 : 0;

  const handleApprove = async (checkId: string) => {
    try {
      await approveMutation.mutateAsync({ checkId });
      toast.success(t("ptw.clearance.approved", "Clearance approved"));
    } catch (error) {
      toast.error(t("ptw.clearance.approveError", "Failed to approve clearance"));
    }
  };

  const handleReject = async () => {
    if (!selectedCheckId || !rejectionReason.trim()) return;
    
    try {
      await rejectMutation.mutateAsync({ 
        checkId: selectedCheckId, 
        comments: rejectionReason.trim() 
      });
      toast.success(t("ptw.clearance.rejected", "Clearance rejected"));
      setShowRejectForm(false);
      setSelectedCheckId(null);
      setRejectionReason("");
    } catch (error) {
      toast.error(t("ptw.clearance.rejectError", "Failed to reject clearance"));
    }
  };

  const startReject = (checkId: string) => {
    setSelectedCheckId(checkId);
    setShowRejectForm(true);
  };

  const cancelReject = () => {
    setShowRejectForm(false);
    setSelectedCheckId(null);
    setRejectionReason("");
  };

  // Group clearances by category
  const groupedClearances = clearances?.reduce((acc, check) => {
    const category = check.category || "other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(check);
    return acc;
  }, {} as Record<string, typeof clearances>) || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>{t("ptw.clearance.title", "Project Clearance")}</DialogTitle>
          <DialogDescription>
            {t("ptw.clearance.description", "Review and approve all clearance requirements before project activation")}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Summary */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {t("ptw.clearance.progress", "Mobilization Progress")}
            </span>
            <span className="font-medium">
              {approvedCount}/{totalCount} {t("ptw.clearance.completed", "completed")}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Separator />

        {/* Rejection Form */}
        {showRejectForm && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">{t("ptw.clearance.rejectTitle", "Reject Clearance")}</span>
            </div>
            <Textarea
              placeholder={t("ptw.clearance.rejectReasonPlaceholder", "Enter reason for rejection...")}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={cancelReject}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleReject}
                disabled={!rejectionReason.trim() || rejectMutation.isPending}
              >
                {rejectMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t("ptw.clearance.confirmReject", "Confirm Rejection")}
              </Button>
            </div>
          </div>
        )}

        {/* Clearance List */}
        <ScrollArea className="h-[400px] pe-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : clearances?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("ptw.clearance.noClearances", "No clearance requirements found")}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedClearances).map(([category, checks]) => {
                const IconComponent = categoryIcons[category] || FileText;
                return (
                  <div key={category} className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <IconComponent className="h-4 w-4" />
                      <span className="capitalize">
                        {t(`ptw.clearance.category.${category}`, category.replace(/_/g, " "))}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      {checks?.map((check) => (
                        <div
                          key={check.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border ${
                            check.status === "rejected" ? "border-destructive/50 bg-destructive/5" : "bg-card"
                          }`}
                        >
                          {/* Status Icon */}
                          <div className="mt-0.5">
                            {check.status === "approved" && (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            )}
                            {check.status === "rejected" && (
                              <XCircle className="h-5 w-5 text-destructive" />
                            )}
                            {check.status === "pending" && (
                              <Clock className="h-5 w-5 text-amber-500" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-medium text-sm">
                                  {isRTL && check.requirement_name_ar 
                                    ? check.requirement_name_ar 
                                    : check.requirement_name}
                                </p>
                                {check.is_mandatory && (
                                  <Badge variant="destructive" className="text-xs mt-1">
                                    {t("ptw.clearance.mandatory", "Mandatory")}
                                  </Badge>
                                )}
                              </div>
                              <Badge
                                variant={
                                  check.status === "approved" ? "default" :
                                  check.status === "rejected" ? "destructive" :
                                  "secondary"
                                }
                              >
                                {t(`ptw.clearance.status.${check.status}`, check.status)}
                              </Badge>
                            </div>

                            {/* Comments / Rejection Reason */}
                            {check.comments && (
                              <p className={`text-sm mt-2 ${check.status === "rejected" ? "text-destructive" : "text-muted-foreground"}`}>
                                {check.status === "rejected" 
                                  ? `${t("ptw.clearance.rejectionReason", "Reason")}: ${check.comments}`
                                  : check.comments
                                }
                              </p>
                            )}

                            {/* Actions for pending items */}
                            {check.status === "pending" && !showRejectForm && (
                              <div className="flex gap-2 mt-3">
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleApprove(check.id)}
                                  disabled={approveMutation.isPending}
                                >
                                  {approveMutation.isPending && (
                                    <Loader2 className="me-2 h-3 w-3 animate-spin" />
                                  )}
                                  <CheckCircle2 className="me-1 h-3 w-3" />
                                  {t("ptw.clearance.approve", "Approve")}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => startReject(check.id)}
                                >
                                  <XCircle className="me-1 h-3 w-3" />
                                  {t("ptw.clearance.reject", "Reject")}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer Status */}
        {progress === 100 && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
            <p className="text-sm text-green-700 dark:text-green-400 font-medium">
              {t("ptw.clearance.allApproved", "All clearances approved! Project is ready for activation.")}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
