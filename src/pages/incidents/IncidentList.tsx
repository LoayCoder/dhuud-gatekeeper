import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Lock } from 'lucide-react';
import { useIncidents, useDeleteIncident, useUpdateIncidentStatus } from '@/hooks/use-incidents';
import { useDeletionPassword } from '@/hooks/use-deletion-password';
import { useUserRoles } from '@/hooks/use-user-roles';
import { useAuth } from '@/contexts/AuthContext';
import { useAITags } from '@/hooks/use-ai-tags';
import { useHSSEEventsExport } from '@/hooks/use-hsse-events-export';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  IncidentListHeader,
  IncidentKPIStrip,
  IncidentFilterPanel,
  IncidentCardEnhanced,
  IncidentTableView,
  type IncidentFilters,
} from '@/components/incidents/listing';
import { isWithinInterval, parseISO, isPast, addDays } from 'date-fns';

export default function IncidentList() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAdmin } = useAuth();
  const { hasRole } = useUserRoles();
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Parse tags from URL
  const urlTags = searchParams.get('tags');
  const initialTags = urlTags ? urlTags.split(',').filter(Boolean) : [];

  // Filters state
  const [filters, setFilters] = useState<IncidentFilters>({
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || '',
    severity: searchParams.get('severity') || '',
    eventType: searchParams.get('type') || '',
    branchId: searchParams.get('branch') || '',
    contractorId: searchParams.get('contractor') || undefined,
    dateRange: undefined,
    tags: initialTags,
  });

  // Memoize filters for useIncidents to prevent infinite re-fetching
  const incidentsFilters = useMemo(() => ({
    search: filters.search,
    status: filters.status,
    severity: filters.severity,
    eventType: filters.eventType,
    branchId: filters.branchId,
    contractorId: filters.contractorId,
    dateRange: filters.dateRange,
    tags: filters.tags
  }), [filters]);

  // Fetch incidents with server-side filtering and pagination
  const { data: incidentsData, isLoading, refetch } = useIncidents({
    page,
    pageSize,
    filters: incidentsFilters
  });

  const incidents = incidentsData?.data || [];
  const totalCount = incidentsData?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const { tags: incidentTags } = useAITags('incident');
  const { exportEvents } = useHSSEEventsExport();
  const [hasHSSEAccess, setHasHSSEAccess] = useState(false);

  // View mode state (persisted in URL)
  const viewMode = (searchParams.get('view') as 'cards' | 'table') || 'cards';

  // Regular delete dialog (for non-closed incidents by admin)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [incidentToDelete, setIncidentToDelete] = useState<string | null>(null);
  const [incidentToDeleteStatus, setIncidentToDeleteStatus] = useState<string | null>(null);

  // Password-protected delete dialog (for closed incidents by HSSE Manager)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [deletionPassword, setDeletionPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const deleteIncident = useDeleteIncident();
  const updateStatus = useUpdateIncidentStatus();
  const { deleteClosedIncident, isLoading: isDeletingClosed, checkStatus, isConfigured } = useDeletionPassword();

  const isHSSEManager = isAdmin || hasRole('hsse_manager');

  useEffect(() => {
    const checkAccess = async () => {
      if (!user?.id) return;
      const { data } = await supabase.rpc('has_hsse_incident_access', { _user_id: user.id });
      setHasHSSEAccess(data === true);
    };
    checkAccess();
  }, [user?.id]);

  useEffect(() => {
    if (isHSSEManager) {
      checkStatus();
    }
  }, [isHSSEManager, checkStatus]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  // Client-side KPI stats (Note: Currently reflects only the fetched page. Ideally should be server-side aggregated)
  // For now, we will hide the strict counts or just show them for the current view, 
  // but to avoid confusion let's keep the component but maybe accept it's "Current View Stats" 
  // or we need a separate hook for global stats.
  const kpiStats = useMemo(() => {
    if (!incidents) return { totalOpen: 0, criticalHigh: 0, overdue: 0, pendingActions: 0 };

    const closedStatuses = ['closed', 'no_investigation_required', 'investigation_closed'];
    const rejectedStatuses = ['expert_rejected', 'manager_rejected'];
    const criticalSeverities = ['level_4', 'level_5'];
    const pendingActionStatuses = [
      'pending_manager_approval',
      'pending_dept_rep_approval',
      'pending_dept_rep_incident_review',
      'pending_hsse_escalation_review',
      'hsse_manager_escalation',
      'pending_closure',
      'pending_final_closure'
    ];

    const totalOpen = incidents.filter(i =>
      !closedStatuses.includes(i.status || '') &&
      !rejectedStatuses.includes(i.status || '') &&
      !pendingActionStatuses.includes(i.status || '')
    ).length;

    const criticalHigh = incidents.filter(i =>
      criticalSeverities.includes(i.severity_v2 || '') &&
      !closedStatuses.includes(i.status || '')
    ).length;

    const overdue = incidents.filter(i => {
      if (!i.occurred_at || closedStatuses.includes(i.status || '')) return false;
      return isPast(addDays(new Date(i.occurred_at), 7));
    }).length;

    const pendingActions = incidents.filter(i =>
      pendingActionStatuses.includes(i.status || '')
    ).length;

    return { totalOpen, criticalHigh, overdue, pendingActions };
  }, [incidents]);

  // Get unique branches for filter - fetch branches separately
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    const fetchBranches = async () => {
      const { data } = await supabase
        .from('branches')
        .select('id, name')
        .order('name');
      if (data) setBranches(data);
    };
    fetchBranches();
  }, []);

  const handleViewModeChange = (mode: 'cards' | 'table') => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('view', mode);
    setSearchParams(newParams);
  };

  const handleFiltersChange = (newFilters: IncidentFilters) => {
    setFilters(newFilters);
    // Update URL params
    const newParams = new URLSearchParams(searchParams);
    if (newFilters.search) newParams.set('search', newFilters.search);
    else newParams.delete('search');
    if (newFilters.status) newParams.set('status', newFilters.status);
    else newParams.delete('status');
    if (newFilters.severity) newParams.set('severity', newFilters.severity);
    else newParams.delete('severity');
    if (newFilters.eventType) newParams.set('type', newFilters.eventType);
    else newParams.delete('type');
    if (newFilters.branchId) newParams.set('branch', newFilters.branchId);
    else newParams.delete('branch');
    if (newFilters.contractorId) newParams.set('contractor', newFilters.contractorId);
    else newParams.delete('contractor');
    if (newFilters.tags.length > 0) newParams.set('tags', newFilters.tags.join(','));
    else newParams.delete('tags');
    setSearchParams(newParams);
  };

  const handleKPIClick = (filter: string) => {
    switch (filter) {
      case 'open':
        handleFiltersChange({ ...filters, status: 'submitted' });
        break;
      case 'critical':
        handleFiltersChange({ ...filters, severity: 'level_5' });
        break;
      default:
        break;
    }
  };

  const handleStartInvestigation = async (incidentId: string) => {
    await updateStatus.mutateAsync({ id: incidentId, status: 'investigation_in_progress' });
    navigate(`/incidents/investigate?incident=${incidentId}`);
  };

  const handleExport = useCallback((format: 'pdf' | 'excel') => {
    exportEvents(format, filters);
  }, [exportEvents, filters]);

  const handleDeleteClick = (incidentId: string, status: string | null) => {
    setIncidentToDelete(incidentId);
    setIncidentToDeleteStatus(status);

    if (status === 'closed') {
      setPasswordDialogOpen(true);
    } else {
      setDeleteDialogOpen(true);
    }
  };

  const canDeleteIncident = (status: string | null) => {
    if (status === 'closed') return isHSSEManager;
    return isAdmin;
  };

  const handleConfirmDelete = async () => {
    if (incidentToDelete) {
      await deleteIncident.mutateAsync(incidentToDelete);
      setDeleteDialogOpen(false);
      setIncidentToDelete(null);
      refetch(); // Refetch to update list
    }
  };

  const handlePasswordDelete = async () => {
    if (!incidentToDelete || !deletionPassword) return;

    setPasswordError(null);
    const success = await deleteClosedIncident(incidentToDelete, deletionPassword);

    if (success) {
      setPasswordDialogOpen(false);
      setIncidentToDelete(null);
      setDeletionPassword('');
      refetch();
    } else {
      setPasswordError(t('profile.deletionPassword.invalidPassword'));
    }
  };

  const handlePasswordDialogClose = (open: boolean) => {
    if (!open) {
      setDeletionPassword('');
      setPasswordError(null);
      setIncidentToDelete(null);
    }
    setPasswordDialogOpen(open);
  };

  return (
    <div className="container py-6 space-y-6" dir={direction}>
      {/* Header */}
      <IncidentListHeader
        totalCount={totalCount}
        filteredCount={totalCount}
        hasHSSEAccess={hasHSSEAccess}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onExport={handleExport}
      />

      {/* Summary Section - KPI Strip */}
      <section>
        <IncidentKPIStrip
          totalOpen={kpiStats.totalOpen}
          criticalHigh={kpiStats.criticalHigh}
          overdue={kpiStats.overdue}
          pendingActions={kpiStats.pendingActions}
          onKPIClick={handleKPIClick}
        />
      </section>

      {/* Filters */}
      <IncidentFilterPanel
        filters={filters}
        onFiltersChange={handleFiltersChange}
        branches={branches}
        availableTags={incidentTags}
      />

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-32" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-4 w-48" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : incidents && incidents.length > 0 ? (
        <div className="space-y-4">
          {viewMode === 'table' ? (
            <IncidentTableView
              incidents={incidents.map(i => ({
                ...i,
                incident_type: (i as any).incident_type,
              })) as any}
              hasHSSEAccess={hasHSSEAccess}
              isAdmin={isAdmin}
              isHSSEManager={isHSSEManager}
              onStartInvestigation={handleStartInvestigation}
              onDelete={handleDeleteClick}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {incidents.map((incident) => (
                <IncidentCardEnhanced
                  key={incident.id}
                  incident={{
                    ...incident,
                    incident_type: (incident as any).incident_type,
                  } as any}
                  hasHSSEAccess={hasHSSEAccess}
                  canDelete={canDeleteIncident(incident.status)}
                  onStartInvestigation={handleStartInvestigation}
                  onDelete={handleDeleteClick}
                />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-4">
              <div className="text-sm text-muted-foreground">
                {t('common.showing', 'Showing')} {(page - 1) * pageSize + 1} {t('common.to', 'to')} {Math.min(page * pageSize, totalCount)} {t('common.of', 'of')} {totalCount} {t('common.results', 'results')}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  {t('common.previous', 'Previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  {t('common.next', 'Next')}
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('common.noData')}</h3>
            <p className="text-muted-foreground mb-4">
              {filters.search || filters.status || filters.severity || filters.eventType || filters.branchId
                ? t('common.noResultsFound', 'No results match your filters')
                : t('incidents.noIncidentsYet')}
            </p>
            {!filters.search && !filters.status && !filters.severity && (
              <Button asChild>
                <Link to="/incidents/report" className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t('incidents.reportFirstIncident')}
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog (for non-closed incidents) */}
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

      {/* Password-Protected Delete Dialog (for closed incidents) */}
      <Dialog open={passwordDialogOpen} onOpenChange={handlePasswordDialogClose}>
        <DialogContent dir={direction}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              {t('incidents.delete')}
            </DialogTitle>
            <DialogDescription>
              {t('profile.deletionPassword.enterPassword')}
            </DialogDescription>
          </DialogHeader>

          {!isConfigured ? (
            <div className="py-4">
              <p className="text-sm text-destructive">
                {t('profile.deletionPassword.notConfiguredError')}
              </p>
            </div>
          ) : (
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="deletion-password">{t('profile.deletionPassword.title')}</Label>
                <Input
                  id="deletion-password"
                  type="password"
                  value={deletionPassword}
                  onChange={(e) => setDeletionPassword(e.target.value)}
                  placeholder="••••••"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && deletionPassword) {
                      handlePasswordDelete();
                    }
                  }}
                />
              </div>

              {passwordError && (
                <p className="text-sm text-destructive">{passwordError}</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => handlePasswordDialogClose(false)}>
              {t('common.cancel')}
            </Button>
            {isConfigured && (
              <Button
                onClick={handlePasswordDelete}
                disabled={isDeletingClosed || !deletionPassword}
                variant="destructive"
              >
                {isDeletingClosed ? t('common.deleting') : t('common.delete')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
