import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBulkStatusChange } from '@/hooks/use-bulk-asset-operations';
import type { Database } from '@/integrations/supabase/types';

type AssetStatus = Database['public']['Enums']['asset_status'];

const ASSET_STATUSES: AssetStatus[] = [
  'active',
  'under_maintenance',
  'out_of_service',
  'pending_inspection',
  'retired',
  'missing',
];

interface BulkStatusChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAssetIds: string[];
  onSuccess: () => void;
}

export function BulkStatusChangeDialog({
  open,
  onOpenChange,
  selectedAssetIds,
  onSuccess,
}: BulkStatusChangeDialogProps) {
  const { t, i18n } = useTranslation();
  const [selectedStatus, setSelectedStatus] = useState<AssetStatus | ''>('');
  const { mutate, isPending } = useBulkStatusChange();

  const handleSubmit = () => {
    if (!selectedStatus) return;

    mutate(
      { assetIds: selectedAssetIds, newStatus: selectedStatus },
      {
        onSuccess: () => {
          onSuccess();
          onOpenChange(false);
          setSelectedStatus('');
        },
      }
    );
  };

  const handleClose = () => {
    if (!isPending) {
      onOpenChange(false);
      setSelectedStatus('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]" dir={i18n.dir()}>
        <DialogHeader>
          <DialogTitle>{t('assets.bulk.changeStatusTitle')}</DialogTitle>
          <DialogDescription>
            {t('assets.bulk.changeStatusDescription', { count: selectedAssetIds.length })}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="status">{t('assets.status.label')}</Label>
            <Select
              value={selectedStatus}
              onValueChange={(v) => setSelectedStatus(v as AssetStatus)}
              dir={i18n.dir()}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder={t('assets.bulk.selectStatus')} />
              </SelectTrigger>
              <SelectContent>
                {ASSET_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {t(`assets.status.${status}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedStatus || isPending}>
            {isPending ? t('common.loading') : t('common.apply')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
