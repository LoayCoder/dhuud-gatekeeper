import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ContractorWorker, useCheckWorkerIsSiteRep } from "@/features/contractors/hooks/use-contractor-workers";

interface DeleteWorkerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worker: ContractorWorker | null;
  onConfirm: () => void;
  isPending: boolean;
}

interface SiteRepCheck {
  isSiteRep: boolean;
  companyName?: string;
  companyId?: string;
}

export function DeleteWorkerDialog({
  open,
  onOpenChange,
  worker,
  onConfirm,
  isPending,
}: DeleteWorkerDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const checkWorkerIsSiteRep = useCheckWorkerIsSiteRep();
  
  const [siteRepCheck, setSiteRepCheck] = useState<SiteRepCheck | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // Check if worker is a site representative when dialog opens
  useEffect(() => {
    if (open && worker) {
      setIsChecking(true);
      setSiteRepCheck(null);
      checkWorkerIsSiteRep(worker.id)
        .then(setSiteRepCheck)
        .finally(() => setIsChecking(false));
    } else {
      setSiteRepCheck(null);
    }
  }, [open, worker?.id]);

  if (!worker) return null;

  const handleGoToCompany = () => {
    onOpenChange(false);
    navigate(`/contractors/companies/${siteRepCheck?.companyId || worker.company_id}`);
  };

  // Show loading state while checking
  if (isChecking) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("common.loading", "Loading...")}
            </AlertDialogTitle>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Show warning if worker is a site representative
  if (siteRepCheck?.isSiteRep) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-warning flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {t("contractors.workers.cannotDeleteSiteRep", "Cannot Delete Site Representative")}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              <Alert variant="default" className="border-warning bg-warning/10">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertDescription className="text-start">
                  <strong>{worker.full_name}</strong>{" "}
                  {t(
                    "contractors.workers.siteRepWarning",
                    "is the Site Representative for"
                  )}{" "}
                  <strong>{siteRepCheck.companyName}</strong>.
                </AlertDescription>
              </Alert>
              <p className="text-muted-foreground text-start">
                {t(
                  "contractors.workers.siteRepInstructions",
                  "To delete this worker, please first set the company status to \"Expired\" or \"Inactive\", then try again."
                )}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("common.cancel", "Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleGoToCompany}>
              {t("contractors.workers.goToCompany", "Go to Company")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Normal delete confirmation
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
