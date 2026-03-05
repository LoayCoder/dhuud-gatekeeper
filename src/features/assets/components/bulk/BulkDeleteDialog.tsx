import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useBulkDelete } from '@/hooks/use-bulk-asset-operations';
import { useCheckAssetDependencies, AssetDependencies } from '@/hooks/use-check-asset-dependencies';

interface BulkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAssetIds: string[];
  onSuccess: () => void;
}

export function BulkDeleteDialog({
  open,
  onOpenChange,
  selectedAssetIds,
  onSuccess,
}: BulkDeleteDialogProps) {
  const { t, i18n } = useTranslation();
  const { mutate, isPending } = useBulkDelete();
  const checkDependencies = useCheckAssetDependencies();
  const [dependencies, setDependencies] = useState<AssetDependencies | null>(null);

  // Check dependencies when dialog opens
  useEffect(() => {
    if (open && selectedAssetIds.length > 0) {
      checkDependencies.mutate(selectedAssetIds, {
        onSuccess: setDependencies,
      });
    } else if (!open) {
      setDependencies(null);
    }
  }, [open, selectedAssetIds]);

  const handleDelete = () => {
    mutate(
      { assetIds: selectedAssetIds },
      {
        onSuccess: () => {
          onSuccess();
          onOpenChange(false);
        },
      }
    );
  };

  const hasLinkedRecords = dependencies && dependencies.totalLinkedRecords > 0;
  const isCheckingDependencies = checkDependencies.isPending;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent dir={i18n.dir()}>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {t('assets.bulk.deleteTitle')}
          </AlertDialogTitle>

          {/* Loading state while checking dependencies */}
          {isCheckingDependencies && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ms-2 text-sm text-muted-foreground">
                {t('assets.bulk.checkingDependencies')}
              </span>
            </div>
          )}

          {/* Warning for linked records */}
          {!isCheckingDependencies && hasLinkedRecords && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3 my-2">
              <p className="text-amber-800 dark:text-amber-200 font-medium text-sm">
                ⚠️ {t('assets.bulk.linkedRecordsWarning')}
              </p>
              <ul className="text-sm text-amber-700 dark:text-amber-300 mt-2 list-disc ps-4 space-y-1">
                {dependencies.maintenanceSchedules > 0 && (
                  <li>{t('assets.bulk.linkedSchedules', { count: dependencies.maintenanceSchedules })}</li>
                )}
                {dependencies.costTransactions > 0 && (
                  <li>{t('assets.bulk.linkedCosts', { count: dependencies.costTransactions })}</li>
                )}
                {dependencies.inspections > 0 && (
                  <li>{t('assets.bulk.linkedInspections', { count: dependencies.inspections })}</li>
                )}
                {dependencies.documents > 0 && (
                  <li>{t('assets.bulk.linkedDocuments', { count: dependencies.documents })}</li>
                )}
                {dependencies.photos > 0 && (
                  <li>{t('assets.bulk.linkedPhotos', { count: dependencies.photos })}</li>
                )}
                {dependencies.maintenanceHistory > 0 && (
                  <li>{t('assets.bulk.linkedHistory', { count: dependencies.maintenanceHistory })}</li>
                )}
              </ul>
              <p className="text-sm text-amber-800 dark:text-amber-200 mt-2 font-medium">
                {t('assets.bulk.deleteWarningCascade')}
              </p>
            </div>
          )}

          <AlertDialogDescription>
            {t('assets.bulk.deleteDescription', { count: selectedAssetIds.length })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending || isCheckingDependencies}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin me-2" />
                {t('common.loading')}
              </>
            ) : (
              t('common.delete')
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
