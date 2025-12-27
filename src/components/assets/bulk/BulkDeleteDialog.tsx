import { useTranslation } from 'react-i18next';
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

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent dir={i18n.dir()}>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('assets.bulk.deleteTitle')}</AlertDialogTitle>
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
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? t('common.loading') : t('common.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
