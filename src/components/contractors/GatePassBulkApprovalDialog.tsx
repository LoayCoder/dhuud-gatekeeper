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
import { Check, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { MaterialGatePass, useBulkApproveGatePasses } from "@/hooks/contractor-management/use-material-gate-passes";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface GatePassBulkApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  passes: MaterialGatePass[];
  onSuccess: () => void;
}

export function GatePassBulkApprovalDialog({
  open,
  onOpenChange,
  passes,
  onSuccess,
}: GatePassBulkApprovalDialogProps) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState("");
  const [results, setResults] = useState<{ success: number; failed: number } | null>(null);
  const bulkApprove = useBulkApproveGatePasses();

  const handleApprove = async () => {
    // Determine approval type based on first pass status
    const approvalType = passes[0]?.status === "pending_pm_approval" ? "pm" : "safety";
    
    const result = await bulkApprove.mutateAsync({
      passIds: passes.map((p) => p.id),
      approvalType,
      notes: notes.trim() || undefined,
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
    setNotes("");
    setResults(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-primary" />
            {t("contractors.gatePasses.bulk.confirmApproval", "Confirm Bulk Approval")}
          </DialogTitle>
          <DialogDescription>
            {t("contractors.gatePasses.bulk.approvalSummary", "You are about to approve {{count}} gate passes", { count: passes.length })}
          </DialogDescription>
        </DialogHeader>

        {results ? (
          <div className="py-4 space-y-3">
            {results.success > 0 && (
              <Alert variant="default" className="border-green-500 bg-green-50 dark:bg-green-950/20">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700 dark:text-green-400">
                  {t("contractors.gatePasses.bulk.approveSuccess", "{{count}} passes approved", { count: results.success })}
                </AlertDescription>
              </Alert>
            )}
            {results.failed > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t("contractors.gatePasses.bulk.approveFailed", "{{count}} passes failed to approve", { count: results.failed })}
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
              <Label htmlFor="bulk-notes">
                {t("contractors.gatePasses.bulk.sharedNotes", "Approval notes (applied to all)")}
              </Label>
              <Textarea
                id="bulk-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("contractors.gatePasses.bulk.notesPlaceholder", "Optional notes for all passes...")}
                rows={2}
              />
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={bulkApprove.isPending}>
            {t("common.cancel", "Cancel")}
          </Button>
          {!results && (
            <Button onClick={handleApprove} disabled={bulkApprove.isPending}>
              {bulkApprove.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 me-1 animate-spin" />
                  {t("contractors.gatePasses.bulk.processing", "Processing...")}
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 me-1" />
                  {t("contractors.gatePasses.bulk.approveCount", "Approve All ({{count}})", { count: passes.length })}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
