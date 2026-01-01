import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  SwitchCamera, 
  Flashlight, 
  FlashlightOff, 
  Camera, 
  AlertCircle,
  Loader2,
  CheckCircle2
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

      // Wait for DOM to be ready
      await new Promise(resolve => setTimeout(resolve, 150));

      const container = document.getElementById(containerId);
      if (!container) {
        throw new Error('Scanner container not found');
      }

      // Stop any existing scanner first
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
        () => {
          // QR not found - ignore
        }
      );

      // Check for torch capability
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

  // Start scanner when open
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

  // Restart when camera changes
  useEffect(() => {
    if (isOpen && status === 'scanning') {
      startScanner();
    }
  }, [facingMode]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  return (
    <div className="relative w-full">
      {/* Scanner Container */}
      <div 
        className={cn(
          "relative w-full rounded-xl overflow-hidden bg-muted",
          scannerClassName
        )}
      >
        {/* Video Container */}
        <div 
          id={containerId}
          className={cn(
            "w-full transition-opacity duration-300",
            status !== 'scanning' && status !== 'success' && 'opacity-0 absolute'
          )}
          style={{ minHeight: status === 'scanning' || status === 'success' ? '300px' : '0' }}
        />

        {/* Scanning Overlay */}
        {status === 'scanning' && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Viewfinder Frame */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div 
                className="relative border-2 border-primary/50 rounded-lg"
                style={{ width: qrboxSize.width, height: qrboxSize.height }}
              >
                {/* Animated Corners */}
                <div className="absolute -top-1 -start-1 w-6 h-6 border-t-4 border-s-4 border-primary rounded-tl-lg animate-pulse-corner" />
                <div className="absolute -top-1 -end-1 w-6 h-6 border-t-4 border-e-4 border-primary rounded-tr-lg animate-pulse-corner" style={{ animationDelay: '0.2s' }} />
                <div className="absolute -bottom-1 -start-1 w-6 h-6 border-b-4 border-s-4 border-primary rounded-bl-lg animate-pulse-corner" style={{ animationDelay: '0.4s' }} />
                <div className="absolute -bottom-1 -end-1 w-6 h-6 border-b-4 border-e-4 border-primary rounded-br-lg animate-pulse-corner" style={{ animationDelay: '0.6s' }} />

                {/* Scan Line */}
                <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-line" />
              </div>
            </div>

            {/* Semi-transparent overlay outside viewfinder */}
            <div className="absolute inset-0 bg-background/40 backdrop-blur-[1px]" 
              style={{
                clipPath: `polygon(
                  0% 0%, 100% 0%, 100% 100%, 0% 100%,
                  0% 0%,
                  calc(50% - ${qrboxSize.width/2}px) calc(50% - ${qrboxSize.height/2}px),
                  calc(50% - ${qrboxSize.width/2}px) calc(50% + ${qrboxSize.height/2}px),
                  calc(50% + ${qrboxSize.width/2}px) calc(50% + ${qrboxSize.height/2}px),
                  calc(50% + ${qrboxSize.width/2}px) calc(50% - ${qrboxSize.height/2}px),
                  calc(50% - ${qrboxSize.width/2}px) calc(50% - ${qrboxSize.height/2}px)
                )`
              }}
            />
          </div>
        )}

        {/* Permission Denied State */}
        {status === 'permission_denied' && (
          <div className="flex flex-col items-center justify-center gap-4 p-8 min-h-[300px] text-center">
            <div className="p-4 rounded-full bg-destructive/10">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">
                {t('scanner.cameraPermissionTitle', 'Camera Access Required')}
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                {t('scanner.cameraPermissionDesc', 'Please allow camera access to scan codes')}
              </p>
            </div>
            <Button variant="outline" onClick={startScanner}>
              {t('scanner.retryCamera', 'Retry')}
            </Button>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="flex flex-col items-center justify-center gap-4 p-8 min-h-[300px] text-center">
            <div className="p-4 rounded-full bg-destructive/10">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={startScanner}>
              {t('scanner.retryCamera', 'Retry')}
            </Button>
          </div>
        )}

        {/* Idle State */}
        {status === 'idle' && (
          <div className="flex flex-col items-center justify-center gap-4 p-8 min-h-[300px] text-center">
            <div className="p-4 rounded-full bg-muted-foreground/10">
              <Camera className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {t('scanner.pointAtCode', 'Point camera at the code')}
            </p>
          </div>
        )}

        {/* Processing State */}
        {status === 'processing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">
              {t('scanner.processing', 'Processing...')}
            </p>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && successMessage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm">
            <div className="p-4 rounded-full bg-success/10">
              <CheckCircle2 className="h-10 w-10 text-success" />
            </div>
            <p className="text-sm font-medium text-success">
              {successMessage || t('scanner.scanSuccessful', 'Scan Successful')}
            </p>
          </div>
        )}

        {/* Camera Controls */}
        {status === 'scanning' && (
          <div className="absolute bottom-4 end-4 flex flex-col gap-2">
            {showCameraSwitch && (
              <Button
                size="icon"
                variant="secondary"
                className="h-12 w-12 rounded-full shadow-lg bg-background/80 backdrop-blur-sm hover:bg-background/90"
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
                  "h-12 w-12 rounded-full shadow-lg backdrop-blur-sm",
                  torchEnabled 
                    ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                    : "bg-background/80 hover:bg-background/90"
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

      {/* Error Alert */}
      {error && status !== 'permission_denied' && status !== 'error' && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Scanning Instructions */}
      {status === 'scanning' && (
        <p className="text-sm text-muted-foreground text-center mt-4">
          {t('scanner.pointAtCode', 'Point camera at the code')}
        </p>
      )}

      {/* Camera Mode Indicator */}
      {status === 'scanning' && (
        <div className="flex justify-center mt-2">
          <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
            {facingMode === 'environment' 
              ? t('scanner.backCamera', 'Back Camera')
              : t('scanner.frontCamera', 'Front Camera')
            }
          </span>
        </div>
      )}
    </div>
  );
}

export function setProcessing(scanner: { setStatus: (status: ScannerStatus) => void }) {
  scanner.setStatus('processing');
}
