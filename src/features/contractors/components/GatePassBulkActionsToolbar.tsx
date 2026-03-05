import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Loader2 } from "lucide-react";

interface GatePassBulkActionsToolbarProps {
  selectedCount: number;
  onApprove: () => void;
  onReject: () => void;
  onClear: () => void;
  isProcessing?: boolean;
}

export function GatePassBulkActionsToolbar({
  selectedCount,
  onApprove,
  onReject,
  onClear,
  isProcessing,
}: GatePassBulkActionsToolbarProps) {
  const { t } = useTranslation();

  if (selectedCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/50 border rounded-lg mb-4">
      <Badge variant="secondary" className="text-sm">
        {t("contractors.gatePasses.bulk.selected", "{{count}} selected", { count: selectedCount })}
      </Badge>
      
      <div className="flex-1" />
      
      <Button size="sm" onClick={onApprove} disabled={isProcessing}>
        {isProcessing ? (
          <Loader2 className="h-4 w-4 me-1 animate-spin" />
        ) : (
          <Check className="h-4 w-4 me-1" />
        )}
        {t("contractors.gatePasses.bulk.approveAll", "Approve All")}
      </Button>
      
      <Button size="sm" variant="destructive" onClick={onReject} disabled={isProcessing}>
        <X className="h-4 w-4 me-1" />
        {t("contractors.gatePasses.bulk.rejectAll", "Reject All")}
      </Button>
      
      <Button size="sm" variant="ghost" onClick={onClear} disabled={isProcessing}>
        {t("contractors.gatePasses.bulk.clearSelection", "Clear")}
      </Button>
    </div>
  );
}
