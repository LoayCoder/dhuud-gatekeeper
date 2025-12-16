import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Camera, XCircle, QrCode, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AssetQRScannerProps {
  onScanSuccess?: (assetId: string) => void;
  autoNavigate?: boolean;
}

export function AssetQRScanner({ onScanSuccess, autoNavigate = true }: AssetQRScannerProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'qr-reader';

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
    
    // Extract asset ID from URL or raw UUID
    const urlPattern = /\/assets\/([a-f0-9-]{36})/i;
    const uuidPattern = /^[a-f0-9-]{36}$/i;
    
    let assetId: string | null = null;
    
    const urlMatch = decodedText.match(urlPattern);
    if (urlMatch && urlMatch[1]) {
      assetId = urlMatch[1];
    } else if (uuidPattern.test(decodedText.trim())) {
      assetId = decodedText.trim();
    }
    
    if (assetId) {
      if (onScanSuccess) {
        onScanSuccess(assetId);
      }
      
      if (autoNavigate) {
        navigate(`/assets/${assetId}`);
      }
    } else {
      setError(t('assets.invalidQRCode'));
    }
  };

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
        
        {!isScanning && (
          <div className="w-full max-w-[300px] aspect-square rounded-lg bg-muted flex flex-col items-center justify-center gap-4">
            <Camera className="h-16 w-16 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center px-4">
              {t('assets.scanQRDescription')}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          {!isScanning ? (
            <Button onClick={startScanning}>
              <Camera className="h-4 w-4 me-2" />
              {t('assets.startScanning')}
            </Button>
          ) : (
            <Button variant="destructive" onClick={stopScanning}>
              <XCircle className="h-4 w-4 me-2" />
              {t('assets.stopScanning')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
