import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Clock, CheckCircle2, XCircle, AlertTriangle, User } from "lucide-react";
import { WorkerAccessLog, useRecordWorkerExit } from "@/hooks/contractor-management/use-worker-access-logs";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

interface WorkerAccessLogTableProps {
  logs: WorkerAccessLog[];
  showExitButton?: boolean;
  isLoading?: boolean;
}

export function WorkerAccessLogTable({ logs, showExitButton = true, isLoading }: WorkerAccessLogTableProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  const locale = isRtl ? ar : undefined;
  const recordExit = useRecordWorkerExit();
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  // Fetch photo URLs
  useEffect(() => {
    const fetchPhotoUrls = async () => {
      const urls: Record<string, string> = {};
      for (const log of logs) {
        if (log.worker?.photo_path && !photoUrls[log.worker.id]) {
          const { data } = supabase.storage
            .from('contractor-photos')
            .getPublicUrl(log.worker.photo_path);
          if (data?.publicUrl) {
            urls[log.worker.id] = data.publicUrl;
          }
        }
      }
      if (Object.keys(urls).length > 0) {
        setPhotoUrls(prev => ({ ...prev, ...urls }));
      }
    };
    fetchPhotoUrls();
  }, [logs]);

  const getStatusBadge = (log: WorkerAccessLog) => {
    if (log.exit_time) {
      return (
        <Badge variant="outline" className="bg-muted">
          <CheckCircle2 className="h-3 w-3 me-1" />
          {t('security.accessHistory.exited', 'Exited')}
        </Badge>
      );
    }
    
    if (log.validation_status === 'valid' || log.validation_status === 'granted') {
      return (
        <Badge className="bg-green-600">
          <CheckCircle2 className="h-3 w-3 me-1" />
          {t('security.accessHistory.onSite', 'On Site')}
        </Badge>
      );
    }
    
    if (log.validation_status === 'warning') {
      return (
        <Badge variant="outline" className="border-yellow-500 text-yellow-600">
          <AlertTriangle className="h-3 w-3 me-1" />
          {t('security.accessHistory.warning', 'Warning')}
        </Badge>
      );
    }
    
    return (
      <Badge variant="destructive">
        <XCircle className="h-3 w-3 me-1" />
        {t('security.accessHistory.denied', 'Denied')}
      </Badge>
    );
  };

  const formatTime = (dateStr: string) => {
    return format(new Date(dateStr), 'HH:mm', { locale });
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale });
  };

  const handleRecordExit = (log: WorkerAccessLog) => {
    recordExit.mutate({ logId: log.id });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>{t('security.accessHistory.noLogs', 'No access logs found')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-start">{t('security.accessHistory.worker', 'Worker')}</TableHead>
            <TableHead className="text-start">{t('security.accessHistory.company', 'Company')}</TableHead>
            <TableHead className="text-start">{t('security.accessHistory.date', 'Date')}</TableHead>
            <TableHead className="text-start">{t('security.accessHistory.entryTime', 'Entry')}</TableHead>
            <TableHead className="text-start">{t('security.accessHistory.exitTime', 'Exit')}</TableHead>
            <TableHead className="text-start">{t('security.accessHistory.status', 'Status')}</TableHead>
            {showExitButton && (
              <TableHead className="text-start">{t('common.actions', 'Actions')}</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={photoUrls[log.worker?.id || '']} />
                    <AvatarFallback>
                      {log.worker?.full_name?.charAt(0) || 'W'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{log.worker?.full_name || '-'}</div>
                    <div className="text-xs text-muted-foreground">
                      {log.worker?.national_id || '-'}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {log.worker?.company?.company_name || '-'}
              </TableCell>
              <TableCell>{formatDate(log.entry_time)}</TableCell>
              <TableCell>
                <Badge variant="outline" className="bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400">
                  {formatTime(log.entry_time)}
                </Badge>
              </TableCell>
              <TableCell>
                {log.exit_time ? (
                  <Badge variant="outline" className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400">
                    {formatTime(log.exit_time)}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>{getStatusBadge(log)}</TableCell>
              {showExitButton && (
                <TableCell>
                  {!log.exit_time && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRecordExit(log)}
                      disabled={recordExit.isPending}
                    >
                      <LogOut className="h-4 w-4 me-1" />
                      {t('security.accessHistory.recordExit', 'Exit')}
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
