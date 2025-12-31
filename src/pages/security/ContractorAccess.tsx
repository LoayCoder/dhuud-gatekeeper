import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  QrCode, 
  Search, 
  Users, 
  FileCheck, 
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  History,
  UserCheck
} from "lucide-react";
import { WorkerApprovalQueue } from "@/components/contractors/WorkerApprovalQueue";
import { GatePassApprovalQueue } from "@/components/contractors/GatePassApprovalQueue";
import { TodayGatePasses } from "@/components/contractors/TodayGatePasses";
import { WorkerAccessLogTable } from "@/components/security/WorkerAccessLogTable";
import { ContractorQRScanner } from "@/components/security/ContractorQRScanner";
import { usePendingWorkerApprovals } from "@/hooks/contractor-management/use-contractor-workers";
import { useMaterialGatePasses } from "@/hooks/contractor-management/use-material-gate-passes";
import { useWorkerAccessLogs, useLogWorkerEntry, useRecordWorkerExit, useWorkersOnSiteCount } from "@/hooks/contractor-management/use-worker-access-logs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ContractorAccess() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("verification");
  const [searchQuery, setSearchQuery] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<string>("today");
  const [verificationResult, setVerificationResult] = useState<{
    status: 'granted' | 'denied' | 'warning' | null;
    worker?: any;
    message?: string;
    warnings?: string[];
    errors?: string[];
  }>({ status: null });

  // Hooks
  const { data: pendingWorkers = [], isLoading: workersLoading } = usePendingWorkerApprovals();
  const { data: allGatePasses = [], isLoading: passesLoading } = useMaterialGatePasses();
  const { data: workersOnSite = 0 } = useWorkersOnSiteCount();
  const logEntry = useLogWorkerEntry();
  const recordExit = useRecordWorkerExit();

  // Calculate date filters
  const getDateFrom = () => {
    const now = new Date();
    switch (dateFilter) {
      case 'today':
        now.setHours(0, 0, 0, 0);
        return now.toISOString();
      case '7days':
        now.setDate(now.getDate() - 7);
        return now.toISOString();
      case '30days':
        now.setDate(now.getDate() - 30);
        return now.toISOString();
      default:
        now.setHours(0, 0, 0, 0);
        return now.toISOString();
    }
  };

  const { data: accessLogs = [], isLoading: logsLoading } = useWorkerAccessLogs({
    dateFrom: getDateFrom(),
  });

  // Filter passes
  const pendingGatePasses = allGatePasses.filter(gp => 
    gp.status === 'pending_pm_approval' || gp.status === 'pending_safety_approval'
  );
  const todayApprovedPasses = allGatePasses.filter(gp => {
    if (gp.status !== 'approved') return false;
    const passDate = new Date(gp.pass_date);
    const today = new Date();
    return passDate.toDateString() === today.toDateString();
  });

  const handleVerifyWorker = async () => {
    if (!searchQuery.trim()) {
      toast.error(t('security.contractorAccess.enterSearchTerm', 'Please enter a national ID or name'));
      return;
    }

    setIsVerifying(true);
    setVerificationResult({ status: null });

    try {
      // Get tenant_id
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', userData.user?.id || '')
        .single();

      // Call the validate-worker-qr edge function with search mode
      const { data, error } = await supabase.functions.invoke('validate-worker-qr', {
        body: { 
          search_term: searchQuery, 
          search_mode: true,
          tenant_id: profile?.tenant_id
        }
      });

      if (error) throw error;

      if (data?.is_valid) {
        setVerificationResult({
          status: data.warnings?.length > 0 ? 'warning' : 'granted',
          worker: data.worker,
          warnings: data.warnings
        });
      } else {
        setVerificationResult({
          status: 'denied',
          message: data?.errors?.[0] || t('security.contractorAccess.workerNotFound', 'Worker not found or access denied'),
          errors: data?.errors
        });
      }
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationResult({
        status: 'denied',
        message: t('security.contractorAccess.verificationError', 'Error verifying worker')
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleScanResult = async (qrData: string) => {
    setScannerOpen(false);
    
    // Check if it's a worker QR code (format: WORKER:{token})
    let qrToken = qrData;
    if (qrData.startsWith('WORKER:')) {
      qrToken = qrData.substring(7);
    }

    setIsVerifying(true);
    setVerificationResult({ status: null });

    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', userData.user?.id || '')
        .single();

      // Call with QR token
      const { data, error } = await supabase.functions.invoke('validate-worker-qr', {
        body: { 
          qr_token: qrToken,
          tenant_id: profile?.tenant_id
        }
      });

      if (error) throw error;

      if (data?.is_valid) {
        setVerificationResult({
          status: data.warnings?.length > 0 ? 'warning' : 'granted',
          worker: data.worker,
          warnings: data.warnings
        });
      } else {
        setVerificationResult({
          status: 'denied',
          message: data?.errors?.[0] || t('security.contractorAccess.invalidQR', 'Invalid QR code'),
          errors: data?.errors
        });
      }
    } catch (error) {
      console.error('QR scan error:', error);
      setVerificationResult({
        status: 'denied',
        message: t('security.contractorAccess.verificationError', 'Error verifying QR code')
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogEntry = async () => {
    if (!verificationResult.worker) return;
    
    logEntry.mutate({
      workerId: verificationResult.worker.id,
      validationStatus: verificationResult.status === 'granted' ? 'valid' : 'warning',
    }, {
      onSuccess: () => {
        setVerificationResult({ status: null });
        setSearchQuery("");
      }
    });
  };

  const handleRecordExit = async () => {
    if (!verificationResult.worker) return;
    
    recordExit.mutate({
      workerId: verificationResult.worker.id,
    }, {
      onSuccess: () => {
        setVerificationResult({ status: null });
        setSearchQuery("");
      }
    });
  };

  const handleClear = () => {
    setVerificationResult({ status: null });
    setSearchQuery("");
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {t('security.contractorAccess.title', 'Contractor Access Control')}
            </h1>
            <p className="text-muted-foreground">
              {t('security.contractorAccess.description', 'Verify workers, review gate passes, and manage access requests')}
            </p>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="flex gap-2">
          <Badge variant="outline" className="px-3 py-1.5 text-sm bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
            <UserCheck className="h-4 w-4 me-1.5 text-green-600" />
            {workersOnSite} {t('security.contractorAccess.onSite', 'on site')}
          </Badge>
          {pendingWorkers.length > 0 && (
            <Badge variant="destructive" className="px-3 py-1.5 text-sm">
              {pendingWorkers.length} {t('security.contractorAccess.pendingApproval', 'pending')}
            </Badge>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
          <TabsTrigger value="verification" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            <span className="hidden sm:inline">{t('security.contractorAccess.tabs.verification', 'Worker Verification')}</span>
            <span className="sm:hidden">{t('security.contractorAccess.tabs.verify', 'Verify')}</span>
          </TabsTrigger>
          <TabsTrigger value="workerApprovals" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">{t('security.contractorAccess.tabs.workerApprovals', 'Worker Approvals')}</span>
            <span className="sm:hidden">{t('security.contractorAccess.tabs.workers', 'Workers')}</span>
            {pendingWorkers.length > 0 && (
              <Badge variant="destructive" className="ms-1">{pendingWorkers.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="gatePassVerification" className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            <span className="hidden sm:inline">{t('security.contractorAccess.tabs.gatePassVerification', 'Gate Passes')}</span>
            <span className="sm:hidden">{t('security.contractorAccess.tabs.passes', 'Passes')}</span>
          </TabsTrigger>
          <TabsTrigger value="gatePassApprovals" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">{t('security.contractorAccess.tabs.gatePassApprovals', 'Pass Approvals')}</span>
            <span className="sm:hidden">{t('security.contractorAccess.tabs.approvals', 'Approvals')}</span>
            {pendingGatePasses.length > 0 && (
              <Badge variant="destructive" className="ms-1">{pendingGatePasses.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="accessHistory" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">{t('security.contractorAccess.tabs.accessHistory', 'Access History')}</span>
            <span className="sm:hidden">{t('security.contractorAccess.tabs.history', 'History')}</span>
          </TabsTrigger>
        </TabsList>

        {/* Worker Verification Tab */}
        <TabsContent value="verification" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                {t('security.contractorAccess.searchOrScan', 'Search or Scan Worker')}
              </CardTitle>
              <CardDescription>
                {t('security.contractorAccess.searchDescription', 'Enter national ID, name, or scan QR code to verify worker access')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder={t('security.contractorAccess.searchPlaceholder', 'Enter national ID or name...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyWorker()}
                  className="flex-1"
                />
                <div className="flex gap-2">
                  <Button onClick={handleVerifyWorker} disabled={isVerifying}>
                    {isVerifying ? (
                      <Loader2 className="h-4 w-4 animate-spin me-2" />
                    ) : (
                      <Search className="h-4 w-4 me-2" />
                    )}
                    {t('security.contractorAccess.check', 'Check')}
                  </Button>
                  <Button variant="outline" onClick={() => setScannerOpen(true)}>
                    <QrCode className="h-4 w-4 me-2" />
                    {t('security.contractorAccess.scan', 'Scan')}
                  </Button>
                  {verificationResult.status && (
                    <Button variant="ghost" onClick={handleClear}>
                      {t('common.clear', 'Clear')}
                    </Button>
                  )}
                </div>
              </div>

              {/* Verification Result */}
              {verificationResult.status && (
                <Card className={`border-2 ${
                  verificationResult.status === 'granted' ? 'border-green-500 bg-green-50 dark:bg-green-950/20' :
                  verificationResult.status === 'warning' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' :
                  'border-destructive bg-destructive/10'
                }`}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-4">
                      {verificationResult.status === 'granted' && (
                        <CheckCircle2 className="h-12 w-12 text-green-600 flex-shrink-0" />
                      )}
                      {verificationResult.status === 'warning' && (
                        <AlertTriangle className="h-12 w-12 text-yellow-600 flex-shrink-0" />
                      )}
                      {verificationResult.status === 'denied' && (
                        <XCircle className="h-12 w-12 text-destructive flex-shrink-0" />
                      )}
                      
                      <div className="flex-1 space-y-2">
                        <h3 className="text-lg font-semibold">
                          {verificationResult.status === 'granted' && t('security.contractorAccess.accessGranted', 'Access Granted')}
                          {verificationResult.status === 'warning' && t('security.contractorAccess.accessWithWarning', 'Access Granted with Warnings')}
                          {verificationResult.status === 'denied' && t('security.contractorAccess.accessDenied', 'Access Denied')}
                        </h3>
                        
                        {verificationResult.worker && (
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">{t('security.contractorAccess.name', 'Name')}:</span>
                              <span className="ms-2 font-medium">{verificationResult.worker.full_name}</span>
                            </div>
                            {verificationResult.worker.national_id && (
                              <div>
                                <span className="text-muted-foreground">{t('security.contractorAccess.nationalId', 'National ID')}:</span>
                                <span className="ms-2 font-medium">{verificationResult.worker.national_id}</span>
                              </div>
                            )}
                            <div>
                              <span className="text-muted-foreground">{t('security.contractorAccess.company', 'Company')}:</span>
                              <span className="ms-2 font-medium">{verificationResult.worker.company_name}</span>
                            </div>
                            {verificationResult.worker.nationality && (
                              <div>
                                <span className="text-muted-foreground">{t('security.contractorAccess.nationality', 'Nationality')}:</span>
                                <span className="ms-2 font-medium">{verificationResult.worker.nationality}</span>
                              </div>
                            )}
                            {verificationResult.worker.project_name && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground">{t('security.contractorAccess.project', 'Project')}:</span>
                                <span className="ms-2 font-medium">{verificationResult.worker.project_name}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {verificationResult.warnings && verificationResult.warnings.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {verificationResult.warnings.map((warning, idx) => (
                              <p key={idx} className="text-yellow-700 dark:text-yellow-400 text-sm flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {warning}
                              </p>
                            ))}
                          </div>
                        )}

                        {verificationResult.errors && verificationResult.errors.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {verificationResult.errors.map((error, idx) => (
                              <p key={idx} className="text-destructive text-sm flex items-center gap-1">
                                <XCircle className="h-3 w-3" />
                                {error}
                              </p>
                            ))}
                          </div>
                        )}

                        {verificationResult.message && !verificationResult.errors?.length && (
                          <p className="text-destructive text-sm">{verificationResult.message}</p>
                        )}

                        {verificationResult.worker && verificationResult.status !== 'denied' && (
                          <div className="flex gap-2 pt-2">
                            <Button 
                              onClick={handleLogEntry} 
                              className="bg-green-600 hover:bg-green-700"
                              disabled={logEntry.isPending}
                            >
                              {logEntry.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin me-2" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 me-2" />
                              )}
                              {t('security.contractorAccess.logEntry', 'Log Entry')}
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={handleRecordExit}
                              disabled={recordExit.isPending}
                            >
                              {recordExit.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin me-2" />
                              ) : (
                                <XCircle className="h-4 w-4 me-2" />
                              )}
                              {t('security.contractorAccess.recordExit', 'Record Exit')}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Worker Approvals Tab */}
        <TabsContent value="workerApprovals" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t('security.contractorAccess.pendingWorkerApprovals', 'Pending Worker Approvals')}
                {pendingWorkers.length > 0 && (
                  <Badge variant="destructive">{pendingWorkers.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {workersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <WorkerApprovalQueue workers={pendingWorkers} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gate Pass Verification Tab */}
        <TabsContent value="gatePassVerification" className="mt-4">
          {passesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <TodayGatePasses passes={todayApprovedPasses} />
          )}
        </TabsContent>

        {/* Gate Pass Approvals Tab */}
        <TabsContent value="gatePassApprovals" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t('security.contractorAccess.pendingGatePassApprovals', 'Pending Gate Pass Approvals')}
                {pendingGatePasses.length > 0 && (
                  <Badge variant="destructive">{pendingGatePasses.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {passesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <GatePassApprovalQueue passes={pendingGatePasses} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Access History Tab */}
        <TabsContent value="accessHistory" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  {t('security.accessHistory.title', 'Worker Access History')}
                </CardTitle>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">{t('security.accessHistory.today', 'Today')}</SelectItem>
                    <SelectItem value="7days">{t('security.accessHistory.last7Days', 'Last 7 Days')}</SelectItem>
                    <SelectItem value="30days">{t('security.accessHistory.last30Days', 'Last 30 Days')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <CardDescription>
                {t('security.accessHistory.description', 'View and manage worker entry and exit records')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WorkerAccessLogTable logs={accessLogs} isLoading={logsLoading} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* QR Scanner Dialog */}
      <ContractorQRScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={handleScanResult}
      />
    </div>
  );
}
