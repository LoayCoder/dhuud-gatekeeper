import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, Loader2, History, User } from "lucide-react";
import { useState } from "react";
import { useIncidentAuditLogs } from "@/hooks/use-investigation";
import { format } from "date-fns";

interface AuditLogPanelProps {
  incidentId: string;
}

export function AuditLogPanel({ incidentId }: AuditLogPanelProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [isOpen, setIsOpen] = useState(false);

  const { data: logs, isLoading } = useIncidentAuditLogs(incidentId);

  const getActionLabel = (action: string) => {
    const actionLabels: Record<string, string> = {
      'investigation_started': t('investigation.audit.started', 'Investigation Started'),
      'investigation_updated': t('investigation.audit.updated', 'Investigation Updated'),
      'action_created': t('investigation.audit.actionCreated', 'Action Created'),
      'action_updated': t('investigation.audit.actionUpdated', 'Action Updated'),
      'evidence_uploaded': t('investigation.audit.evidenceUploaded', 'Evidence Uploaded'),
      'evidence_reviewed': t('investigation.audit.evidenceReviewed', 'Evidence Reviewed'),
      'evidence_deleted': t('investigation.auditLog.evidenceDeleted', 'Evidence Deleted'),
      'witness_added': t('investigation.audit.witnessAdded', 'Witness Statement Added'),
      'status_changed': t('investigation.audit.statusChanged', 'Status Changed'),
    };
    return actionLabels[action] || action;
  };

  const getActionVariant = (action: string): "default" | "secondary" | "outline" | "destructive" => {
    if (action.includes('started')) return 'default';
    if (action.includes('deleted')) return 'destructive';
    if (action.includes('created') || action.includes('uploaded')) return 'secondary';
    return 'outline';
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card dir={direction}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" />
                {t('investigation.audit.title', 'Audit Trail')}
                {logs && logs.length > 0 && (
                  <Badge variant="secondary" className="ms-2">
                    {logs.length}
                  </Badge>
                )}
              </CardTitle>
              <Button variant="ghost" size="icon">
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : logs?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('investigation.audit.noLogs', 'No audit logs yet.')}
              </p>
            ) : (
              <div className="space-y-3">
                {logs?.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={getActionVariant(log.action)}>
                          {getActionLabel(log.action)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                        </span>
                      </div>
                      {log.details && typeof log.details === 'object' && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {JSON.stringify(log.details)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
