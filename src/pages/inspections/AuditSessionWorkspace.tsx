import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Pencil, Trash2, MapPin, Users, Shield, Download } from 'lucide-react';
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
import { useInspectionSession, useDeleteSession } from '@/hooks/use-inspection-sessions';
import {
  useAuditTemplate,
  useAuditTemplateItems,
  useAuditResponses,
  useAuditProgress,
  useNCCounts,
  useStartAuditSession,
  useCompleteAuditSession,
} from '@/hooks/use-audit-sessions';
import { useCanCloseSession, useCloseAreaSession } from '@/hooks/use-session-lifecycle';
import {
  SessionStatusBadge,
  EditSessionDialog,
  AuditChecklistItem,
  AuditProgressCard,
  FindingsPanel,
  SessionStatusCard,
  SessionCompletionDialog,
  SessionExportDropdown,
  SessionActionsPanel,
} from '@/components/inspections/sessions';
import { useReopenAreaSession } from '@/hooks/use-session-lifecycle';
import { useAuth } from '@/contexts/AuthContext';
import { useAreaFindingsCount } from '@/hooks/use-area-findings';

function AuditSessionWorkspaceContent() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [completionMode, setCompletionMode] = useState<'complete' | 'close'>('complete');
  
  const { data: session, isLoading: sessionLoading } = useInspectionSession(sessionId);
  const { data: template } = useAuditTemplate(session?.template_id);
  const { data: templateItems = [] } = useAuditTemplateItems(session?.template_id);
  const { data: responses = [] } = useAuditResponses(sessionId);
  const { data: progress } = useAuditProgress(sessionId, session?.template_id);
  const { data: ncCounts } = useNCCounts(sessionId, session?.template_id);
  const { data: findingsCount } = useAreaFindingsCount(sessionId);
  const { data: closureStatus, isLoading: closureLoading } = useCanCloseSession(sessionId);
  
  const startSession = useStartAuditSession();
  const completeSession = useCompleteAuditSession();
  const closeSession = useCloseAreaSession();
  const reopenSession = useReopenAreaSession();
  const deleteSession = useDeleteSession();
  const { profile } = useAuth();
  
  // Check if user can verify actions (for now, allow all authenticated users)
  const canVerifyActions = !!profile;
  
  // Create response map for quick lookup
  const responseMap = useMemo(() => {
    return new Map(responses.map(r => [r.template_item_id, r]));
  }, [responses]);
  
  // Group items by clause section (first part of clause_reference)
  const groupedItems = useMemo(() => {
    const groups: Record<string, typeof templateItems> = {};
    
    for (const item of templateItems) {
      const section = item.clause_reference?.split('.')[0] || t('audits.general');
      if (!groups[section]) {
        groups[section] = [];
      }
      groups[section].push(item);
    }
    
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [templateItems, t]);
  
  const handleStartSession = async () => {
    if (!sessionId) return;
    try {
      await startSession.mutateAsync(sessionId);
      toast.success(t('audits.sessionStarted'));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleCompleteSession = async () => {
    if (!sessionId) return;
    try {
      await completeSession.mutateAsync(sessionId);
      toast.success(t('audits.sessionCompleted'));
      setShowCompletionDialog(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleCloseSession = async () => {
    if (!sessionId) return;
    try {
      await closeSession.mutateAsync({ sessionId });
      toast.success(t('audits.sessionClosed'));
      setShowCompletionDialog(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteSession = async () => {
    if (!sessionId) return;
    try {
      await deleteSession.mutateAsync(sessionId);
      toast.success(t('audits.sessionDeleted'));
      navigate('/inspections/sessions');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleReopenSession = async () => {
    if (!sessionId) return;
    try {
      await reopenSession.mutateAsync({ sessionId });
      toast.success(t('audits.sessionReopened'));
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
            <p className="text-muted-foreground">{t('audits.sessionNotFound')}</p>
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
  const attendees = Array.isArray(session.attendees) ? session.attendees : [];
  
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
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{session.reference_id}</h1>
              <SessionStatusBadge status={session.status} />
              <Badge variant="outline" className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                {t('audits.audit')}
              </Badge>
              {template?.standard_reference && (
                <Badge>{template.standard_reference}</Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {i18n.language === 'ar' && template?.name_ar 
                ? template.name_ar 
                : template?.name} • {session.period}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {session.status !== 'draft' && (
            <SessionExportDropdown
              session={session}
              responses={responses as any}
              findings={[]}
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
            <AlertDialogTitle>{t('audits.deleteSession')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('audits.confirmDeleteSession')}
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
      
      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sidebar */}
        <div className="space-y-6 lg:col-span-1">
          {/* Audit Progress Card */}
          <AuditProgressCard
            progress={progress || null}
            ncCounts={ncCounts || null}
            standardReference={template?.standard_reference}
          />
          
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
          
          {/* Audit Info Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{t('audits.auditInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {session.site && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <span>{session.site.name}</span>
                </div>
              )}
              
              {session.inspector && (
                <div className="flex items-start gap-2">
                  <Users className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium">{t('audits.leadAuditor')}</div>
                    <div>{session.inspector.full_name}</div>
                  </div>
                </div>
              )}
              
              {attendees.length > 0 && (
                <div className="space-y-1 pt-2 border-t">
                  <div className="font-medium text-xs text-muted-foreground uppercase">
                    {t('audits.auditTeam')}
                  </div>
                  {attendees.map((att: { name: string; role?: string }, idx: number) => (
                    <div key={idx} className="text-sm">
                      {att.name}
                      {att.role && <span className="text-muted-foreground"> - {att.role}</span>}
                    </div>
                  ))}
                </div>
              )}
              
              {session.scope_notes && (
                <div className="pt-2 border-t">
                  <div className="font-medium text-xs text-muted-foreground uppercase mb-1">
                    {t('audits.auditScope')}
                  </div>
                  <p className="text-muted-foreground">{session.scope_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Checklist Items */}
        <div className="lg:col-span-2 space-y-6">
          {groupedItems.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">{t('audits.noItems')}</p>
              </CardContent>
            </Card>
          ) : (
            groupedItems.map(([section, items]) => (
              <Card key={section}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {t('audits.clause')} {section}
                    <Badge variant="secondary">{items.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {items.map((item) => (
                    <AuditChecklistItem
                      key={item.id}
                      item={item}
                      response={responseMap.get(item.id)}
                      sessionId={sessionId!}
                      tenantId={session.tenant_id}
                      isLocked={isCompleted}
                    />
                  ))}
                </CardContent>
              </Card>
            ))
          )}
          
          {/* Findings Panel */}
          {(findingsCount?.total ?? 0) > 0 && (
            <FindingsPanel
              sessionId={sessionId!}
              isLocked={isCompleted}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuditSessionWorkspace() {
  return (
    <ModuleGate module="asset_management">
      <AuditSessionWorkspaceContent />
    </ModuleGate>
  );
}
