import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, XCircle, AlertTriangle, User, HardHat, Loader2, QrCode, ShieldCheck, Clock, WifiOff, LogIn, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { gateOfflineCache } from '@/lib/gate-offline-cache';
import { CameraScanner } from '@/components/ui/camera-scanner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useHostArrivalNotification } from '@/hooks/use-host-arrival-notification';

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
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const hostArrivalNotification = useHostArrivalNotification();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const [scanResult, setScanResult] = useState<QRScanResult | null>(null);
  const [isScannerActive, setIsScannerActive] = useState(true);
  const scannerKeyRef = useRef(0);

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
      console.warn('[GateQR] Could not get tenant_id');
    }

    // Handle VISITOR: prefix
    if (code.startsWith('VISITOR:')) {
      const visitorToken = code.replace('VISITOR:', '');
      
      if (isOnline) {
        try {
          // Fetch visitor with visit request for expiration check
          const { data: visitor } = await supabase
            .from('visitors')
            .select('id, full_name, company_name, national_id, qr_code_token, qr_used_at, is_active')
            .eq('qr_code_token', visitorToken)
            .eq('is_active', true)
            .maybeSingle();

          if (visitor) {
            // CRITICAL: Check if visitor is on the blacklist (only non-deleted entries)
            if (visitor.national_id && tenantId) {
              const { data: blacklistEntry } = await supabase
                .from('security_blacklist')
                .select('id, reason')
                .eq('tenant_id', tenantId)
                .eq('national_id', visitor.national_id)
                .is('deleted_at', null) // AUDIT: Only check active blacklist entries
                .maybeSingle();

              if (blacklistEntry) {
                return {
                  type: 'visitor',
                  id: visitor.id,
                  status: 'revoked',
                  rawCode: code,
                  data: {
                    name: visitor.full_name,
                    company: visitor.company_name || undefined,
                    warnings: [
                      t('visitors.checkpoint.blockedByBlacklist', 'Entry blocked - visitor is blacklisted'),
                      blacklistEntry.reason ? `${t('visitors.blacklist.reason', 'Reason')}: ${blacklistEntry.reason}` : '',
                    ].filter(Boolean),
                  },
                };
              }
            }

            // SECURITY: Check visit request expiration
            const { data: visitRequest } = await supabase
              .from('visit_requests')
              .select('id, status, valid_until')
              .eq('visitor_id', visitor.id)
              .eq('status', 'approved')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (visitRequest?.valid_until) {
              const now = new Date();
              const validUntil = new Date(visitRequest.valid_until);
              if (validUntil < now) {
                return {
                  type: 'visitor',
                  id: visitor.id,
                  status: 'expired',
                  rawCode: code,
                  data: {
                    name: visitor.full_name,
                    company: visitor.company_name || undefined,
                    expiresAt: visitRequest.valid_until,
                    warnings: [t('security.qrScanner.visitExpired', 'Visit has expired')],
                  },
                };
              }
            }

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
                  warnings: [t('security.qrScanner.qrAlreadyUsed', 'QR code already used')],
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
              data: { name: gateEntry.person_name || undefined },
            };
          }

          return {
            type: 'visitor',
            status: 'not_found',
            rawCode: code,
            data: { warnings: [t('security.qrScanner.visitorNotFound', 'Visitor not found')] },
          };
        } catch (error) {
          console.error('[GateQR] Online verification failed:', error);
        }
      }
      
      const cachedVisitor = await gateOfflineCache.getVisitorVerification(visitorToken) as { 
        id: string; full_name: string; company_name?: string; qr_used_at?: string; _cachedAt?: number;
      } | null;
      
      if (cachedVisitor) {
        return {
          type: 'visitor',
          id: cachedVisitor.id,
          status: cachedVisitor.qr_used_at ? 'used' : 'valid',
          rawCode: code,
          isOfflineCached: true,
          cachedAt: cachedVisitor._cachedAt,
          data: {
            name: cachedVisitor.full_name,
            company: cachedVisitor.company_name || undefined,
            warnings: cachedVisitor.qr_used_at 
              ? [t('security.qrScanner.qrAlreadyUsed', 'QR already used')]
              : [t('security.qrScanner.offlineCachedData', 'Cached data (offline)')],
          },
        };
      }
      
      return {
        type: 'visitor',
        status: 'not_found',
        rawCode: code,
        data: { warnings: [isOnline ? t('security.qrScanner.visitorNotFound', 'Visitor not found') : t('security.qrScanner.offlineNoCache', 'Offline - not cached')] },
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
                data: { warnings: errorMessages.length > 0 ? errorMessages : [error?.message || 'Invalid QR'] },
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
            console.error('[GateQR] Worker verification failed:', error);
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
              warnings: [...(cachedWorker.warnings || []), t('security.qrScanner.offlineCachedData', 'Cached (offline)')],
            },
          };
        }
        
        return {
          type: 'worker',
          status: 'not_found',
          rawCode: code,
          data: { warnings: [isOnline ? t('security.qrScanner.workerNotFound', 'Worker not found') : t('security.qrScanner.offlineNoCache', 'Offline - not cached')] },
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
          data: { name: visitor.person_name || undefined },
        };
      }

      return {
        type: 'visitor',
        status: 'not_found',
        rawCode: code,
        data: { warnings: [t('security.qrScanner.visitorNotFound', 'Visitor not found')] },
      };
    }

    return {
      type: 'unknown',
      status: 'not_found',
      rawCode: code,
      data: { warnings: [t('security.qrScanner.unknownFormat', 'Unknown QR format')] },
    };
  };

  const handleScan = useCallback(async (decodedText: string) => {
    if (isVerifying) return;
    
    if (navigator.vibrate) {
      navigator.vibrate(50);
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

  const handleUseAndClose = useCallback(() => {
    if (scanResult) {
      onScanResult(scanResult);
      handleClose();
    }
  }, [scanResult, onScanResult, handleClose]);

  // Log entry to database and immediately start scanning for next QR code
  const handleLogAndScanNext = useCallback(async () => {
    if (!scanResult || !profile?.tenant_id) return;
    
    // Only log entry for valid status
    if (scanResult.status === 'valid') {
      setIsLogging(true);
      try {
        const entryType = scanResult.type === 'worker' ? 'worker' : 'visitor';
        const entryTime = new Date().toISOString();
        
        // Generate unique visit reference
        const visitReference = `VIS-${Date.now().toString(36).toUpperCase()}`;
        
        // Check for existing active entry to prevent duplicates
        const { data: existingEntry } = await supabase
          .from('gate_entry_logs')
          .select('id, entry_time')
          .eq('tenant_id', profile.tenant_id)
          .eq('entry_type', entryType)
          .ilike('person_name', `%${scanResult.data?.name || ''}%`)
          .is('exit_time', null)
          .is('deleted_at', null)
          .order('entry_time', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingEntry) {
          toast({ 
            title: t('security.gate.alreadyOnSite', 'Already On Site'),
            description: t('security.gate.alreadyOnSiteDesc', 'This person is already on-site'),
            variant: 'default'
          });
        } else {
          // Fetch host info for visitor notifications
          let hostPhone: string | null = null;
          
          if (scanResult.type === 'visitor' && scanResult.id) {
            // First check visitor record for host_phone
            const { data: visitor } = await supabase
              .from('visitors')
              .select('host_phone, host_id')
              .eq('id', scanResult.id)
              .single();
            
            hostPhone = visitor?.host_phone || null;
            
            // If no host_phone, try to get from host_id profile
            if (!hostPhone && visitor?.host_id) {
              const { data: hostProfile } = await supabase
                .from('profiles')
                .select('phone_number')
                .eq('id', visitor.host_id)
                .single();
              hostPhone = hostProfile?.phone_number || null;
            }
            
            // If still no host phone, check visit_requests
            if (!hostPhone) {
              const { data: visitRequest } = await supabase
                .from('visit_requests')
                .select('host_id, profiles:host_id(phone_number)')
                .eq('visitor_id', scanResult.id)
                .eq('status', 'approved')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
              
              if (visitRequest?.profiles) {
                const hostData = visitRequest.profiles as { phone_number?: string };
                hostPhone = hostData?.phone_number || null;
              }
            }
          }
          
          // Create gate entry log with visit reference
          const { data: newEntry, error } = await supabase
            .from('gate_entry_logs')
            .insert({
              tenant_id: profile.tenant_id,
              person_name: scanResult.data?.name || 'Unknown',
              entry_type: entryType,
              entry_time: entryTime,
              guard_id: user?.id,
              visitor_id: scanResult.type === 'visitor' ? scanResult.id : null,
              visit_reference: visitReference,
              host_mobile: hostPhone,
            })
            .select('id')
            .single();

          if (error) throw error;

          // Mark visitor QR as used
          if (scanResult.type === 'visitor' && scanResult.id) {
            await supabase
              .from('visitors')
              .update({ qr_used_at: entryTime })
              .eq('id', scanResult.id);
          }

          toast({ 
            title: t('security.gate.entryRecorded', 'Entry recorded successfully'),
          });

          // Send host arrival notification (async, non-blocking)
          if (hostPhone && newEntry?.id && scanResult.type === 'visitor') {
            console.log('[GateQR] Sending host arrival notification to:', hostPhone);
            hostArrivalNotification.mutate({
              entryId: newEntry.id,
              visitorName: scanResult.data?.name || 'Visitor',
              hostPhone,
              visitReference,
              entryTime,
              tenantId: profile.tenant_id,
            });
          } else if (scanResult.type === 'visitor' && !hostPhone) {
            console.log('[GateQR] No host phone available, skipping notification');
          }

          // Invalidate queries to refresh active visitors lists
          queryClient.invalidateQueries({ queryKey: ['gate-entries'] });
          queryClient.invalidateQueries({ queryKey: ['visit-requests'] });
        }
      } catch (error) {
        console.error('Failed to log entry:', error);
        toast({ 
          title: t('security.gate.entryFailed', 'Failed to record entry'),
          variant: 'destructive'
        });
      } finally {
        setIsLogging(false);
      }
    }

    // Pass result to parent
    onScanResult(scanResult);
    
    // Start scanning for next QR code
    setScanResult(null);
    setIsVerifying(false);
    setIsScannerActive(true);
    scannerKeyRef.current += 1;
  }, [scanResult, onScanResult, profile?.tenant_id, user?.id, queryClient, toast, t, hostArrivalNotification]);

  const getStatusConfig = (status: QRScanResult['status']) => {
    switch (status) {
      case 'valid':
        return { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-600', label: t('security.qrScanner.valid', 'VALID') };
      case 'expired':
        return { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-600', label: t('security.qrScanner.expired', 'EXPIRED') };
      case 'revoked':
        return { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive', label: t('security.qrScanner.revoked', 'REVOKED') };
      case 'used':
        return { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-600', label: t('security.qrScanner.used', 'USED') };
      default:
        return { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive', label: t('security.qrScanner.invalid', 'INVALID') };
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden rounded-lg border-2 border-border bg-background max-h-[90vh] overflow-y-auto">
        {/* Header - Military/Formal Style */}
        <DialogHeader className="p-4 pb-3 border-b-2 border-border bg-muted/50">
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded bg-primary/10 border border-primary/30">
              <QrCode className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-semibold uppercase tracking-wide">
                {t('security.qrScanner.scanQRCode', 'Scan QR Code')}
              </span>
              <span className="text-xs text-muted-foreground font-normal">
                {scanResult 
                  ? t('security.qrScanner.scanComplete', 'Scan Complete') 
                  : t('security.qrScanner.workersAndVisitors', 'Workers & Visitors')}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Scanner Area */}
        <div className="p-3">
          {isScannerActive && !isVerifying && (
            <CameraScanner
              key={scannerKeyRef.current}
              containerId="gate-qr-scanner"
              isOpen={open && isScannerActive}
              onScan={handleScan}
              qrboxSize={{ width: 220, height: 220 }}
              aspectRatio={1.0}
              showCameraSwitch={true}
              showTorchToggle={true}
            />
          )}

          {/* Verifying State */}
          {isVerifying && (
            <div className="flex flex-col items-center justify-center gap-4 p-6 min-h-[240px] bg-muted/50 rounded-lg border-2 border-border">
              <div className="p-4 rounded bg-primary/10 border border-primary/30">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold uppercase tracking-wide">{t('security.qrScanner.verifying', 'Verifying')}</p>
                <p className="text-xs text-muted-foreground">{t('security.qrScanner.pleaseWait', 'Please wait')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Result Display */}
        {scanResult && !isVerifying && (
          <div className="px-3 pb-3 space-y-3">
            {/* Status Card */}
            <div className={cn("p-3 rounded-lg border-2", getStatusConfig(scanResult.status).bg, getStatusConfig(scanResult.status).border)}>
              <div className="flex items-start gap-3">
                {/* Status Icon */}
                <div className={cn("p-2 rounded", getStatusConfig(scanResult.status).bg)}>
                  {(() => {
                    const Icon = getStatusConfig(scanResult.status).icon;
                    return <Icon className={cn("h-6 w-6", getStatusConfig(scanResult.status).color)} />;
                  })()}
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant="outline" className={cn("text-xs font-bold uppercase tracking-wide", getStatusConfig(scanResult.status).color, getStatusConfig(scanResult.status).border)}>
                      {scanResult.type === 'worker' && <HardHat className="h-3 w-3 me-1" />}
                      {scanResult.type === 'visitor' && <User className="h-3 w-3 me-1" />}
                      {getStatusConfig(scanResult.status).label}
                    </Badge>
                    
                    {scanResult.isOfflineCached && (
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-600">
                        <WifiOff className="h-3 w-3 me-1" />
                        CACHED
                      </Badge>
                    )}
                  </div>
                  
                  {scanResult.data?.name && (
                    <p className="text-base font-bold truncate">{scanResult.data.name}</p>
                  )}
                  
                  {scanResult.data?.company && (
                    <p className="text-sm text-muted-foreground truncate">{scanResult.data.company}</p>
                  )}
                  
                  {scanResult.data?.projectName && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <ShieldCheck className="h-3 w-3" />
                      <span className="truncate">{scanResult.data.projectName}</span>
                    </p>
                  )}
                </div>
              </div>
              
              {/* Warnings */}
              {scanResult.data?.warnings && scanResult.data.warnings.length > 0 && (
                <div className="mt-2 space-y-1">
                  {scanResult.data.warnings.map((warning, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 rounded bg-destructive/10 border border-destructive/20 text-xs">
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0 mt-0.5" />
                      <span className="text-destructive">{warning}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="gap-2 h-10" onClick={handleScanNext}>
                <RotateCcw className="h-4 w-4" />
                {t('scanner.scanNext', 'Scan Next')}
              </Button>
              
              {scanResult.status === 'valid' ? (
                <Button 
                  className="gap-2 h-10 bg-green-600 hover:bg-green-700 text-white" 
                  onClick={handleLogAndScanNext}
                  disabled={isLogging}
                >
                  {isLogging ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                  {t('scanner.logEntry', 'Log Entry')}
                </Button>
              ) : (
                <Button variant="secondary" className="gap-2 h-10" onClick={handleLogAndScanNext}>
                  <CheckCircle2 className="h-4 w-4" />
                  {t('scanner.acknowledge', 'Acknowledge')}
                </Button>
              )}
            </div>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
