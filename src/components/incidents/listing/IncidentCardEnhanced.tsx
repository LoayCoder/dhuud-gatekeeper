import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  MapPin, 
  Calendar, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  PlayCircle, 
  Lock,
  Building,
  Clock,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { IncidentStatusBadge } from '@/components/incidents/IncidentStatusBadge';
import { formatDistanceToNow, isPast, addDays } from 'date-fns';
import { getSeverityBadgeVariant } from '@/lib/hsse-severity-levels';
import { getStatusBorderColor } from '@/lib/incident-status-colors';
import { cn } from '@/lib/utils';

interface IncidentCardEnhancedProps {
  incident: {
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
  };
  hasHSSEAccess: boolean;
  canDelete: boolean;
  onStartInvestigation?: (id: string) => void;
  onDelete?: (id: string, status: string | null) => void;
}

// Severity indicator colors for visual reference inside the card
const getSeverityIndicatorColor = (severity: string | null): string => {
  switch (severity) {
    case 'level_5': return 'bg-red-500';
    case 'level_4': return 'bg-orange-500';
    case 'level_3': return 'bg-amber-500';
    case 'level_2': return 'bg-yellow-500';
    case 'level_1': return 'bg-green-500';
    default: return 'bg-muted';
  }
};

export function IncidentCardEnhanced({
  incident,
  hasHSSEAccess,
  canDelete,
  onStartInvestigation,
  onDelete,
}: IncidentCardEnhancedProps) {
  const { t } = useTranslation();

  // Calculate if overdue (example: more than 7 days old and still open)
  const isOverdue = incident.occurred_at && 
    !['closed', 'no_investigation_required'].includes(incident.status || '') &&
    isPast(addDays(new Date(incident.occurred_at), 7));

  return (
    <Card 
      className={cn(
        "group relative overflow-hidden transition-all hover:shadow-lg border-s-4",
        getStatusBorderColor(incident.status),
        isOverdue && "ring-1 ring-amber-500/50"
      )}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header Row - Status & Actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {incident.status && (
              <IncidentStatusBadge status={incident.status} />
            )}
            {isOverdue && (
              <Badge variant="destructive" className="text-xs">
                <Clock className="h-3 w-3 me-1" />
                {t('common.overdue', 'Overdue')}
              </Badge>
            )}
          </div>

          {hasHSSEAccess && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                >
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
                {canDelete && onDelete && (
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
          )}
        </div>

        {/* Title & Reference */}
        <div>
          <Link 
            to={`/incidents/${incident.id}`}
            className="block group/title"
          >
            <h3 className="font-semibold text-base line-clamp-2 group-hover/title:text-primary transition-colors">
              {incident.title}
            </h3>
          </Link>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <FileText className="h-3 w-3" />
            <span className="font-mono text-xs">{incident.reference_id}</span>
          </div>
        </div>

        {/* Event Type & Classification */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {t(`incidents.eventCategories.${incident.event_type}`)}
          </Badge>
          {incident.severity_v2 && (
            <Badge variant={getSeverityBadgeVariant(incident.severity_v2)} className="text-xs">
              {t(`severity.${incident.severity_v2}.label`)}
            </Badge>
          )}
          {incident.incident_type && (
            <Badge variant="outline" className="text-xs">
              {t(`incidents.hsseEventTypes.${incident.incident_type}`, incident.incident_type)}
            </Badge>
          )}
        </div>

        {/* Location */}
        {(incident.branch || incident.site || incident.location) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {[incident.branch?.name, incident.site?.name, incident.location]
                .filter(Boolean)
                .join(' › ')}
            </span>
          </div>
        )}

        {/* Footer - Time & View Link */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {incident.occurred_at && formatDistanceToNow(new Date(incident.occurred_at), { addSuffix: true })}
          </div>
          <Button asChild variant="ghost" size="sm" className="gap-1 text-xs h-7">
            <Link to={`/incidents/${incident.id}`}>
              {t('common.viewDetails', 'View Details')}
              <ChevronRight className="h-3 w-3 rtl:rotate-180" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
