import { useState } from 'react';
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
  Search,
  Edit,
  Clock,
  AlertCircle
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
import { IncidentStatusBadge } from '@/features/incidents';
import { ResponsibleUserBadge } from '@/features/incidents';
import { AdminEditObservationDialog } from '@/features/admin';
import { getSeverityBadgeVariant } from '@/lib/hsse-severity-levels';
import { calculateInvestigationSLA } from '@/lib/investigation-sla';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface IncidentDetailHeaderProps {
  incident: {
    id: string;
    title: string;
    reference_id: string;
    event_type: string;
    status: string | null;
    severity_v2: string | null;
    severity?: string | null;
    potential_severity_v2?: string | null;
    branch_id?: string | null;
    site_id?: string | null;
    branch?: { id?: string; name: string } | null;
    site?: { id?: string; name: string } | null;
    location?: string | null;
    occurred_at: string | null;
    created_at?: string | null;
    related_contractor_company_id?: string | null;
    approval_manager?: { id: string; full_name: string | null; job_title: string | null } | null;
    investigations?: { investigator?: { id: string; full_name: string | null; job_title: string | null } | null }[] | null;
    related_contractor_company?: { id: string; company_name: string } | null;
  };
  backPath: string;
  isAdmin: boolean;
  isPrinting: boolean;
  onPrint: (options?: { fullLegalMode?: boolean; includeFullAuditLog?: boolean }) => void;
  onDelete: () => void;
  onRefresh?: () => void;
}

const getSeverityGradient = (severity: string | null): string => {
  switch (severity) {
    case 'level_5': return 'border-destructive/30 bg-destructive/5';
    case 'level_4': return 'border-orange-500/30 bg-orange-500/5';
    case 'level_3': return 'border-amber-500/30 bg-amber-500/5';
    case 'level_2': return 'border-yellow-500/30 bg-yellow-500/5';
    case 'level_1': return 'border-green-500/30 bg-green-500/5';
    default: return 'border-border bg-background';
  }
};

export function IncidentDetailHeader({
  incident,
  backPath,
  isAdmin,
  isPrinting,
  onPrint,
  onDelete,
  onRefresh,
}: IncidentDetailHeaderProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [showEditDialog, setShowEditDialog] = useState(false);

  const locationBreadcrumb = [
    incident.branch?.name,
    incident.site?.name,
    incident.location,
  ].filter(Boolean).join(' â€º ');

  // Calculate SLA for the detail view header
  let slaInfo = null;
  if (incident.created_at) {
    slaInfo = calculateInvestigationSLA(incident.created_at, incident.severity_v2 || incident.severity);
  }

  return (
    <Card
      className={cn(
        "rounded-xl border p-5 sm:p-6 sm:pb-5 shadow-sm overflow-hidden relative",
        getSeverityGradient(incident.severity_v2)
      )}
    >
      {/* Decorative background element for modern look */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-background/0 to-muted/20 rounded-bl-full pointer-events-none -mr-10 -mt-10 blur-2xl" />

      {/* Top Row - Back & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4 relative z-10">
        <Button asChild variant="ghost" size="sm" className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
          <Link to={backPath}>
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {t('incidents.backToList', 'Back')}
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          {slaInfo && incident.status !== 'closed' && (
            <div className={cn(
              "flex items-center gap-1.5 text-sm font-medium rounded-full px-3 py-1 shadow-sm border bg-background/50 backdrop-blur-sm",
              slaInfo.status === 'red' ? "text-red-700 border-red-200 dark:text-red-400 dark:border-red-900" :
                slaInfo.status === 'yellow' ? "text-yellow-700 border-yellow-200 dark:text-yellow-400 dark:border-yellow-900" :
                  "text-emerald-700 border-emerald-200 dark:text-emerald-400 dark:border-emerald-900"
            )}>
              {slaInfo.status === 'red' ? <AlertCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
              {slaInfo.isOverdue
                ? t('investigation.sla.overdueBy', { count: Math.abs(slaInfo.daysRemaining), defaultValue: `${Math.abs(slaInfo.daysRemaining)}d OVERDUE` })
                : t('investigation.sla.daysRemaining', { count: slaInfo.daysRemaining, defaultValue: `${slaInfo.daysRemaining}d ${slaInfo.hoursRemaining}h REMAINING` })
              }
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 bg-background/50 backdrop-blur-sm">
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">{t('common.export', 'Export')}</span>
                <MoreHorizontal className="h-4 w-4 sm:hidden" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover w-56">
              <DropdownMenuItem asChild>
                <Link to={`/incidents/investigate?incident=${incident.id}`}>
                  <Search className="h-4 w-4 me-2 text-muted-foreground" />
                  {t('navigation.investigationWorkspace')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onPrint()}
                disabled={isPrinting}
              >
                <Printer className="h-4 w-4 me-2 text-muted-foreground" />
                {t('incidents.printReport')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onPrint({ fullLegalMode: true })}
                disabled={isPrinting}
              >
                <Scale className="h-4 w-4 me-2 text-muted-foreground" />
                {t('incidents.exportFullLegalReport', 'Export Full Legal Report')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onPrint({ includeFullAuditLog: true })}
                disabled={isPrinting}
              >
                <History className="h-4 w-4 me-2 text-muted-foreground" />
                {t('incidents.exportWithAuditLogs', 'Export with Audit Logs')}
              </DropdownMenuItem>
              {isAdmin && incident.status !== 'closed' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowEditDialog(true)}
                  >
                    <Edit className="h-4 w-4 me-2 text-muted-foreground" />
                    {t('admin.editObservation.menuItem', 'Edit Location & Assignment')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                  >
                    <Trash2 className="h-4 w-4 me-2" />
                    {t('incidents.delete')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">

        {/* Left Side: ID, Title, Location */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="bg-primary/10 text-primary font-mono text-sm px-2.5 py-1 rounded-md font-medium border border-primary/20">
              {incident.reference_id}
            </span>
            {incident.status && (
              <IncidentStatusBadge status={incident.status} />
            )}
            {incident.severity_v2 && (
              <Badge
                variant={getSeverityBadgeVariant(incident.severity_v2)}
                className="text-sm shadow-sm"
              >
                {t(`severity.${incident.severity_v2}.label`)}
              </Badge>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {incident.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md border text-xs font-medium uppercase tracking-wider">
              {t(`incidents.eventCategories.${incident.event_type}`)}
            </div>
            {locationBreadcrumb && (
              <div className="flex items-center gap-1.5 font-medium">
                <MapPin className="h-4 w-4" />
                <span className="truncate max-w-[300px]" title={locationBreadcrumb}>{locationBreadcrumb}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Assignment */}
        <div className="shrink-0 bg-background/60 p-3 sm:p-4 rounded-lg border shadow-sm backdrop-blur-sm xl:min-w-[280px]">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Pending With
          </div>
          <ResponsibleUserBadge incident={incident as unknown} showTitle={false} className="text-sm font-medium" />
        </div>
      </div>

      {/* Admin Edit Dialog */}
      <AdminEditObservationDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        incident={{
          id: incident.id,
          branch_id: incident.branch_id,
          site_id: incident.site_id,
          related_contractor_company_id: incident.related_contractor_company_id,
          branch: incident.branch,
          site: incident.site,
          status: incident.status,
        }}
        onSuccess={onRefresh}
      />
    </Card>
  );
}


