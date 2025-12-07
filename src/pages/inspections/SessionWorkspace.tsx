import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ArrowLeft, QrCode, CheckCircle, RefreshCw, Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModuleGate } from '@/components/ModuleGate';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useInspectionSession,
  useSessionAssets,
  useUninspectedAssets,
  useSessionProgress,
  useCompleteSession,
  useSessionAssetByAssetId,
  useAddAssetToSession,
  useRefreshSessionAssets,
  useDeleteSession,
} from '@/hooks/use-inspection-sessions';
import {
  SessionProgressCard,
  QuickInspectionCard,
  UninspectedAssetsList,
  BulkInspectionScanner,
  SessionStatusBadge,
  EditSessionDialog,
} from '@/components/inspections/sessions';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

function SessionWorkspaceContent() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { profile } = useAuth();
  
  const [showScanner, setShowScanner] = useState(false);
  const [scannedAssetId, setScannedAssetId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('inspect');
  const [showAddAssetDialog, setShowAddAssetDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [pendingAssetToAdd, setPendingAssetToAdd] = useState<{ id: string; name: string; code: string } | null>(null);
  
  const { data: session, isLoading: sessionLoading } = useInspectionSession(sessionId);
  const { data: allAssets = [] } = useSessionAssets(sessionId);
  const { data: uninspectedAssets = [], refetch: refetchUninspected } = useUninspectedAssets(sessionId);
  const { data: progress } = useSessionProgress(sessionId);
  const { data: scannedSessionAsset, isLoading: scanLookupLoading } = useSessionAssetByAssetId(sessionId, scannedAssetId || undefined);
  
  const completeSession = useCompleteSession();
  const addAssetToSession = useAddAssetToSession();
  const refreshSessionAssets = useRefreshSessionAssets();
  const deleteSession = useDeleteSession();
  
  const [selectedAsset, setSelectedAsset] = useState<typeof uninspectedAssets[0] | null>(null);
  
  // When a QR is scanned and lookup completes
  useEffect(() => {
    if (scannedAssetId && !scanLookupLoading) {
      if (scannedSessionAsset) {
        // Asset is in session, select it for inspection
        setSelectedAsset(scannedSessionAsset);
        setShowScanner(false);
        setScannedAssetId(null);
      } else {
        // Asset not in session - check if it matches filters and offer to add
        checkAndOfferToAddAsset(scannedAssetId);
      }
    }
  }, [scannedAssetId, scannedSessionAsset, scanLookupLoading]);
  
  const checkAndOfferToAddAsset = async (assetId: string) => {
    if (!profile?.tenant_id || !session) return;
    
    try {
      // Get asset details
      const { data: asset, error } = await supabase
        .from('hsse_assets')
        .select('id, name, asset_code, site_id, building_id, floor_zone_id, category_id, type_id')
        .eq('id', assetId)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .single();
      
      if (error || !asset) {
        toast.error(t('inspectionSessions.assetNotFound'));
        setScannedAssetId(null);
        return;
      }
      
      // Check if asset matches session filters
      let matches = true;
      if (session.site_id && asset.site_id !== session.site_id) matches = false;
      if (session.building_id && asset.building_id !== session.building_id) matches = false;
      if (session.category_id && asset.category_id !== session.category_id) matches = false;
      if (session.type_id && asset.type_id !== session.type_id) matches = false;
      
      if (matches) {
        // Asset matches filters, offer to add
        setPendingAssetToAdd({ id: asset.id, name: asset.name, code: asset.asset_code });
        setShowAddAssetDialog(true);
      } else {
        toast.error(t('inspectionSessions.assetDoesNotMatchFilters'));
      }
      
      setScannedAssetId(null);
      setShowScanner(false);
    } catch (error: any) {
      toast.error(error.message);
      setScannedAssetId(null);
    }
  };
  
  const handleAddAssetConfirm = async () => {
    if (!pendingAssetToAdd || !sessionId) return;
    
    try {
      await addAssetToSession.mutateAsync({ sessionId, assetId: pendingAssetToAdd.id });
      toast.success(t('inspectionSessions.assetAddedToSession'));
      setShowAddAssetDialog(false);
      setPendingAssetToAdd(null);
    } catch (error: any) {
      toast.error(error.message);
    }
  };
  
  const handleRefreshAssets = async () => {
    if (!sessionId) return;
    
    try {
      const result = await refreshSessionAssets.mutateAsync(sessionId);
      if (result.added > 0) {
        toast.success(t('inspectionSessions.assetsRefreshed', { count: result.added }));
      } else {
        toast.info(t('inspectionSessions.noNewAssetsFound'));
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };
  
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
      toast.success(t('inspectionSessions.sessionCompleted'));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteSession = async () => {
    if (!sessionId) return;
    try {
      await deleteSession.mutateAsync(sessionId);
      toast.success(t('inspectionSessions.sessionDeleted'));
      navigate('/inspections/sessions');
    } catch (error: any) {
      toast.error(error.message);
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
              <Button 
                variant="outline" 
                onClick={handleRefreshAssets}
                disabled={refreshSessionAssets.isPending}
              >
                {refreshSessionAssets.isPending ? (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="me-2 h-4 w-4" />
                )}
                {t('inspectionSessions.refreshAssets')}
              </Button>
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
          {session.status !== 'closed' && (
            <>
              <Button variant="outline" size="icon" onClick={() => setShowEditDialog(true)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Edit Dialog */}
      {session && (
        <EditSessionDialog 
          open={showEditDialog} 
          onOpenChange={setShowEditDialog} 
          session={session}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent dir={direction}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('inspectionSessions.deleteSession')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('inspectionSessions.confirmDeleteSession')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSession} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
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
      
      {/* Add Asset Confirmation Dialog */}
      <AlertDialog open={showAddAssetDialog} onOpenChange={setShowAddAssetDialog}>
        <AlertDialogContent dir={direction}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('inspectionSessions.addAssetToSession')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('inspectionSessions.confirmAddAsset', { 
                code: pendingAssetToAdd?.code, 
                name: pendingAssetToAdd?.name 
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingAssetToAdd(null)}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleAddAssetConfirm}
              disabled={addAssetToSession.isPending}
            >
              {addAssetToSession.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              <Plus className="me-2 h-4 w-4" />
              {t('common.add')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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