import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Pencil, Trash2, MapPin, Cloud, Users, Download, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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
  useDeleteSession,
  useStartSession,
} from '@/hooks/use-inspection-sessions';
import {
  useAreaChecklistProgress,
  useAreaInspectionResponses,
  useAreaTemplate,
} from '@/hooks/use-area-inspections';
import { useAreaFindingsCount } from '@/hooks/use-area-findings';
import { useCanCloseSession, useCompleteAreaSession, useCloseAreaSession } from '@/hooks/use-session-lifecycle';
import { useTemplateItems } from '@/hooks/use-inspections';
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
} from '@/components/inspections/sessions';
import { useReopenAreaSession } from '@/hooks/use-session-lifecycle';
import { useAuth } from '@/contexts/AuthContext';

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
  
  const { data: session, isLoading: sessionLoading } = useInspectionSession(sessionId);
  const { data: progress } = useAreaChecklistProgress(sessionId);
  const { data: templateItems = [] } = useTemplateItems(session?.template_id);
  const { data: responses = [] } = useAreaInspectionResponses(sessionId);
  const { data: areaTemplate } = useAreaTemplate(session?.template_id);
  const { data: findingsCount } = useAreaFindingsCount(sessionId);
  const { data: closureStatus, isLoading: closureLoading } = useCanCloseSession(sessionId);
  
  const startSession = useStartSession();
  const completeSession = useCompleteAreaSession();
  const closeSession = useCloseAreaSession();
  const reopenSession = useReopenAreaSession();
  const deleteSession = useDeleteSession();
  const { profile } = useAuth();
  
  // Check if user can verify actions (for now, allow all authenticated users)
  // TODO: Implement proper HSSE role check when role structure is available
  const canVerifyActions = !!profile;
  
  // Create a map of responses by template_item_id for quick lookup
  const responseMap = new Map(responses.map(r => [r.template_item_id, r]));
  
  const handleStartSession = async () => {
    if (!sessionId) return;
    try {
      await startSession.mutateAsync(sessionId);
      toast.success(t('inspectionSessions.sessionStarted'));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleCompleteSession = async () => {
    if (!sessionId) return;
    try {
      await completeSession.mutateAsync({ sessionId });
      toast.success(t('inspectionSessions.sessionCompleted'));
      setShowCompletionDialog(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleCloseSession = async () => {
    if (!sessionId) return;
    try {
      await closeSession.mutateAsync({ sessionId });
      toast.success(t('inspectionSessions.sessionClosed'));
      setShowCompletionDialog(false);
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

  const handleReopenSession = async () => {
    if (!sessionId) return;
    try {
      await reopenSession.mutateAsync({ sessionId });
      toast.success(t('inspectionSessions.sessionReopened'));
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
  const canComplete = progress && progress.responded === progress.total && progress.total > 0;
  
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
              <Badge variant="outline">{t('inspections.areaInspection')}</Badge>
            </div>
            <p className="text-muted-foreground">
              {i18n.language === 'ar' && session.template?.name_ar 
                ? session.template.name_ar 
                : session.template?.name} • {session.period}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Swipe Mode Button - only show when session is in progress */}
          {session.status === 'in_progress' && (
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
              templateItems={templateItems}
              isAreaSession={true}
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
      
      {/* Bulk Swipe Inspection Dialog */}
      <BulkSwipeInspection
        open={showSwipeMode}
        onOpenChange={setShowSwipeMode}
        items={templateItems}
        responses={responses}
        sessionId={sessionId!}
        isLocked={isCompleted}
      />
      
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
          {progress && (
            <AreaProgressCard
              total={progress.total}
              responded={progress.responded}
              passed={progress.passed}
              failed={progress.failed}
              na={progress.na}
              percentage={progress.percentage}
            />
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
      
      {/* Checklist Items */}
      <Card>
        <CardHeader>
          <CardTitle>{t('inspections.checklistItems')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {templateItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {t('inspections.noItems')}
            </p>
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
