import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Clock, Eye, Filter, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePendingApprovals, useAdminOverrideApproval, type PendingApprovalIncident } from '@/hooks/use-admin-override-approval';
import { PageLoader } from '@/components/ui/page-loader';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

const STATUS_OPTIONS = [
  'all',
  'pending_dept_rep_approval',
  'pending_dept_rep_incident_review',
  'pending_manager_approval',
  'pending_hsse_escalation_review',
  'pending_hsse_validation',
  'pending_investigation_approval',
];

export default function PendingApprovalsOverride() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRtl = i18n.language === 'ar';
  const dateLocale = isRtl ? ar : enUS;

  const [statusFilter, setStatusFilter] = useState('all');
  const [minDaysFilter, setMinDaysFilter] = useState(0);
  const [selectedIncident, setSelectedIncident] = useState<PendingApprovalIncident | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [originalApprover, setOriginalApprover] = useState('');

  const { data: incidents, isLoading } = usePendingApprovals(minDaysFilter);
  const override = useAdminOverrideApproval();

  const filteredIncidents = incidents?.filter(
    (i) => statusFilter === 'all' || i.status === statusFilter
  ) || [];

  const handleOverride = async () => {
    if (!selectedIncident || overrideReason.length < 10) return;

    await override.mutateAsync({
      incidentId: selectedIncident.id,
      overrideReason,
      originalApprover: originalApprover || selectedIncident.assigned_to_name || 'Unknown',
    });

    setSelectedIncident(null);
    setOverrideReason('');
    setOriginalApprover('');
  };

  const getStatusBadgeVariant = (status: string) => {
    if (status.includes('pending')) return 'warning';
    return 'default';
  };

  const getDaysStuckColor = (days: number) => {
    if (days >= 7) return 'text-destructive';
    if (days >= 3) return 'text-amber-600 dark:text-amber-400';
    return 'text-muted-foreground';
  };

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            {t('admin.override.title')}
          </h1>
          <p className="text-muted-foreground">{t('admin.override.description')}</p>
        </div>
        <Badge variant="outline" className="self-start">
          {filteredIncidents.length} {t('admin.override.pendingItems')}
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            {t('common.filters')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1 space-y-2">
              <Label>{t('admin.override.filterByStatus')}</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status === 'all' ? t('common.all') : t(`incident.statuses.${status}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-40 space-y-2">
              <Label>{t('admin.override.minDaysStuck')}</Label>
              <Select value={minDaysFilter.toString()} onValueChange={(v) => setMinDaysFilter(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">{t('common.all')}</SelectItem>
                  <SelectItem value="1">1+ {t('common.days')}</SelectItem>
                  <SelectItem value="3">3+ {t('common.days')}</SelectItem>
                  <SelectItem value="7">7+ {t('common.days')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Incidents Table */}
      <Card>
        <CardContent className="p-0">
          {filteredIncidents.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <ShieldCheck className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">{t('admin.override.noItems')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.reference')}</TableHead>
                    <TableHead>{t('common.type')}</TableHead>
                    <TableHead>{t('common.title')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead>{t('common.department')}</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {t('admin.override.stuckFor')}
                      </div>
                    </TableHead>
                    <TableHead className="text-end">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIncidents.map((incident) => (
                    <TableRow key={incident.id}>
                      <TableCell className="font-mono text-sm">{incident.reference_id}</TableCell>
                      <TableCell>
                        <Badge variant={incident.event_type === 'incident' ? 'destructive' : 'secondary'}>
                          {t(`incident.eventTypes.${incident.event_type}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{incident.title}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(incident.status) as any}>
                          {t(`incident.statuses.${incident.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>{incident.department_name || '-'}</TableCell>
                      <TableCell>
                        <span className={getDaysStuckColor(incident.days_stuck)}>
                          {incident.days_stuck} {t('common.days')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/incidents/${incident.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-amber-500 text-amber-700 hover:bg-amber-100 dark:text-amber-400"
                            onClick={() => {
                              setSelectedIncident(incident);
                              setOriginalApprover(incident.assigned_to_name || '');
                            }}
                          >
                            {t('admin.override.override')}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Override Dialog */}
      <Dialog open={!!selectedIncident} onOpenChange={(open) => !open && setSelectedIncident(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              {t('admin.override.modalTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('admin.override.modalDescription')}
            </DialogDescription>
          </DialogHeader>

          {selectedIncident && (
            <div className="space-y-4 py-4">
              <Alert>
                <AlertDescription>
                  <div className="space-y-1 text-sm">
                    <p><strong>{t('common.reference')}:</strong> {selectedIncident.reference_id}</p>
                    <p><strong>{t('common.title')}:</strong> {selectedIncident.title}</p>
                    <p><strong>{t('admin.override.currentStatus')}:</strong> {t(`incident.statuses.${selectedIncident.status}`)}</p>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="dialogOriginalApprover">{t('admin.override.originalApprover')}</Label>
                <Input
                  id="dialogOriginalApprover"
                  value={originalApprover}
                  onChange={(e) => setOriginalApprover(e.target.value)}
                  placeholder={t('admin.override.originalApproverPlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dialogOverrideReason">
                  {t('admin.override.reason')} <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="dialogOverrideReason"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder={t('admin.override.reasonPlaceholder')}
                  rows={4}
                  className={overrideReason.length > 0 && overrideReason.length < 10 ? 'border-destructive' : ''}
                />
                {overrideReason.length > 0 && overrideReason.length < 10 && (
                  <p className="text-xs text-destructive">{t('admin.override.reasonMinLength')}</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSelectedIncident(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleOverride}
              disabled={overrideReason.length < 10 || override.isPending}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {override.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {t('admin.override.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
