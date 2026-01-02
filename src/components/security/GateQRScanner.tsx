import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, XCircle, AlertTriangle, User, HardHat, Loader2, QrCode, ShieldCheck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ScannerDialog } from '@/components/ui/scanner-dialog';

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

export function GateQRScanner({ open, onOpenChange, onScanResult, expectedType }: GateQRScannerProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(false);
  const [scanResult, setScanResult] = useState<QRScanResult | null>(null);

  const verifyQRCode = async (code: string): Promise<QRScanResult> => {
    const { data: userData } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', userData.user?.id || '')
      .single();
    const tenantId = profile?.tenant_id;

    // Handle VISITOR: prefix
    if (code.startsWith('VISITOR:')) {
      const visitorToken = code.replace('VISITOR:', '');
      
      const { data: visitor } = await supabase
        .from('visitors')
        .select('id, full_name, company_name, qr_code_token, qr_used_at')
        .eq('qr_code_token', visitorToken)
        .is('deleted_at', null)
        .maybeSingle();

      if (visitor) {
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
    }

    // Handle WORKER: prefix
    if (code.startsWith('WORKER:')) {
      const parts = code.split(':');
      if (parts.length >= 2) {
        const qrToken = parts[1];
        
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
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }

    setIsVerifying(true);
    setScanResult(null);

    try {
      const parsedResult = await verifyQRCode(decodedText);
      setScanResult(parsedResult);
      
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
  }, [onScanResult]);

  const handleClose = useCallback(() => {
    setScanResult(null);
    setIsVerifying(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleRescan = useCallback(() => {
    setScanResult(null);
    setIsVerifying(false);
  }, []);

  const handleUseResult = useCallback(() => {
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

  // Custom content when we have a result or are verifying
  if (isVerifying || scanResult) {
    return (
      <ScannerDialog
        open={open}
        onOpenChange={handleClose}
        onScan={handleScan}
        title={expectedType === 'worker' 
          ? t('security.qrScanner.scanWorkerQR', 'Scan Worker QR')
          : t('security.qrScanner.scanVisitorQR', 'Scan Visitor QR')
        }
        description={expectedType === 'worker'
          ? t('security.qrScanner.pointAtWorkerQR', 'Point camera at worker QR code')
          : t('security.qrScanner.pointAtVisitorQR', 'Point camera at visitor QR code')
        }
        icon={expectedType === 'worker' 
          ? <HardHat className="h-5 w-5 text-primary" />
          : <User className="h-5 w-5 text-primary" />
        }
        containerId="gate-qr-scanner"
        className={cn(
          scanResult && "sm:max-w-md"
        )}
      >
        {/* Verification Overlay */}
        {isVerifying && (
          <div className="flex flex-col items-center justify-center gap-6 p-8 min-h-[320px]">
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

        {/* Result Display */}
        {scanResult && !isVerifying && (
          <div className="flex flex-col items-center justify-center gap-4 p-6 min-h-[320px]">
            {/* Status Icon with Animation */}
            <div className="relative">
              {scanResult.status === 'valid' ? (
                <>
                  <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse" />
                  <div className="relative p-5 rounded-full bg-gradient-to-br from-green-500/20 to-green-500/10 border-2 border-green-500/30 animate-scale-in">
                    <CheckCircle2 className="h-12 w-12 text-green-500" />
                  </div>
                </>
              ) : (
                <>
                  <div className={cn("absolute inset-0 rounded-full blur-xl animate-pulse", getStatusConfig(scanResult.status).bgColor)} />
                  <div className={cn(
                    "relative p-5 rounded-full border-2 animate-scale-in",
                    getStatusConfig(scanResult.status).bgColor,
                    getStatusConfig(scanResult.status).borderColor
                  )}>
                    {(() => {
                      const Icon = getStatusConfig(scanResult.status).icon;
                      return <Icon className={cn("h-12 w-12", getStatusConfig(scanResult.status).color)} />;
                    })()}
                  </div>
                </>
              )}
            </div>

            {/* Status Badge */}
            <Badge 
              variant={scanResult.status === 'valid' ? 'default' : 'destructive'}
              className={cn(
                "text-base px-4 py-1.5 animate-fade-in",
                scanResult.status === 'valid' && "bg-green-600 hover:bg-green-700",
                scanResult.status === 'expired' && "bg-amber-600 hover:bg-amber-700",
                scanResult.status === 'used' && "bg-amber-600 hover:bg-amber-700"
              )}
            >
              {scanResult.type === 'worker' && <HardHat className="h-4 w-4 me-2" />}
              {scanResult.type === 'visitor' && <User className="h-4 w-4 me-2" />}
              {getStatusConfig(scanResult.status).label}
            </Badge>

            {/* Person Info */}
            {scanResult.data?.name && (
              <div className="text-center space-y-1 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <p className="text-xl font-bold">{scanResult.data.name}</p>
                {scanResult.data.company && (
                  <p className="text-sm text-muted-foreground">{scanResult.data.company}</p>
                )}
                {scanResult.data.projectName && (
                  <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    {scanResult.data.projectName}
                  </p>
                )}
              </div>
            )}

            {/* Warnings */}
            {scanResult.data?.warnings && scanResult.data.warnings.length > 0 && (
              <div className="w-full max-w-xs space-y-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                {scanResult.data.warnings.map((warning, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm"
                  >
                    <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                    <span className="text-destructive">{warning}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 w-full max-w-xs mt-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <Button 
                variant="outline" 
                className="flex-1 rounded-xl"
                onClick={handleRescan}
              >
                <QrCode className="h-4 w-4 me-2" />
                {t('scanner.scanAgain', 'Scan Again')}
              </Button>
              {scanResult.status !== 'valid' && (
                <Button 
                  className="flex-1 rounded-xl"
                  onClick={handleUseResult}
                >
                  {t('scanner.useResult', 'Use Result')}
                </Button>
              )}
            </div>
          </div>
        )}
      </ScannerDialog>
    );
  }

  // Normal scanner view
  return (
    <ScannerDialog
      open={open}
      onOpenChange={handleClose}
      onScan={handleScan}
      title={expectedType === 'worker' 
        ? t('security.qrScanner.scanWorkerQR', 'Scan Worker QR')
        : t('security.qrScanner.scanVisitorQR', 'Scan Visitor QR')
      }
      description={expectedType === 'worker'
        ? t('security.qrScanner.pointAtWorkerQR', 'Point camera at worker QR code')
        : t('security.qrScanner.pointAtVisitorQR', 'Point camera at visitor QR code')
      }
      icon={expectedType === 'worker' 
        ? <HardHat className="h-5 w-5 text-primary" />
        : <User className="h-5 w-5 text-primary" />
      }
      containerId="gate-qr-scanner"
    />
  );
}
