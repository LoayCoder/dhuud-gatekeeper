import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  FileText, 
  MapPin, 
  Printer, 
  History, 
  Scale, 
  MoreHorizontal,
  Trash2,
  Search
} from 'lucide-react';
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
import { getSeverityBadgeVariant } from '@/lib/hsse-severity-levels';
import { cn } from '@/lib/utils';

interface IncidentDetailHeaderProps {
  incident: {
    id: string;
    title: string;
    reference_id: string;
    event_type: string;
    status: string | null;
    severity_v2: string | null;
    potential_severity_v2?: string | null;
    branch?: { name: string } | null;
    site?: { name: string } | null;
    location?: string | null;
    occurred_at: string | null;
  };
  backPath: string;
  isAdmin: boolean;
  isPrinting: boolean;
  onPrint: (options?: { fullLegalMode?: boolean; includeFullAuditLog?: boolean }) => void;
  onDelete: () => void;
}

const getSeverityGradient = (severity: string | null): string => {
  switch (severity) {
    case 'level_5': return 'from-destructive/20 to-destructive/5 border-destructive/30';
    case 'level_4': return 'from-orange-500/20 to-orange-500/5 border-orange-500/30';
    case 'level_3': return 'from-amber-500/20 to-amber-500/5 border-amber-500/30';
    case 'level_2': return 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/30';
    case 'level_1': return 'from-green-500/20 to-green-500/5 border-green-500/30';
    default: return 'from-muted/50 to-background border-border';
  }
};

export function IncidentDetailHeader({
  incident,
  backPath,
  isAdmin,
  isPrinting,
  onPrint,
  onDelete,
}: IncidentDetailHeaderProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();

  const locationBreadcrumb = [
    incident.branch?.name,
    incident.site?.name,
    incident.location,
  ].filter(Boolean).join(' › ');

  return (
    <div 
      className={cn(
        "rounded-xl border p-4 sm:p-6 bg-gradient-to-br",
        getSeverityGradient(incident.severity_v2)
      )}
    >
      {/* Top Row - Back & Actions */}
      <div className="flex items-center justify-between mb-4">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link to={backPath}>
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {t('incidents.backToList')}
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">{t('common.export', 'Export')}</span>
              <MoreHorizontal className="h-4 w-4 sm:hidden" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            <DropdownMenuItem asChild>
              <Link to={`/incidents/investigate?incident=${incident.id}`}>
                <Search className="h-4 w-4 me-2" />
                {t('navigation.investigationWorkspace')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onPrint()}
              disabled={isPrinting}
            >
              <Printer className="h-4 w-4 me-2" />
              {t('incidents.printReport')}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onPrint({ fullLegalMode: true })}
              disabled={isPrinting}
            >
              <Scale className="h-4 w-4 me-2" />
              {t('incidents.exportFullLegalReport', 'Export Full Legal Report')}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onPrint({ includeFullAuditLog: true })}
              disabled={isPrinting}
            >
              <History className="h-4 w-4 me-2" />
              {t('incidents.exportWithAuditLogs', 'Export with Audit Logs')}
            </DropdownMenuItem>
            {isAdmin && incident.status !== 'closed' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 me-2" />
                  {t('incidents.delete')}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Severity & Status Badges */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {incident.severity_v2 && (
          <Badge 
            variant={getSeverityBadgeVariant(incident.severity_v2)} 
            className="text-sm px-3 py-1"
          >
            {t(`severity.${incident.severity_v2}.label`)}
          </Badge>
        )}
        {incident.potential_severity_v2 && incident.potential_severity_v2 !== incident.severity_v2 && (
          <Badge variant="outline" className="text-sm border-dashed">
            {t('severity.potentialSeverity')}: {t(`severity.${incident.potential_severity_v2}.label`)}
          </Badge>
        )}
        {incident.status && (
          <IncidentStatusBadge status={incident.status} />
        )}
        <Badge variant="secondary" className="text-sm">
          {t(`incidents.eventCategories.${incident.event_type}`)}
        </Badge>
      </div>

      {/* Title */}
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight mb-2">
        {incident.title}
      </h1>

      {/* Reference & Location */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <FileText className="h-4 w-4" />
          <span className="font-mono">{incident.reference_id}</span>
        </div>
        {locationBreadcrumb && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            <span>{locationBreadcrumb}</span>
          </div>
        )}
      </div>
    </div>
  );
}
