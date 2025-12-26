import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  ShieldCheck, 
  Clock, 
  AlertTriangle, 
  Filter, 
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useHSSEValidationDashboard } from '@/hooks/use-hsse-validation-dashboard';
import { useHSSEValidation } from '@/hooks/use-hsse-validation';
import { useSites } from '@/hooks/use-sites';
import { getSeverityBadgeVariant } from '@/lib/hsse-severity-levels';
import { toast } from 'sonner';

export default function HSSEValidationDashboard() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [siteFilter, setSiteFilter] = useState<string>('');

  const { data, isLoading, refetch } = useHSSEValidationDashboard({
    severityFilter: severityFilter || undefined,
    siteId: siteFilter || undefined,
  });
  const { data: sites } = useSites();
  const validation = useHSSEValidation();

  const handleQuickAccept = async (incidentId: string) => {
    try {
      await validation.mutateAsync({
        incidentId,
        decision: 'accept',
      });
      toast.success(t('hsseValidationDashboard.accepted', 'Observation accepted'));
      refetch();
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  const stats = data?.stats;
  const pendingValidations = data?.pending_validations || [];

  return (
    <div className="container py-6 space-y-6" dir={direction}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            {t('hsseValidationDashboard.title', 'HSSE Validation Dashboard')}
          </h1>
          <p className="text-muted-foreground">
            {t('hsseValidationDashboard.subtitle', 'Manage pending observation validations')}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('hsseValidationDashboard.pendingValidation', 'Pending Validation')}
                </p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-warning">{stats?.pending_validation || 0}</p>
                )}
              </div>
              <Clock className="h-8 w-8 text-warning/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('hsseValidationDashboard.pendingClosure', 'Pending Closure')}
                </p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-primary">{stats?.pending_closure || 0}</p>
                )}
              </div>
              <ShieldCheck className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('hsseValidationDashboard.level5Critical', 'Level 5 (Critical)')}
                </p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-destructive">{stats?.level_5_count || 0}</p>
                )}
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('hsseValidationDashboard.avgPendingDays', 'Avg. Pending Days')}
                </p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{stats?.avg_pending_days?.toFixed(1) || 0}</p>
                )}
              </div>
              <Clock className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <CardTitle className="text-base">{t('common.filters', 'Filters')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="w-48">
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('hsseValidationDashboard.allSeverities', 'All Severities')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('hsseValidationDashboard.allSeverities', 'All Severities')}</SelectItem>
                  <SelectItem value="level_3">{t('severity.level_3.label', 'Level 3')}</SelectItem>
                  <SelectItem value="level_4">{t('severity.level_4.label', 'Level 4')}</SelectItem>
                  <SelectItem value="level_5">{t('severity.level_5.label', 'Level 5')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Select value={siteFilter} onValueChange={setSiteFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('hsseValidationDashboard.allSites', 'All Sites')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('hsseValidationDashboard.allSites', 'All Sites')}</SelectItem>
                  {sites?.map(site => (
                    <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Validations Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('hsseValidationDashboard.pendingTasks', 'Pending Validation Tasks')}</CardTitle>
          <CardDescription>
            {t('hsseValidationDashboard.pendingTasksDescription', 'Observations requiring HSSE expert review')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : pendingValidations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShieldCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('hsseValidationDashboard.noPending', 'No pending validations')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.reference', 'Reference')}</TableHead>
                    <TableHead>{t('common.title', 'Title')}</TableHead>
                    <TableHead>{t('common.severity', 'Severity')}</TableHead>
                    <TableHead>{t('common.status', 'Status')}</TableHead>
                    <TableHead>{t('common.site', 'Site')}</TableHead>
                    <TableHead>{t('hsseValidationDashboard.daysPending', 'Days Pending')}</TableHead>
                    <TableHead className="text-end">{t('common.actions', 'Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingValidations.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">{item.reference_id}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{item.title}</TableCell>
                      <TableCell>
                        <Badge variant={getSeverityBadgeVariant(item.severity_v2)}>
                          {t(`severity.${item.severity_v2}.label`, item.severity_v2)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.status === 'pending_final_closure' ? 'default' : 'secondary'}>
                          {t(`incidents.status.${item.status}`, item.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.site_name || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={item.days_pending > 5 ? 'destructive' : 'outline'}>
                          {Math.floor(item.days_pending)} {t('common.days', 'days')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          {item.status === 'pending_hsse_validation' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-chart-3 hover:text-chart-3"
                              onClick={() => handleQuickAccept(item.id)}
                              disabled={validation.isPending}
                            >
                              {validation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" asChild>
                            <Link to={`/incidents/${item.id}`}>
                              <ExternalLink className="h-4 w-4" />
                            </Link>
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
    </div>
  );
}
