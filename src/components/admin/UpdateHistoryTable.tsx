import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X, AlertTriangle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import type { AppUpdate } from '@/hooks/use-app-updates';

interface UpdateHistoryTableProps {
  updates: AppUpdate[];
  isLoading: boolean;
}

export function UpdateHistoryTable({ updates, isLoading }: UpdateHistoryTableProps) {
  const { t } = useTranslation();

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <Badge variant="destructive">{t('admin.updates.critical', 'Critical')}</Badge>;
      case 'important':
        return <Badge className="bg-warning text-warning-foreground">{t('admin.updates.important', 'Important')}</Badge>;
      default:
        return <Badge variant="secondary">{t('admin.updates.normal', 'Normal')}</Badge>;
    }
  };

  const getSuccessRate = (update: AppUpdate) => {
    if (update.total_recipients === 0) return 100;
    return Math.round((update.successful_sends / update.total_recipients) * 100);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (updates.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>{t('admin.updates.noHistory', 'No broadcasts yet')}</p>
        <p className="text-sm">{t('admin.updates.noHistoryDesc', 'Broadcast your first update to see it here')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('admin.updates.version', 'Version')}</TableHead>
            <TableHead>{t('admin.updates.priority', 'Priority')}</TableHead>
            <TableHead className="text-center">{t('admin.updates.delivered', 'Delivered')}</TableHead>
            <TableHead className="text-center">{t('admin.updates.success', 'Success')}</TableHead>
            <TableHead>{t('admin.updates.broadcastAt', 'Broadcast At')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {updates.map((update) => {
            const successRate = getSuccessRate(update);
            return (
              <TableRow key={update.id}>
                <TableCell className="font-mono font-medium">
                  {update.version}
                </TableCell>
                <TableCell>
                  {getPriorityBadge(update.priority)}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>{update.successful_sends}</span>
                    {update.failed_sends > 0 && (
                      <>
                        <span className="text-muted-foreground">/</span>
                        <X className="h-4 w-4 text-destructive" />
                        <span className="text-destructive">{update.failed_sends}</span>
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge 
                    variant={successRate >= 90 ? 'default' : successRate >= 70 ? 'secondary' : 'destructive'}
                    className="min-w-[4rem]"
                  >
                    {successRate}%
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    <div className="text-sm">
                      {format(new Date(update.broadcast_at), 'PP')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(update.broadcast_at), { addSuffix: true })}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
