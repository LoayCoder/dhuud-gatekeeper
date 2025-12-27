import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  QrCode, 
  Barcode, 
  MapPin, 
  Wifi, 
  WifiOff, 
  CloudOff, 
  RefreshCw,
  Wrench,
  Eye,
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AssetQRScanner } from './AssetQRScanner';
import { AssetBarcodeScanner } from './AssetBarcodeScanner';
import { useAssetOfflineActions, useAssetOfflineCache } from '@/hooks/use-asset-offline-actions';
import { cn } from '@/lib/utils';

interface MobileAssetScannerUIProps {
  defaultAction?: 'view' | 'inspect' | 'maintenance' | 'transfer';
}

export function MobileAssetScannerUI({ defaultAction = 'view' }: MobileAssetScannerUIProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [scanMode, setScanMode] = useState<'qr' | 'barcode'>('qr');
  const [selectedAction, setSelectedAction] = useState<string>(defaultAction);
  const [lastScannedAsset, setLastScannedAsset] = useState<{ id: string; code: string } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'unknown' | 'available' | 'unavailable'>('unknown');

  const { 
    isOnline, 
    isSyncing, 
    pendingCount, 
    failedCount, 
    addAction, 
    syncQueue, 
    retryFailed 
  } = useAssetOfflineActions();
  
  const { prefetchRecentAssets } = useAssetOfflineCache();

  // Check GPS availability
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => setGpsStatus('available'),
        () => setGpsStatus('unavailable'),
        { timeout: 5000 }
      );
    } else {
      setGpsStatus('unavailable');
    }
  }, []);

  // Prefetch assets for offline use
  useEffect(() => {
    if (isOnline) {
      prefetchRecentAssets();
    }
  }, [isOnline, prefetchRecentAssets]);

  const handleScanSuccess = async (assetId: string, assetCode?: string) => {
    setLastScannedAsset({ id: assetId, code: assetCode || '' });

    // Log the scan action
    await addAction('scan_log', {
      action: selectedAction,
      scan_method: scanMode,
      timestamp: new Date().toISOString(),
    }, assetId, assetCode);

    // Navigate based on action
    switch (selectedAction) {
      case 'view':
        navigate(`/assets/${assetId}`);
        break;
      case 'inspect':
        navigate(`/assets/${assetId}/inspect`);
        break;
      case 'maintenance':
        navigate(`/assets/${assetId}?tab=maintenance`);
        break;
      case 'transfer':
        navigate(`/assets/${assetId}?action=transfer`);
        break;
      default:
        navigate(`/assets/${assetId}`);
    }
  };

  const QUICK_ACTIONS = [
    { id: 'view', icon: Eye, labelKey: 'assets.scanner.view', color: 'bg-blue-500/10 text-blue-700' },
    { id: 'inspect', icon: CheckCircle2, labelKey: 'assets.scanner.inspect', color: 'bg-green-500/10 text-green-700' },
    { id: 'maintenance', icon: Wrench, labelKey: 'assets.scanner.maintenance', color: 'bg-orange-500/10 text-orange-700' },
    { id: 'transfer', icon: ArrowRightLeft, labelKey: 'assets.scanner.transfer', color: 'bg-purple-500/10 text-purple-700' },
  ];

  return (
    <div className="space-y-4">
      {/* Status Bar */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
        <div className="flex items-center gap-3">
          {/* Online Status */}
          <div className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
            isOnline ? 'bg-green-500/10 text-green-700' : 'bg-red-500/10 text-red-700'
          )}>
            {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isOnline ? t('common.online', 'Online') : t('common.offline', 'Offline')}
          </div>

          {/* GPS Status */}
          <div className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
            gpsStatus === 'available' ? 'bg-green-500/10 text-green-700' : 
            gpsStatus === 'unavailable' ? 'bg-yellow-500/10 text-yellow-700' : 'bg-gray-500/10 text-gray-700'
          )}>
            <MapPin className="h-3 w-3" />
            {gpsStatus === 'available' ? 'GPS' : gpsStatus === 'unavailable' ? t('common.noGps', 'No GPS') : '...'}
          </div>
        </div>

        {/* Pending Sync */}
        {(pendingCount > 0 || failedCount > 0) && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <CloudOff className="h-3 w-3" />
              {pendingCount + failedCount} {t('common.pending', 'pending')}
            </Badge>
            {isOnline && (
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => failedCount > 0 ? retryFailed() : syncQueue()}
                disabled={isSyncing}
              >
                <RefreshCw className={cn('h-4 w-4', isSyncing && 'animate-spin')} />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Offline Warning */}
      {!isOnline && (
        <Alert variant="destructive">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            {t('assets.scanner.offlineMode', 'You are offline. Scans will be saved and synced when back online.')}
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-2">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          const isSelected = selectedAction === action.id;
          return (
            <Button
              key={action.id}
              variant={isSelected ? 'default' : 'outline'}
              className={cn(
                'flex-col h-auto py-3 gap-1',
                !isSelected && action.color
              )}
              onClick={() => setSelectedAction(action.id)}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{t(action.labelKey, action.id)}</span>
            </Button>
          );
        })}
      </div>

      {/* Scanner */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={scanMode} onValueChange={(v) => setScanMode(v as 'qr' | 'barcode')}>
            <TabsList className="w-full grid grid-cols-2 rounded-none rounded-t-lg">
              <TabsTrigger value="qr" className="gap-2">
                <QrCode className="h-4 w-4" />
                {t('assets.scanner.qrCode', 'QR Code')}
              </TabsTrigger>
              <TabsTrigger value="barcode" className="gap-2">
                <Barcode className="h-4 w-4" />
                {t('assets.scanner.barcode', 'Barcode')}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="qr" className="m-0">
              <AssetQRScanner 
                onScanSuccess={handleScanSuccess}
                autoNavigate={false}
              />
            </TabsContent>
            <TabsContent value="barcode" className="m-0">
              <AssetBarcodeScanner 
                onScanSuccess={handleScanSuccess}
                autoNavigate={false}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Last Scanned */}
      {lastScannedAsset && (
        <Card className="bg-green-500/10 border-green-200">
          <CardContent className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">{t('assets.scanner.lastScanned', 'Last Scanned')}</p>
                <p className="text-xs text-muted-foreground">{lastScannedAsset.code}</p>
              </div>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => navigate(`/assets/${lastScannedAsset.id}`)}
            >
              {t('common.view', 'View')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Failed Syncs Warning */}
      {failedCount > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              {t('assets.scanner.failedSyncs', '{{count}} actions failed to sync', { count: failedCount })}
            </span>
            <Button size="sm" variant="outline" onClick={retryFailed}>
              {t('common.retry', 'Retry')}
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
