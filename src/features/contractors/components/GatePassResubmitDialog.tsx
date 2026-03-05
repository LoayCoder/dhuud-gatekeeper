import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Calendar, Clock, RefreshCw } from "lucide-react";
import { useResubmitGatePass } from "@/features/contractors/hooks/use-gate-pass-renewal";
import { useDateRangeValidation } from "@/hooks/use-date-range-validation";
import { MaterialGatePass } from "@/features/contractors/hooks/use-material-gate-passes";

interface GatePassResubmitDialogProps {
  pass: MaterialGatePass | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function GatePassResubmitDialog({
  pass,
  open,
  onOpenChange,
  onSuccess,
}: GatePassResubmitDialogProps) {
  const { t } = useTranslation();
  const resubmitMutation = useResubmitGatePass();

  // Use shared date range validation hook
  const {
    dateRange,
    handleStartDateChange,
    handleEndDateChange,
    getMaxEndDate,
    getToday,
    dateRangeError,
  } = useDateRangeValidation({ maxDays: 7 });

  const [timeWindow, setTimeWindow] = useState({
    time_window_start: "",
    time_window_end: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pass || dateRangeError) return;

    await resubmitMutation.mutateAsync({
      gatePassId: pass.id,
      startDate: dateRange.start_date,
      endDate: dateRange.end_date,
      timeWindowStart: timeWindow.time_window_start || undefined,
      timeWindowEnd: timeWindow.time_window_end || undefined,
    });

    onOpenChange(false);
    onSuccess?.();
  };

  if (!pass) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            {t("contractors.gatePasses.resubmitTitle", "Resubmit Gate Pass")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "contractors.gatePasses.resubmitDescription",
              "Update the dates for your gate pass. All other details will be preserved."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Pass Info */}
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-semibold">{pass.reference_number}</span>
              <Badge variant="secondary">
                {t("contractors.passStatus.pendingResubmission", "Pending Resubmission")}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {pass.material_description}
            </p>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              {t(
                "contractors.gatePasses.resubmitWarning",
                "This pass has expired after renewal. Select new dates to resubmit for approval."
              )}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {t("contractors.gatePasses.startDate", "Start Date")} *
                </Label>
                <Input
                  type="date"
                  value={dateRange.start_date}
                  min={getToday()}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {t("contractors.gatePasses.endDate", "End Date")} *
                </Label>
                <Input
                  type="date"
                  value={dateRange.end_date}
                  min={dateRange.start_date}
                  max={getMaxEndDate()}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  required
                />
              </div>
            </div>

            {dateRangeError && (
              <p className="text-xs text-destructive">{dateRangeError}</p>
            )}

            <p className="text-xs text-muted-foreground">
              {t("contractors.gatePasses.dateRangeNote", "Pass validity can span up to 7 days maximum.")}
            </p>

            {/* Time Window */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {t("contractors.gatePasses.timeWindowStart", "Time From")}
                  <span className="text-muted-foreground text-xs">
                    ({t("common.optional", "Optional")})
                  </span>
                </Label>
                <Input
                  type="time"
                  value={timeWindow.time_window_start}
                  onChange={(e) => setTimeWindow({ ...timeWindow, time_window_start: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {t("contractors.gatePasses.timeWindowEnd", "Time To")}
                  <span className="text-muted-foreground text-xs">
                    ({t("common.optional", "Optional")})
                  </span>
                </Label>
                <Input
                  type="time"
                  value={timeWindow.time_window_end}
                  onChange={(e) => setTimeWindow({ ...timeWindow, time_window_end: e.target.value })}
                />
              </div>
            </div>
          </form>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={resubmitMutation.isPending || !!dateRangeError}
          >
            {resubmitMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 me-2 animate-spin" />
                {t("common.submitting", "Submitting...")}
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 me-2" />
                {t("contractors.gatePasses.resubmit", "Resubmit")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
