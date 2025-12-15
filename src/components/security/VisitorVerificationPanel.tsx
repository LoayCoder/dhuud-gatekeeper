import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, QrCode, UserCheck, UserX, AlertTriangle, LogIn, LogOut, Bell, WifiOff, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useGateEntries, useCreateGateEntry, useRecordExit } from '@/hooks/use-gate-entries';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { GateQRScanner, QRScanResult } from './GateQRScanner';
import { gateOfflineCache } from '@/lib/gate-offline-cache';

interface VerificationResult {
  status: 'granted' | 'denied' | 'warning';
  name: string;
  company?: string;
  nationalId?: string;
  host?: string;
  hostMobile?: string;
  purpose?: string;
  warnings?: string[];
  entryId?: string;
  isOnSite?: boolean;
  type?: 'visitor' | 'worker';
}

export function VisitorVerificationPanel() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { toast } = useToast();
  const { isOnline } = useNetworkStatus();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [notifyHost, setNotifyHost] = useState(true);
  const [isCachedData, setIsCachedData] = useState(false);
  
  const createEntry = useCreateGateEntry();
  const recordExit = useRecordExit();

  const handleSearch = async () => {
    if (!searchQuery.trim() || !profile?.tenant_id) return;
    
    setIsSearching(true);
    setVerificationResult(null);

    try {
      // Search in gate entry logs for active entries
      const { data: activeEntry } = await supabase
        .from('gate_entry_logs')
        .select('id, person_name, purpose, destination_name, entry_time, exit_time, mobile_number')
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .or(`person_name.ilike.%${searchQuery}%,mobile_number.ilike.%${searchQuery}%`)
        .order('entry_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Check blacklist
      const { data: blacklistMatch } = await supabase
        .from('security_blacklist')
        .select('id, full_name, reason')
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .or(`full_name.ilike.%${searchQuery}%,national_id.ilike.%${searchQuery}%`)
        .limit(1)
        .maybeSingle();

      if (blacklistMatch) {
        setVerificationResult({
          status: 'denied',
          name: blacklistMatch.full_name,
          warnings: [blacklistMatch.reason || 'Person is on security blacklist'],
        });
        return;
      }

      if (activeEntry) {
        const isOnSite = !activeEntry.exit_time;
        setVerificationResult({
          status: 'granted',
          name: activeEntry.person_name || 'Unknown',
          purpose: activeEntry.purpose || undefined,
          host: activeEntry.destination_name || undefined,
          entryId: activeEntry.id,
          isOnSite,
        });
      } else {
        // No existing entry found, show as new visitor
        setVerificationResult({
          status: 'warning',
          name: searchQuery,
          warnings: ['No existing record found. Create new entry?'],
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({ 
        title: t('common.error', 'Error'), 
        description: t('security.gateDashboard.searchFailed', 'Search failed'),
        variant: 'destructive' 
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleLogEntry = async () => {
    if (!verificationResult) return;
    
    const entryData = {
      person_name: verificationResult.name,
      entry_type: verificationResult.type === 'worker' ? 'worker' : 'visitor',
      entry_time: new Date().toISOString(),
      purpose: verificationResult.purpose,
      destination_name: verificationResult.host,
      host_mobile: verificationResult.hostMobile,
      notify_host: notifyHost,
    };

    createEntry.mutate(entryData, {
      onSuccess: async (data) => {
        setVerificationResult(prev => prev ? { ...prev, isOnSite: true, entryId: data?.id } : null);
        toast({ title: t('security.gate.entryRecorded', 'Entry recorded successfully') });
        
        // Send host notification if enabled
        if (notifyHost && verificationResult.hostMobile && data?.id) {
          try {
            await supabase.functions.invoke('send-gate-whatsapp', {
              body: {
                notification_type: 'host_notification',
                host_mobile: verificationResult.hostMobile,
                visitor_name: verificationResult.name,
                tenant_id: profile?.tenant_id,
                entry_id: data.id,
                language: 'en',
              },
            });
            toast({ 
              title: t('security.gate.hostNotified', 'Host notified'),
              description: t('security.gate.hostNotifiedDesc', 'WhatsApp notification sent to host'),
            });
          } catch (error) {
            console.error('Failed to notify host:', error);
          }
        }
      }
    });
  };

  const handleRecordExit = () => {
    if (!verificationResult?.entryId) return;
    
    recordExit.mutate(verificationResult.entryId, {
      onSuccess: () => {
        setVerificationResult(prev => prev ? { ...prev, isOnSite: false } : null);
        toast({ title: t('security.gate.exitRecorded', 'Exit recorded successfully') });
      }
    });
  };

  // Handle QR scan result
  const handleQRScanResult = (result: QRScanResult) => {
    if (result.status === 'valid' && result.data?.name) {
      setVerificationResult({
        status: 'granted',
        name: result.data.name,
        company: result.data.company,
        type: result.type === 'worker' ? 'worker' : 'visitor',
        warnings: result.data.warnings,
      });
      setSearchQuery(result.data.name);
    } else if (result.status === 'not_found') {
      setVerificationResult({
        status: 'warning',
        name: result.rawCode,
        warnings: [t('security.qrScanner.notFound', 'No record found for this QR code')],
      });
      setSearchQuery(result.rawCode);
    } else {
      setVerificationResult({
        status: 'denied',
        name: result.data?.name || result.rawCode,
        warnings: result.data?.warnings || [t('security.qrScanner.invalid', 'Invalid or expired QR code')],
      });
    }
  };

  const getStatusConfig = (status: VerificationResult['status']) => {
    switch (status) {
      case 'granted':
        return {
          icon: UserCheck,
          color: 'text-green-600 dark:text-green-400',
          bg: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800',
          label: t('security.gateDashboard.accessGranted', 'Access Granted'),
        };
      case 'denied':
        return {
          icon: UserX,
          color: 'text-destructive',
          bg: 'bg-destructive/10 border-destructive/30',
          label: t('security.gateDashboard.accessDenied', 'Access Denied'),
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          color: 'text-warning',
          bg: 'bg-warning/10 border-warning/30',
          label: t('security.gateDashboard.requiresAttention', 'Requires Attention'),
        };
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Search className="h-4 w-4" />
          {t('security.gateDashboard.verifyVisitor', 'Verify Visitor')}
          {!isOnline && (
            <Badge variant="outline" className="ms-auto text-warning">
              <WifiOff className="h-3 w-3 me-1" />
              {t('common.offline', 'Offline')}
            </Badge>
          )}
          {isCachedData && (
            <Badge variant="secondary" className="ms-2">
              {t('common.cached', 'Cached')}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="flex gap-2">
          <Input
            placeholder={t('security.gateDashboard.searchPlaceholder', 'Enter name, ID, or phone...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            title={t('security.gateDashboard.scanQR', 'Scan QR')}
            onClick={() => setIsQRScannerOpen(true)}
          >
            <QrCode className="h-4 w-4" />
          </Button>
        </div>

        {/* Verification Result */}
        {verificationResult && (
          <Card className={cn('border-2', getStatusConfig(verificationResult.status).bg)}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-lg">
                    {verificationResult.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {(() => {
                      const config = getStatusConfig(verificationResult.status);
                      const Icon = config.icon;
                      return (
                        <>
                          <Icon className={cn('h-5 w-5', config.color)} />
                          <span className={cn('font-semibold', config.color)}>
                            {config.label}
                          </span>
                        </>
                      );
                    })()}
                    {verificationResult.isOnSite && (
                      <Badge variant="secondary" className="ms-auto">
                        {t('security.gateDashboard.onSite', 'On Site')}
                      </Badge>
                    )}
                  </div>
                  
                  <h3 className="font-semibold text-lg">{verificationResult.name}</h3>
                  
                  {verificationResult.company && (
                    <p className="text-sm text-muted-foreground">{verificationResult.company}</p>
                  )}
                  
                  {verificationResult.host && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">{t('security.gateDashboard.host', 'Host')}: </span>
                      {verificationResult.host}
                    </p>
                  )}
                  
                  {verificationResult.purpose && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">{t('security.gateDashboard.purpose', 'Purpose')}: </span>
                      {verificationResult.purpose}
                    </p>
                  )}

                  {verificationResult.warnings && verificationResult.warnings.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {verificationResult.warnings.map((warning, idx) => (
                        <p key={idx} className="text-sm text-destructive flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {warning}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {verificationResult.status !== 'denied' && (
                <div className="flex flex-col gap-3 mt-4 pt-4 border-t">
                  {/* Notify Host Toggle */}
                  {!verificationResult.isOnSite && (
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="notify-host" 
                        checked={notifyHost}
                        onCheckedChange={(checked) => setNotifyHost(checked === true)}
                      />
                      <Label htmlFor="notify-host" className="text-sm flex items-center gap-1 cursor-pointer">
                        <Bell className="h-3 w-3" />
                        {t('security.gateDashboard.notifyHost', 'Notify host via WhatsApp')}
                      </Label>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    {!verificationResult.isOnSite && (
                      <Button 
                        className="flex-1" 
                        onClick={handleLogEntry}
                        disabled={createEntry.isPending}
                      >
                        {createEntry.isPending ? (
                          <Loader2 className="h-4 w-4 me-2 animate-spin" />
                        ) : (
                          <LogIn className="h-4 w-4 me-2" />
                        )}
                        {t('security.gateDashboard.logEntry', 'Log Entry')}
                      </Button>
                    )}
                    {verificationResult.isOnSite && verificationResult.entryId && (
                      <Button 
                        variant="secondary" 
                        className="flex-1"
                        onClick={handleRecordExit}
                        disabled={recordExit.isPending}
                      >
                        {recordExit.isPending ? (
                          <Loader2 className="h-4 w-4 me-2 animate-spin" />
                        ) : (
                          <LogOut className="h-4 w-4 me-2" />
                        )}
                        {t('security.gateDashboard.recordExit', 'Record Exit')}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* QR Scanner Dialog */}
        <GateQRScanner
          open={isQRScannerOpen}
          onOpenChange={setIsQRScannerOpen}
          onScanResult={handleQRScanResult}
        />
      </CardContent>
    </Card>
  );
}
