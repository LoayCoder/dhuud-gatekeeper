import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Camera, XCircle, QrCode, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'qr-reader';
  
  // Hook to resolve asset by code (for non-UUID scans)
  const { data: assetResult, isLoading: isResolving } = useAssetByCode(scannedCode);

  const startScanning = async () => {
    setError(null);
    setIsScanning(true); // Make container visible FIRST
    
    // Wait for DOM to update so container has dimensions
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      // Check camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
      
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(containerId);
      }

      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {
          // QR code not found - ignore
        }
      );
    } catch (err) {
      setIsScanning(false); // Revert on failure
      console.error('Scanner error:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setHasPermission(false);
          setError(t('assets.cameraPermissionDenied'));
        } else {
          setError(t('assets.cameraError'));
        }
      }
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
  };

  const handleScanSuccess = async (decodedText: string) => {
    await stopScanning();
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
      
      setError(t('assets.assetNotFound'));
      setScannedCode(null);
    }
  }, [assetResult, isResolving, scannedCode, onScanSuccess, autoNavigate, navigate, t, scanAction]);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
            scannerRef.current.stop().catch(console.error);
          }
        } catch (err) {
          // Scanner may already be cleared
        }
      }
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          {t('assets.scanQRCode')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {hasPermission === false && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('assets.enableCameraInstructions')}
            </AlertDescription>
          </Alert>
        )}

        <div
          id={containerId}
          className={`w-full max-w-[300px] aspect-square rounded-lg overflow-hidden bg-muted ${
            !isScanning ? 'hidden' : ''
          }`}
        />
        
        {!isScanning && !isResolving && (
          <div className="w-full max-w-[300px] aspect-square rounded-lg bg-muted flex flex-col items-center justify-center gap-4">
            <Camera className="h-16 w-16 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center px-4">
              {t('assets.scanQRDescription')}
            </p>
          </div>
        )}
        
        {isResolving && (
          <div className="w-full max-w-[300px] aspect-square rounded-lg bg-muted flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-16 w-16 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground text-center px-4">
              {t('assets.resolvingAsset')}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          {!isScanning && !isResolving ? (
            <Button onClick={startScanning}>
              <Camera className="h-4 w-4 me-2" />
              {t('assets.startScanning')}
            </Button>
          ) : isScanning ? (
            <Button variant="destructive" onClick={stopScanning}>
              <XCircle className="h-4 w-4 me-2" />
              {t('assets.stopScanning')}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
