import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Html5Qrcode, Html5QrcodeResult, Html5QrcodeCameraScanConfig } from 'html5-qrcode';
import { X, Camera, SwitchCamera, Loader2, CheckCircle2, XCircle, AlertTriangle, User, HardHat } from 'lucide-react';
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
  expectedType?: 'worker' | 'visitor';
}

export interface QRScanResult {
  type: 'visitor' | 'worker' | 'unknown';
  id?: string;
  status: 'valid' | 'invalid' | 'expired' | 'revoked' | 'not_found' | 'used';
  data?: {
    name?: string;
    company?: string;
    projectName?: string;
    inductionStatus?: string;
    expiresAt?: string;
    warnings?: string[];
    isOnSite?: boolean;
    entryTime?: string;
    entryId?: string;
    qrUsedAt?: string;
  };
  rawCode: string;
}

const SCANNER_CONFIG: Html5QrcodeCameraScanConfig = {
  fps: 10,
  qrbox: { width: 250, height: 250 },
  aspectRatio: 1.0,
};

export function GateQRScanner({ open, onOpenChange, onScanResult, expectedType }: GateQRScannerProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [scanResult, setScanResult] = useState<QRScanResult | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [isContainerReady, setIsContainerReady] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'gate-qr-scanner';

  // Wait for DOM container to be ready
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        const element = document.getElementById(scannerContainerId);
        if (element) {
          setIsContainerReady(true);
        }
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setIsContainerReady(false);
    }
  }, [open]);

  // Initialize scanner after container is ready
  useEffect(() => {
    if (open && isContainerReady && !scannerRef.current) {
      const element = document.getElementById(scannerContainerId);
      if (!element) return;

      scannerRef.current = new Html5Qrcode(scannerContainerId);
      
      // Get available cameras for switching purposes
      Html5Qrcode.getCameras().then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices.map(d => ({ id: d.id, label: d.label })));
        }
      }).catch((err) => {
        console.error('Failed to get cameras:', err);
      });

      // Start with back camera preference using facingMode
      startScanning({ facingMode: 'environment' });
    }

    return () => {
      stopScanning();
    };
  }, [open, isContainerReady]);

  const startScanning = useCallback(async (cameraIdOrFacingMode: string | { facingMode: string }) => {
    if (!scannerRef.current || isScanning) return;

    try {
      await scannerRef.current.start(
        cameraIdOrFacingMode,
        SCANNER_CONFIG,
        onScanSuccess,
        () => {} // Ignore errors during scanning
      );
      setIsScanning(true);
    } catch (error) {
      console.error('Failed to start scanner:', error);
      // Fallback to first camera if facingMode fails
      if (typeof cameraIdOrFacingMode === 'object' && cameras.length > 0) {
        try {
          await scannerRef.current.start(
            cameras[0].id,
            SCANNER_CONFIG,
            onScanSuccess,
            () => {}
          );
          setIsScanning(true);
        } catch (fallbackError) {
          console.error('Fallback camera also failed:', fallbackError);
          toast({
            title: t('security.qrScanner.cameraError', 'Camera Error'),
            description: t('security.qrScanner.cameraPermission', 'Please allow camera access'),
            variant: 'destructive',
          });
        }
      }
    }
  }, [isScanning, cameras, toast, t]);

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

  // activeTab prop to determine which type of QR is expected (for type validation)
  // This is passed via context or detected from parent - for now we detect from the code

  const verifyQRCode = async (code: string): Promise<QRScanResult> => {
    // Get tenant_id for validation
    const { data: userData } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', userData.user?.id || '')
      .single();
    const tenantId = profile?.tenant_id;
    
    // Parse QR code format
    // Expected formats:
    // - WORKER:{qr_token} - QR token is used to look up worker
    // - VISITOR:{visitor_token} - Visitor token
    // - VIS-{reference_id} - Legacy format

    // Handle VISITOR: prefix - return as visitor type
    if (code.startsWith('VISITOR:')) {
      const visitorToken = code.replace('VISITOR:', '');
      
      // Look up visitor by QR token - check if already used
      const { data: visitor } = await supabase
        .from('visitors')
        .select('id, full_name, company_name, qr_code_token, qr_used_at')
        .eq('qr_code_token', visitorToken)
        .is('deleted_at', null)
        .maybeSingle();

      if (visitor) {
        // Check if QR was already used (one-time use)
        if (visitor.qr_used_at) {
          return {
            type: 'visitor',
            id: visitor.id,
            status: 'used',
            rawCode: code,
            data: {
              name: visitor.full_name,
              company: visitor.company_name || undefined,
              qrUsedAt: visitor.qr_used_at,
              warnings: [t('security.qrScanner.qrAlreadyUsed', 'This QR code has already been used')],
            },
          };
        }
        
        return {
          type: 'visitor',
          id: visitor.id,
          status: 'valid',
          rawCode: code,
          data: {
            name: visitor.full_name,
            company: visitor.company_name || undefined,
          },
        };
      }

      // Also check gate_entry_logs for legacy entries
      const { data: gateEntry } = await supabase
        .from('gate_entry_logs')
        .select('id, person_name, purpose, destination_name, qr_code_token')
        .eq('qr_code_token', visitorToken)
        .is('deleted_at', null)
        .maybeSingle();

      if (gateEntry) {
        return {
          type: 'visitor',
          id: gateEntry.id,
          status: 'valid',
          rawCode: code,
          data: {
            name: gateEntry.person_name || undefined,
          },
        };
      }

      return {
        type: 'visitor',
        status: 'not_found',
        rawCode: code,
        data: {
          warnings: [t('security.qrScanner.visitorNotFound', 'Visitor not found')],
        },
      };
    }

    // Handle WORKER: prefix
    if (code.startsWith('WORKER:')) {
      const parts = code.split(':');
      if (parts.length >= 2) {
        // QR format is WORKER:{qr_token} - the qr_token is in parts[1]
        const qrToken = parts[1];
        
        // Validate worker QR via edge function using qr_token
        // The edge function will look up the worker by qr_token
        const { data, error } = await supabase.functions.invoke('validate-worker-qr', {
          body: { qr_token: qrToken, tenant_id: tenantId },
        });

        // Edge function returns: { is_valid, worker: { id, full_name, company_name, project_name }, errors, warnings }
        if (error || !data?.is_valid) {
          const errorMessages = data?.errors || [];
          const hasExpired = errorMessages.some((e: string) => e.toLowerCase().includes('expired'));
          const hasRevoked = errorMessages.some((e: string) => e.toLowerCase().includes('revoked'));
          
          return {
            type: 'worker',
            id: data?.worker?.id,
            status: hasExpired ? 'expired' : hasRevoked ? 'revoked' : 'invalid',
            rawCode: code,
            data: {
              warnings: errorMessages.length > 0 ? errorMessages : [error?.message || 'Invalid QR code'],
            },
          };
        }

        return {
          type: 'worker',
          id: data.worker?.id,
          status: 'valid',
          rawCode: code,
          data: {
            name: data.worker?.full_name,
            company: data.worker?.company_name,
            projectName: data.worker?.project_name,
            inductionStatus: data.induction?.status || 'not_started',
            expiresAt: data.induction?.expires_at,
            warnings: data.warnings,
          },
        };
      }
    }

    // Handle legacy VIS- format
    if (code.startsWith('VIS-')) {
      const visitorId = code.replace('VIS-', '');
      
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
            name: visitor.person_name || undefined,
          },
        };
      }

      return {
        type: 'visitor',
        status: 'not_found',
        rawCode: code,
        data: {
          warnings: [t('security.qrScanner.visitorNotFound', 'Visitor not found')],
        },
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
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
      } catch (e) {
        // Ignore clear errors
      }
      scannerRef.current = null;
    }
    setScanResult(null);
    setIsContainerReady(false);
    onOpenChange(false);
  }, [stopScanning, onOpenChange]);

  const handleRescan = useCallback(async () => {
    setScanResult(null);
    // If we have a known camera, use it; otherwise use facingMode
    if (cameras.length > 0 && currentCameraIndex < cameras.length) {
      await startScanning(cameras[currentCameraIndex].id);
    } else {
      await startScanning({ facingMode: 'environment' });
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
      case 'used':
        return t('security.qrScanner.used', 'Already Used');
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
          {/* Visual indicator for expected QR type */}
          {!scanResult && expectedType && (
            <div className={cn(
              "flex items-center justify-center gap-2 p-3 mx-4 mb-2 rounded-lg border",
              expectedType === 'worker' 
                ? "bg-orange-500/10 border-orange-500/20" 
                : "bg-blue-500/10 border-blue-500/20"
            )}>
              {expectedType === 'worker' ? (
                <HardHat className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              ) : (
                <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              )}
              <div className="text-center">
                <p className={cn(
                  "font-medium text-sm",
                  expectedType === 'worker' ? "text-orange-600 dark:text-orange-400" : "text-blue-600 dark:text-blue-400"
                )}>
                  {expectedType === 'worker' 
                    ? t('security.qrScanner.expectedWorkerQR', 'Scan Worker QR Code')
                    : t('security.qrScanner.expectedVisitorQR', 'Scan Visitor QR Code')
                  }
                </p>
              </div>
            </div>
          )}

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
