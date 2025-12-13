import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useTranslation } from 'react-i18next';
import { useBanContractor, Contractor } from '@/hooks/use-contractors';
import { Loader2, Ban } from 'lucide-react';

interface BanContractorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractor: Contractor | null;
}

export function BanContractorDialog({ open, onOpenChange, contractor }: BanContractorDialogProps) {
  const { t } = useTranslation();
  const banContractor = useBanContractor();
  const [reason, setReason] = useState('');
  const [durationType, setDurationType] = useState<'permanent' | 'until'>('permanent');
  const [expiryDate, setExpiryDate] = useState('');

  const handleBan = async () => {
    if (!contractor || !reason.trim()) return;

    await banContractor.mutateAsync({
      id: contractor.id,
      reason: reason.trim(),
      expiresAt: durationType === 'until' ? expiryDate : undefined,
    });

    setReason('');
    setDurationType('permanent');
    setExpiryDate('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Ban className="h-5 w-5" />
            {t('security.contractors.banContractor')}
          </DialogTitle>
          <DialogDescription>
            {t('security.contractors.banDescription', { name: contractor?.full_name })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">{t('security.contractors.banReason')} *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('security.contractors.banReasonPlaceholder')}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('security.contractors.banDuration')}</Label>
            <RadioGroup value={durationType} onValueChange={(v) => setDurationType(v as 'permanent' | 'until')}>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <RadioGroupItem value="permanent" id="permanent" />
                <Label htmlFor="permanent" className="font-normal">
                  {t('security.contractors.permanentBan')}
                </Label>
              </div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <RadioGroupItem value="until" id="until" />
                <Label htmlFor="until" className="font-normal">
                  {t('security.contractors.banUntilDate')}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {durationType === 'until' && (
            <div className="space-y-2">
              <Label htmlFor="expiryDate">{t('security.contractors.banExpiryDate')}</Label>
              <Input
                id="expiryDate"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleBan}
            disabled={!reason.trim() || banContractor.isPending || (durationType === 'until' && !expiryDate)}
          >
            {banContractor.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t('security.contractors.confirmBan')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
