import { useTranslation } from 'react-i18next';
import { format, formatDistanceToNow } from 'date-fns';
import { User, HardHat, LogOut, Clock, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { UnifiedAccessEntry, EntityType } from '@/hooks/use-unified-access';

interface UnifiedAccessLogTableProps {
  entries: UnifiedAccessEntry[];
  isLoading?: boolean;
  onRecordExit?: (entryId: string, source?: 'gate_entry_logs' | 'contractor_access_logs') => void;
  showExitButton?: boolean;
  compact?: boolean;
}

const entityIcons: Record<EntityType, typeof User> = {
  visitor: User,
  worker: HardHat,
  contractor: HardHat,
  employee: User,
  vehicle: User,
};

const entityColors: Record<EntityType, string> = {
  visitor: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
  worker: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300',
  contractor: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300',
  employee: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
  vehicle: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300',
};

function getStatusBadge(status: string | null | undefined) {
  if (!status) return null;
  
  switch (status) {
    case 'valid':
      return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="h-3 w-3 me-1" />Valid</Badge>;
    case 'warning':
      return <Badge variant="secondary" className="bg-yellow-500 text-white"><AlertTriangle className="h-3 w-3 me-1" />Warning</Badge>;
    case 'denied':
      return <Badge variant="destructive"><XCircle className="h-3 w-3 me-1" />Denied</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function UnifiedAccessLogTable({ 
  entries, 
  isLoading, 
  onRecordExit, 
  showExitButton = true,
  compact = false 
}: UnifiedAccessLogTableProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
        <p>{t('security.accessControl.noEntries', 'No access entries found')}</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {entries.map((entry) => {
          const Icon = entityIcons[entry.entity_type] || User;
          const colorClass = entityColors[entry.entity_type] || entityColors.visitor;
          const isOnSite = !entry.exit_time;
          const initials = entry.person_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

          return (
            <div 
              key={entry.id} 
              className={`flex items-center gap-3 p-3 border rounded-lg ${isOnSite ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : ''}`}
            >
              <Avatar className="h-9 w-9 flex-shrink-0">
                <AvatarFallback className={colorClass}>{initials}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate text-sm">{entry.person_name}</span>
                  <Badge variant="outline" className="text-xs gap-1">
                    <Icon className="h-3 w-3" />
                    {t(`security.accessControl.entityTypes.${entry.entity_type}`, entry.entity_type)}
                  </Badge>
                  {isOnSite && <Badge variant="default" className="bg-green-600 text-xs">On Site</Badge>}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <Clock className="h-3 w-3" />
                  <span>{format(new Date(entry.entry_time), 'HH:mm')}</span>
                  {entry.exit_time && (
                    <>
                      <span>→</span>
                      <span>{format(new Date(entry.exit_time), 'HH:mm')}</span>
                    </>
                  )}
                  {!entry.exit_time && (
                    <span className="text-primary">
                      ({formatDistanceToNow(new Date(entry.entry_time), { addSuffix: false })})
                    </span>
                  )}
                </div>
              </div>
              
              {showExitButton && isOnSite && onRecordExit && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onRecordExit(entry.id, entry.worker ? 'contractor_access_logs' : 'gate_entry_logs')}
                  className="gap-1 text-xs"
                >
                  <LogOut className="h-3 w-3" />
                  Exit
                </Button>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('security.accessControl.person', 'Person')}</TableHead>
          <TableHead>{t('security.accessControl.type', 'Type')}</TableHead>
          <TableHead>{t('security.accessControl.entryTime', 'Entry')}</TableHead>
          <TableHead>{t('security.accessControl.exitTime', 'Exit')}</TableHead>
          <TableHead>{t('security.accessControl.status', 'Status')}</TableHead>
          {showExitButton && <TableHead className="text-end">{t('common.actions', 'Actions')}</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => {
          const Icon = entityIcons[entry.entity_type] || User;
          const colorClass = entityColors[entry.entity_type] || entityColors.visitor;
          const isOnSite = !entry.exit_time;
          const initials = entry.person_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

          return (
            <TableRow key={entry.id} className={isOnSite ? 'bg-green-50/50 dark:bg-green-950/10' : ''}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className={colorClass}>{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{entry.person_name}</div>
                    {entry.worker?.company?.company_name && (
                      <div className="text-xs text-muted-foreground">{entry.worker.company.company_name}</div>
                    )}
                    {entry.destination_name && (
                      <div className="text-xs text-muted-foreground">→ {entry.destination_name}</div>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="gap-1">
                  <Icon className="h-3 w-3" />
                  {t(`security.accessControl.entityTypes.${entry.entity_type}`, entry.entity_type)}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm">{format(new Date(entry.entry_time), 'HH:mm')}</div>
                <div className="text-xs text-muted-foreground">{format(new Date(entry.entry_time), 'dd MMM')}</div>
              </TableCell>
              <TableCell>
                {entry.exit_time ? (
                  <div className="text-sm">{format(new Date(entry.exit_time), 'HH:mm')}</div>
                ) : (
                  <Badge variant="default" className="bg-green-600">On Site</Badge>
                )}
              </TableCell>
              <TableCell>
                {getStatusBadge(entry.validation_status)}
              </TableCell>
              {showExitButton && (
                <TableCell className="text-end">
                  {isOnSite && onRecordExit && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onRecordExit(entry.id, entry.worker ? 'contractor_access_logs' : 'gate_entry_logs')}
                      className="gap-1"
                    >
                      <LogOut className="h-4 w-4" />
                      {t('security.accessControl.recordExit', 'Record Exit')}
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
