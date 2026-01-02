import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, QrCode, UserCheck, UserX, AlertTriangle, LogIn, LogOut, WifiOff, Loader2, HardHat, Building2, GraduationCap, Clock, Calendar, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useCreateGateEntry, useRecordExit } from '@/hooks/use-gate-entries';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays, differenceInMinutes, isPast, isFuture, addDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { GateQRScanner, QRScanResult } from './GateQRScanner';
import { useGateScan } from '@/contexts/GateScanContext';

interface WorkerVerificationResult {
  status: 'granted' | 'denied' | 'warning';
  workerId: string;
  name: string;
  nameAr?: string;
  company?: string;
  project?: string;
  projectId?: string;
  nationality?: string;
  photoUrl?: string;
  mobileNumber?: string;
  nationalId?: string;
  induction?: {
    status: 'completed' | 'pending' | 'expired' | 'not_started';
    videoTitle?: string;
    language?: string;
    expiresAt?: string;
    completedAt?: string;
  };
  qrValidity?: {
    isValid: boolean;
    expiresAt?: string;
  };
  warnings?: string[];
  entryId?: string;
  entryTime?: string;
  isOnSite?: boolean;
}

interface WorkerVerificationPanelProps {
  onSwitchTab?: (tab: string) => void;
}

export function WorkerVerificationPanel({ onSwitchTab }: WorkerVerificationPanelProps) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { toast } = useToast();
  const { isOnline } = useNetworkStatus();
  const { pendingScanResult, setPendingScanResult, clearPendingScanResult } = useGateScan();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [verificationResult, setVerificationResult] = useState<WorkerVerificationResult | null>(null);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  
  const createEntry = useCreateGateEntry();
  const recordExit = useRecordExit();

  // Process pending scan result from context (when redirected from visitor tab)
  useEffect(() => {
    if (pendingScanResult && pendingScanResult.type === 'worker') {
      processWorkerQRResult(pendingScanResult);
      clearPendingScanResult();
    }
  }, [pendingScanResult]);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !profile?.tenant_id) return;
    
    setIsSearching(true);
    setVerificationResult(null);

    try {
      // Search contractor workers by name, national ID, or mobile
      const { data: worker } = await supabase
        .from('contractor_workers')
        .select(`
          id, full_name, full_name_ar, national_id, mobile_number, nationality, photo_path, approval_status,
          company:contractor_companies(id, company_name)
        `)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .or(`full_name.ilike.%${searchQuery}%,national_id.ilike.%${searchQuery}%,mobile_number.ilike.%${searchQuery}%`)
        .limit(1)
        .maybeSingle();

      if (!worker) {
        setVerificationResult({
          status: 'warning',
          workerId: '',
          name: searchQuery,
          warnings: [t('security.workerVerification.noWorkerFound', 'No worker found with this information')],
        });
        return;
      }

      // Get worker's active project assignment
      const { data: assignment } = await supabase
        .from('project_worker_assignments')
        .select(`
          id, project_id,
          project:contractor_projects(id, project_name, status)
        `)
        .eq('worker_id', worker.id)
        .is('deleted_at', null)
        .maybeSingle();

      // Get worker's latest induction status
      const { data: induction } = await supabase
        .from('worker_inductions')
        .select(`
          id, status, acknowledged_at, expires_at, sent_at,
          video:induction_videos(title, title_ar)
        `)
        .eq('worker_id', worker.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get active QR code
      const { data: qrCode } = await supabase
        .from('worker_qr_codes')
        .select('id, valid_until, is_revoked')
        .eq('worker_id', worker.id)
        .eq('is_revoked', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Check for active entry
      const { data: activeEntry } = await supabase
        .from('gate_entry_logs')
        .select('id, entry_time, exit_time')
        .eq('tenant_id', profile.tenant_id)
        .eq('entry_type', 'worker')
        .ilike('person_name', `%${worker.full_name}%`)
        .is('exit_time', null)
        .is('deleted_at', null)
        .order('entry_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Build verification result
      const warnings: string[] = [];
      let status: WorkerVerificationResult['status'] = 'granted';

      // Check approval status
      if (worker.approval_status !== 'approved') {
        warnings.push(t('security.workerVerification.notApproved', 'Worker is not approved'));
        status = 'denied';
      }

      // Check induction status
      let inductionStatus: 'completed' | 'pending' | 'expired' | 'not_started' = 'not_started';
      if (induction) {
        if (induction.status === 'acknowledged') {
          if (induction.expires_at && isPast(new Date(induction.expires_at))) {
            inductionStatus = 'expired';
            warnings.push(t('security.workerVerification.inductionExpired', 'Safety induction has expired'));
            status = status === 'granted' ? 'warning' : status;
          } else {
            inductionStatus = 'completed';
          }
        } else if (induction.status === 'sent') {
          inductionStatus = 'pending';
          warnings.push(t('security.workerVerification.inductionPending', 'Safety induction pending completion'));
          status = status === 'granted' ? 'warning' : status;
        }
      } else {
        warnings.push(t('security.workerVerification.noInduction', 'No safety induction on record'));
        status = status === 'granted' ? 'warning' : status;
      }

      // Check QR validity
      const qrValid = qrCode && !qrCode.is_revoked && (!qrCode.valid_until || isFuture(new Date(qrCode.valid_until)));
      if (!qrValid && worker.approval_status === 'approved') {
        warnings.push(t('security.workerVerification.noValidQR', 'No valid QR code'));
      }

      // Get photo URL if exists
      let photoUrl: string | undefined;
      if (worker.photo_path) {
        const { data: signedUrl } = await supabase.storage
          .from('worker-photos')
          .createSignedUrl(worker.photo_path, 3600);
        photoUrl = signedUrl?.signedUrl;
      }

      const projectData = assignment?.project as { id: string; project_name: string; status: string } | null;
      const companyData = worker.company as { id: string; company_name: string } | null;
      const videoData = induction?.video as { title: string; title_ar: string } | null;

      setVerificationResult({
        status,
        workerId: worker.id,
        name: worker.full_name,
        nameAr: worker.full_name_ar || undefined,
        company: companyData?.company_name,
        project: projectData?.project_name,
        projectId: projectData?.id,
        nationality: worker.nationality || undefined,
        photoUrl,
        mobileNumber: worker.mobile_number,
        nationalId: worker.national_id,
        induction: {
          status: inductionStatus,
          videoTitle: videoData?.title,
          expiresAt: induction?.expires_at || undefined,
          completedAt: induction?.acknowledged_at || undefined,
        },
        qrValidity: {
          isValid: !!qrValid,
          expiresAt: qrCode?.valid_until || undefined,
        },
        warnings: warnings.length > 0 ? warnings : undefined,
        entryId: activeEntry?.id,
        entryTime: activeEntry?.entry_time || undefined,
        isOnSite: !!activeEntry,
      });
    } catch (error) {
      console.error('Worker search error:', error);
      toast({ 
        title: t('common.error', 'Error'), 
        description: t('security.workerVerification.searchFailed', 'Worker search failed'),
        variant: 'destructive' 
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleLogEntry = async () => {
    if (!verificationResult || !profile?.tenant_id) return;
    
    // Check for existing active entry to prevent duplicates
    const { data: existingEntry } = await supabase
      .from('gate_entry_logs')
      .select('id, entry_time')
      .eq('tenant_id', profile.tenant_id)
      .eq('entry_type', 'worker')
      .ilike('person_name', `%${verificationResult.name}%`)
      .is('exit_time', null)
      .is('deleted_at', null)
      .order('entry_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingEntry) {
      // Worker already on site - show warning and update state
      setVerificationResult(prev => prev ? { ...prev, isOnSite: true, entryId: existingEntry.id } : null);
      toast({ 
        title: t('security.gate.alreadyOnSite', 'Already On Site'),
        description: t('security.gate.alreadyOnSiteDesc', 'This worker is already logged as on-site since {time}', { time: format(new Date(existingEntry.entry_time), 'HH:mm') }),
        variant: 'default'
      });
      return;
    }
    
    const entryData = {
      person_name: verificationResult.name,
      entry_type: 'worker' as const,
      entry_time: new Date().toISOString(),
      purpose: `Project: ${verificationResult.project || 'Unknown'}`,
      destination_name: verificationResult.company,
      mobile_number: verificationResult.mobileNumber,
    };

    createEntry.mutate(entryData, {
      onSuccess: (data) => {
        setVerificationResult(prev => prev ? { ...prev, isOnSite: true, entryId: data?.id } : null);
        toast({ title: t('security.gate.entryRecorded', 'Entry recorded successfully') });
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

  // Process worker QR result (used by both direct scan and pending result)
  const processWorkerQRResult = async (result: QRScanResult) => {
    if (result.type === 'worker' && result.id) {
      // Set search query and trigger search
      setSearchQuery(result.data?.name || result.id);
      
      // Check if worker is already on site
      const { data: activeEntry } = await supabase
        .from('gate_entry_logs')
        .select('id, entry_time')
        .eq('tenant_id', profile?.tenant_id || '')
        .eq('entry_type', 'worker')
        .ilike('person_name', `%${result.data?.name || ''}%`)
        .is('exit_time', null)
        .is('deleted_at', null)
        .order('entry_time', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (result.status === 'valid') {
        // Use the data from the scan directly
        setVerificationResult({
          status: 'granted',
          workerId: result.id,
          name: result.data?.name || 'Unknown',
          company: result.data?.company,
          project: result.data?.projectName,
          warnings: result.data?.warnings,
          induction: {
            status: result.data?.inductionStatus === 'acknowledged' ? 'completed' : 
                   result.data?.inductionStatus === 'completed' ? 'completed' :
                   result.data?.inductionStatus === 'sent' ? 'pending' : 
                   result.data?.inductionStatus === 'viewed' ? 'pending' : 'not_started',
            expiresAt: result.data?.expiresAt,
          },
          qrValidity: { isValid: true },
          isOnSite: !!activeEntry,
          entryId: activeEntry?.id,
          entryTime: activeEntry?.entry_time || undefined,
        });
      } else {
        setVerificationResult({
          status: result.status === 'expired' || result.status === 'revoked' ? 'denied' : 'warning',
          workerId: result.id || '',
          name: result.data?.name || result.rawCode,
          warnings: result.data?.warnings || [t('security.qrScanner.invalid', 'Invalid or expired QR code')],
          qrValidity: { isValid: false },
          isOnSite: !!activeEntry,
          entryId: activeEntry?.id,
          entryTime: activeEntry?.entry_time || undefined,
        });
      }
    } else {
      setVerificationResult({
        status: 'warning',
        workerId: '',
        name: result.rawCode,
        warnings: [t('security.qrScanner.notFound', 'No worker found for this QR code')],
      });
      setSearchQuery(result.rawCode);
    }
  };

  // Handle QR scan result - detect type and route appropriately
  const handleQRScanResult = async (result: QRScanResult) => {
    // Detect visitor QR on worker tab - redirect to visitor tab
    if (result.type === 'visitor') {
      toast({
        title: t('security.gate.visitorDetected', 'Visitor QR Detected'),
        description: t('security.gate.switchingToVisitorTab', 'Switching to Visitor verification...'),
      });
      setPendingScanResult(result);
      onSwitchTab?.('visitors');
      return;
    }
    
    // Process as worker
    await processWorkerQRResult(result);
  };

  const getStatusConfig = (status: WorkerVerificationResult['status'], isOnSite?: boolean) => {
    // If worker is already on site, show warning/amber style regardless of verification status
    if (isOnSite) {
      return {
        icon: AlertTriangle,
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-400 dark:border-amber-600',
        label: t('security.qrScanner.workerOnSite', 'Worker Already On Site'),
      };
    }
    
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

  const getInductionStatusBadge = (status: WorkerVerificationResult['induction']) => {
    if (!status) return null;
    
    switch (status.status) {
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-600 hover:bg-green-700">
            <GraduationCap className="h-3 w-3 me-1" />
            {t('security.workerVerification.inductionCompleted', 'Completed')}
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
            <Clock className="h-3 w-3 me-1" />
            {t('security.workerVerification.inductionPendingStatus', 'Pending')}
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 me-1" />
            {t('security.workerVerification.inductionExpiredStatus', 'Expired')}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            {t('security.workerVerification.noInductionStatus', 'Not Started')}
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <HardHat className="h-4 w-4" />
          {t('security.workerVerification.title', 'Verify Worker')}
          {!isOnline && (
            <Badge variant="outline" className="ms-auto text-warning">
              <WifiOff className="h-3 w-3 me-1" />
              {t('common.offline', 'Offline')}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="flex gap-2">
          <Input
            placeholder={t('security.workerVerification.searchPlaceholder', 'Enter name, ID, or mobile...')}
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
            title={t('security.workerVerification.scanWorkerQR', 'Scan Worker QR')}
            onClick={() => setIsQRScannerOpen(true)}
          >
            <QrCode className="h-4 w-4" />
          </Button>
        </div>

        {/* Verification Result */}
        {verificationResult && (
          <Card className={cn('border-2', getStatusConfig(verificationResult.status, verificationResult.isOnSite).bg)}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  {verificationResult.photoUrl && (
                    <AvatarImage src={verificationResult.photoUrl} alt={verificationResult.name} />
                  )}
                  <AvatarFallback className="text-lg">
                    {verificationResult.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  {/* Status Header */}
                  <div className="flex items-center gap-2 mb-2">
                    {(() => {
                      const config = getStatusConfig(verificationResult.status, verificationResult.isOnSite);
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
                    {verificationResult.isOnSite && verificationResult.entryTime && (
                      <Badge variant="default" className="ms-auto bg-amber-500 hover:bg-amber-600 text-white">
                        <Clock className="h-3 w-3 me-1" />
                        {t('security.gateDashboard.onSite', 'On Site')} - {format(new Date(verificationResult.entryTime), 'HH:mm')}
                      </Badge>
                    )}
                    {verificationResult.isOnSite && !verificationResult.entryTime && (
                      <Badge variant="secondary" className="ms-auto">
                        {t('security.gateDashboard.onSite', 'On Site')}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Worker Name */}
                  <h3 className="font-semibold text-lg">{verificationResult.name}</h3>
                  {verificationResult.nameAr && (
                    <p className="text-sm text-muted-foreground" dir="rtl">{verificationResult.nameAr}</p>
                  )}
                  
                  {/* Company & Project */}
                  <div className="mt-2 space-y-1">
                    {verificationResult.company && (
                      <p className="text-sm flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">{t('security.workerVerification.company', 'Company')}:</span>
                        <span>{verificationResult.company}</span>
                      </p>
                    )}
                    {verificationResult.project && (
                      <p className="text-sm flex items-center gap-1">
                        <HardHat className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">{t('security.workerVerification.project', 'Project')}:</span>
                        <span>{verificationResult.project}</span>
                      </p>
                    )}
                    {verificationResult.nationality && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">{t('security.workerVerification.nationality', 'Nationality')}:</span>
                        <Badge variant="outline" className="ms-2">{verificationResult.nationality}</Badge>
                      </p>
                    )}
                  </div>

                  {/* Induction Status Section */}
                  {verificationResult.induction && (
                    <div className="mt-3 p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium flex items-center gap-1">
                          <GraduationCap className="h-4 w-4" />
                          {t('security.workerVerification.inductionStatus', 'Induction Status')}
                        </span>
                        {getInductionStatusBadge(verificationResult.induction)}
                      </div>
                      {verificationResult.induction.videoTitle && (
                        <p className="text-xs text-muted-foreground">
                          {verificationResult.induction.videoTitle}
                        </p>
                      )}
                      {verificationResult.induction.expiresAt && (
                        <p className="text-xs mt-1 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span className="text-muted-foreground">
                            {t('security.workerVerification.expiresOn', 'Expires')}:
                          </span>
                          <span className={cn(
                            isPast(new Date(verificationResult.induction.expiresAt)) 
                              ? 'text-destructive font-medium' 
                              : differenceInDays(new Date(verificationResult.induction.expiresAt), new Date()) <= 7
                                ? 'text-warning font-medium'
                                : ''
                          )}>
                            {format(new Date(verificationResult.induction.expiresAt), 'dd MMM yyyy')}
                          </span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* On-Site Alert with Duration */}
                  {verificationResult.isOnSite && verificationResult.entryTime && (
                    <div className="mt-3 p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700">
                      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <div className="flex-1">
                          <p className="font-semibold text-sm">
                            {t('security.qrScanner.workerOnSite', 'Worker Already On Site')}
                          </p>
                          <p className="text-xs mt-0.5">
                            {t('security.qrScanner.workerOnSiteDesc', 'This worker entered at {{time}}', { 
                              time: format(new Date(verificationResult.entryTime), 'HH:mm') 
                            })}
                            {' • '}
                            {t('security.qrScanner.onSiteDuration', 'On site for {{duration}}', {
                              duration: `${Math.floor(differenceInMinutes(new Date(), new Date(verificationResult.entryTime)) / 60)}h ${differenceInMinutes(new Date(), new Date(verificationResult.entryTime)) % 60}m`
                            })}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 bg-amber-50 dark:bg-amber-900/50 border-amber-400 hover:bg-amber-200 dark:hover:bg-amber-800"
                          onClick={() => {
                            toast({
                              title: t('security.qrScanner.verifyIdentity', 'Verify Identity'),
                              description: t('security.workerVerification.identityVerified', 'Identity verification confirmed'),
                            });
                          }}
                        >
                          <ShieldCheck className="h-4 w-4 me-1" />
                          {t('security.qrScanner.verifyIdentity', 'Verify Identity')}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* QR Validity */}
                  {verificationResult.qrValidity && (
                    <div className="mt-2 text-xs">
                      {verificationResult.qrValidity.isValid ? (
                        <span className="text-green-600 dark:text-green-400">
                          ✓ {t('security.workerVerification.qrValid', 'Valid QR')}
                          {verificationResult.qrValidity.expiresAt && (
                            <span className="text-muted-foreground ms-1">
                              ({t('security.workerVerification.validUntil', 'until')} {format(new Date(verificationResult.qrValidity.expiresAt), 'dd MMM yyyy')})
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-destructive">
                          ✗ {t('security.workerVerification.qrInvalid', 'No valid QR')}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Warnings */}
                  {verificationResult.warnings && verificationResult.warnings.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {verificationResult.warnings.map((warning, idx) => (
                        <p key={idx} className="text-sm text-destructive flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          {warning}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {verificationResult.status !== 'denied' && (
                <div className="flex gap-2 mt-4 pt-4 border-t">
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
                      {t('security.workerVerification.logWorkerEntry', 'Log Entry')}
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
                      {t('security.workerVerification.logWorkerExit', 'Record Exit')}
                    </Button>
                  )}
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
          expectedType="worker"
        />
      </CardContent>
    </Card>
  );
}
