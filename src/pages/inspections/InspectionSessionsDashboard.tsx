import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Plus, ClipboardList, Calendar, User, MapPin, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ModuleGate } from '@/components/ModuleGate';
import { useInspectionSessions, useDeleteSession, InspectionSession } from '@/hooks/use-inspection-sessions';
import { CreateSessionDialog, EditSessionDialog, SessionStatusBadge } from '@/components/inspections/sessions';
import { toast } from 'sonner';

function InspectionSessionsDashboardContent() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const navigate = useNavigate();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState<InspectionSession | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const deleteSession = useDeleteSession();
  
  const { data: sessions = [], isLoading } = useInspectionSessions(
    statusFilter !== 'all' ? { status: statusFilter } : undefined
  );
  
  const statusCounts = {
    all: sessions.length,
    in_progress: sessions.filter(s => s.status === 'in_progress').length,
    completed_with_open_actions: sessions.filter(s => s.status === 'completed_with_open_actions').length,
    closed: sessions.filter(s => s.status === 'closed').length,
  };

  const handleEditClick = (e: React.MouseEvent, session: InspectionSession) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedSession(session);
    setShowEditDialog(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, session: InspectionSession) => {
    e.preventDefault();
    e.stopPropagation();
    if (session.status === 'closed') {
      toast.error(t('inspectionSessions.cannotDeleteClosedSession'));
      return;
    }
    setSelectedSession(session);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedSession) return;
    try {
      await deleteSession.mutateAsync(selectedSession.id);
      toast.success(t('inspectionSessions.sessionDeleted'));
      setShowDeleteDialog(false);
      setSelectedSession(null);
    } catch (error) {
      toast.error(t('common.error'));
    }
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6" dir={direction}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('inspectionSessions.title')}</h1>
          <p className="text-muted-foreground">{t('inspectionSessions.description')}</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="me-2 h-4 w-4" />
          {t('inspectionSessions.createSession')}
        </Button>
      </div>
      
      {/* Status Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter} dir={direction}>
        <TabsList>
          <TabsTrigger value="all">
            {t('common.all')} ({statusCounts.all})
          </TabsTrigger>
          <TabsTrigger value="in_progress">
            {t('inspectionSessions.status.inProgress')} ({statusCounts.in_progress})
          </TabsTrigger>
          <TabsTrigger value="completed_with_open_actions">
            {t('inspectionSessions.status.completedWithActions')} ({statusCounts.completed_with_open_actions})
          </TabsTrigger>
          <TabsTrigger value="closed">
            {t('inspectionSessions.status.closed')} ({statusCounts.closed})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={statusFilter} className="mt-4">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t('inspectionSessions.noSessions')}</p>
                <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="me-2 h-4 w-4" />
                  {t('inspectionSessions.createFirst')}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sessions.map((session) => (
                <Card key={session.id} className="hover:border-primary transition-colors h-full relative">
                  <Link to={`/inspections/sessions/${session.id}`} className="block">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{session.reference_id}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {i18n.language === 'ar' && session.template?.name_ar 
                              ? session.template.name_ar 
                              : session.template?.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <SessionStatusBadge status={session.status} />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => handleEditClick(e, session)}>
                                <Pencil className="me-2 h-4 w-4" />
                                {t('inspectionSessions.editSession')}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={(e) => handleDeleteClick(e, session)}
                                className="text-destructive"
                                disabled={session.status === 'closed'}
                              >
                                <Trash2 className="me-2 h-4 w-4" />
                                {t('inspectionSessions.deleteSession')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Period */}
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{session.period}</span>
                      </div>
                      
                      {/* Site */}
                      {session.site && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{session.site.name}</span>
                        </div>
                      )}
                      
                      {/* Inspector */}
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{session.inspector?.full_name}</span>
                      </div>
                      
                      {/* Progress */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-secondary rounded-full h-2">
                          <div 
                            className="bg-primary rounded-full h-2 transition-all"
                            style={{ 
                              width: `${session.total_assets > 0 
                                ? Math.round((session.inspected_count / session.total_assets) * 100) 
                                : 0}%` 
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {session.inspected_count}/{session.total_assets}
                        </span>
                      </div>
                      
                      {/* Compliance */}
                      {session.compliance_percentage !== null && (
                        <Badge 
                          variant={session.compliance_percentage >= 90 ? 'default' : session.compliance_percentage >= 70 ? 'secondary' : 'destructive'}
                        >
                          {session.compliance_percentage}% {t('inspectionSessions.complianceRate')}
                        </Badge>
                      )}
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      <CreateSessionDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
      
      {selectedSession && (
        <EditSessionDialog 
          open={showEditDialog} 
          onOpenChange={setShowEditDialog} 
          session={selectedSession}
        />
      )}

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
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function InspectionSessionsDashboard() {
  return (
    <ModuleGate module="asset_management">
      <InspectionSessionsDashboardContent />
    </ModuleGate>
  );
}
