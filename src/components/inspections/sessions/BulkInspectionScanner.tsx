import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { Camera, X, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BulkInspectionScannerProps {
  onScan: (assetId: string) => void;
  onClose: () => void;
  isProcessing: boolean;
}

export function BulkInspectionScanner({ onScan, onClose, isProcessing }: BulkInspectionScannerProps) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  
  useEffect(() => {
    startScanning();
    
    return () => {
      stopScanning();
    };
  }, []);
  
  const startScanning = async () => {
    try {
      setError(null);
      
      const scanner = new Html5Qrcode('bulk-qr-reader');
      scannerRef.current = scanner;
      
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {
          // Ignore scan failures (no QR code in frame)
        }
      );
      
      setIsScanning(true);
    } catch (err: any) {
      console.error('Scanner error:', err);
      if (err.toString().includes('NotAllowedError')) {
        setError(t('assets.cameraPermissionDenied'));
      } else {
        setError(t('assets.scannerError'));
      }
    }
  };
  
  const stopScanning = async () => {
    try {
      if (scannerRef.current) {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING) {
          await scannerRef.current.stop();
        }
        scannerRef.current = null;
      }
    } catch (err) {
      console.error('Error stopping scanner:', err);
    }
    setIsScanning(false);
  };
  
  const handleScanSuccess = (decodedText: string) => {
    // Extract asset ID from QR code
    // Format: tenant_id:asset_id or just asset_id (UUID)
    let assetId = decodedText;
    
    // Check if it's in tenant:asset format
    if (decodedText.includes(':')) {
      assetId = decodedText.split(':')[1];
    }
    
    // Check if it's a URL with asset ID
    if (decodedText.includes('/assets/')) {
      const match = decodedText.match(/\/assets\/([a-f0-9-]+)/i);
      if (match) {
        assetId = match[1];
      }
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(assetId)) {
      // Temporarily stop scanning while processing
      onScan(assetId);
    }
  };
  
  const handleClose = () => {
    stopScanning();
    onClose();
  };
  
  return (
    <Card className="relative">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {t('inspectionSessions.scanAssetQR')}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {isProcessing && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 rounded-lg">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{t('common.processing')}</p>
            </div>
          </div>
        )}
        
        <div 
          id="bulk-qr-reader" 
          className="w-full rounded-lg overflow-hidden"
          style={{ minHeight: '300px' }}
        />
        
        <p className="text-sm text-muted-foreground text-center mt-4">
          {t('inspectionSessions.pointCameraAtQR')}
        </p>
      </CardContent>
    </Card>
  );
}
