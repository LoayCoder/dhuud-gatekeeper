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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RefreshCcw, Calendar, AlertTriangle, Package, Truck } from "lucide-react";
import { useResubmitGatePass } from "@/hooks/contractor-management/use-gate-pass-renewal";
import { format, addDays } from "date-fns";

interface GatePassResubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gatePass: {
    id: string;
    reference_number: string;
    pass_date: string;
    original_pass_date?: string;
    material_description: string;
    revert_reason?: string;
    vehicle_plate?: string;
    driver_name?: string;
    pass_type: string;
    project?: {
      project_name: string;
      company?: { company_name: string };
    } | null;
  } | null;
  onSuccess?: () => void;
}

export function GatePassResubmitDialog({
  open,
  onOpenChange,
  gatePass,
  onSuccess,
}: GatePassResubmitDialogProps) {
  const { t } = useTranslation();
  const today = new Date().toISOString().split("T")[0];
  const maxDate = addDays(new Date(), 7).toISOString().split("T")[0];

  const [newPassDate, setNewPassDate] = useState(today);
  const resubmitPass = useResubmitGatePass();

  if (!gatePass) return null;

  const handleResubmit = async () => {
    try {
      await resubmitPass.mutateAsync({
        passId: gatePass.id,
        newPassDate,
      });
      onOpenChange(false);
      onSuccess?.();
    } catch {
      // Error handled by hook
    }
  };

  const passTypeLabel = {
    material_in: t("contractors.gatePasses.materialIn", "Material In"),
    material_out: t("contractors.gatePasses.materialOut", "Material Out"),
    equipment_in: t("contractors.gatePasses.equipmentIn", "Equipment In"),
    equipment_out: t("contractors.gatePasses.equipmentOut", "Equipment Out"),
  }[gatePass.pass_type] || gatePass.pass_type;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCcw className="h-5 w-5 text-primary" />
            {t("contractors.gatePasses.resubmitPass", "Resubmit Gate Pass")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "contractors.gatePasses.resubmitDescription",
              "Create a new gate pass request with the same details but a new date."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Revert Reason Alert */}
          {gatePass.revert_reason && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>
                {t("contractors.gatePasses.resubmissionRequired", "Resubmission Required")}
              </AlertTitle>
              <AlertDescription>{gatePass.revert_reason}</AlertDescription>
            </Alert>
          )}

          {/* Original Pass Details */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {t("contractors.gatePasses.originalReference", "Original Reference")}
              </span>
              <Badge variant="secondary" className="font-mono">
                {gatePass.reference_number}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {t("contractors.gatePasses.passType", "Pass Type")}
              </span>
              <Badge variant="outline">{passTypeLabel}</Badge>
            </div>

            {gatePass.project && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("contractors.gatePasses.project", "Project")}
                </span>
                <span className="text-sm font-medium">
                  {gatePass.project.project_name}
                </span>
              </div>
            )}

            <div className="pt-2 border-t">
              <div className="flex items-start gap-2">
                <Package className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="text-sm">
                  <span className="text-muted-foreground">
                    {t("contractors.gatePasses.materials", "Materials")}:{" "}
                  </span>
                  <span>{gatePass.material_description}</span>
                </div>
              </div>
            </div>

            {(gatePass.vehicle_plate || gatePass.driver_name) && (
              <div className="flex items-start gap-2">
                <Truck className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="text-sm">
                  {gatePass.vehicle_plate && (
                    <span className="font-medium">{gatePass.vehicle_plate}</span>
                  )}
                  {gatePass.vehicle_plate && gatePass.driver_name && " • "}
                  {gatePass.driver_name && <span>{gatePass.driver_name}</span>}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t("contractors.gatePasses.originalDate", "Original Date")}
              </span>
              <span className="text-destructive font-medium">
                {format(
                  new Date(gatePass.original_pass_date || gatePass.pass_date),
                  "dd/MM/yyyy"
                )}{" "}
                ({t("gatePasses.status.expired", "Expired")})
              </span>
            </div>
          </div>

          {/* New Date Selection */}
          <div className="space-y-2">
            <Label htmlFor="new-pass-date" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t("contractors.gatePasses.selectNewDate", "Select New Pass Date")} *
            </Label>
            <Input
              id="new-pass-date"
              type="date"
              value={newPassDate}
              min={today}
              max={maxDate}
              onChange={(e) => setNewPassDate(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              {t(
                "contractors.gatePasses.dateRangeHint",
                "Date must be between today and 7 days from now"
              )}
            </p>
          </div>

          {/* Info */}
          <Alert>
            <AlertDescription>
              {t(
                "contractors.gatePasses.resubmitInfo",
                "A new gate pass will be created with the same details. It will go through the normal approval process."
              )}
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            onClick={handleResubmit}
            disabled={resubmitPass.isPending || !newPassDate}
          >
            {resubmitPass.isPending ? (
              <>
                <RefreshCcw className="h-4 w-4 me-2 animate-spin" />
                {t("contractors.gatePasses.resubmitting", "Resubmitting...")}
              </>
            ) : (
              <>
                <RefreshCcw className="h-4 w-4 me-2" />
                {t("contractors.gatePasses.resubmitButton", "Resubmit Pass")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
