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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2, ShieldOff } from "lucide-react";

interface GlassBreakDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string, duration: number) => Promise<void>;
  isLoading: boolean;
  tenantName: string;
}

export function GlassBreakDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  tenantName,
}: GlassBreakDialogProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState<string>("15");
  const [confirmText, setConfirmText] = useState("");

  const handleConfirm = async () => {
    if (confirmText !== "GLASS BREAK") return;
    await onConfirm(reason, parseInt(duration));
    setReason("");
    setDuration("15");
    setConfirmText("");
  };

  const isValid = reason.length >= 10 && confirmText === "GLASS BREAK";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <ShieldOff className="h-5 w-5" />
            {t("security.activateGlassBreak", "Activate Glass Break")}
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <p>
              {t("security.glassBreakWarning", "This will temporarily bypass security checks for emergency access.")}
            </p>
            <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded-md border border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <span className="text-sm text-amber-700 dark:text-amber-400">
                {t("security.glassBreakAuditWarning", "This action will be logged and audited")}
              </span>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Tenant Badge */}
          <div className="flex items-center gap-2">
            <Label>{t("security.tenant", "Tenant")}:</Label>
            <Badge variant="outline">{tenantName}</Badge>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              {t("security.reason", "Reason")} <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder={t("security.glassBreakReasonPlaceholder", "Describe the emergency situation requiring glass break access...")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              {t("security.minimumCharacters", "Minimum 10 characters")} ({reason.length}/10)
            </p>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">{t("security.duration", "Duration")}</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 {t("common.minutes", "minutes")}</SelectItem>
                <SelectItem value="30">30 {t("common.minutes", "minutes")}</SelectItem>
                <SelectItem value="60">1 {t("common.hour", "hour")}</SelectItem>
                <SelectItem value="120">2 {t("common.hours", "hours")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Confirmation */}
          <div className="space-y-2">
            <Label htmlFor="confirm">
              {t("security.typeToConfirm", "Type GLASS BREAK to confirm")}
            </Label>
            <Input
              id="confirm"
              placeholder="GLASS BREAK"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              className="font-mono"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isValid || isLoading}
          >
            {isLoading && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            🔓 {t("security.activateGlassBreak", "Activate Glass Break")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
