import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { MaterialGatePass, useBulkRejectGatePasses } from "@/hooks/contractor-management/use-material-gate-passes";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface GatePassBulkRejectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  passes: MaterialGatePass[];
  onSuccess: () => void;
}

export function GatePassBulkRejectionDialog({
  open,
  onOpenChange,
  passes,
  onSuccess,
}: GatePassBulkRejectionDialogProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [results, setResults] = useState<{ success: number; failed: number } | null>(null);
  const bulkReject = useBulkRejectGatePasses();

  const handleReject = async () => {
    if (!reason.trim()) return;
    
    const result = await bulkReject.mutateAsync({
      passIds: passes.map((p) => p.id),
      reason: reason.trim(),
    });

    setResults(result);
    
    if (result.success > 0) {
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    }
  };

  const handleClose = () => {
    setReason("");
    setResults(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <X className="h-5 w-5" />
            {t("contractors.gatePasses.bulk.confirmRejection", "Confirm Bulk Rejection")}
          </DialogTitle>
          <DialogDescription>
            {t("contractors.gatePasses.bulk.rejectionSummary", "You are about to reject {{count}} gate passes", { count: passes.length })}
          </DialogDescription>
        </DialogHeader>

        {results ? (
          <div className="py-4 space-y-3">
            {results.success > 0 && (
              <Alert variant="default" className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                <CheckCircle2 className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-700 dark:text-amber-400">
                  {t("contractors.gatePasses.bulk.rejectSuccess", "{{count}} passes rejected", { count: results.success })}
                </AlertDescription>
              </Alert>
            )}
            {results.failed > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t("contractors.gatePasses.bulk.rejectFailed", "{{count}} passes failed to reject", { count: results.failed })}
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-48 border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-start p-2 font-medium">{t("contractors.gatePasses.reference", "Reference")}</th>
                    <th className="text-start p-2 font-medium">{t("contractors.gatePasses.material", "Material")}</th>
                    <th className="text-start p-2 font-medium">{t("contractors.gatePasses.date", "Date")}</th>
                  </tr>
                </thead>
                <tbody>
                  {passes.map((pass) => (
                    <tr key={pass.id} className="border-t">
                      <td className="p-2 font-mono text-xs">{pass.reference_number}</td>
                      <td className="p-2 truncate max-w-32">{pass.material_description}</td>
                      <td className="p-2">{format(new Date(pass.pass_date), "dd/MM/yyyy")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>

            <div className="space-y-2">
              <Label htmlFor="bulk-reason" className="text-destructive">
                {t("contractors.gatePasses.bulk.rejectionReason", "Rejection reason (applied to all)")} *
              </Label>
              <Textarea
                id="bulk-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("contractors.gatePasses.bulk.reasonPlaceholder", "Required: Enter reason for rejection...")}
                rows={3}
                className="border-destructive/50 focus-visible:ring-destructive"
              />
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={bulkReject.isPending}>
            {t("common.cancel", "Cancel")}
          </Button>
          {!results && (
            <Button 
              variant="destructive" 
              onClick={handleReject} 
              disabled={bulkReject.isPending || !reason.trim()}
            >
              {bulkReject.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 me-1 animate-spin" />
                  {t("contractors.gatePasses.bulk.processing", "Processing...")}
                </>
              ) : (
                <>
                  <X className="h-4 w-4 me-1" />
                  {t("contractors.gatePasses.bulk.rejectCount", "Reject All ({{count}})", { count: passes.length })}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
