import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslation } from 'react-i18next';
import { ContractorAccessLog, useRecordExit } from '@/hooks/use-contractors';
import { format } from 'date-fns';
import { LogOut, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface ContractorAccessLogTableProps {
  logs: ContractorAccessLog[];
  isLoading?: boolean;
}

export function ContractorAccessLogTable({ logs, isLoading }: ContractorAccessLogTableProps) {
  const { t } = useTranslation();
  const recordExit = useRecordExit();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'passed':
        return (
          <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="h-3 w-3" />
            {t('security.contractors.accessGranted')}
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            {t('security.contractors.accessDenied')}
          </Badge>
        );
      case 'warning':
        return (
          <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-700 dark:text-yellow-400">
            <AlertTriangle className="h-3 w-3" />
            {t('security.contractors.accessWarning')}
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        {t('common.loading')}...
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        {t('security.contractors.noAccessLogs')}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('security.contractors.contractor')}</TableHead>
            <TableHead>{t('security.contractors.entryTime')}</TableHead>
            <TableHead>{t('security.contractors.exitTime')}</TableHead>
            <TableHead>{t('security.contractors.status')}</TableHead>
            <TableHead>{t('security.contractors.accessType')}</TableHead>
            <TableHead className="text-end">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => {
            const contractor = log.contractor as any;
            return (
              <TableRow key={log.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={contractor?.photo_path || undefined} />
                      <AvatarFallback>
                        {contractor?.full_name?.slice(0, 2).toUpperCase() || '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{contractor?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{contractor?.company_name}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {format(new Date(log.entry_time), 'dd/MM/yyyy HH:mm')}
                </TableCell>
                <TableCell>
                  {log.exit_time ? (
                    format(new Date(log.exit_time), 'dd/MM/yyyy HH:mm')
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {getStatusBadge(log.validation_status)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {log.access_type === 'entry' ? t('security.contractors.entry') : t('security.contractors.exit')}
                  </Badge>
                </TableCell>
                <TableCell className="text-end">
                  {!log.exit_time && log.validation_status === 'passed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => recordExit.mutate(log.id)}
                      disabled={recordExit.isPending}
                    >
                      <LogOut className="h-4 w-4 me-1" />
                      {t('security.contractors.recordExit')}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
