import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ArrowLeft, QrCode, CheckCircle, RefreshCw, Loader2, Plus, Pencil, Trash2, Search, MapPin, ChevronDown, XCircle, Ban, Cog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ModuleGate } from '@/components';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
  useSessionProgress,
  useCompleteSession,
  useSessionAssetByAssetId,
  useAddAssetToSession,
  useRefreshSessionAssets,
  useDeleteSession,
  useSessionPartsProgress,
  type SessionAsset,
} from '@/features/incidents';
// @ts-ignore - type compat
import {
  SessionProgressCard,
  QuickInspectionCard,
  BulkInspectionScanner,
  SessionStatusBadge,
  EditSessionDialog,
} from '@/features/incidents';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePartInspectionResults } from '@/hooks/use-part-inspection-results';
import { usePartsForAsset } from '@/features/assets';

/** Inline component to show parts completion count for a session asset */
function AssetPartsCount({ sessionAssetId, typeId, subtypeId }: { sessionAssetId: string; typeId?: string; subtypeId?: string | null }) {
  const { data: parts } = usePartsForAsset(typeId || '', subtypeId || null);
  const { data: results } = usePartInspectionResults(sessionAssetId);

  const totalParts = parts?.length || 0;
  const completedParts = results?.length || 0;

  if (totalParts === 0) return null;

  return (
    <Badge variant="outline" className="text-xs gap-1">
      <Cog className="h-3 w-3" />
      {completedParts}/{totalParts}
    </Badge>
  );
}

