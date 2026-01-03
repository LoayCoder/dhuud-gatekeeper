import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, ShieldBan, MessageSquare } from "lucide-react";

interface WorkerBulkActionsToolbarProps {
  selectedCount: number;
  onApprove: () => void;
  onReject: () => void;
  onAddToBlacklist: () => void;
  onSendMessage?: () => void;
  onClear: () => void;
  isApproving?: boolean;
  showBlacklist?: boolean;
  showMessage?: boolean;
}

export function WorkerBulkActionsToolbar({
  selectedCount,
  onApprove,
  onReject,
  onAddToBlacklist,
  onSendMessage,
  onClear,
  isApproving,
  showBlacklist = false,
  showMessage = false,
}: WorkerBulkActionsToolbarProps) {
  const { t } = useTranslation();

  if (selectedCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/50 border rounded-lg mb-4">
      <Badge variant="secondary" className="text-sm">
        {selectedCount} {t("common.selected", "selected")}
      </Badge>
      
      <div className="flex-1" />
      
      {showMessage && onSendMessage && (
        <Button size="sm" variant="secondary" onClick={onSendMessage}>
          <MessageSquare className="h-4 w-4 me-1" />
          {t("contractors.workers.bulkMessage", "Send Message")}
        </Button>
      )}
      
      <Button size="sm" onClick={onApprove} disabled={isApproving}>
        <Check className="h-4 w-4 me-1" />
        {t("contractors.workers.bulkApprove", "Approve Selected")}
      </Button>
      
      <Button size="sm" variant="destructive" onClick={onReject}>
        <X className="h-4 w-4 me-1" />
        {t("contractors.workers.bulkReject", "Reject Selected")}
      </Button>
      
      {showBlacklist && (
        <Button size="sm" variant="outline" onClick={onAddToBlacklist}>
          <ShieldBan className="h-4 w-4 me-1" />
          {t("contractors.workers.addToBlacklist", "Blacklist")}
        </Button>
      )}
      
      <Button size="sm" variant="ghost" onClick={onClear}>
        {t("common.clear", "Clear")}
      </Button>
    </div>
  );
}
