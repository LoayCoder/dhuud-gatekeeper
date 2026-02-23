import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";
import type { DuplicateResult } from "@/hooks/use-duplicate-check";

interface DuplicateWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicates: DuplicateResult[];
  onProceed: () => void;
  onCancel: () => void;
}

export function DuplicateWarningDialog({
  open,
  onOpenChange,
  duplicates,
  onProceed,
  onCancel,
}: DuplicateWarningDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent dir={direction}>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            {t("incidents.duplicateWarning", "Potential Duplicates Found")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t(
              "incidents.duplicateWarningDesc",
              "The following existing incidents appear similar to the one you are creating. Please review before proceeding."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="max-h-60 overflow-y-auto space-y-2">
          {duplicates.map((dup) => (
            <div
              key={dup.duplicate_id}
              className="border rounded-md p-3 bg-muted/50 space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  {dup.duplicate_reference_id}
                </span>
                <span className="text-xs bg-warning/20 text-warning-foreground px-2 py-0.5 rounded-full">
                  {Math.round(dup.similarity_score * 100)}%{" "}
                  {t("incidents.match", "match")}
                </span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {dup.duplicate_title}
              </p>
            </div>
          ))}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            {t("common.cancel", "Cancel")}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onProceed}>
            {t("incidents.proceedAnyway", "Proceed Anyway")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
