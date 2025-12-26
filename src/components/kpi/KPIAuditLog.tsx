import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { History, Plus, Edit2, Trash2 } from 'lucide-react';
import { useKPIAuditLogs, KPI_METADATA } from '@/hooks/use-kpi-targets-admin';

export function KPIAuditLog() {
  const { t, i18n } = useTranslation();
  const { data: logs, isLoading } = useKPIAuditLogs();
  const isRTL = i18n.dir() === 'rtl';

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created': return <Plus className="h-3.5 w-3.5" />;
      case 'updated': return <Edit2 className="h-3.5 w-3.5" />;
      case 'deleted': return <Trash2 className="h-3.5 w-3.5" />;
      default: return <History className="h-3.5 w-3.5" />;
    }
  };

  const getActionBadgeVariant = (action: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (action) {
      case 'created': return 'default';
      case 'updated': return 'secondary';
      case 'deleted': return 'destructive';
      default: return 'outline';
    }
  };

  const formatValue = (value: Record<string, unknown> | null) => {
    if (!value) return '-';
    const parts = [];
    if (value.target_value !== undefined) parts.push(`T: ${value.target_value}`);
    if (value.warning_threshold !== undefined) parts.push(`W: ${value.warning_threshold}`);
    if (value.critical_threshold !== undefined) parts.push(`C: ${value.critical_threshold}`);
    return parts.join(' | ') || '-';
  };

  const getKPIName = (code: string) => {
    const meta = KPI_METADATA[code];
    if (meta) {
      return isRTL ? meta.nameAr : meta.name;
    }
    return code;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('kpiAdmin.auditLog', 'Audit Log')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle>{t('kpiAdmin.auditLog', 'Audit Log')}</CardTitle>
            <CardDescription>
              {t('kpiAdmin.auditLogDescription', 'History of all KPI target changes')}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {logs && logs.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('kpiAdmin.dateTime', 'Date & Time')}</TableHead>
                  <TableHead>{t('kpiAdmin.kpi', 'KPI')}</TableHead>
                  <TableHead>{t('kpiAdmin.action', 'Action')}</TableHead>
                  <TableHead>{t('kpiAdmin.previousValue', 'Previous')}</TableHead>
                  <TableHead>{t('kpiAdmin.newValue', 'New')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(
                        new Date(log.changed_at),
                        'dd MMM yyyy HH:mm',
                        { locale: isRTL ? ar : undefined }
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {getKPIName(log.kpi_code)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getActionBadgeVariant(log.action_type)} className="gap-1">
                        {getActionIcon(log.action_type)}
                        {t(`kpiAdmin.action_${log.action_type}`, log.action_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">
                      {formatValue(log.old_value)}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {formatValue(log.new_value)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>{t('kpiAdmin.noAuditLogs', 'No audit logs yet')}</p>
            <p className="text-sm">{t('kpiAdmin.noAuditLogsDescription', 'Changes to KPI targets will be recorded here')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
