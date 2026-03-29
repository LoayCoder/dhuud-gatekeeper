import { useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Pencil, Trash2, MapPin, Cloud, Users, Zap, AlertTriangle, Search, CheckCircle, XCircle, Ban, Cog, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  useDeleteSession,
  useStartSession,
  useSessionAssets,
  useSessionPartsProgress,
  useSessionProgress as useAssetSessionProgress,
} from '@/features/incidents';
import {
  useAreaChecklistProgress,
  useAreaInspectionResponses,
  useAreaTemplate,
  useBackfillAreaResponses,
  useBackfillAreaAssets,
} from '@/hooks/use-area-inspections';
import { useAreaFindingsCount } from '@/hooks/use-area-findings';
import { useCanCloseSession, useCompleteAreaSession, useCloseAreaSession } from '@/hooks/use-session-lifecycle';
import { useTemplateItems } from '@/features/incidents';
import {
  SessionStatusBadge,
  EditSessionDialog,
  AreaProgressCard,
  AreaChecklistItem,
  FindingsPanel,
  SessionStatusCard,
  SessionCompletionDialog,
  SessionExportDropdown,
  SessionActionsPanel,
  BulkSwipeInspection,
  SessionProgressCard,
  QuickInspectionCard,
} from '@/features/incidents';
import { useReopenAreaSession } from '@/hooks/use-session-lifecycle';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionProgress } from '@/hooks/use-inspection-sessions';
import { usePartsForAsset } from '@/features/assets';
import { usePartInspectionResults } from '@/hooks/use-part-inspection-results';
import { ScannerDialog } from '@/components/ui/scanner-dialog';

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

