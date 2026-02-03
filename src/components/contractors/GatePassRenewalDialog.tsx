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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, AlertTriangle, Clock, Info } from "lucide-react";
import { useRenewGatePass, useCanRenewGatePass } from "@/hooks/contractor-management/use-gate-pass-renewal";
import { format, addDays } from "date-fns";

interface GatePassRenewalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gatePass: {
    id: string;
    reference_number: string;
    pass_date: string;
    material_description: string;
    renewal_count?: number;
    original_pass_date?: string;
    vehicle_plate?: string;
    driver_name?: string;
  } | null;
  onSuccess?: () => void;
}

export function GatePassRenewalDialog({
  open,
  onOpenChange,
  gatePass,
  onSuccess,
}: GatePassRenewalDialogProps) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState("");
  const renewPass = useRenewGatePass();
  const { data: canRenew, isLoading: checkingRenewal } = useCanRenewGatePass(
    gatePass?.id
  );

  if (!gatePass) return null;

  const newPassDate = format(new Date(), "dd/MM/yyyy");
  const isRenewalAllowed = canRenew?.allowed === true;

  const handleRenew = async () => {
    try {
      await renewPass.mutateAsync({
        passId: gatePass.id,
        notes: notes.trim() || undefined,
      });
      setNotes("");
      onOpenChange(false);
      onSuccess?.();
    } catch {
      // Error handled by hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            {t("contractors.gatePasses.renewPass", "Renew Gate Pass")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "contractors.gatePasses.renewDescription",
              "Extend this expired gate pass by 24 hours. This can only be done once per pass."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Pass Details */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {t("contractors.gatePasses.reference", "Reference")}
              </span>
              <Badge variant="outline" className="font-mono">
                {gatePass.reference_number}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {t("contractors.gatePasses.originalDate", "Original Date")}
              </span>
              <span className="text-sm font-medium">
                {format(new Date(gatePass.original_pass_date || gatePass.pass_date), "dd/MM/yyyy")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {t("contractors.gatePasses.expiredDate", "Expired Date")}
              </span>
              <span className="text-sm font-medium text-destructive">
                {format(new Date(gatePass.pass_date), "dd/MM/yyyy")}
              </span>
            </div>
            {gatePass.vehicle_plate && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("contractors.gatePasses.vehicle", "Vehicle")}
                </span>
                <span className="text-sm font-medium">{gatePass.vehicle_plate}</span>
              </div>
            )}
          </div>

          {/* Renewal Info */}
          {isRenewalAllowed ? (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                {t(
                  "contractors.gatePasses.renewalInfo",
                  "Pass will be valid for today ({{date}}). If it expires again without being used, it will be returned to the requester for resubmission.",
                  { date: newPassDate }
                )}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {canRenew?.reason ||
                  t("contractors.gatePasses.renewalNotAllowed", "This pass cannot be renewed")}
              </AlertDescription>
            </Alert>
          )}

          {/* Notes */}
          {isRenewalAllowed && (
            <div className="space-y-2">
              <Label htmlFor="renewal-notes">
                {t("contractors.gatePasses.renewalNotes", "Renewal Notes (Optional)")}
              </Label>
              <Textarea
                id="renewal-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t(
                  "contractors.gatePasses.renewalNotesPlaceholder",
                  "Add any notes about this renewal..."
                )}
                rows={2}
              />
            </div>
          )}

          {/* Warning */}
          {(gatePass.renewal_count ?? 0) === 0 && isRenewalAllowed && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              <p>
                {t(
                  "contractors.gatePasses.renewalWarning",
                  "This is a one-time extension. If the pass expires again, the requester must resubmit with new dates."
                )}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            onClick={handleRenew}
            disabled={renewPass.isPending || checkingRenewal || !isRenewalAllowed}
          >
            {renewPass.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 me-2 animate-spin" />
                {t("contractors.gatePasses.renewing", "Renewing...")}
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 me-2" />
                {t("contractors.gatePasses.renewFor24h", "Renew for 24 Hours")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
