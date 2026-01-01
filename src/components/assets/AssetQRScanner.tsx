import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Camera, XCircle, QrCode, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { CameraScanner } from '@/components/ui/camera-scanner';
import { useAssetByCode } from '@/hooks/use-asset-by-code';
import { logAssetScan } from '@/lib/asset-scan-logger';

interface AssetQRScannerProps {
  onScanSuccess?: (assetId: string) => void;
  autoNavigate?: boolean;
  scanAction?: 'view' | 'inspect' | 'maintenance' | 'transfer';
}

export function AssetQRScanner({ onScanSuccess, autoNavigate = true, scanAction = 'view' }: AssetQRScannerProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  
  // Hook to resolve asset by code (for non-UUID scans)
  const { data: assetResult, isLoading: isResolving } = useAssetByCode(scannedCode);

  const handleScan = async (decodedText: string) => {
    setIsScanning(false);
    setError(null);
    
    // Extract asset ID from URL or raw UUID (backward compatibility)
    const urlPattern = /\/assets\/([a-f0-9-]{36})/i;
    const uuidPattern = /^[a-f0-9-]{36}$/i;
    
    const urlMatch = decodedText.match(urlPattern);
    if (urlMatch && urlMatch[1]) {
      // Found UUID in URL - navigate directly
      const assetId = urlMatch[1];
      
      // Log successful scan
      logAssetScan({
        asset_id: assetId,
        asset_code: decodedText,
        scan_action: scanAction,
        scan_method: 'qrcode',
        scan_result: 'success',
      });
      
      if (onScanSuccess) {
        onScanSuccess(assetId);
      }
      if (autoNavigate) {
        navigate(`/assets/${assetId}`);
      }
      return;
    }
    
    if (uuidPattern.test(decodedText.trim())) {
      // Raw UUID - navigate directly
      const assetId = decodedText.trim();
      
      // Log successful scan
      logAssetScan({
        asset_id: assetId,
        asset_code: assetId,
        scan_action: scanAction,
        scan_method: 'qrcode',
        scan_result: 'success',
      });
      
      if (onScanSuccess) {
        onScanSuccess(assetId);
      }
      if (autoNavigate) {
        navigate(`/assets/${assetId}`);
      }
      return;
    }
    
    // Not a UUID - treat as asset code and use hook to resolve
    setScannedCode(decodedText.trim());
  };

  // Handle async asset resolution by code
  useEffect(() => {
    if (!scannedCode || isResolving) return;
    
    if (assetResult?.found && assetResult.asset) {
      const assetId = assetResult.asset.id;
      
      // Log successful code-resolved scan
      logAssetScan({
        asset_id: assetId,
        asset_code: scannedCode,
        scan_action: scanAction,
        scan_method: 'qrcode',
        scan_result: 'success',
      });
      
      if (onScanSuccess) {
        onScanSuccess(assetId);
      }
      if (autoNavigate) {
        navigate(`/assets/${assetId}`);
      }
      setScannedCode(null);
    } else if (assetResult && !assetResult.found) {
      // Log failed scan - asset not found
      logAssetScan({
        asset_id: null,
        asset_code: scannedCode,
        scan_action: scanAction,
        scan_method: 'qrcode',
        scan_result: 'not_found',
      });
      
      setError(t('assets.assetNotFound', 'Asset not found'));
      setScannedCode(null);
    }
  }, [assetResult, isResolving, scannedCode, onScanSuccess, autoNavigate, navigate, t, scanAction]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          {t('assets.scanQRCode', 'Scan QR Code')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isScanning ? (
          <div className="w-full max-w-[350px]">
            <CameraScanner
              containerId="asset-qr-reader"
              isOpen={isScanning}
              onScan={handleScan}
              onError={(err) => setError(err)}
              qrboxSize={{ width: 250, height: 250 }}
              showCameraSwitch={true}
              showTorchToggle={true}
            />
          </div>
        ) : isResolving ? (
          <div className="w-full max-w-[300px] aspect-square rounded-xl bg-muted flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-16 w-16 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground text-center px-4">
              {t('assets.resolvingAsset', 'Resolving asset...')}
            </p>
          </div>
        ) : (
          <div className="w-full max-w-[300px] aspect-square rounded-xl bg-muted flex flex-col items-center justify-center gap-4">
            <Camera className="h-16 w-16 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center px-4">
              {t('assets.scanQRDescription', 'Scan asset QR code to view details')}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          {!isScanning && !isResolving ? (
            <Button onClick={() => setIsScanning(true)}>
              <Camera className="h-4 w-4 me-2" />
              {t('assets.startScanning', 'Start Scanning')}
            </Button>
          ) : isScanning ? (
            <Button variant="destructive" onClick={() => setIsScanning(false)}>
              <XCircle className="h-4 w-4 me-2" />
              {t('assets.stopScanning', 'Stop Scanning')}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
