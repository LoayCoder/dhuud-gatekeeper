import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { format } from 'date-fns';
import { AlertTriangle, FileText, ExternalLink, Calendar, Tag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAssetIncidents } from '@/hooks/use-incident-assets';

interface AssetIncidentHistoryProps {
  assetId: string;
}

export function AssetIncidentHistory({ assetId }: AssetIncidentHistoryProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();

  const { data: incidentLinks = [], isLoading } = useAssetIncidents(assetId);

  const getSeverityBadge = (severity: string | null) => {
    const variants: Record<string, 'destructive' | 'secondary' | 'outline' | 'default'> = {
      critical: 'destructive',
      high: 'destructive',
      medium: 'secondary',
      low: 'outline',
    };
    return variants[severity || 'low'] || 'outline';
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'destructive' | 'secondary' | 'outline' | 'default'> = {
      submitted: 'outline',
      investigation_in_progress: 'secondary',
      cpa_assigned: 'secondary',
      cpa_in_progress: 'secondary',
      pending_verification: 'default',
      closed: 'default',
    };
    return variants[status] || 'outline';
  };

  const getLinkTypeBadge = (linkType: string) => {
    const variants: Record<string, 'destructive' | 'secondary' | 'outline' | 'default'> = {
      damaged: 'destructive',
      caused_by: 'destructive',
      involved: 'secondary',
      affected: 'outline',
    };
    return variants[linkType] || 'outline';
  };

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        {t('common.loading')}...
      </div>
    );
  }

  if (incidentLinks.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="font-medium text-muted-foreground">{t('assetManagement.noIncidentHistory')}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t('assetManagement.noIncidentHistoryDescription')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timeline */}
      <div className="relative">
        {incidentLinks.map((link, index) => (
          <div key={link.id} className="relative pb-4 last:pb-0">
            {/* Timeline line */}
            {index < incidentLinks.length - 1 && (
              <div
                className="absolute start-4 top-8 bottom-0 w-0.5 bg-border"
                aria-hidden="true"
              />
            )}

            <Card className="ms-10 relative">
              {/* Timeline dot */}
              <div
                className="absolute -start-10 top-4 h-3 w-3 rounded-full border-2 border-primary bg-background"
                aria-hidden="true"
              />

              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Header with reference and badges */}
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {link.incident?.reference_id}
                      </Badge>
                      <Badge variant={getLinkTypeBadge(link.link_type)} className="text-xs">
                        {t(`assetManagement.linkTypes.${link.link_type}`)}
                      </Badge>
                      {link.incident?.severity && (
                        <Badge variant={getSeverityBadge(link.incident.severity)} className="text-xs">
                          {t(`incidents.severity.${link.incident.severity}`)}
                        </Badge>
                      )}
                    </div>

                    {/* Title */}
                    <h4 className="font-medium text-sm line-clamp-2">
                      {link.incident?.title}
                    </h4>

                    {/* Meta info */}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {t(`incidents.eventTypes.${link.incident?.event_type}`)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {link.incident?.occurred_at && format(new Date(link.incident.occurred_at), 'PP')}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="mt-2">
                      <Badge variant={getStatusBadge(link.incident?.status || 'submitted')} className="text-xs">
                        {t(`incidents.status.${link.incident?.status}`)}
                      </Badge>
                    </div>

                    {/* Notes */}
                    {link.notes && (
                      <p className="text-xs text-muted-foreground mt-2 italic border-s-2 border-muted ps-2">
                        {link.notes}
                      </p>
                    )}
                  </div>

                  {/* Action */}
                  <Button variant="ghost" size="icon" className="shrink-0" asChild>
                    <RouterLink to={`/incidents/${link.incident_id}`}>
                      <ExternalLink className="h-4 w-4" />
                    </RouterLink>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
