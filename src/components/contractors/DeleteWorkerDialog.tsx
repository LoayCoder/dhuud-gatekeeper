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
import { ContractorWorker } from "@/hooks/contractor-management/use-contractor-workers";

interface DeleteWorkerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worker: ContractorWorker | null;
  onConfirm: () => void;
  isPending: boolean;
}

export function DeleteWorkerDialog({
  open,
  onOpenChange,
  worker,
  onConfirm,
  isPending,
}: DeleteWorkerDialogProps) {
  const { t } = useTranslation();

  if (!worker) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("contractors.workers.deleteWorker", "Delete Worker")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t(
              "contractors.workers.deleteConfirmation",
              "Are you sure you want to delete {{name}} (ID: {{nationalId}})? This action can be undone by an administrator.",
              { name: worker.full_name, nationalId: worker.national_id }
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {t("common.cancel", "Cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? t("common.deleting", "Deleting...") : t("common.delete", "Delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
