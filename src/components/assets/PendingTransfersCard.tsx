import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePendingTransfers, type AssetTransfer } from '@/hooks/use-asset-transfers';
import { TransferApprovalDialog } from './TransferApprovalDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ArrowRight, MapPin, Trash2, Power, Clock, PackageCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export function PendingTransfersCard() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { data: transfers, isLoading } = usePendingTransfers();
  const [selectedTransfer, setSelectedTransfer] = useState<AssetTransfer | null>(null);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'location_transfer':
        return <MapPin className="h-3 w-3" />;
      case 'disposal':
        return <Trash2 className="h-3 w-3" />;
      case 'decommission':
        return <Power className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getTypeVariant = (type: string): 'default' | 'destructive' | 'secondary' => {
    switch (type) {
      case 'location_transfer':
        return 'default';
      case 'disposal':
        return 'destructive';
      case 'decommission':
        return 'secondary';
      default:
        return 'default';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendingCount = transfers?.length || 0;

  return (
    <Card dir={direction}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <PackageCheck className="h-5 w-5 text-warning" />
          {t('assets.transfer.pendingTransfers')}
          {pendingCount > 0 && (
            <Badge variant="secondary" className="ms-2">
              {pendingCount}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pendingCount === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('assets.transfer.noPendingTransfers')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transfers?.slice(0, 5).map((transfer) => (
              <div
                key={transfer.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Badge variant={getTypeVariant(transfer.transfer_type)} className="flex items-center gap-1 shrink-0">
                    {getTypeIcon(transfer.transfer_type)}
                    <span className="hidden sm:inline">
                      {t(`assets.transfer.${transfer.transfer_type}`)}
                    </span>
                  </Badge>
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {transfer.asset?.name || transfer.asset?.asset_code}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {transfer.requested_by_profile?.full_name} •{' '}
                      {format(new Date(transfer.requested_at), 'MMM d, HH:mm')}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedTransfer(transfer)}
                >
                  {t('common.review')}
                </Button>
              </div>
            ))}

            {pendingCount > 5 && (
              <Link
                to="/assets"
                className="flex items-center justify-center gap-1 text-sm text-primary hover:underline pt-2"
              >
                {t('assets.transfer.viewAll')}
                <ArrowRight className="h-3 w-3 rtl:rotate-180" />
              </Link>
            )}
          </div>
        )}
      </CardContent>

      {selectedTransfer && (
        <TransferApprovalDialog
          open={!!selectedTransfer}
          onOpenChange={(open) => !open && setSelectedTransfer(null)}
          transfer={selectedTransfer}
          assetName={selectedTransfer.asset?.name}
        />
      )}
    </Card>
  );
}
