import { useState, useEffect } from 'react';
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
import { useBulkLocationChange } from '@/hooks/use-bulk-asset-operations';
import { useBranches } from '@/hooks/use-branches';
import { useSites } from '@/hooks/use-sites';

interface BulkLocationChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAssetIds: string[];
  onSuccess: () => void;
}

export function BulkLocationChangeDialog({
  open,
  onOpenChange,
  selectedAssetIds,
  onSuccess,
}: BulkLocationChangeDialogProps) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');

  const { data: branches } = useBranches();
  const { data: sites } = useSites(selectedBranchId || undefined);
  const { mutate, isPending } = useBulkLocationChange();

  // Reset site when branch changes
  useEffect(() => {
    setSelectedSiteId('');
  }, [selectedBranchId]);

  const handleSubmit = () => {
    if (!selectedBranchId && !selectedSiteId) return;

    mutate(
      {
        assetIds: selectedAssetIds,
        branchId: selectedBranchId || null,
        siteId: selectedSiteId || null,
        // Clear building and floor when moving to new location
        buildingId: null,
        floorZoneId: null,
      },
      {
        onSuccess: () => {
          onSuccess();
          onOpenChange(false);
          setSelectedBranchId('');
          setSelectedSiteId('');
        },
      }
    );
  };

  const handleClose = () => {
    if (!isPending) {
      onOpenChange(false);
      setSelectedBranchId('');
      setSelectedSiteId('');
    }
  };

  const canSubmit = selectedBranchId || selectedSiteId;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]" dir={i18n.dir()}>
        <DialogHeader>
          <DialogTitle>{t('assets.bulk.changeLocationTitle')}</DialogTitle>
          <DialogDescription>
            {t('assets.bulk.changeLocationDescription', { count: selectedAssetIds.length })}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="branch">{t('assets.branch')}</Label>
            <Select
              value={selectedBranchId}
              onValueChange={setSelectedBranchId}
              dir={i18n.dir()}
            >
              <SelectTrigger id="branch">
                <SelectValue placeholder={t('assets.bulk.selectBranch')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="clear">{t('assets.bulk.clearLocation')}</SelectItem>
                {branches?.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedBranchId && selectedBranchId !== 'clear' && (
            <div className="grid gap-2">
              <Label htmlFor="site">{t('assets.site')}</Label>
              <Select
                value={selectedSiteId}
                onValueChange={setSelectedSiteId}
                dir={i18n.dir()}
              >
                <SelectTrigger id="site">
                  <SelectValue placeholder={t('assets.bulk.selectSite')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('common.none')}</SelectItem>
                  {sites?.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isPending}>
            {isPending ? t('common.loading') : t('common.apply')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
