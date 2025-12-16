import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Barcode, Camera, CameraOff, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useAssetByCode } from '@/hooks/use-asset-by-code';
import { logAssetScan } from '@/lib/asset-scan-logger';

// Extended barcode formats for better compatibility
const BARCODE_FORMATS = [
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.ITF,
];

interface AssetBarcodeScannerProps {
  onScanSuccess?: (assetId: string, assetCode: string) => void;
  autoNavigate?: boolean;
  scanAction?: 'view' | 'inspect' | 'maintenance' | 'transfer';
}

export function AssetBarcodeScanner({
  onScanSuccess,
  autoNavigate = true,
  scanAction = 'view',
}: AssetBarcodeScannerProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerContainerId = 'barcode-scanner-container';

  // Resolve asset by scanned code
  const { data: assetResult, isLoading: isResolving } = useAssetByCode(scannedCode);

  // Handle asset resolution result
  useEffect(() => {
    if (!scannedCode || isResolving) return;

    if (assetResult?.found && assetResult.asset) {
      // Log successful scan
      logAssetScan({
        asset_id: assetResult.asset.id,
        asset_code: scannedCode,
        scan_action: scanAction,
        scan_method: 'barcode',
        scan_result: 'success',
      });

      toast.success(t('assets.assetFound'));

      if (onScanSuccess) {
        onScanSuccess(assetResult.asset.id, scannedCode);
      }

      if (autoNavigate) {
        navigate(`/assets/${assetResult.asset.id}`);
      }
    } else if (assetResult && !assetResult.found) {
      // Log failed scan
      logAssetScan({
        asset_id: null,
        asset_code: scannedCode,
        scan_action: scanAction,
        scan_method: 'barcode',
        scan_result: 'not_found',
      });

      setError(t('assets.barcodeNotFound'));
      toast.error(t('assets.barcodeNotFound'));
    }
  }, [assetResult, isResolving, scannedCode, scanAction, autoNavigate, navigate, onScanSuccess, t]);

  const startScanning = async () => {
    setError(null);
    setScannedCode(null);

    try {
      // Create scanner with native BarcodeDetector API support for faster detection
      const scanner = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: BARCODE_FORMATS,
        useBarCodeDetectorIfSupported: true, // Use native API when available (faster)
        verbose: false,
      });
      scannerRef.current = scanner;

      // Dynamic scan box that adapts to viewport size
      const qrboxFunction = (viewfinderWidth: number, viewfinderHeight: number) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        return {
          width: Math.floor(viewfinderWidth * 0.85), // 85% of viewport width
          height: Math.floor(Math.min(minEdge * 0.35, 120)), // Max 120px height for barcodes
        };
      };

      await scanner.start(
        {
          facingMode: { ideal: 'environment' },
          // Request HD resolution for sharper image
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
        },
        {
          fps: 15, // Higher FPS for faster detection
          qrbox: qrboxFunction,
          aspectRatio: 2, // Better aspect ratio for HD cameras
        },
        (decodedText) => {
          // Vibrate on scan (mobile)
          if (navigator.vibrate) {
            navigator.vibrate(100);
          }

          setScannedCode(decodedText);
          stopScanning();
        },
        () => {
          // Ignore scan failures (continuous scanning)
        }
      );

      setIsScanning(true);
    } catch (err) {
      console.error('Error starting scanner:', err);
      setError(t('assets.cameraAccessDenied'));
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        const isRunning = scannerRef.current.isScanning;
        if (isRunning) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.error('Error stopping scanner:', err);
      } finally {
        scannerRef.current = null;
        // Clear the container to prevent React reconciliation issues
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }
      }
    }
    setIsScanning(false);
  };

  const handleRetry = () => {
    setError(null);
    setScannedCode(null);
    startScanning();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(console.error);
          }
        } catch (err) {
          console.error('Cleanup error:', err);
        } finally {
          scannerRef.current = null;
          // Clear container to prevent React DOM conflicts
          if (containerRef.current) {
            containerRef.current.innerHTML = '';
          }
        }
      }
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Barcode className="h-5 w-5" />
          {t('assets.scanBarcode')}
        </CardTitle>
        <CardDescription>
          {t('assets.barcodeScanDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scanner Container Wrapper */}
        <div className="relative">
          {/* Scanner Container - MUST be empty, html5-qrcode controls its DOM */}
          <div
            id={scannerContainerId}
            ref={containerRef}
            className={`overflow-hidden rounded-lg bg-muted ${
              isScanning ? 'aspect-[3/1]' : 'aspect-video'
            }`}
          />
          
          {/* Overlay - positioned outside scanner container to avoid DOM conflicts */}
          {!isScanning && !scannedCode && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none">
              <Camera className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center px-4">
                {t('assets.tapToStartScanning')}
              </p>
            </div>
          )}
          
          {/* Loading overlay */}
          {scannedCode && isResolving && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/80 rounded-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <p className="text-sm text-muted-foreground">
                {t('assets.resolvingAsset')}
              </p>
            </div>
          )}
        </div>

        {/* Scanned Code Display */}
        {scannedCode && !error && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">
              {t('assets.scannedCode')}:
            </p>
            <p className="font-mono font-medium">{scannedCode}</p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!isScanning ? (
            <Button
              className="flex-1"
              onClick={startScanning}
              disabled={isResolving}
            >
              <Camera className="h-4 w-4 me-2" />
              {scannedCode ? t('assets.scanAgain') : t('assets.startScanning')}
            </Button>
          ) : (
            <Button
              variant="destructive"
              className="flex-1"
              onClick={stopScanning}
            >
              <CameraOff className="h-4 w-4 me-2" />
              {t('assets.stopScanning')}
            </Button>
          )}

          {error && (
            <Button variant="outline" onClick={handleRetry}>
              {t('common.retry')}
            </Button>
          )}
        </div>

        {/* Supported Formats Info */}
        <p className="text-xs text-muted-foreground text-center">
          {t('assets.supportedFormats')}: Code 128, Code 39, Code 93, EAN-13, EAN-8, UPC-A, UPC-E, ITF
        </p>
      </CardContent>
    </Card>
  );
}
