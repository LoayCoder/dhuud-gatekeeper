import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAssetTransfers, AssetTransfer } from '@/hooks/use-asset-transfers';
import { TransferApprovalDialog } from './TransferApprovalDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import {
  MapPin,
  Trash2,
  Power,
  User,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TransferHistoryTabProps {
  assetId: string;
  assetName?: string;
}

export function TransferHistoryTab({ assetId, assetName }: TransferHistoryTabProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { data: transfers, isLoading } = useAssetTransfers(assetId);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedTransfer, setSelectedTransfer] = useState<AssetTransfer | null>(null);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'location_transfer':
        return <MapPin className="h-4 w-4" />;
      case 'disposal':
        return <Trash2 className="h-4 w-4" />;
      case 'decommission':
        return <Power className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      case 'in_transit':
        return <Truck className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'in_transit':
        return 'outline';
      case 'completed':
        return 'default';
      case 'cancelled':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (!transfers || transfers.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>{t('assets.transfer.noTransfers')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir={direction}>
      {transfers.map((transfer) => {
        const isExpanded = expandedId === transfer.id;
        const canManage = transfer.status === 'pending' || transfer.status === 'approved' || transfer.status === 'in_transit';

        return (
          <div
            key={transfer.id}
            className={cn(
              'border rounded-lg overflow-hidden transition-colors',
              transfer.status === 'pending' && 'border-warning/50 bg-warning/5',
              transfer.status === 'completed' && 'border-success/50',
              transfer.status === 'rejected' && 'border-destructive/50'
            )}
          >
            {/* Header */}
            <div
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50"
              onClick={() => setExpandedId(isExpanded ? null : transfer.id)}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-muted">
                  {getTypeIcon(transfer.transfer_type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {t(`assets.transfer.${transfer.transfer_type}`)}
                    </span>
                    <Badge variant={getStatusVariant(transfer.status)} className="flex items-center gap-1">
                      {getStatusIcon(transfer.status)}
                      {t(`assets.transfer.${transfer.status}`)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(transfer.requested_at), 'PPp')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canManage && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTransfer(transfer);
                    }}
                  >
                    {t('common.manage')}
                  </Button>
                )}
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="px-4 pb-4 border-t pt-4 space-y-3 text-sm">
                {/* Requester */}
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('assets.transfer.requestedBy')}:</span>
                  <span className="font-medium">{transfer.requested_by_profile?.full_name}</span>
                </div>

                {/* Location Transfer Details */}
                {transfer.transfer_type === 'location_transfer' && (
                  <>
                    <div>
                      <span className="text-muted-foreground">{t('assets.transfer.currentLocation')}:</span>
                      <p className="font-medium mt-1">
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
                    <div>
                      <span className="text-muted-foreground">{t('assets.transfer.newLocation')}:</span>
                      <p className="font-medium mt-1">
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
                  </>
                )}

                {/* Disposal Details */}
                {transfer.transfer_type === 'disposal' && transfer.disposal_method && (
                  <div className="flex gap-4">
                    <div>
                      <span className="text-muted-foreground">{t('assets.transfer.disposalMethod')}:</span>
                      <p className="font-medium">{t(`assets.transfer.methods.${transfer.disposal_method}`)}</p>
                    </div>
                    {transfer.disposal_value && (
                      <div>
                        <span className="text-muted-foreground">{t('assets.transfer.disposalValue')}:</span>
                        <p className="font-medium">{transfer.disposal_value}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Reason */}
                <div>
                  <span className="text-muted-foreground">{t('assets.transfer.reason')}:</span>
                  <p className="mt-1">{transfer.reason}</p>
                </div>

                {/* Rejection Reason */}
                {transfer.status === 'rejected' && transfer.rejection_reason && (
                  <div className="p-3 bg-destructive/10 rounded-lg">
                    <span className="text-destructive font-medium">{t('assets.transfer.rejectionReason')}:</span>
                    <p className="mt-1">{transfer.rejection_reason}</p>
                    {transfer.approved_by_profile && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {t('assets.transfer.rejectedBy')}: {transfer.approved_by_profile.full_name}
                      </p>
                    )}
                  </div>
                )}

                {/* Approval Info */}
                {transfer.approved_at && transfer.status !== 'rejected' && (
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle className="h-4 w-4" />
                    <span>
                      {t('assets.transfer.approvedBy')}: {transfer.approved_by_profile?.full_name} •{' '}
                      {format(new Date(transfer.approved_at), 'PPp')}
                    </span>
                  </div>
                )}

                {/* Completion Info */}
                {transfer.completed_at && (
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle className="h-4 w-4" />
                    <span>
                      {t('assets.transfer.completedBy')}: {transfer.completed_by_profile?.full_name} •{' '}
                      {format(new Date(transfer.completed_at), 'PPp')}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {selectedTransfer && (
        <TransferApprovalDialog
          open={!!selectedTransfer}
          onOpenChange={(open) => !open && setSelectedTransfer(null)}
          transfer={selectedTransfer}
          assetName={assetName}
        />
      )}
    </div>
  );
}
