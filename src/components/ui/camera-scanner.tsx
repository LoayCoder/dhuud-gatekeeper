import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  SwitchCamera, 
  Flashlight, 
  FlashlightOff, 
  Camera, 
  AlertCircle,
  Loader2,
  CheckCircle2,
  QrCode,
  Crosshair
} from 'lucide-react';

export type ScannerStatus = 'idle' | 'scanning' | 'processing' | 'success' | 'error' | 'permission_denied';

interface CameraScannerProps {
  containerId: string;
  onScan: (result: string) => void;
  onError?: (error: string) => void;
  isOpen: boolean;
  aspectRatio?: number;
  qrboxSize?: { width: number; height: number };
  showCameraSwitch?: boolean;
  showTorchToggle?: boolean;
  scannerClassName?: string;
  successMessage?: string;
}

export function CameraScanner({
  containerId,
  onScan,
  onError,
  isOpen,
  aspectRatio = 1.0,
  qrboxSize = { width: 250, height: 250 },
  showCameraSwitch = true,
  showTorchToggle = true,
  scannerClassName,
  successMessage,
}: CameraScannerProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<ScannerStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isStartingRef = useRef(false);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      scannerRef.current = null;
    }
  }, []);

  const startScanner = useCallback(async () => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;

    try {
      setError(null);
      setStatus('scanning');

      await new Promise(resolve => setTimeout(resolve, 150));

      const container = document.getElementById(containerId);
      if (!container) {
        throw new Error('Scanner container not found');
      }

      await stopScanner();

      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode },
        {
          fps: 10,
          qrbox: qrboxSize,
          aspectRatio,
        },
        (decodedText) => {
          setStatus('success');
          onScan(decodedText);
        },
        () => {}
      );

      try {
        const capabilities = scanner.getRunningTrackCameraCapabilities();
        setHasTorch(capabilities.torchFeature().isSupported());
      } catch {
        setHasTorch(false);
      }

    } catch (err: any) {
      console.error('Scanner error:', err);
      
      if (err.name === 'NotAllowedError' || err.toString().includes('NotAllowedError')) {
        setStatus('permission_denied');
        setError(t('scanner.cameraPermissionDenied', 'Camera access denied'));
      } else {
        setStatus('error');
        setError(err.message || t('scanner.scannerError', 'Failed to start scanner'));
      }
      
      onError?.(err.message);
    } finally {
      isStartingRef.current = false;
    }
  }, [containerId, facingMode, qrboxSize, aspectRatio, onScan, onError, stopScanner, t]);

  const switchCamera = useCallback(async () => {
    const newFacingMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacingMode);
  }, [facingMode]);

  const toggleTorch = useCallback(async () => {
    if (!scannerRef.current || !hasTorch) return;

    try {
      const capabilities = scannerRef.current.getRunningTrackCameraCapabilities();
      const torch = capabilities.torchFeature();
      
      if (torch.isSupported()) {
        await torch.apply(!torchEnabled);
        setTorchEnabled(!torchEnabled);
      }
    } catch (err) {
      console.error('Error toggling torch:', err);
    }
  }, [hasTorch, torchEnabled]);

  useEffect(() => {
    if (isOpen) {
      startScanner();
    } else {
      stopScanner();
      setStatus('idle');
      setError(null);
      setTorchEnabled(false);
    }
  }, [isOpen, startScanner, stopScanner]);

  useEffect(() => {
    if (isOpen && status === 'scanning') {
      startScanner();
    }
  }, [facingMode]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  return (
    <div className="relative w-full">
      {/* Scanner Container - Military/Formal Style */}
      <div 
        className={cn(
          "relative w-full rounded-lg overflow-hidden bg-muted border-2 border-border",
          scannerClassName
        )}
      >
        {/* Video Container */}
        <div 
          id={containerId}
          className={cn(
            "w-full",
            status !== 'scanning' && status !== 'success' && 'opacity-0 absolute'
          )}
          style={{ minHeight: status === 'scanning' || status === 'success' ? '280px' : '0' }}
        />

        {/* Minimal Scanning Overlay */}
        {status === 'scanning' && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Semi-transparent overlay */}
            <div className="absolute inset-0 bg-black/40" />
            
            {/* Clean viewfinder cutout */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div 
                className="relative bg-transparent"
                style={{ width: qrboxSize.width, height: qrboxSize.height }}
              >
                {/* Clear area in center */}
                <div className="absolute inset-0 bg-black/40" style={{
                  clipPath: 'polygon(0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%, 0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%)'
                }} />
                
                {/* Corner brackets - Top Start */}
                <div className="absolute top-0 start-0 w-8 h-8 border-t-3 border-s-3 border-primary" />
                {/* Top End */}
                <div className="absolute top-0 end-0 w-8 h-8 border-t-3 border-e-3 border-primary" />
                {/* Bottom Start */}
                <div className="absolute bottom-0 start-0 w-8 h-8 border-b-3 border-s-3 border-primary" />
                {/* Bottom End */}
                <div className="absolute bottom-0 end-0 w-8 h-8 border-b-3 border-e-3 border-primary" />

                {/* Center crosshair */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Crosshair className="h-6 w-6 text-primary/60" />
                </div>
              </div>
            </div>

            {/* Top status bar - Minimal */}
            <div className="absolute top-3 inset-x-3">
              <div className="flex items-center justify-center gap-2 bg-black/70 px-3 py-1.5 rounded text-xs">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <span className="text-white/90 font-medium uppercase tracking-wide">
                  {t('scanner.scanning', 'Scanning')}
                </span>
              </div>
            </div>

            {/* Bottom info bar */}
            <div className="absolute bottom-16 inset-x-3">
              <div className="flex items-center justify-center gap-3 bg-black/70 px-3 py-1.5 rounded text-xs">
                <span className="text-white/80 uppercase tracking-wide">
                  {facingMode === 'environment' 
                    ? t('scanner.backCamera', 'Rear')
                    : t('scanner.frontCamera', 'Front')
                  }
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Permission Denied State */}
        {status === 'permission_denied' && (
          <div className="flex flex-col items-center justify-center gap-4 p-6 min-h-[280px] text-center bg-destructive/5">
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold">
                {t('scanner.cameraPermissionTitle', 'Camera Access Required')}
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                {t('scanner.cameraPermissionDesc', 'Allow camera access to scan codes')}
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={startScanner}
              className="gap-2"
              size="sm"
            >
              <Camera className="h-4 w-4" />
              {t('scanner.retryCamera', 'Retry')}
            </Button>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="flex flex-col items-center justify-center gap-4 p-6 min-h-[280px] text-center bg-destructive/5">
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold">
                {t('scanner.errorTitle', 'Scanner Error')}
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs">{error}</p>
            </div>
            <Button 
              variant="outline" 
              onClick={startScanner}
              className="gap-2"
              size="sm"
            >
              <Camera className="h-4 w-4" />
              {t('scanner.retryCamera', 'Retry')}
            </Button>
          </div>
        )}

        {/* Idle State */}
        {status === 'idle' && (
          <div className="flex flex-col items-center justify-center gap-4 p-6 min-h-[280px] text-center">
            <div className="p-4 rounded-lg bg-muted border border-border">
              <QrCode className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold">
                {t('scanner.readyTitle', 'Ready to Scan')}
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                {t('scanner.pointAtCode', 'Point camera at QR code')}
              </p>
            </div>
            <Button 
              onClick={startScanner}
              className="gap-2"
              size="sm"
            >
              <Camera className="h-4 w-4" />
              {t('scanner.startCamera', 'Start Camera')}
            </Button>
          </div>
        )}

        {/* Processing State */}
        {status === 'processing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/95 z-10">
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {t('scanner.processing', 'Processing...')}
            </p>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/95 z-10">
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <div className="text-center space-y-0.5">
              <p className="text-base font-semibold text-green-600">
                {t('scanner.scanSuccessful', 'Scan Complete')}
              </p>
              {successMessage && (
                <p className="text-sm text-muted-foreground">{successMessage}</p>
              )}
            </div>
          </div>
        )}

        {/* Camera Controls - Compact buttons */}
        {status === 'scanning' && (
          <div className="absolute bottom-3 end-3 flex flex-col gap-2 z-20">
            {showCameraSwitch && (
              <Button
                size="icon"
                variant="secondary"
                className="h-10 w-10 rounded-lg bg-white/90 dark:bg-black/80 hover:bg-white dark:hover:bg-black border border-border shadow-md"
                onClick={switchCamera}
                aria-label={t('scanner.switchCamera', 'Switch Camera')}
              >
                <SwitchCamera className="h-5 w-5" />
              </Button>
            )}
            
            {showTorchToggle && hasTorch && (
              <Button
                size="icon"
                variant="secondary"
                className={cn(
                  "h-10 w-10 rounded-lg border shadow-md",
                  torchEnabled 
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 border-primary" 
                    : "bg-white/90 dark:bg-black/80 hover:bg-white dark:hover:bg-black border-border"
                )}
                onClick={toggleTorch}
                aria-label={t('scanner.toggleFlash', 'Toggle Flash')}
              >
                {torchEnabled ? (
                  <Flashlight className="h-5 w-5" />
                ) : (
                  <FlashlightOff className="h-5 w-5" />
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function setProcessing(scanner: { setStatus: (status: ScannerStatus) => void }) {
  scanner.setStatus('processing');
}
