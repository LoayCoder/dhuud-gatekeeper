import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, XCircle, AlertTriangle, User, HardHat, Loader2, QrCode, ShieldCheck, Clock, WifiOff, LogIn, LogOut, X, RotateCcw, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { gateOfflineCache } from '@/lib/gate-offline-cache';
import { CameraScanner } from '@/components/ui/camera-scanner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  isOfflineCached?: boolean;
  cachedAt?: number;
}

export function GateQRScanner({ open, onOpenChange, onScanResult, expectedType }: GateQRScannerProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(false);
  const [scanResult, setScanResult] = useState<QRScanResult | null>(null);
  const [isScannerActive, setIsScannerActive] = useState(true);
  const scannerKeyRef = useRef(0);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setScanResult(null);
      setIsVerifying(false);
      setIsScannerActive(true);
      scannerKeyRef.current += 1;
    }
  }, [open]);

  const verifyQRCode = async (code: string): Promise<QRScanResult> => {
    const isOnline = navigator.onLine;
    
    let tenantId: string | undefined;
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', userData.user?.id || '')
        .single();
      tenantId = profile?.tenant_id;
    } catch (error) {
      console.warn('[GateQR] Could not get tenant_id, proceeding with cache check');
    }

    // Handle VISITOR: prefix
    if (code.startsWith('VISITOR:')) {
      const visitorToken = code.replace('VISITOR:', '');
      
      if (isOnline) {
        try {
          const { data: visitor } = await supabase
            .from('visitors')
            .select('id, full_name, company_name, qr_code_token, qr_used_at')
            .eq('qr_code_token', visitorToken)
            .is('deleted_at', null)
            .maybeSingle();

          if (visitor) {
            await gateOfflineCache.cacheVisitorVerification(visitorToken, {
              id: visitor.id,
              full_name: visitor.full_name,
              company_name: visitor.company_name,
              qr_used_at: visitor.qr_used_at,
            });

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
        } catch (error) {
          console.error('[GateQR] Online verification failed, trying cache:', error);
        }
      }
      
      const cachedVisitor = await gateOfflineCache.getVisitorVerification(visitorToken) as { 
        id: string; 
        full_name: string; 
        company_name?: string;
        qr_used_at?: string;
        _cachedAt?: number;
      } | null;
      
      if (cachedVisitor) {
        if (cachedVisitor.qr_used_at) {
          return {
            type: 'visitor',
            id: cachedVisitor.id,
            status: 'used',
            rawCode: code,
            isOfflineCached: true,
            cachedAt: cachedVisitor._cachedAt,
            data: {
              name: cachedVisitor.full_name,
              company: cachedVisitor.company_name || undefined,
              qrUsedAt: cachedVisitor.qr_used_at,
              warnings: [t('security.qrScanner.qrAlreadyUsed', 'This QR code has already been used')],
            },
          };
        }
        
        return {
          type: 'visitor',
          id: cachedVisitor.id,
          status: 'valid',
          rawCode: code,
          isOfflineCached: true,
          cachedAt: cachedVisitor._cachedAt,
          data: {
            name: cachedVisitor.full_name,
            company: cachedVisitor.company_name || undefined,
            warnings: [t('security.qrScanner.offlineCachedData', 'Using cached data (offline)')],
          },
        };
      }
      
      return {
        type: 'visitor',
        status: 'not_found',
        rawCode: code,
        data: {
          warnings: [isOnline 
            ? t('security.qrScanner.visitorNotFound', 'Visitor not found')
            : t('security.qrScanner.offlineNoCache', 'No network. Visitor not in offline cache.')
          ],
        },
      };
    }

    // Handle WORKER: prefix
    if (code.startsWith('WORKER:')) {
      const parts = code.split(':');
      if (parts.length >= 2) {
        const qrToken = parts[1];
        
        if (isOnline) {
          try {
            const { data, error } = await supabase.functions.invoke('validate-worker-qr', {
              body: { qr_token: qrToken, tenant_id: tenantId },
            });

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

            await gateOfflineCache.cacheWorkerVerification(qrToken, {
              worker: data.worker,
              induction: data.induction,
              warnings: data.warnings,
              is_valid: true,
            });

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
          } catch (error) {
            console.error('[GateQR] Online worker verification failed, trying cache:', error);
          }
        }
        
        const cachedWorker = await gateOfflineCache.getWorkerVerification(qrToken) as {
          worker?: { id: string; full_name: string; company_name?: string; project_name?: string };
          induction?: { status: string; expires_at?: string };
          warnings?: string[];
          is_valid?: boolean;
          _cachedAt?: number;
        } | null;
        
        if (cachedWorker && cachedWorker.is_valid) {
          return {
            type: 'worker',
            id: cachedWorker.worker?.id,
            status: 'valid',
            rawCode: code,
            isOfflineCached: true,
            cachedAt: cachedWorker._cachedAt,
            data: {
              name: cachedWorker.worker?.full_name,
              company: cachedWorker.worker?.company_name,
              projectName: cachedWorker.worker?.project_name,
              inductionStatus: cachedWorker.induction?.status || 'not_started',
              expiresAt: cachedWorker.induction?.expires_at,
              warnings: [
                ...(cachedWorker.warnings || []),
                t('security.qrScanner.offlineCachedData', 'Using cached data (offline)'),
              ],
            },
          };
        }
        
        return {
          type: 'worker',
          status: 'not_found',
          rawCode: code,
          data: {
            warnings: [isOnline 
              ? t('security.qrScanner.workerNotFound', 'Worker verification failed')
              : t('security.qrScanner.offlineNoCache', 'No network. Worker not in offline cache.')
            ],
          },
        };
      }
    }

    // Handle legacy VIS- format
    if (code.startsWith('VIS-')) {
      const visitorId = code.replace('VIS-', '');
      
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

    return {
      type: 'unknown',
      status: 'not_found',
      rawCode: code,
      data: {
        warnings: [t('security.qrScanner.unknownFormat', 'Unknown QR format')],
      },
    };
  };

  const handleScan = useCallback(async (decodedText: string) => {
    // Prevent duplicate scans while verifying
    if (isVerifying) return;
    
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }

    setIsVerifying(true);
    setIsScannerActive(false);

    try {
      const parsedResult = await verifyQRCode(decodedText);
      setScanResult(parsedResult);
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
  }, [isVerifying]);

  const handleClose = useCallback(() => {
    setScanResult(null);
    setIsVerifying(false);
    setIsScannerActive(true);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleScanNext = useCallback(() => {
    setScanResult(null);
    setIsVerifying(false);
    setIsScannerActive(true);
    scannerKeyRef.current += 1;
  }, []);

  const handleUseResult = useCallback(() => {
    if (scanResult) {
      onScanResult(scanResult);
      // Don't close - allow user to take action and then scan next
    }
  }, [scanResult, onScanResult]);

  const handleUseAndClose = useCallback(() => {
    if (scanResult) {
      onScanResult(scanResult);
      handleClose();
    }
  }, [scanResult, onScanResult, handleClose]);

  const getStatusConfig = (status: QRScanResult['status']) => {
    switch (status) {
      case 'valid':
        return {
          icon: CheckCircle2,
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/30',
          label: t('security.qrScanner.valid', 'Valid'),
        };
      case 'expired':
        return {
          icon: Clock,
          color: 'text-amber-500',
          bgColor: 'bg-amber-500/10',
          borderColor: 'border-amber-500/30',
          label: t('security.qrScanner.expired', 'Expired'),
        };
      case 'revoked':
        return {
          icon: XCircle,
          color: 'text-destructive',
          bgColor: 'bg-destructive/10',
          borderColor: 'border-destructive/30',
          label: t('security.qrScanner.revoked', 'Revoked'),
        };
      case 'used':
        return {
          icon: AlertTriangle,
          color: 'text-amber-500',
          bgColor: 'bg-amber-500/10',
          borderColor: 'border-amber-500/30',
          label: t('security.qrScanner.used', 'Already Used'),
        };
      default:
        return {
          icon: XCircle,
          color: 'text-destructive',
          bgColor: 'bg-destructive/10',
          borderColor: 'border-destructive/30',
          label: t('security.qrScanner.invalid', 'Invalid'),
        };
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden rounded-2xl border-0 shadow-2xl bg-gradient-to-b from-background to-muted/30 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <DialogHeader className="p-5 pb-3 border-b border-border/50 bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
          <DialogTitle className="flex items-center justify-between gap-3 text-xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                {expectedType === 'worker' 
                  ? <HardHat className="h-5 w-5 text-primary" />
                  : <User className="h-5 w-5 text-primary" />
                }
              </div>
              <div className="flex flex-col gap-0.5">
                <span>
                  {expectedType === 'worker' 
                    ? t('security.qrScanner.scanWorkerQR', 'Scan Worker QR')
                    : t('security.qrScanner.scanVisitorQR', 'Scan Visitor QR')
                  }
                </span>
                <span className="text-sm font-normal text-muted-foreground">
                  {scanResult 
                    ? t('security.qrScanner.scanComplete', 'Scan Complete')
                    : t('security.qrScanner.pointAtCode', 'Point camera at QR code')
                  }
                </span>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClose} className="rounded-full">
              <X className="h-5 w-5" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Scanner Area - Always visible but may be paused */}
        <div className="p-4 pb-2">
          {isScannerActive && !isVerifying && (
            <CameraScanner
              key={scannerKeyRef.current}
              containerId="gate-qr-scanner"
              isOpen={open && isScannerActive}
              onScan={handleScan}
              qrboxSize={{ width: 250, height: 250 }}
              aspectRatio={1.0}
              showCameraSwitch={true}
              showTorchToggle={true}
            />
          )}

          {/* Verifying State */}
          {isVerifying && (
            <div className="flex flex-col items-center justify-center gap-6 p-8 min-h-[280px] bg-gradient-to-br from-muted/50 to-muted rounded-2xl border border-border/50">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                <div className="relative p-5 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30">
                  <Loader2 className="h-12 w-12 text-primary animate-spin" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">{t('security.qrScanner.verifying', 'Verifying...')}</h3>
                <p className="text-sm text-muted-foreground">{t('security.qrScanner.pleaseWait', 'Please wait')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Result Display - Shows below scanner when we have a result */}
        {scanResult && !isVerifying && (
          <div className="px-4 pb-4 space-y-4 animate-in slide-in-from-bottom-4 duration-300">
            {/* Status Card */}
            <div className={cn(
              "p-4 rounded-xl border-2",
              getStatusConfig(scanResult.status).bgColor,
              getStatusConfig(scanResult.status).borderColor
            )}>
              <div className="flex items-start gap-4">
                {/* Status Icon */}
                <div className={cn(
                  "p-3 rounded-full flex-shrink-0",
                  getStatusConfig(scanResult.status).bgColor
                )}>
                  {(() => {
                    const Icon = getStatusConfig(scanResult.status).icon;
                    return <Icon className={cn("h-8 w-8", getStatusConfig(scanResult.status).color)} />;
                  })()}
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge 
                      variant={scanResult.status === 'valid' ? 'default' : 'destructive'}
                      className={cn(
                        scanResult.status === 'valid' && "bg-green-600 hover:bg-green-700",
                        scanResult.status === 'expired' && "bg-amber-600 hover:bg-amber-700",
                        scanResult.status === 'used' && "bg-amber-600 hover:bg-amber-700"
                      )}
                    >
                      {scanResult.type === 'worker' && <HardHat className="h-3 w-3 me-1" />}
                      {scanResult.type === 'visitor' && <User className="h-3 w-3 me-1" />}
                      {getStatusConfig(scanResult.status).label}
                    </Badge>
                    
                    {scanResult.isOfflineCached && (
                      <Badge variant="outline" className="text-amber-600 border-amber-400">
                        <WifiOff className="h-3 w-3 me-1" />
                        {t('security.qrScanner.offlineData', 'Cached')}
                      </Badge>
                    )}
                  </div>
                  
                  {scanResult.data?.name && (
                    <p className="text-lg font-bold mt-2 truncate">{scanResult.data.name}</p>
                  )}
                  
                  {scanResult.data?.company && (
                    <p className="text-sm text-muted-foreground truncate">{scanResult.data.company}</p>
                  )}
                  
                  {scanResult.data?.projectName && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <ShieldCheck className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{scanResult.data.projectName}</span>
                    </p>
                  )}
                </div>
              </div>
              
              {/* Warnings */}
              {scanResult.data?.warnings && scanResult.data.warnings.length > 0 && (
                <div className="mt-3 space-y-2">
                  {scanResult.data.warnings.map((warning, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-start gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-sm"
                    >
                      <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                      <span className="text-destructive">{warning}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="gap-2 h-12 rounded-xl"
                onClick={handleScanNext}
              >
                <RotateCcw className="h-4 w-4" />
                {t('scanner.scanNext', 'Scan Next')}
              </Button>
              
              {scanResult.status === 'valid' ? (
                <Button 
                  className="gap-2 h-12 rounded-xl bg-green-600 hover:bg-green-700"
                  onClick={handleUseAndClose}
                >
                  <LogIn className="h-4 w-4" />
                  {t('scanner.logEntry', 'Log Entry')}
                </Button>
              ) : (
                <Button 
                  variant="secondary"
                  className="gap-2 h-12 rounded-xl"
                  onClick={handleUseAndClose}
                >
                  {t('scanner.useResult', 'Use Result')}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Close button when scanner is active */}
        {!scanResult && !isVerifying && (
          <div className="p-4 pt-0">
            <Button 
              variant="outline" 
              className="w-full gap-2 rounded-xl h-12 border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all duration-300" 
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
              {t('common.cancel', 'Cancel')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
