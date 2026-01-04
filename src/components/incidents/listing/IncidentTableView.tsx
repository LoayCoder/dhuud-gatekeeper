import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  PlayCircle, 
  Lock,
  ArrowUpDown,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { IncidentStatusBadge } from '@/components/incidents/IncidentStatusBadge';
import { formatDistanceToNow, format, isPast, addDays } from 'date-fns';
import { getSeverityBadgeVariant } from '@/lib/hsse-severity-levels';
import { getStatusBackgroundColor } from '@/lib/incident-status-colors';
import { cn } from '@/lib/utils';

interface Incident {
  id: string;
  title: string;
  reference_id: string;
  event_type: string;
  status: string | null;
  severity_v2: string | null;
  incident_type?: string;
  subtype?: string;
  occurred_at: string | null;
  created_at: string | null;
  branch?: { name: string } | null;
  site?: { name: string } | null;
  location?: string | null;
}

interface IncidentTableViewProps {
  incidents: Incident[];
  hasHSSEAccess: boolean;
  isAdmin: boolean;
  isHSSEManager: boolean;
  onStartInvestigation?: (id: string) => void;
  onDelete?: (id: string, status: string | null) => void;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (field: string) => void;
}

export function IncidentTableView({
  incidents,
  hasHSSEAccess,
  isAdmin,
  isHSSEManager,
  onStartInvestigation,
  onDelete,
  sortField,
  sortDirection,
  onSort,
}: IncidentTableViewProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();

  const canDeleteIncident = (status: string | null) => {
    if (status === 'closed') return isHSSEManager;
    return isAdmin;
  };

  const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 gap-1 -ms-3"
      onClick={() => onSort?.(field)}
    >
      {children}
      <ArrowUpDown className={cn(
        "h-3 w-3",
        sortField === field && "text-primary"
      )} />
    </Button>
  );

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[140px]">
              <SortableHeader field="reference_id">
                {t('incidents.referenceId', 'Ref ID')}
              </SortableHeader>
            </TableHead>
            <TableHead className="min-w-[200px]">
              <SortableHeader field="title">
                {t('incidents.title', 'Title')}
              </SortableHeader>
            </TableHead>
            <TableHead className="w-[120px]">
              {t('incidents.eventType', 'Type')}
            </TableHead>
            <TableHead className="w-[100px]">
              <SortableHeader field="severity_v2">
                {t('incidents.severity', 'Severity')}
              </SortableHeader>
            </TableHead>
            <TableHead className="w-[160px]">
              {t('incidents.status.label', 'Status')}
            </TableHead>
            <TableHead className="w-[150px]">
              {t('incidents.branch', 'Location')}
            </TableHead>
            <TableHead className="w-[120px]">
              <SortableHeader field="occurred_at">
                {t('incidents.occurredAt', 'Date')}
              </SortableHeader>
            </TableHead>
            {hasHSSEAccess && (
              <TableHead className="w-[60px]">{t('common.actions', 'Actions')}</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {incidents.map((incident) => {
            const isOverdue = incident.occurred_at && 
              !['closed', 'no_investigation_required'].includes(incident.status || '') &&
              isPast(addDays(new Date(incident.occurred_at), 7));

            return (
              <TableRow 
                key={incident.id}
                className={cn(
                  "hover:bg-muted/50 transition-colors",
                  isOverdue ? "bg-amber-50/50 dark:bg-amber-950/20" : getStatusBackgroundColor(incident.status)
                )}
              >
                <TableCell>
                  <Link 
                    to={`/incidents/${incident.id}`}
                    className="font-mono text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <FileText className="h-3 w-3" />
                    {incident.reference_id}
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Link 
                      to={`/incidents/${incident.id}`}
                      className="font-medium hover:text-primary transition-colors line-clamp-1"
                    >
                      {incident.title}
                    </Link>
                    {isOverdue && (
                      <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500">
                        <Clock className="h-3 w-3" />
                        {t('common.overdue', 'Overdue')}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {t(`incidents.eventCategories.${incident.event_type}`)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {incident.severity_v2 && (
                    <Badge variant={getSeverityBadgeVariant(incident.severity_v2)} className="text-xs">
                      {t(`severity.${incident.severity_v2}.label`)}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {incident.status && (
                    <IncidentStatusBadge status={incident.status} className="text-xs" />
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground truncate block max-w-[140px]">
                    {incident.branch?.name || incident.site?.name || '—'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {incident.occurred_at 
                      ? formatDistanceToNow(new Date(incident.occurred_at), { addSuffix: true })
                      : '—'}
                  </span>
                </TableCell>
                {hasHSSEAccess && (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover">
                        {incident.status === 'submitted' && onStartInvestigation && (
                          <DropdownMenuItem onClick={() => onStartInvestigation(incident.id)}>
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
                        {canDeleteIncident(incident.status) && onDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => onDelete(incident.id, incident.status)}
                              className="text-destructive focus:text-destructive"
                            >
                              {incident.status === 'closed' ? (
                                <Lock className="h-4 w-4 me-2" />
                              ) : (
                                <Trash2 className="h-4 w-4 me-2" />
                              )}
                              {t('incidents.delete')}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
