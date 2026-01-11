import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { 
  Truck, QrCode, Package, Clock, CheckCircle2, XCircle, 
  AlertTriangle, LogIn, LogOut, Phone, Car, Hash, ShieldAlert
} from 'lucide-react';
import { ScannerDialog } from '@/components/ui/scanner-dialog';
import { useGuardGateAction, useVerifyPassByReference } from '@/hooks/contractor-management/use-gate-pass-guard-actions';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles } from '@/hooks/use-user-roles';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MaterialPassResult {
  is_valid: boolean;
  pass?: {
    id: string;
    reference_number: string;
    pass_type: string;
    material_description: string;
    quantity: string | null;
    vehicle_plate: string | null;
    driver_name: string | null;
    driver_mobile: string | null;
    pass_date: string;
    time_window_start: string | null;
    time_window_end: string | null;
    status: string;
    entry_time: string | null;
    exit_time: string | null;
    project_name: string;
    company_name: string;
  };
  items?: Array<{
    item_name: string;
    description: string | null;
    quantity: string | null;
    unit: string | null;
  }>;
  errors: string[];
  warnings: string[];
}

export function MaterialPassVerificationPanel() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { hasRole } = useUserRoles();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [result, setResult] = useState<MaterialPassResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [manualRef, setManualRef] = useState('');
  const [actionRecorded, setActionRecorded] = useState<'entry' | 'exit' | null>(null);

  const guardAction = useGuardGateAction();
  const verifyByRef = useVerifyPassByReference();

  // Role check: Only security guards can use this panel
  const isGuard = hasRole('security_guard');

  // Auto-record action helper
  const autoRecordAction = async (passData: MaterialPassResult['pass'], validationMethod: 'qr_scan' | 'manual_entry') => {
    if (!passData) return;

    // Determine action based on current state
    const action: 'entry' | 'exit' = passData.entry_time ? 'exit' : 'entry';

    try {
      await guardAction.mutateAsync({
        passId: passData.id,
        passReference: passData.reference_number,
        action,
        validationMethod,
        metadata: {
          vehicle_plate: passData.vehicle_plate,
          pass_date: passData.pass_date,
        },
      });

      setActionRecorded(action);

      // Update local result to reflect the action
      setResult(prev => {
        if (!prev || !prev.pass) return prev;
        return {
          ...prev,
          pass: {
            ...prev.pass,
            entry_time: action === 'entry' ? new Date().toISOString() : prev.pass.entry_time,
            exit_time: action === 'exit' ? new Date().toISOString() : prev.pass.exit_time,
          },
        };
      });
    } catch (error) {
      // Error already handled by mutation's onError
      console.error('Auto-action failed:', error);
    }
  };

  const handleScan = async (code: string) => {
    setScannerOpen(false);
    setIsLoading(true);
    setResult(null);
    setActionRecorded(null);

    try {
      // Extract token from MGP: prefix
      const token = code.startsWith('MGP:') ? code.replace('MGP:', '') : code;

      const { data, error } = await supabase.functions.invoke('validate-material-qr', {
        body: {
          qr_token: token,
          tenant_id: profile?.tenant_id,
        },
      });

      if (error) throw error;
      setResult(data);

      // AUTO-ACTION: If valid and guard, automatically record entry/exit
      if (data.is_valid && data.pass && isGuard) {
        // Check if already completed
        if (data.pass.entry_time && data.pass.exit_time) {
          toast.info(t('security.materialPass.passCompleted', 'Pass already completed'));
        } else {
          await autoRecordAction(data.pass, 'qr_scan');
        }
      }
    } catch (error) {
      console.error('Material QR validation error:', error);
      setResult({
        is_valid: false,
        errors: ['Failed to validate gate pass QR code'],
        warnings: [],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualVerify = async () => {
    if (!manualRef.trim()) {
      toast.error(t('security.materialPass.enterReference', 'Please enter a gate pass number'));
      return;
    }

    setIsLoading(true);
    setResult(null);
    setActionRecorded(null);

    try {
      const data = await verifyByRef.mutateAsync(manualRef.trim());
      setResult(data as MaterialPassResult);

      // AUTO-ACTION: If valid and guard, automatically record entry/exit
      if (data.is_valid && data.pass && isGuard) {
        if (data.pass.entry_time && data.pass.exit_time) {
          toast.info(t('security.materialPass.passCompleted', 'Pass already completed'));
        } else {
          await autoRecordAction(data.pass, 'manual_entry');
        }
      }
    } catch (error: any) {
      setResult({
        is_valid: false,
        errors: [error.message || 'Failed to verify gate pass'],
        warnings: [],
      });
    } finally {
      setIsLoading(false);
      setManualRef('');
    }
  };

  const clearResult = () => {
    setResult(null);
    setActionRecorded(null);
  };

  // ACCESS DENIED: Show restricted message for non-guards
  if (!isGuard) {
    return (
      <Card className="border-destructive/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-destructive">
            <ShieldAlert className="h-5 w-5" />
            {t('security.materialPass.accessDenied', 'Access Restricted')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('security.materialPass.guardOnlyMessage', 'Only security guards can record gate entry and exit.')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Truck className="h-5 w-5 text-primary" />
          {t('security.materialPass.title', 'Material Gate Pass')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scan Button */}
        <Button
          onClick={() => setScannerOpen(true)}
          className="w-full gap-2"
          size="lg"
          disabled={isLoading}
        >
          <QrCode className="h-5 w-5" />
          {t('security.materialPass.scanQR', 'Scan Gate Pass QR')}
        </Button>

        {/* Manual Reference Entry */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Hash className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('security.materialPass.manualEntryPlaceholder', 'e.g. GP-2026-00123')}
              value={manualRef}
              onChange={(e) => setManualRef(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleManualVerify()}
              className="ps-9 font-mono"
              disabled={isLoading}
            />
          </div>
          <Button
            onClick={handleManualVerify}
            variant="outline"
            disabled={isLoading || !manualRef.trim()}
          >
            {t('security.materialPass.verify', 'Verify')}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {t('security.materialPass.autoActionHint', 'Entry/Exit is recorded automatically after verification')}
        </p>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="text-sm text-muted-foreground mt-2">
              {t('common.verifying', 'Verifying...')}
            </p>
          </div>
        )}

        {/* Result Display */}
        {result && !isLoading && (
          <div className="space-y-4">
            {/* Status Banner */}
            <div
              className={cn(
                'p-4 rounded-lg flex items-center gap-3',
                result.is_valid 
                  ? 'bg-green-500/10 border border-green-500/30' 
                  : 'bg-destructive/10 border border-destructive/30'
              )}
            >
              {result.is_valid ? (
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400 flex-shrink-0" />
              ) : (
                <XCircle className="h-8 w-8 text-destructive flex-shrink-0" />
              )}
              <div>
                <p className={cn(
                  'font-bold text-lg',
                  result.is_valid ? 'text-green-700 dark:text-green-300' : 'text-destructive'
                )}>
                  {result.is_valid 
                    ? t('security.materialPass.valid', 'VALID PASS')
                    : t('security.materialPass.invalid', 'INVALID PASS')
                  }
                </p>
                {result.pass && (
                  <p className="text-sm font-mono">{result.pass.reference_number}</p>
                )}
              </div>
            </div>

            {/* Action Recorded Confirmation */}
            {actionRecorded && (
              <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/40 flex items-center gap-2">
                {actionRecorded === 'entry' ? (
                  <>
                    <LogIn className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="font-medium text-green-700 dark:text-green-300">
                      {t('security.materialPass.autoEntryRecorded', 'Entry recorded automatically')}
                    </span>
                  </>
                ) : (
                  <>
                    <LogOut className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="font-medium text-green-700 dark:text-green-300">
                      {t('security.materialPass.autoExitRecorded', 'Exit recorded - Pass completed')}
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Errors */}
            {result.errors.length > 0 && (
              <div className="space-y-1">
                {result.errors.map((error, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-destructive">
                    <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    {error}
                  </div>
                ))}
              </div>
            )}

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div className="space-y-1">
                {result.warnings.map((warning, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    {warning}
                  </div>
                ))}
              </div>
            )}

            {/* Pass Details */}
            {result.pass && (
              <div className="space-y-3">
                <Separator />
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">
                      {t('security.materialPass.type', 'Type')}
                    </p>
                    <Badge variant="outline" className="mt-1">
                      {result.pass.pass_type === 'incoming' ? '📥 Incoming' : '📤 Outgoing'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">
                      {t('security.materialPass.project', 'Project')}
                    </p>
                    <p className="font-medium">{result.pass.project_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">
                      {t('security.materialPass.company', 'Company')}
                    </p>
                    <p className="font-medium">{result.pass.company_name}</p>
                  </div>
                  {result.pass.time_window_start && result.pass.time_window_end && (
                    <div>
                      <p className="text-muted-foreground text-xs flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {t('security.materialPass.timeWindow', 'Time Window')}
                      </p>
                      <p className="font-medium">
                        {result.pass.time_window_start} - {result.pass.time_window_end}
                      </p>
                    </div>
                  )}
                </div>

                {/* Vehicle & Driver */}
                {(result.pass.vehicle_plate || result.pass.driver_name) && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {result.pass.vehicle_plate && (
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono font-bold">{result.pass.vehicle_plate}</span>
                        </div>
                      )}
                      {result.pass.driver_name && (
                        <div>
                          <p className="text-muted-foreground text-xs">
                            {t('security.materialPass.driver', 'Driver')}
                          </p>
                          <p className="font-medium">{result.pass.driver_name}</p>
                          {result.pass.driver_mobile && (
                            <a 
                              href={`tel:${result.pass.driver_mobile}`}
                              className="text-xs text-primary flex items-center gap-1"
                            >
                              <Phone className="h-3 w-3" />
                              {result.pass.driver_mobile}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Items */}
                {result.items && result.items.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-muted-foreground text-xs mb-2 flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {t('security.materialPass.items', 'Items')}
                      </p>
                      <div className="space-y-1">
                        {result.items.map((item, i) => (
                          <div key={i} className="text-sm bg-muted/50 rounded px-2 py-1">
                            <span className="font-medium">{item.item_name}</span>
                            {item.quantity && (
                              <span className="text-muted-foreground ms-2">
                                ({item.quantity}{item.unit && ` ${item.unit}`})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Entry/Exit Status (read-only, no buttons) */}
                {result.pass.entry_time && !actionRecorded && (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <LogIn className="h-4 w-4" />
                    {t('security.materialPass.entryRecorded', 'Entry recorded at')}{' '}
                    {new Date(result.pass.entry_time).toLocaleTimeString()}
                  </div>
                )}

                {result.pass.exit_time && !actionRecorded && (
                  <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                    <LogOut className="h-4 w-4" />
                    {t('security.materialPass.exitRecorded', 'Exit recorded at')}{' '}
                    {new Date(result.pass.exit_time).toLocaleTimeString()}
                  </div>
                )}

                {/* NO MANUAL BUTTONS - Action is automatic after scan */}

                <Button variant="ghost" onClick={clearResult} className="w-full">
                  {t('common.clear', 'Clear')}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Scanner Dialog */}
        <ScannerDialog
          open={scannerOpen}
          onOpenChange={setScannerOpen}
          onScan={handleScan}
          title={t('security.materialPass.scanTitle', 'Scan Gate Pass QR')}
          description={t('security.materialPass.scanDescription', 'Point camera at material gate pass QR code')}
          icon={<Truck className="h-5 w-5 text-primary" />}
          containerId="material-qr-scanner"
        />
      </CardContent>
    </Card>
  );
}
