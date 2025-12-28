import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { usePurchaseRequests, useDecidePurchaseRequest } from "@/hooks/use-asset-approval-workflows";
import { format } from "date-fns";

interface PurchaseApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string | null;
}

export function PurchaseApprovalDialog({ open, onOpenChange, requestId }: PurchaseApprovalDialogProps) {
  const { t } = useTranslation();
  const { data: requests } = usePurchaseRequests();
  const decideRequest = useDecidePurchaseRequest();
  
  const [notes, setNotes] = useState("");
  
  const request = requests?.find(r => r.id === requestId);

  const handleDecision = async (decision: "approved" | "rejected") => {
    if (!requestId) return;
    
    await decideRequest.mutateAsync({
      requestId,
      decision,
      notes,
    });
    
    setNotes("");
    onOpenChange(false);
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("purchaseApproval.title", "Review Purchase Request")}</DialogTitle>
          <DialogDescription>
            {t("purchaseApproval.description", "Review and approve or reject this purchase request")}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Request Summary */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("purchaseRequest.requestNumber", "Request #")}</span>
              <span className="font-mono">{request.request_number}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("common.title", "Title")}</span>
              <span className="font-medium">{request.title}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("purchaseRequest.totalCost", "Total Cost")}</span>
              <span className="text-lg font-bold">
                {(request.estimated_cost * request.quantity).toLocaleString()} {request.currency}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("common.quantity", "Quantity")}</span>
              <span>{request.quantity}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("common.date", "Date")}</span>
              <span>{format(new Date(request.requested_at), "dd/MM/yyyy HH:mm")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("purchaseRequest.approvalLevel", "Current Level")}</span>
              <Badge variant="outline">{request.current_approval_level}</Badge>
            </div>
          </div>
          
          {/* Justification */}
          {request.justification && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">{t("purchaseRequest.justification", "Business Justification")}</Label>
              <div className="p-3 border rounded-lg bg-background">
                <p className="text-sm">{request.justification}</p>
              </div>
            </div>
          )}
          
          {/* Description */}
          {request.description && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">{t("common.description", "Description")}</Label>
              <div className="p-3 border rounded-lg bg-background">
                <p className="text-sm">{request.description}</p>
              </div>
            </div>
          )}
          
          {/* Vendor Info */}
          {request.vendor_name && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">{t("purchaseRequest.vendorName", "Vendor")}:</span>
              <span>{request.vendor_name}</span>
            </div>
          )}
          
          {/* Approval Notes */}
          <div className="space-y-2">
            <Label>{t("purchaseApproval.notes", "Approval Notes")}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("purchaseApproval.notesPlaceholder", "Add any notes or conditions for your decision...")}
              rows={3}
            />
          </div>
        </div>
        
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button 
            variant="destructive"
            onClick={() => handleDecision("rejected")} 
            disabled={decideRequest.isPending}
          >
            {decideRequest.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            <XCircle className="h-4 w-4 me-2 rtl:rotate-0" />
            {t("purchaseApproval.reject", "Reject")}
          </Button>
          <Button 
            onClick={() => handleDecision("approved")} 
            disabled={decideRequest.isPending}
          >
            {decideRequest.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            <CheckCircle className="h-4 w-4 me-2" />
            {t("purchaseApproval.approve", "Approve")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
