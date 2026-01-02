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
  Focus,
  Zap
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
  const [isAnimating, setIsAnimating] = useState(false);
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
    setIsAnimating(true);
    const newFacingMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacingMode);
    setTimeout(() => setIsAnimating(false), 500);
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
          "relative w-full rounded-2xl overflow-hidden bg-gradient-to-br from-muted to-muted/50 shadow-xl border border-border/50",
          scannerClassName
        )}
      >
        {/* Video Container */}
        <div 
          id={containerId}
          className={cn(
            "w-full transition-all duration-500",
            status !== 'scanning' && status !== 'success' && 'opacity-0 absolute',
            isAnimating && 'scale-95 opacity-50'
          )}
          style={{ minHeight: status === 'scanning' || status === 'success' ? '320px' : '0' }}
        />

        {/* Advanced Scanning Overlay */}
        {status === 'scanning' && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Dark overlay outside viewfinder */}
            <div 
              className="absolute inset-0 bg-black/60"
              style={{
                maskImage: `radial-gradient(ellipse ${qrboxSize.width * 0.6}px ${qrboxSize.height * 0.6}px at center, transparent 60%, black 100%)`,
                WebkitMaskImage: `radial-gradient(ellipse ${qrboxSize.width * 0.6}px ${qrboxSize.height * 0.6}px at center, transparent 60%, black 100%)`
              }}
            />

            {/* Viewfinder Frame */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div 
                className="relative"
                style={{ width: qrboxSize.width, height: qrboxSize.height }}
              >
                {/* Glowing border effect */}
                <div className="absolute inset-0 rounded-2xl border-2 border-primary/30 shadow-[0_0_30px_rgba(var(--primary),0.3)]" />
                
                {/* Animated corner brackets - Top Start */}
                <div className="absolute -top-1 -start-1 w-10 h-10">
                  <div className="absolute top-0 start-0 w-full h-1 bg-gradient-to-e from-primary to-primary/50 rounded-full animate-pulse" />
                  <div className="absolute top-0 start-0 w-1 h-full bg-gradient-to-b from-primary to-primary/50 rounded-full animate-pulse" />
                  <div className="absolute top-0 start-0 w-3 h-3 bg-primary rounded-full animate-ping opacity-75" style={{ animationDuration: '2s' }} />
                </div>
                
                {/* Top End */}
                <div className="absolute -top-1 -end-1 w-10 h-10">
                  <div className="absolute top-0 end-0 w-full h-1 bg-gradient-to-s from-primary to-primary/50 rounded-full animate-pulse" style={{ animationDelay: '0.15s' }} />
                  <div className="absolute top-0 end-0 w-1 h-full bg-gradient-to-b from-primary to-primary/50 rounded-full animate-pulse" style={{ animationDelay: '0.15s' }} />
                  <div className="absolute top-0 end-0 w-3 h-3 bg-primary rounded-full animate-ping opacity-75" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
                </div>
                
                {/* Bottom Start */}
                <div className="absolute -bottom-1 -start-1 w-10 h-10">
                  <div className="absolute bottom-0 start-0 w-full h-1 bg-gradient-to-e from-primary to-primary/50 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                  <div className="absolute bottom-0 start-0 w-1 h-full bg-gradient-to-t from-primary to-primary/50 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                  <div className="absolute bottom-0 start-0 w-3 h-3 bg-primary rounded-full animate-ping opacity-75" style={{ animationDuration: '2s', animationDelay: '1s' }} />
                </div>
                
                {/* Bottom End */}
                <div className="absolute -bottom-1 -end-1 w-10 h-10">
                  <div className="absolute bottom-0 end-0 w-full h-1 bg-gradient-to-s from-primary to-primary/50 rounded-full animate-pulse" style={{ animationDelay: '0.45s' }} />
                  <div className="absolute bottom-0 end-0 w-1 h-full bg-gradient-to-t from-primary to-primary/50 rounded-full animate-pulse" style={{ animationDelay: '0.45s' }} />
                  <div className="absolute bottom-0 end-0 w-3 h-3 bg-primary rounded-full animate-ping opacity-75" style={{ animationDuration: '2s', animationDelay: '1.5s' }} />
                </div>

                {/* Horizontal Scan Line with glow */}
                <div 
                  className="absolute inset-x-0 h-1 animate-scan-line"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, hsl(var(--primary)) 20%, hsl(var(--primary)) 80%, transparent 100%)',
                    boxShadow: '0 0 20px 4px hsl(var(--primary) / 0.6), 0 0 40px 8px hsl(var(--primary) / 0.3)'
                  }}
                />
                
                {/* Vertical scan pulse effect */}
                <div 
                  className="absolute inset-y-0 w-0.5 animate-[scan-line-horizontal_3s_ease-in-out_infinite]"
                  style={{
                    background: 'linear-gradient(180deg, transparent 0%, hsl(var(--primary) / 0.5) 50%, transparent 100%)',
                    boxShadow: '0 0 10px 2px hsl(var(--primary) / 0.3)'
                  }}
                />

                {/* Center focus indicator */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    <Focus className="h-8 w-8 text-primary/40 animate-pulse" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 bg-primary rounded-full animate-ping" />
                    </div>
                  </div>
                </div>

                {/* Grid pattern overlay */}
                <div 
                  className="absolute inset-4 opacity-10"
                  style={{
                    backgroundImage: `
                      linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
                      linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)
                    `,
                    backgroundSize: '20px 20px'
                  }}
                />
              </div>
            </div>

            {/* Top instruction banner */}
            <div className="absolute top-4 inset-x-4">
              <div className="flex items-center justify-center gap-2 bg-black/60 backdrop-blur-md rounded-full px-4 py-2 border border-white/10">
                <QrCode className="h-4 w-4 text-primary animate-pulse" />
                <span className="text-sm font-medium text-white">
                  {t('scanner.alignCode', 'Align QR code within the frame')}
                </span>
              </div>
            </div>

            {/* Bottom status bar */}
            <div className="absolute bottom-20 inset-x-4">
              <div className="flex items-center justify-center gap-3 bg-black/60 backdrop-blur-md rounded-full px-4 py-2 border border-white/10">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-white/80">{t('scanner.scanning', 'Scanning...')}</span>
                </div>
                <div className="w-px h-4 bg-white/20" />
                <div className="flex items-center gap-1.5">
                  <Zap className="h-3 w-3 text-primary" />
                  <span className="text-xs text-white/80">
                    {facingMode === 'environment' 
                      ? t('scanner.backCamera', 'Back Camera')
                      : t('scanner.frontCamera', 'Front Camera')
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Permission Denied State */}
        {status === 'permission_denied' && (
          <div className="flex flex-col items-center justify-center gap-6 p-8 min-h-[320px] text-center bg-gradient-to-br from-destructive/5 to-destructive/10">
            <div className="relative">
              <div className="absolute inset-0 bg-destructive/20 rounded-full blur-xl animate-pulse" />
              <div className="relative p-5 rounded-full bg-gradient-to-br from-destructive/20 to-destructive/10 border border-destructive/20">
                <AlertCircle className="h-12 w-12 text-destructive" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                {t('scanner.cameraPermissionTitle', 'Camera Access Required')}
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                {t('scanner.cameraPermissionDesc', 'Please allow camera access in your browser settings to scan codes')}
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={startScanner}
              className="gap-2 rounded-full px-6"
            >
              <Camera className="h-4 w-4" />
              {t('scanner.retryCamera', 'Try Again')}
            </Button>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="flex flex-col items-center justify-center gap-6 p-8 min-h-[320px] text-center bg-gradient-to-br from-destructive/5 to-destructive/10">
            <div className="relative">
              <div className="absolute inset-0 bg-destructive/20 rounded-full blur-xl animate-pulse" />
              <div className="relative p-5 rounded-full bg-gradient-to-br from-destructive/20 to-destructive/10 border border-destructive/20">
                <AlertCircle className="h-12 w-12 text-destructive" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                {t('scanner.errorTitle', 'Scanner Error')}
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs">{error}</p>
            </div>
            <Button 
              variant="outline" 
              onClick={startScanner}
              className="gap-2 rounded-full px-6"
            >
              <Camera className="h-4 w-4" />
              {t('scanner.retryCamera', 'Try Again')}
            </Button>
          </div>
        )}

        {/* Idle State */}
        {status === 'idle' && (
          <div className="flex flex-col items-center justify-center gap-6 p-8 min-h-[320px] text-center">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl animate-pulse" />
              <div className="relative p-5 rounded-full bg-gradient-to-br from-muted to-muted/50 border border-border">
                <QrCode className="h-12 w-12 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                {t('scanner.readyTitle', 'Ready to Scan')}
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                {t('scanner.pointAtCode', 'Point camera at the QR code or barcode')}
              </p>
            </div>
            <Button 
              onClick={startScanner}
              className="gap-2 rounded-full px-6"
            >
              <Camera className="h-4 w-4" />
              {t('scanner.startCamera', 'Start Camera')}
            </Button>
          </div>
        )}

        {/* Processing State */}
        {status === 'processing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/90 backdrop-blur-md z-10">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
              <div className="relative p-4 rounded-full bg-primary/10 border border-primary/20">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              </div>
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {t('scanner.processing', 'Processing...')}
            </p>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/90 backdrop-blur-md z-10">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500/30 rounded-full blur-xl animate-pulse" />
              <div className="relative p-4 rounded-full bg-green-500/10 border border-green-500/20">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                {t('scanner.scanSuccessful', 'Scan Successful!')}
              </p>
              {successMessage && (
                <p className="text-sm text-muted-foreground">{successMessage}</p>
              )}
            </div>
          </div>
        )}

        {/* Camera Controls - Floating Action Buttons */}
        {status === 'scanning' && (
          <div className="absolute bottom-4 end-4 flex flex-col gap-3 z-20">
            {showCameraSwitch && (
              <Button
                size="icon"
                variant="secondary"
                className={cn(
                  "h-14 w-14 rounded-full shadow-2xl bg-white/90 dark:bg-black/80 backdrop-blur-md hover:bg-white dark:hover:bg-black/90 border border-white/20 transition-all duration-300",
                  isAnimating && "animate-spin"
                )}
                onClick={switchCamera}
                aria-label={t('scanner.switchCamera', 'Switch Camera')}
              >
                <SwitchCamera className="h-6 w-6 text-foreground" />
              </Button>
            )}
            
            {showTorchToggle && hasTorch && (
              <Button
                size="icon"
                variant="secondary"
                className={cn(
                  "h-14 w-14 rounded-full shadow-2xl backdrop-blur-md border transition-all duration-300",
                  torchEnabled 
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 border-primary/50 shadow-[0_0_20px_rgba(var(--primary),0.5)]" 
                    : "bg-white/90 dark:bg-black/80 hover:bg-white dark:hover:bg-black/90 border-white/20"
                )}
                onClick={toggleTorch}
                aria-label={t('scanner.toggleFlash', 'Toggle Flash')}
              >
                {torchEnabled ? (
                  <Flashlight className="h-6 w-6" />
                ) : (
                  <FlashlightOff className="h-6 w-6 text-foreground" />
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
