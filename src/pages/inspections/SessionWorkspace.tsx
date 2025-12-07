import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ArrowLeft, QrCode, CheckCircle, Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModuleGate } from '@/components/ModuleGate';
import { toast } from '@/hooks/use-toast';
import {
  useInspectionSession,
  useSessionAssets,
  useUninspectedAssets,
  useSessionProgress,
  useCompleteSession,
  useSessionAssetByAssetId,
} from '@/hooks/use-inspection-sessions';
import {
  SessionProgressCard,
  QuickInspectionCard,
  UninspectedAssetsList,
  BulkInspectionScanner,
  SessionStatusBadge,
} from '@/components/inspections/sessions';

function SessionWorkspaceContent() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  
  const [showScanner, setShowScanner] = useState(false);
  const [scannedAssetId, setScannedAssetId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('inspect');
  
  const { data: session, isLoading: sessionLoading } = useInspectionSession(sessionId);
  const { data: allAssets = [] } = useSessionAssets(sessionId);
  const { data: uninspectedAssets = [], refetch: refetchUninspected } = useUninspectedAssets(sessionId);
  const { data: progress } = useSessionProgress(sessionId);
  const { data: scannedSessionAsset, isLoading: scanLookupLoading } = useSessionAssetByAssetId(sessionId, scannedAssetId || undefined);
  
  const completeSession = useCompleteSession();
  
  const [selectedAsset, setSelectedAsset] = useState<typeof uninspectedAssets[0] | null>(null);
  
  // When a QR is scanned and lookup completes
  useEffect(() => {
    if (scannedAssetId && scannedSessionAsset && !scanLookupLoading) {
      setSelectedAsset(scannedSessionAsset);
      setShowScanner(false);
      setScannedAssetId(null);
    } else if (scannedAssetId && !scannedSessionAsset && !scanLookupLoading) {
      // Asset not in this session
      toast({
        title: t('common.error'),
        description: t('inspectionSessions.assetNotInSession'),
        variant: 'destructive',
      });
      setScannedAssetId(null);
    }
  }, [scannedAssetId, scannedSessionAsset, scanLookupLoading, t]);
  
  const handleQRScan = (assetId: string) => {
    setScannedAssetId(assetId);
  };
  
  const handleInspectionComplete = () => {
    setSelectedAsset(null);
    refetchUninspected();
  };
  
  const handleCompleteSession = async () => {
    if (!sessionId) return;
    
    try {
      await completeSession.mutateAsync(sessionId);
      toast({ title: t('common.success'), description: t('inspectionSessions.sessionCompleted') });
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    }
  };
  
  if (sessionLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  
  if (!session) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t('inspectionSessions.sessionNotFound')}</p>
            <Button className="mt-4" asChild>
              <Link to="/inspections/sessions">{t('common.back')}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const isCompleted = session.status === 'completed_with_open_actions' || session.status === 'closed';
  const canComplete = progress && progress.inspected_count === progress.total_assets && progress.total_assets > 0;
  
  return (
    <div className="container mx-auto py-6 space-y-6" dir={direction}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/inspections/sessions">
              <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{session.reference_id}</h1>
              <SessionStatusBadge status={session.status} />
            </div>
            <p className="text-muted-foreground">
              {i18n.language === 'ar' && session.template?.name_ar 
                ? session.template.name_ar 
                : session.template?.name} • {session.period}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {session.status === 'in_progress' && (
            <>
              <Button variant="outline" onClick={() => setShowScanner(true)}>
                <QrCode className="me-2 h-4 w-4" />
                {t('inspectionSessions.scanQR')}
              </Button>
              {canComplete && (
                <Button onClick={handleCompleteSession} disabled={completeSession.isPending}>
                  {completeSession.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  <CheckCircle className="me-2 h-4 w-4" />
                  {t('inspectionSessions.completeSession')}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Progress Card */}
      {progress && (
        <SessionProgressCard
          total={progress.total_assets}
          inspected={progress.inspected_count}
          passed={progress.passed_count}
          failed={progress.failed_count}
          notAccessible={progress.not_accessible_count}
          compliancePercentage={progress.compliance_percentage}
        />
      )}
      
      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Scanner or Selected Asset */}
        <div>
          {showScanner ? (
            <BulkInspectionScanner
              onScan={handleQRScan}
              onClose={() => setShowScanner(false)}
              isProcessing={scanLookupLoading}
            />
          ) : selectedAsset ? (
            <QuickInspectionCard
              sessionAsset={selectedAsset}
              sessionId={sessionId!}
              onComplete={handleInspectionComplete}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <QrCode className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  {isCompleted 
                    ? t('inspectionSessions.sessionCompleted')
                    : t('inspectionSessions.scanOrSelectAsset')
                  }
                </p>
                {!isCompleted && (
                  <Button onClick={() => setShowScanner(true)}>
                    <QrCode className="me-2 h-4 w-4" />
                    {t('inspectionSessions.startScanning')}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Right: Uninspected Assets List */}
        <div>
          <UninspectedAssetsList
            assets={uninspectedAssets}
            onSelectAsset={setSelectedAsset}
            onScanQR={() => setShowScanner(true)}
          />
        </div>
      </div>
      
      {/* Inspected Assets Tab */}
      <Tabs value={activeTab} onValueChange={setActiveTab} dir={direction}>
        <TabsList>
          <TabsTrigger value="inspect">{t('inspectionSessions.inspectionView')}</TabsTrigger>
          <TabsTrigger value="all">{t('inspectionSessions.allAssets')} ({allAssets.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('inspectionSessions.allSessionAssets')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {allAssets.map((sa) => (
                  <div 
                    key={sa.id} 
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <span className="font-medium">{sa.asset?.asset_code}</span>
                      <span className="text-muted-foreground ms-2">{sa.asset?.name}</span>
                    </div>
                    {sa.quick_result ? (
                      <span className={`text-sm font-medium ${
                        sa.quick_result === 'good' ? 'text-green-600' :
                        sa.quick_result === 'not_good' ? 'text-red-600' : 'text-yellow-600'
                      }`}>
                        {t(`inspectionSessions.result_${sa.quick_result}`)}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">{t('inspectionSessions.pending')}</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function SessionWorkspace() {
  return (
    <ModuleGate module="asset_management">
      <SessionWorkspaceContent />
    </ModuleGate>
  );
}
