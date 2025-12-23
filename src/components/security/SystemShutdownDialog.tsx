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
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2, Power } from "lucide-react";

interface SystemShutdownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<void>;
  isLoading: boolean;
  tenantName: string;
  activeSessionsCount: number;
}

export function SystemShutdownDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  tenantName,
  activeSessionsCount,
}: SystemShutdownDialogProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");

  const handleConfirm = async () => {
    if (confirmText !== tenantName.toUpperCase()) return;
    await onConfirm(reason);
    setReason("");
    setConfirmText("");
  };

  const isValid = reason.length >= 10 && confirmText === tenantName.toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Power className="h-5 w-5" />
            {t("security.systemShutdown", "System Shutdown")}
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <p className="font-semibold text-red-600">
              {t("security.shutdownWarning", "⚠️ CRITICAL: This will terminate ALL active sessions immediately!")}
            </p>
            <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-md border border-red-300">
              <ul className="text-sm space-y-1 text-red-700 dark:text-red-400">
                <li>• {t("security.allUsersLoggedOut", "All users will be logged out instantly")}</li>
                <li>• {t("security.unsavedWorkLost", "Any unsaved work may be lost")}</li>
                <li>• {t("security.actionIrreversible", "This action cannot be undone")}</li>
              </ul>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Impact Summary */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-md">
            <span>{t("security.tenant", "Tenant")}:</span>
            <Badge variant="outline">{tenantName}</Badge>
          </div>
          <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-md">
            <span className="text-red-600">{t("security.activeSessionsToTerminate", "Sessions to terminate")}:</span>
            <Badge variant="destructive">{activeSessionsCount}</Badge>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="shutdown-reason">
              {t("security.reason", "Reason")} <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="shutdown-reason"
              placeholder={t("security.shutdownReasonPlaceholder", "Explain why system shutdown is necessary...")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              {t("security.minimumCharacters", "Minimum 10 characters")} ({reason.length}/10)
            </p>
          </div>

          {/* Confirmation */}
          <div className="space-y-2">
            <Label htmlFor="shutdown-confirm" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              {t("security.typeTenantNameToConfirm", "Type the tenant name to confirm")}:
              <code className="px-1 bg-muted rounded text-red-600">{tenantName.toUpperCase()}</code>
            </Label>
            <Input
              id="shutdown-confirm"
              placeholder={tenantName.toUpperCase()}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              className="font-mono border-red-300 focus:border-red-500"
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
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            <Power className="h-4 w-4 me-2" />
            {t("security.shutdownNow", "Shutdown Now")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
