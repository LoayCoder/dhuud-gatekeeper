import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, Loader2, History, User, CheckCircle2, Clock, AlertCircle, PlayCircle, PlusCircle, Trash2, Edit, CheckSquare, FileText } from "lucide-react";
import { useState } from "react";
import { useIncidentAuditLogs } from "@/hooks/use-investigation";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AuditLogPanelProps {
  incidentId: string;
  defaultOpen?: boolean;
}

export function AuditLogPanel({ incidentId, defaultOpen = false }: AuditLogPanelProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const { data: logs, isLoading } = useIncidentAuditLogs(incidentId);

  const getActionDetails = (action: string) => {
    switch (action) {
      case 'investigation_started':
        return { label: t('investigation.audit.started', 'Investigation Started'), icon: PlayCircle, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200' };
      case 'investigation_updated':
        return { label: t('investigation.audit.updated', 'Investigation Updated'), icon: Edit, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200' };
      case 'action_created':
        return { label: t('investigation.audit.actionCreated', 'Action Created'), icon: PlusCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-200' };
      case 'action_updated':
        return { label: t('investigation.audit.actionUpdated', 'Action Updated'), icon: CheckSquare, color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-200' };
      case 'evidence_uploaded':
        return { label: t('investigation.audit.evidenceUploaded', 'Evidence Uploaded'), icon: FileText, color: 'text-indigo-500', bg: 'bg-indigo-50 border-indigo-200' };
      case 'evidence_reviewed':
        return { label: t('investigation.audit.evidenceReviewed', 'Evidence Reviewed'), icon: CheckCircle2, color: 'text-indigo-500', bg: 'bg-indigo-50 border-indigo-200' };
      case 'evidence_deleted':
        return { label: t('investigation.auditLog.evidenceDeleted', 'Evidence Deleted'), icon: Trash2, color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20' };
      case 'witness_added':
        return { label: t('investigation.audit.witnessAdded', 'Witness Statement Added'), icon: User, color: 'text-purple-500', bg: 'bg-purple-50 border-purple-200' };
      case 'status_changed':
        return { label: t('investigation.audit.statusChanged', 'Status Changed'), icon: Clock, color: 'text-primary', bg: 'bg-primary/10 border-primary/20' };
      default:
        return { label: action, icon: AlertCircle, color: 'text-muted-foreground', bg: 'bg-muted border-border' };
    }
  };

  const toggleSort = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  const sortedLogs = logs ? [...logs].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  }) : [];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card dir={direction} className="border shadow-sm overflow-hidden">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                  <History className="h-4 w-4" />
                </div>
                {t('investigation.audit.title', 'Audit Trail')}
                {logs && logs.length > 0 && (
                  <Badge variant="secondary" className="ms-2 font-mono">
                    {logs.length}
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSort}
                  className="h-8 gap-2 bg-background"
                >
                  <Clock className="h-3.5 w-3.5" />
                  {sortOrder === 'desc'
                    ? t('investigation.audit.newestFirst', 'Newest First')
                    : t('investigation.audit.oldestFirst', 'Oldest First')}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")} />
                </Button>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-6 px-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : sortedLogs.length === 0 ? (
              <div className="text-center py-12 bg-muted/20 rounded-lg border border-dashed mt-4">
                <History className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  {t('investigation.audit.noLogs', 'No audit logs recorded yet.')}
                </p>
              </div>
            ) : (
              <div className="relative pl-6 sm:pl-8 border-l-2 border-muted space-y-8 mt-6">
                {sortedLogs.map((log) => {
                  const details = getActionDetails(log.action);
                  const Icon = details.icon;

                  return (
                    <div key={log.id} className="relative group">
                      {/* Timeline Dot */}
                      <div className={cn(
                        "absolute -left-[33px] sm:-left-[41px] top-1.5 h-8 w-8 rounded-full flex items-center justify-center ring-4 ring-card border transition-all duration-200 shadow-sm",
                        details.bg, details.color
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-6">
                        {/* Meta Column */}
                        <div className="flex-shrink-0 sm:w-36 pt-1 text-sm text-muted-foreground whitespace-nowrap">
                          <div className="font-medium text-foreground">
                            {format(new Date(log.created_at), 'MMM d, yyyy')}
                          </div>
                          <div>
                            {format(new Date(log.created_at), 'HH:mm')}
                          </div>
                        </div>

                        {/* Content Card */}
                        <div className="flex-1 bg-muted/20 hover:bg-muted/40 transition-colors rounded-xl p-4 border shadow-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-foreground text-sm">
                              {details.label}
                            </span>
                          </div>

                          {/* Profile Data (Simulated - log usually doesn't store profile name but ID, 
                              for this redesign we assume user profile is passed or just render standard user icon) */}
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2 mb-3 bg-background/50 w-fit px-2.5 py-1 rounded-md border">
                            <User className="h-3.5 w-3.5" />
                            <span>System / User</span>
                          </div>

                          {log.details && typeof log.details === 'object' && (
                            <div className="bg-background rounded-lg p-3 text-sm text-muted-foreground border mt-2 overflow-x-auto font-mono text-xs">
                              {Object.entries(log.details).map(([key, value]) => (
                                <div key={key} className="flex gap-2">
                                  <span className="font-semibold text-foreground/80">{key}:</span>
                                  <span className="truncate">{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