function AreaSessionWorkspaceContent() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [completionMode, setCompletionMode] = useState<'complete' | 'close'>('complete');
  const [showSwipeMode, setShowSwipeMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [expandedAssetId, setExpandedAssetId] = useState<string | undefined>(undefined);
  const assetRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { data: session, isLoading: sessionLoading } = useInspectionSession(sessionId);
  const { data: progress } = useAreaChecklistProgress(sessionId);
  const { data: templateItems = [] } = useTemplateItems(session?.template_id);
  const { data: responses = [] } = useAreaInspectionResponses(sessionId);
  const { data: areaTemplate } = useAreaTemplate(session?.template_id);
  const { data: findingsCount } = useAreaFindingsCount(sessionId);
  const { data: closureStatus, isLoading: closureLoading } = useCanCloseSession(sessionId);
  
  // Asset-mode hooks
  const executionMode = (session as any)?.execution_mode as string | null | undefined;
  const isAssetMode = executionMode === 'asset';
  const { data: allAssets = [] } = useSessionAssets(isAssetMode ? sessionId : undefined);
  const { data: assetProgress } = useAssetSessionProgress(isAssetMode ? sessionId : undefined);
  const { data: partsProgress } = useSessionPartsProgress(isAssetMode ? sessionId : undefined);
  
  const startSession = useStartSession();
  const completeSession = useCompleteAreaSession();
  const closeSession = useCloseAreaSession();
  const reopenSession = useReopenAreaSession();
  const deleteSession = useDeleteSession();
  const { profile } = useAuth();
  
  // Self-healing: backfill missing checklist responses for area-mode sessions
  useBackfillAreaResponses(
    !isAssetMode ? sessionId : undefined,
    session?.template_id,
    session?.tenant_id,
    session?.status,
    (session as any)?.branch_id ?? null
  );
  
  // Self-healing: backfill missing assets for legacy sessions without execution_mode
  useBackfillAreaAssets(
    sessionId,
    session?.tenant_id,
    session?.status,
    executionMode,
    session ? {
      branch_id: (session as any)?.branch_id,
      site_id: session?.site_id,
      building_id: (session as any)?.building_id,
      category_id: session?.category_id,
      type_id: (session as any)?.type_id,
      subtype_id: (session as any)?.subtype_id,
    } : undefined
  );
  
  // Check if user can verify actions
  const canVerifyActions = !!profile;
  
  // Create a map of responses by template_item_id for quick lookup (area mode)
  const responseMap = new Map(responses.map(r => [r.template_item_id, r]));
  
  // Sort assets for asset mode: uninspected first, then by code; filter by search
  const sortedAssets = useMemo(() => {
    if (!isAssetMode) return [];
    let filtered = allAssets;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = allAssets.filter((sa: any) => {
        const asset = sa.asset;
        if (!asset) return false;
        return (
          asset.asset_code?.toLowerCase().includes(q) ||
          asset.name?.toLowerCase().includes(q) ||
          asset.building?.name?.toLowerCase().includes(q)
        );
      });
    }
    return [...filtered].sort((a: any, b: any) => {
      const aInspected = a.quick_result !== null ? 1 : 0;
      const bInspected = b.quick_result !== null ? 1 : 0;
      if (aInspected !== bInspected) return aInspected - bInspected;
      return (a.asset?.asset_code || '').localeCompare(b.asset?.asset_code || '');
    });
  }, [allAssets, searchQuery, isAssetMode]);
  
  const handleStartSession = async () => {
    if (!sessionId) return;
    try {
      await startSession.mutateAsync(sessionId);
      toast.success(t('inspectionSessions.sessionStarted'));
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error');
    }
  };

  const handleCompleteSession = async () => {
    if (!sessionId) return;
    try {
      await completeSession.mutateAsync({ sessionId });
      toast.success(t('inspectionSessions.sessionCompleted'));
      setShowCompletionDialog(false);
    } catch (error: any) {
      toast.error(error?.message || 'Error');
    }
  };

  const handleCloseSession = async () => {
    if (!sessionId) return;
    try {
      await closeSession.mutateAsync({ sessionId });
      toast.success(t('inspectionSessions.sessionClosed'));
      setShowCompletionDialog(false);
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

  const handleReopenSession = async () => {
    if (!sessionId) return;
    try {
      await reopenSession.mutateAsync({ sessionId });
      toast.success(t('inspectionSessions.sessionReopened'));
    } catch (error: any) {
      toast.error(error?.message || 'Error');
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
  const canComplete = isAssetMode
    ? assetProgress && assetProgress.inspected_count > 0 && assetProgress.inspected_count === assetProgress.total_assets
    : progress && progress.responded === progress.total && progress.total > 0;
  
  // Parse attendees from session
  const attendees = Array.isArray(session.attendees) ? session.attendees : [];
  
  // Get template requirements from areaTemplate
  const requiresPhotos = areaTemplate?.requires_photos ?? false;
  const requiresGps = areaTemplate?.requires_gps ?? false;
  
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
              <Badge variant="outline">
                {isAssetMode
                  ? t('inspections.assetInspection')
                  : t('inspections.areaInspection')}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {i18n.language === 'ar' && session.template?.name_ar 
                ? session.template.name_ar 
                : session.template?.name} • {session.period}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Swipe Mode Button - only for area mode when in progress */}
          {!isAssetMode && session.status === 'in_progress' && (
            <Button 
              variant="outline" 
              onClick={() => setShowSwipeMode(true)}
              className="gap-2"
            >
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">{t('inspections.bulkSwipeMode')}</span>
            </Button>
          )}
          {session.status !== 'draft' && (
            <SessionExportDropdown
              session={session}
              responses={responses}
              findings={[]}
              templateItems={templateItems as unknown as Parameters<typeof SessionExportDropdown>[0]['templateItems']}
              isAreaSession={!isAssetMode}
            />
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
      
      {/* Bulk Swipe Inspection Dialog (area mode only) */}
      {!isAssetMode && (
        <BulkSwipeInspection
          open={showSwipeMode}
          onOpenChange={setShowSwipeMode}
          items={templateItems}
          responses={responses}
          sessionId={sessionId!}
          isLocked={isCompleted}
        />
      )}
      
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
      
      {/* Session Completion Dialog */}
      <SessionCompletionDialog
        open={showCompletionDialog}
        onOpenChange={setShowCompletionDialog}
        mode={completionMode}
        closureStatus={closureStatus}
        onConfirm={completionMode === 'complete' ? handleCompleteSession : handleCloseSession}
        isLoading={completeSession.isPending || closeSession.isPending}
      />
      
      {/* Progress Card, Status Card & Session Metadata */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Progress */}
        <div className="lg:col-span-2 space-y-6">
          {isAssetMode ? (
            /* Asset-mode progress */
            assetProgress && (
              <SessionProgressCard
                total={assetProgress.total_assets}
                inspected={assetProgress.inspected_count}
                passed={assetProgress.passed_count}
                failed={assetProgress.failed_count}
                notAccessible={assetProgress.not_accessible_count}
                compliancePercentage={assetProgress.compliance_percentage}
                partsProgress={partsProgress}
              />
            )
          ) : (
            /* Area-mode progress */
            progress && (
              <AreaProgressCard
                total={progress.total}
                responded={progress.responded}
                passed={progress.passed}
                failed={progress.failed}
                na={progress.na}
                percentage={progress.percentage}
              />
            )
          )}
          
          {/* Status Card */}
          <SessionStatusCard
            status={session.status}
            closureStatus={closureStatus}
            isLoading={closureLoading}
            onComplete={() => { setCompletionMode('complete'); setShowCompletionDialog(true); }}
            onClose={() => { setCompletionMode('close'); setShowCompletionDialog(true); }}
            onStart={session.status === 'draft' ? handleStartSession : undefined}
            onReopen={session.status === 'closed' ? handleReopenSession : undefined}
            isCompleting={completeSession.isPending}
            isClosing={closeSession.isPending}
            isReopening={reopenSession.isPending}
          />
          
          {/* Session Actions Panel */}
          <SessionActionsPanel sessionId={sessionId!} canVerify={canVerifyActions} />
        </div>
        
        {/* Session Metadata */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t('inspections.sessionInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {/* Location */}
            {session.site && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <div>{session.site.name}</div>
                </div>
              </div>
            )}
            
            {/* Weather */}
            {session.weather_conditions && (
              <div className="flex items-center gap-2">
                <Cloud className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{t(`inspections.weather.${session.weather_conditions}`)}</span>
              </div>
            )}
            
            {/* Attendees */}
            {attendees.length > 0 && (
              <div className="flex items-start gap-2">
                <Users className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="space-y-1">
                  {attendees.map((att: { name: string; role?: string }, idx: number) => (
                    <div key={idx}>
                      <span className="font-medium">{att.name}</span>
                      {att.role && <span className="text-muted-foreground ms-1">({att.role})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Scope Notes */}
            {session.scope_notes && (
              <div className="pt-2 border-t">
                <p className="text-muted-foreground">{session.scope_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* ===== ASSET MODE: Asset Accordion ===== */}
      {isAssetMode && (
        <>
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

          {/* Asset Accordion */}
          <Accordion type="single" collapsible className="space-y-2">
            {sortedAssets.map((sa: any) => {
              const asset = sa.asset;
              if (!asset) return null;

              const resultColor = sa.quick_result === 'good' 
                ? 'border-success/50 bg-success/5' 
                : sa.quick_result === 'not_good' 
                  ? 'border-destructive/50 bg-destructive/5' 
                  : sa.quick_result === 'partial'
                    ? 'border-warning/50 bg-warning/5'
                    : sa.quick_result === 'not_accessible' 
                      ? 'border-muted/50 bg-muted/5' 
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
                              variant={
                                sa.quick_result === 'good' ? 'default' 
                                : sa.quick_result === 'not_good' ? 'destructive' 
                                : sa.quick_result === 'partial' ? 'secondary'
                                : 'secondary'
                              }
                              className={cn(
                                "text-xs py-0",
                                sa.quick_result === 'good' && 'bg-success text-success-foreground',
                                sa.quick_result === 'partial' && 'bg-warning text-warning-foreground',
                              )}
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
        </>
      )}
      
      {/* ===== AREA MODE: Flat Checklist ===== */}
      {!isAssetMode && (
        <Card>
          <CardHeader>
            <CardTitle>{t('inspections.checklistItems')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {templateItems.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <AlertTriangle className="h-10 w-10 text-warning mx-auto" />
                <p className="text-muted-foreground font-medium">
                  {t('inspections.templateHasNoItems')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('inspections.addItemsToTemplate')}
                </p>
              </div>
            ) : (
              templateItems.map((item) => (
                <AreaChecklistItem
                  key={item.id}
                  item={item}
                  response={responseMap.get(item.id)}
                  sessionId={sessionId!}
                  tenantId={session.tenant_id}
                  isLocked={isCompleted}
                  requiresPhotos={requiresPhotos}
                  requiresGps={requiresGps}
                />
              ))
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Findings Panel */}
      {(findingsCount?.total ?? 0) > 0 && (
        <FindingsPanel
          sessionId={sessionId!}
          isLocked={isCompleted}
        />
      )}
    </div>
  );
}

export default function AreaSessionWorkspace() {
  return (
    <ModuleGate module="asset_management">
      <AreaSessionWorkspaceContent />
    </ModuleGate>
  );
}
