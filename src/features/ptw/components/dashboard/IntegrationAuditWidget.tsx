import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  FileWarning,
  Users,
  GraduationCap,
  DoorOpen,
} from 'lucide-react';
import { useIntegrationAuditLogs, type IntegrationAuditEntry } from '@/hooks/use-integration-audit';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

const moduleIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  ptw: FileWarning,
  contractor: Users,
  induction: GraduationCap,
  gate: DoorOpen,
  system: Activity,
  auth: Activity,
};

const statusConfig = {
  success: {
    icon: CheckCircle2,
    variant: 'default' as const,
    color: 'text-green-500',
  },
  failed: {
    icon: XCircle,
    variant: 'destructive' as const,
    color: 'text-destructive',
  },
  warning: {
    icon: AlertTriangle,
    variant: 'secondary' as const,
    color: 'text-yellow-500',
  },
};

function formatEventType(eventType: string): string {
  return eventType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function getEntityLink(entry: IntegrationAuditEntry): string | null {
  switch (entry.entity_type) {
    case 'permit':
      return `/ptw/view/${entry.entity_id}`;
    case 'project':
      return `/ptw/projects/${entry.entity_id}`;
    case 'worker':
      return `/contractor/workers/${entry.entity_id}`;
    case 'contractor':
      return `/contractor/${entry.entity_id}`;
    default:
      return null;
  }
}

interface IntegrationAuditWidgetProps {
  limit?: number;
}

export function IntegrationAuditWidget({ limit = 10 }: IntegrationAuditWidgetProps) {
  const { t, i18n } = useTranslation();
  const { data: logs, isLoading } = useIntegrationAuditLogs(limit);
  const isRTL = i18n.dir() === 'rtl';
  const dateLocale = isRTL ? ar : enUS;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {t('ptw.dashboard.integrationAudit', 'Integration Activity')}
            </CardTitle>
            <CardDescription>
              {t('ptw.dashboard.integrationAuditDesc', 'Recent cross-module events')}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : !logs || logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Activity className="h-10 w-10 mb-2 opacity-50" />
            <p className="text-sm">{t('ptw.dashboard.noAuditEvents', 'No integration events yet')}</p>
          </div>
        ) : (
          <ScrollArea className="h-[350px] pe-4">
            <div className="space-y-3">
              {logs.map((entry) => {
                const StatusIcon = statusConfig[entry.status].icon;
                const ModuleIcon = moduleIcons[entry.source_module] || Activity;
                const entityLink = getEntityLink(entry);

                return (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className={`mt-0.5 ${statusConfig[entry.status].color}`}>
                      <StatusIcon className="h-4 w-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">
                          {formatEventType(entry.event_type)}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          <ModuleIcon className="h-3 w-3 me-1" />
                          {entry.source_module}
                        </Badge>
                        {entry.target_module && entry.target_module !== entry.source_module && (
                          <>
                            <span className="text-xs text-muted-foreground">→</span>
                            <Badge variant="outline" className="text-xs">
                              {entry.target_module}
                            </Badge>
                          </>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{entry.actor_name}</span>
                        <span>•</span>
                        <span>
                          {formatDistanceToNow(new Date(entry.timestamp), {
                            addSuffix: true,
                            locale: dateLocale,
                          })}
                        </span>
                        {entry.entity_reference && (
                          <>
                            <span>•</span>
                            {entityLink ? (
                              <Link
                                to={entityLink}
                                className="text-primary hover:underline"
                              >
                                {entry.entity_reference}
                              </Link>
                            ) : (
                              <span>{entry.entity_reference}</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <Badge variant={statusConfig[entry.status].variant} className="shrink-0">
                      {entry.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
