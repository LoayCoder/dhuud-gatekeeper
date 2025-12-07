import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AssetTransfer,
  useApproveTransfer,
  useRejectTransfer,
  useMarkInTransit,
  useCompleteTransfer,
} from '@/hooks/use-asset-transfers';
import { format } from 'date-fns';
import { MapPin, Trash2, Power, User, Calendar, CheckCircle, XCircle, Truck } from 'lucide-react';

interface TransferApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transfer: AssetTransfer;
  assetName?: string;
}

export function TransferApprovalDialog({ open, onOpenChange, transfer, assetName }: TransferApprovalDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejection, setShowRejection] = useState(false);

  const approveTransfer = useApproveTransfer();
  const rejectTransfer = useRejectTransfer();
  const markInTransit = useMarkInTransit();
  const completeTransfer = useCompleteTransfer();

  const getTypeIcon = () => {
    switch (transfer.transfer_type) {
      case 'location_transfer':
        return <MapPin className="h-4 w-4" />;
      case 'disposal':
        return <Trash2 className="h-4 w-4" />;
      case 'decommission':
        return <Power className="h-4 w-4" />;
    }
  };

  const getTypeBadgeVariant = () => {
    switch (transfer.transfer_type) {
      case 'location_transfer':
        return 'default';
      case 'disposal':
        return 'destructive';
      case 'decommission':
        return 'secondary';
    }
  };

  const handleApprove = async () => {
    await approveTransfer.mutateAsync({
      transferId: transfer.id,
      assetId: transfer.asset_id,
    });
    onOpenChange(false);
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) return;
    await rejectTransfer.mutateAsync({
      transferId: transfer.id,
      assetId: transfer.asset_id,
      reason: rejectionReason,
    });
    onOpenChange(false);
  };

  const handleMarkInTransit = async () => {
    await markInTransit.mutateAsync({
      transferId: transfer.id,
      assetId: transfer.asset_id,
    });
    onOpenChange(false);
  };

  const handleComplete = async () => {
    await completeTransfer.mutateAsync({
      transferId: transfer.id,
      assetId: transfer.asset_id,
    });
    onOpenChange(false);
  };

  const isPending = approveTransfer.isPending || rejectTransfer.isPending || markInTransit.isPending || completeTransfer.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir={direction}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getTypeIcon()}
            {t(`assets.transfer.${transfer.transfer_type}`)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {assetName && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">{assetName}</p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Badge variant={getTypeBadgeVariant()}>
              {t(`assets.transfer.${transfer.transfer_type}`)}
            </Badge>
            <Badge variant="outline">{t(`assets.transfer.${transfer.status}`)}</Badge>
          </div>

          <Separator />

          {/* Request Info */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{t('assets.transfer.requestedBy')}:</span>
              <span className="font-medium text-foreground">
                {transfer.requested_by_profile?.full_name}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{t('assets.transfer.requestedAt')}:</span>
              <span className="font-medium text-foreground">
                {format(new Date(transfer.requested_at), 'PPp')}
              </span>
            </div>
          </div>

          {/* Location Transfer Details */}
          {transfer.transfer_type === 'location_transfer' && (
            <div className="space-y-2">
              <div className="text-sm">
                <span className="text-muted-foreground">{t('assets.transfer.currentLocation')}:</span>
                <p className="font-medium">
                  {[
                    transfer.from_branch?.name,
                    transfer.from_site?.name,
                    i18n.language === 'ar' ? transfer.from_building?.name_ar : transfer.from_building?.name,
                    i18n.language === 'ar' ? transfer.from_floor_zone?.name_ar : transfer.from_floor_zone?.name,
                  ]
                    .filter(Boolean)
                    .join(' → ') || t('common.notSpecified')}
                </p>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">{t('assets.transfer.newLocation')}:</span>
                <p className="font-medium">
                  {[
                    transfer.to_branch?.name,
                    transfer.to_site?.name,
                    i18n.language === 'ar' ? transfer.to_building?.name_ar : transfer.to_building?.name,
                    i18n.language === 'ar' ? transfer.to_floor_zone?.name_ar : transfer.to_floor_zone?.name,
                  ]
                    .filter(Boolean)
                    .join(' → ') || t('common.notSpecified')}
                </p>
              </div>
            </div>
          )}

          {/* Disposal Details */}
          {transfer.transfer_type === 'disposal' && transfer.disposal_method && (
            <div className="space-y-2">
              <div className="text-sm">
                <span className="text-muted-foreground">{t('assets.transfer.disposalMethod')}:</span>
                <p className="font-medium">{t(`assets.transfer.methods.${transfer.disposal_method}`)}</p>
              </div>
              {transfer.disposal_value && (
                <div className="text-sm">
                  <span className="text-muted-foreground">{t('assets.transfer.disposalValue')}:</span>
                  <p className="font-medium">{transfer.disposal_value}</p>
                </div>
              )}
            </div>
          )}

          {/* Reason */}
          <div className="text-sm">
            <span className="text-muted-foreground">{t('assets.transfer.reason')}:</span>
            <p className="mt-1">{transfer.reason}</p>
          </div>

          {transfer.notes && (
            <div className="text-sm">
              <span className="text-muted-foreground">{t('assets.transfer.notes')}:</span>
              <p className="mt-1">{transfer.notes}</p>
            </div>
          )}

          {/* Rejection Reason Input */}
          {showRejection && (
            <div className="space-y-2">
              <Label>{t('assets.transfer.rejectionReason')}</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={t('assets.transfer.rejectionReasonPlaceholder')}
                rows={2}
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {transfer.status === 'pending' && !showRejection && (
            <>
              <Button variant="outline" onClick={() => setShowRejection(true)} disabled={isPending}>
                <XCircle className="h-4 w-4 me-2" />
                {t('assets.transfer.rejectRequest')}
              </Button>
              <Button onClick={handleApprove} disabled={isPending}>
                <CheckCircle className="h-4 w-4 me-2" />
                {t('assets.transfer.approveRequest')}
              </Button>
            </>
          )}

          {showRejection && (
            <>
              <Button variant="outline" onClick={() => setShowRejection(false)} disabled={isPending}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isPending || !rejectionReason.trim()}
              >
                {t('assets.transfer.confirmRejection')}
              </Button>
            </>
          )}

          {transfer.status === 'approved' && transfer.transfer_type === 'location_transfer' && (
            <Button onClick={handleMarkInTransit} disabled={isPending}>
              <Truck className="h-4 w-4 me-2" />
              {t('assets.transfer.markInTransit')}
            </Button>
          )}

          {transfer.status === 'approved' && transfer.transfer_type !== 'location_transfer' && (
            <Button onClick={handleComplete} disabled={isPending}>
              <CheckCircle className="h-4 w-4 me-2" />
              {t('assets.transfer.markComplete')}
            </Button>
          )}

          {transfer.status === 'in_transit' && (
            <Button onClick={handleComplete} disabled={isPending}>
              <CheckCircle className="h-4 w-4 me-2" />
              {t('assets.transfer.markComplete')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