function SessionWorkspaceContent() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { profile } = useAuth();
  
  const [showScanner, setShowScanner] = useState(false);
  const [scannedAssetId, setScannedAssetId] = useState<string | null>(null);
  const [showAddAssetDialog, setShowAddAssetDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [pendingAssetToAdd, setPendingAssetToAdd] = useState<{ id: string; name: string; code: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: session, isLoading: sessionLoading } = useInspectionSession(sessionId);
  const { data: allAssets = [] } = useSessionAssets(sessionId);
  const { data: progress } = useSessionProgress(sessionId);
  const { data: partsProgress } = useSessionPartsProgress(sessionId);
  const { data: scannedSessionAsset, isLoading: scanLookupLoading } = useSessionAssetByAssetId(sessionId, scannedAssetId || undefined);
  
  const completeSession = useCompleteSession();
  const addAssetToSession = useAddAssetToSession();
  const refreshSessionAssets = useRefreshSessionAssets();
  const deleteSession = useDeleteSession();
  
  // When a QR is scanned and lookup completes
  useEffect(() => {
    if (scannedAssetId && !scanLookupLoading) {
      if (scannedSessionAsset) {
        setShowScanner(false);
        setScannedAssetId(null);
      } else {
        checkAndOfferToAddAsset(scannedAssetId);
      }
    }
  }, [scannedAssetId, scannedSessionAsset, scanLookupLoading]);
  
  const checkAndOfferToAddAsset = async (assetId: string) => {
    if (!profile?.tenant_id || !session) return;
    
    try {
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
      
      let matches = true;
      if (session.site_id && asset.site_id !== session.site_id) matches = false;
      if (session.building_id && asset.building_id !== session.building_id) matches = false;
      if (session.category_id && asset.category_id !== session.category_id) matches = false;
      if (session.type_id && asset.type_id !== session.type_id) matches = false;
      
      if (matches) {
        setPendingAssetToAdd({ id: asset.id, name: asset.name, code: asset.asset_code });
        setShowAddAssetDialog(true);
      } else {
        toast.error(t('inspectionSessions.assetDoesNotMatchFilters'));
      }
      
      setScannedAssetId(null);
      setShowScanner(false);
    } catch (error: any) {
      toast.error(error?.message || 'Error');
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
      toast.error(error?.message || 'Error');
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
      toast.error(error?.message || 'Error');
    }
  };
  
  const handleQRScan = (assetId: string) => {
    setScannedAssetId(assetId);
  };
  
  const handleCompleteSession = async () => {
    if (!sessionId) return;
    try {
      await completeSession.mutateAsync(sessionId);
      toast.success(t('inspectionSessions.sessionCompleted'));
    } catch (error: any) {
      toast.error(error?.message || 'Error');
    }
  };

  const handleDeleteSession = async () => {
    if (!sessionId) return;
    try {
      await deleteSession.mutateAsync(sessionId);
      toast.success(t('inspectionSessions.sessionDeleted'));
      navigate('/inspections/sessions');
    } catch (error: any) {
      toast.error(error?.message || 'Error');
    }
  };

  // Sort: uninspected first, then by code; filter by search
  const sortedAssets = useMemo(() => {
    let filtered = allAssets;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = allAssets.filter(sa => {
        const asset = sa.asset;
        if (!asset) return false;
        return (
          asset.asset_code?.toLowerCase().includes(q) ||
          asset.name?.toLowerCase().includes(q) ||
          asset.building?.name?.toLowerCase().includes(q)
        );
      });
    }
    return [...filtered].sort((a, b) => {
      const aInspected = a.quick_result !== null ? 1 : 0;
      const bInspected = b.quick_result !== null ? 1 : 0;
      if (aInspected !== bInspected) return aInspected - bInspected;
      return (a.asset?.asset_code || '').localeCompare(b.asset?.asset_code || '');
    });
  }, [allAssets, searchQuery]);
  
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
    <div className="container mx-auto py-6 space-y-4" dir={direction}>
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
        
        <div className="flex items-center gap-2 flex-wrap">
          {session.status === 'in_progress' && (
            <>
              <Button variant="outline" size="sm" onClick={handleRefreshAssets} disabled={refreshSessionAssets.isPending}>
                {refreshSessionAssets.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <RefreshCw className="me-2 h-4 w-4" />}
                {t('inspectionSessions.refreshAssets')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowScanner(true)}>
                <QrCode className="me-2 h-4 w-4" />
                {t('inspectionSessions.scanQR')}
              </Button>
              {canComplete && (
                <Button size="sm" onClick={handleCompleteSession} disabled={completeSession.isPending}>
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
      {session && <EditSessionDialog open={showEditDialog} onOpenChange={setShowEditDialog} session={session} />}

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent dir={direction}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('inspectionSessions.deleteSession')}</AlertDialogTitle>
            <AlertDialogDescription>{t('inspectionSessions.confirmDeleteSession')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSession} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Scanner Overlay */}
      {showScanner && (
        <BulkInspectionScanner onScan={handleQRScan} onClose={() => setShowScanner(false)} isProcessing={scanLookupLoading} />
      )}
      
      {/* Progress Card */}
      {progress && (
        <SessionProgressCard
          total={progress.total_assets}
          inspected={progress.inspected_count}
          passed={progress.passed_count}
          failed={progress.failed_count}
          notAccessible={progress.not_accessible_count}
          compliancePercentage={progress.compliance_percentage}
          partsProgress={partsProgress}
        />
      )}
      
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('inspectionSessions.searchAssets')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="ps-9"
        />
      </div>

      {/* Accordion Asset List */}
      <Accordion type="single" collapsible className="space-y-2">
        {sortedAssets.map((sa) => {
          const asset = sa.asset;
          if (!asset) return null;

          const resultColor = sa.quick_result === 'good' 
            ? 'border-success/50 bg-success/5' 
            : sa.quick_result === 'not_good' 
              ? 'border-destructive/50 bg-destructive/5' 
              : sa.quick_result === 'not_accessible' 
                ? 'border-warning/50 bg-warning/5' 
                : '';

          return (
            <AccordionItem key={sa.id} value={sa.id} className={cn("border rounded-lg px-0", resultColor)}>
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex flex-1 items-center justify-between me-2">
                  <div className="flex flex-col items-start gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{asset.asset_code}</span>
                      {sa.quick_result && (
                        <Badge 
                          variant={sa.quick_result === 'good' ? 'default' : sa.quick_result === 'not_good' ? 'destructive' : 'secondary'}
                          className="text-xs py-0"
                        >
                          {sa.quick_result === 'good' && <CheckCircle className="h-3 w-3 me-1" />}
                          {sa.quick_result === 'not_good' && <XCircle className="h-3 w-3 me-1" />}
                          {sa.quick_result === 'not_accessible' && <Ban className="h-3 w-3 me-1" />}
                          {t(`inspectionSessions.result_${sa.quick_result}`)}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{asset.name}</span>
                    {asset.building && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {asset.building.name}
                        {asset.floor_zone && ` / ${asset.floor_zone.name}`}
                      </span>
                    )}
                  </div>
                  <AssetPartsCount
                    sessionAssetId={sa.id}
                    typeId={asset.type?.id}
                    subtypeId={asset.subtype_id}
                  />
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <QuickInspectionCard
                  sessionAsset={sa}
                  sessionId={sessionId!}
                  onComplete={() => {}}
                />
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {sortedAssets.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              {searchQuery ? t('common.noResults') : t('inspectionSessions.noAssetsInSession')}
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* Add Asset Confirmation Dialog */}
      <AlertDialog open={showAddAssetDialog} onOpenChange={setShowAddAssetDialog}>
        <AlertDialogContent dir={direction}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('inspectionSessions.addAssetToSession')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('inspectionSessions.confirmAddAsset', { code: pendingAssetToAdd?.code, name: pendingAssetToAdd?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingAssetToAdd(null)}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddAssetConfirm} disabled={addAssetToSession.isPending}>
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
