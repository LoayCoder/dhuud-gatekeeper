import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, FileText, AlertTriangle, Search, MoreHorizontal, Pencil, Trash2, PlayCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useIncidents, useDeleteIncident, useUpdateIncidentStatus } from '@/hooks/use-incidents';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const getSeverityBadgeVariant = (severity: string | null) => {
  switch (severity) {
    case 'critical': return 'destructive';
    case 'high': return 'destructive';
    case 'medium': return 'secondary';
    default: return 'outline';
  }
};

const getStatusBadgeVariant = (status: string | null) => {
  switch (status) {
    case 'closed': return 'secondary';
    case 'resolved': return 'default';
    case 'under_investigation': return 'outline';
    default: return 'outline';
  }
};

export default function IncidentList() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const navigate = useNavigate();
  const { data: incidents, isLoading } = useIncidents();
  const { user } = useAuth();
  const [hasHSSEAccess, setHasHSSEAccess] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [incidentToDelete, setIncidentToDelete] = useState<string | null>(null);

  const deleteIncident = useDeleteIncident();
  const updateStatus = useUpdateIncidentStatus();

  useEffect(() => {
    const checkAccess = async () => {
      if (!user?.id) return;
      const { data } = await supabase.rpc('has_hsse_incident_access', { _user_id: user.id });
      setHasHSSEAccess(data === true);
    };
    checkAccess();
  }, [user?.id]);

  const handleStartInvestigation = async (incidentId: string) => {
    await updateStatus.mutateAsync({ id: incidentId, status: 'investigation_in_progress' });
    navigate(`/incidents/investigate?incident=${incidentId}`);
  };

  const handleDeleteClick = (incidentId: string) => {
    setIncidentToDelete(incidentId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (incidentToDelete) {
      await deleteIncident.mutateAsync(incidentToDelete);
      setDeleteDialogOpen(false);
      setIncidentToDelete(null);
    }
  };

  return (
    <div className="container py-6 space-y-6" dir={direction}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('pages.incidents.title')}</h1>
          <p className="text-muted-foreground">{t('pages.incidents.description')}</p>
        </div>
        <div className="flex items-center gap-2">
          {hasHSSEAccess && (
            <Button asChild variant="outline">
              <Link to="/incidents/investigate" className="gap-2">
                <Search className="h-4 w-4" />
                {t('navigation.investigationWorkspace')}
              </Link>
            </Button>
          )}
          <Button asChild>
            <Link to="/incidents/report" className="gap-2">
              <Plus className="h-4 w-4" />
              {t('incidents.reportIncident')}
            </Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : incidents && incidents.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {incidents.map((incident) => (
            <Card key={incident.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base line-clamp-1 flex-1">
                    {incident.title}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    {incident.severity && (
                      <Badge variant={getSeverityBadgeVariant(incident.severity)}>
                        {t(`incidents.severityLevels.${incident.severity}`)}
                      </Badge>
                    )}
                    {hasHSSEAccess && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          {incident.status === 'submitted' && (
                            <DropdownMenuItem onClick={() => handleStartInvestigation(incident.id)}>
                              <PlayCircle className="h-4 w-4 me-2" />
                              {t('incidents.startInvestigation')}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem asChild>
                            <Link to={`/incidents/${incident.id}`}>
                              <Pencil className="h-4 w-4 me-2" />
                              {t('common.view')} {t('common.details')}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteClick(incident.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 me-2" />
                            {t('incidents.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
                <CardDescription className="flex items-center gap-2">
                  <FileText className="h-3 w-3" />
                  {incident.reference_id}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{t(`incidents.eventTypes.${incident.event_type}`)}</span>
                  {incident.status && (
                    <>
                      <span>•</span>
                      <Badge variant={getStatusBadgeVariant(incident.status)} className="text-xs">
                        {t(`incidents.status.${incident.status}`)}
                      </Badge>
                    </>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {incident.occurred_at && formatDistanceToNow(new Date(incident.occurred_at), { addSuffix: true })}
                </div>
                <Button asChild variant="ghost" size="sm" className="w-full">
                  <Link to={`/incidents/${incident.id}`}>
                    {t('common.view')} {t('common.details')}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('common.noData')}</h3>
            <p className="text-muted-foreground mb-4">{t('incidents.noIncidentsYet')}</p>
            <Button asChild>
              <Link to="/incidents/report" className="gap-2">
                <Plus className="h-4 w-4" />
                {t('incidents.reportFirstIncident')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir={direction}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('incidents.delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('incidents.deleteConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
