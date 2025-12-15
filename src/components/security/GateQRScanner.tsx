import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Html5Qrcode, Html5QrcodeResult, Html5QrcodeCameraScanConfig } from 'html5-qrcode';
import { X, Camera, SwitchCamera, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GateQRScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanResult: (result: QRScanResult) => void;
}

export interface QRScanResult {
  type: 'visitor' | 'worker' | 'unknown';
  id?: string;
  status: 'valid' | 'invalid' | 'expired' | 'revoked' | 'not_found';
  data?: {
    name?: string;
    company?: string;
    projectName?: string;
    inductionStatus?: string;
    expiresAt?: string;
    warnings?: string[];
  };
  rawCode: string;
}

const SCANNER_CONFIG: Html5QrcodeCameraScanConfig = {
  fps: 10,
  qrbox: { width: 250, height: 250 },
  aspectRatio: 1.0,
};

export function GateQRScanner({ open, onOpenChange, onScanResult }: GateQRScannerProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [scanResult, setScanResult] = useState<QRScanResult | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'gate-qr-scanner';

  // Initialize scanner
  useEffect(() => {
    if (open && !scannerRef.current) {
      scannerRef.current = new Html5Qrcode(scannerContainerId);
      
      // Get available cameras
      Html5Qrcode.getCameras().then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices.map(d => ({ id: d.id, label: d.label })));
          startScanning(devices[0].id);
        }
      }).catch((err) => {
        console.error('Failed to get cameras:', err);
        toast({
          title: t('security.qrScanner.cameraError', 'Camera Error'),
          description: t('security.qrScanner.cameraPermission', 'Please allow camera access'),
          variant: 'destructive',
        });
      });
    }

    return () => {
      stopScanning();
    };
  }, [open]);

  const startScanning = useCallback(async (cameraId: string) => {
    if (!scannerRef.current || isScanning) return;

    try {
      await scannerRef.current.start(
        cameraId,
        SCANNER_CONFIG,
        onScanSuccess,
        () => {} // Ignore errors during scanning
      );
      setIsScanning(true);
    } catch (error) {
      console.error('Failed to start scanner:', error);
    }
  }, [isScanning]);

  const stopScanning = useCallback(async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        setIsScanning(false);
      } catch (error) {
        console.error('Failed to stop scanner:', error);
      }
    }
  }, [isScanning]);

  const switchCamera = useCallback(async () => {
    if (cameras.length <= 1) return;

    await stopScanning();
    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    setCurrentCameraIndex(nextIndex);
    await startScanning(cameras[nextIndex].id);
  }, [cameras, currentCameraIndex, startScanning, stopScanning]);

  const onScanSuccess = useCallback(async (decodedText: string, result: Html5QrcodeResult) => {
    // Provide haptic feedback if supported
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }

    // Stop scanning while verifying
    await stopScanning();
    setIsVerifying(true);
    setScanResult(null);

    try {
      const parsedResult = await verifyQRCode(decodedText);
      setScanResult(parsedResult);
      
      // Auto-proceed if valid
      if (parsedResult.status === 'valid') {
        setTimeout(() => {
          onScanResult(parsedResult);
          handleClose();
        }, 1500);
      }
    } catch (error) {
      console.error('QR verification error:', error);
      setScanResult({
        type: 'unknown',
        status: 'invalid',
        rawCode: decodedText,
      });
    } finally {
      setIsVerifying(false);
    }
  }, [stopScanning, onScanResult]);

  const verifyQRCode = async (code: string): Promise<QRScanResult> => {
    // Parse QR code format
    // Expected formats:
    // - WORKER:{worker_id}:{token}
    // - VISITOR:{visitor_id}
    // - VIS-{reference_id}

    if (code.startsWith('WORKER:')) {
      const parts = code.split(':');
      if (parts.length >= 2) {
        const workerId = parts[1];
        const token = parts[2] || '';
        
        // Validate worker QR via edge function
        const { data, error } = await supabase.functions.invoke('validate-worker-qr', {
          body: { worker_id: workerId, qr_token: token },
        });

        if (error || !data?.valid) {
          return {
            type: 'worker',
            id: workerId,
            status: data?.reason === 'expired' ? 'expired' : 
                   data?.reason === 'revoked' ? 'revoked' : 'invalid',
            rawCode: code,
            data: {
              warnings: [data?.reason || 'Invalid QR code'],
            },
          };
        }

        return {
          type: 'worker',
          id: workerId,
          status: 'valid',
          rawCode: code,
          data: {
            name: data.worker_name,
            company: data.company_name,
            projectName: data.project_name,
            inductionStatus: data.induction_status,
            expiresAt: data.expires_at,
          },
        };
      }
    }

    if (code.startsWith('VISITOR:') || code.startsWith('VIS-')) {
      const visitorId = code.replace('VISITOR:', '').replace('VIS-', '');
      
      // Check visitor in gate logs
      const { data: visitor } = await supabase
        .from('gate_entry_logs')
        .select('id, person_name, purpose, destination_name')
        .or(`id.eq.${visitorId},person_name.ilike.%${visitorId}%`)
        .limit(1)
        .maybeSingle();

      if (visitor) {
        return {
          type: 'visitor',
          id: visitor.id,
          status: 'valid',
          rawCode: code,
          data: {
            name: visitor.person_name,
          },
        };
      }

      return {
        type: 'visitor',
        status: 'not_found',
        rawCode: code,
      };
    }

    // Unknown format - could be just a name or ID to search
    return {
      type: 'unknown',
      status: 'not_found',
      rawCode: code,
      data: {
        warnings: [t('security.qrScanner.unknownFormat', 'Unknown QR format')],
      },
    };
  };

  const handleClose = useCallback(() => {
    stopScanning();
    setScanResult(null);
    onOpenChange(false);
  }, [stopScanning, onOpenChange]);

  const handleRescan = useCallback(async () => {
    setScanResult(null);
    if (cameras.length > 0) {
      await startScanning(cameras[currentCameraIndex].id);
    }
  }, [cameras, currentCameraIndex, startScanning]);

  const getStatusIcon = (status: QRScanResult['status']) => {
    switch (status) {
      case 'valid':
        return <CheckCircle2 className="h-12 w-12 text-green-500" />;
      case 'expired':
      case 'revoked':
        return <AlertTriangle className="h-12 w-12 text-warning" />;
      default:
        return <XCircle className="h-12 w-12 text-destructive" />;
    }
  };

  const getStatusLabel = (status: QRScanResult['status']) => {
    switch (status) {
      case 'valid':
        return t('security.qrScanner.valid', 'Valid');
      case 'expired':
        return t('security.qrScanner.expired', 'Expired');
      case 'revoked':
        return t('security.qrScanner.revoked', 'Revoked');
      case 'invalid':
        return t('security.qrScanner.invalid', 'Invalid');
      case 'not_found':
        return t('security.qrScanner.notFound', 'Not Found');
      default:
        return status;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              {t('security.qrScanner.title', 'Scan QR Code')}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="relative">
          {/* Scanner container */}
          <div 
            id={scannerContainerId} 
            className={cn(
              "w-full aspect-square bg-muted",
              scanResult && "hidden"
            )}
          />

          {/* Verification result */}
          {scanResult && (
            <div className="w-full aspect-square bg-muted flex flex-col items-center justify-center p-6 text-center">
              {getStatusIcon(scanResult.status)}
              
              <Badge 
                variant={scanResult.status === 'valid' ? 'default' : 'destructive'}
                className="mt-4 text-lg px-4 py-1"
              >
                {getStatusLabel(scanResult.status)}
              </Badge>

              {scanResult.data?.name && (
                <p className="mt-4 text-lg font-semibold">{scanResult.data.name}</p>
              )}

              {scanResult.data?.company && (
                <p className="text-sm text-muted-foreground">{scanResult.data.company}</p>
              )}

              {scanResult.data?.projectName && (
                <p className="text-sm text-muted-foreground">
                  {t('security.qrScanner.project', 'Project')}: {scanResult.data.projectName}
                </p>
              )}

              {scanResult.data?.warnings?.map((warning, idx) => (
                <p key={idx} className="text-sm text-destructive mt-2">
                  <AlertTriangle className="h-3 w-3 inline me-1" />
                  {warning}
                </p>
              ))}

              <Badge variant="outline" className="mt-4">
                {scanResult.type === 'worker' 
                  ? t('security.qrScanner.workerQR', 'Worker QR')
                  : scanResult.type === 'visitor'
                  ? t('security.qrScanner.visitorQR', 'Visitor QR')
                  : t('security.qrScanner.unknownQR', 'Unknown QR')
                }
              </Badge>
            </div>
          )}

          {/* Loading overlay */}
          {isVerifying && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <span className="ms-3 text-lg font-medium">
                {t('security.qrScanner.verifying', 'Verifying...')}
              </span>
            </div>
          )}

          {/* Camera switch button */}
          {cameras.length > 1 && isScanning && !scanResult && (
            <Button
              variant="secondary"
              size="icon"
              className="absolute bottom-4 end-4"
              onClick={switchCamera}
            >
              <SwitchCamera className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Action buttons */}
        <div className="p-4 flex gap-2">
          {scanResult ? (
            <>
              <Button variant="outline" onClick={handleRescan} className="flex-1">
                {t('security.qrScanner.scanAgain', 'Scan Again')}
              </Button>
              {scanResult.status !== 'valid' && (
                <Button 
                  onClick={() => {
                    onScanResult(scanResult);
                    handleClose();
                  }}
                  className="flex-1"
                >
                  {t('security.qrScanner.useAnyway', 'Use Anyway')}
                </Button>
              )}
            </>
          ) : (
            <p className="text-center text-sm text-muted-foreground w-full">
              {t('security.qrScanner.instructions', 'Point camera at visitor or worker QR code')}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
