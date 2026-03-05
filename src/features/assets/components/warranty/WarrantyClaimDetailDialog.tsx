import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useWarrantyClaims, useUpdateWarrantyClaim, type WarrantyClaimStatus } from '@/hooks/use-warranty-claims';
import { WarrantyStatusBadge } from './WarrantyStatusBadge';

const CLAIM_STATUSES: WarrantyClaimStatus[] = [
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'completed',
];

interface WarrantyClaimDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  claimId: string;
}

export function WarrantyClaimDetailDialog({
  open,
  onOpenChange,
  claimId,
}: WarrantyClaimDetailDialogProps) {
  const { t, i18n } = useTranslation();
  const { data: claims } = useWarrantyClaims();
  const { mutate: updateClaim, isPending } = useUpdateWarrantyClaim();

  const claim = claims?.find((c) => c.id === claimId);

  const [isEditing, setIsEditing] = useState(false);
  const [editStatus, setEditStatus] = useState<WarrantyClaimStatus | ''>('');
  const [editRepairCost, setEditRepairCost] = useState<string>('');
  const [editResolutionNotes, setEditResolutionNotes] = useState<string>('');

  if (!claim) return null;

  const handleStartEdit = () => {
    setEditStatus(claim.claim_status);
    setEditRepairCost(claim.repair_cost?.toString() || '');
    setEditResolutionNotes(claim.resolution_notes || '');
    setIsEditing(true);
  };

  const handleSave = () => {
    updateClaim(
      {
        id: claim.id,
        claim_status: editStatus as WarrantyClaimStatus,
        repair_cost: editRepairCost ? parseFloat(editRepairCost) : null,
        resolution_notes: editResolutionNotes || null,
        resolved_at: editStatus === 'completed' ? new Date().toISOString() : claim.resolved_at,
      },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]" dir={i18n.dir()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {claim.claim_number}
            <WarrantyStatusBadge status={claim.claim_status} />
          </DialogTitle>
          <DialogDescription>
            {t('assets.warranty.claimDetails')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Claim Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground">{t('assets.warranty.claimDate')}</Label>
              <p className="font-medium">{format(new Date(claim.claim_date), 'PPP')}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t('assets.warranty.createdBy')}</Label>
              <p className="font-medium">{claim.creator?.full_name || '-'}</p>
            </div>
          </div>

          {/* Asset Info */}
          {claim.asset && (
            <div className="rounded-lg bg-muted/50 p-3">
              <Label className="text-muted-foreground">{t('assets.warranty.assetInfo')}</Label>
              <p className="font-medium">{claim.asset.name}</p>
              <p className="text-sm text-muted-foreground">{claim.asset.asset_code}</p>
            </div>
          )}

          <Separator />

          {/* Issue Description */}
          <div>
            <Label className="text-muted-foreground">{t('assets.warranty.issueDescription')}</Label>
            <p className="mt-1">{claim.issue_description}</p>
          </div>

          {/* Vendor Info */}
          {(claim.vendor_name || claim.vendor_contact) && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              {claim.vendor_name && (
                <div>
                  <Label className="text-muted-foreground">{t('assets.warranty.vendorName')}</Label>
                  <p className="font-medium">{claim.vendor_name}</p>
                </div>
              )}
              {claim.vendor_contact && (
                <div>
                  <Label className="text-muted-foreground">{t('assets.warranty.vendorContact')}</Label>
                  <p className="font-medium">{claim.vendor_contact}</p>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Editable Section */}
          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('assets.warranty.status.label')}</Label>
                  <Select value={editStatus} onValueChange={(v) => setEditStatus(v as WarrantyClaimStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CLAIM_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {t(`assets.warranty.status.${status}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('assets.warranty.repairCost')}</Label>
                  <Input
                    type="number"
                    value={editRepairCost}
                    onChange={(e) => setEditRepairCost(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('assets.warranty.resolutionNotes')}</Label>
                <Textarea
                  value={editResolutionNotes}
                  onChange={(e) => setEditResolutionNotes(e.target.value)}
                  placeholder={t('assets.warranty.resolutionNotesPlaceholder')}
                  rows={3}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {claim.repair_cost !== null && (
                <div>
                  <Label className="text-muted-foreground">{t('assets.warranty.repairCost')}</Label>
                  <p className="font-medium">{claim.repair_cost.toLocaleString()} SAR</p>
                </div>
              )}
              {claim.resolution_notes && (
                <div>
                  <Label className="text-muted-foreground">{t('assets.warranty.resolutionNotes')}</Label>
                  <p className="mt-1">{claim.resolution_notes}</p>
                </div>
              )}
              {claim.resolved_at && (
                <div>
                  <Label className="text-muted-foreground">{t('assets.warranty.resolvedAt')}</Label>
                  <p className="font-medium">{format(new Date(claim.resolved_at), 'PPP')}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isPending}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSave} disabled={isPending}>
                {isPending ? t('common.loading') : t('common.save')}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.close')}
              </Button>
              <Button onClick={handleStartEdit}>
                {t('common.edit')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
