import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MyActionsViewProps } from '../types';

export function ReportedTab({ viewProps }: { viewProps: MyActionsViewProps }) {
  const { t, i18n } = useTranslation();
  const { myReportedIncidents } = viewProps;

  if (!myReportedIncidents?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="font-semibold text-lg">{t('investigation.noReportedIncidents', 'No Reported Incidents')}</h3>
          <p className="text-muted-foreground text-sm">{t('investigation.noReportedDescription', 'You have not reported any incidents yet.')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {myReportedIncidents.map((inc: any) => (
        <Card key={inc.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{inc.title || inc.reference_id}</span>
                  {inc.severity && <Badge variant="destructive" className="text-xs">{inc.severity}</Badge>}
                  {inc.status && (
                    <Badge variant="outline" className="text-xs">
                      {t(`investigation.actionStatus.${inc.status}`, inc.status?.replace(/_/g, ' '))}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {inc.incident_date && (
                    <span>{new Date(inc.incident_date).toLocaleDateString(i18n.language)}</span>
                  )}
                  {inc.incident_type && <span>{inc.incident_type}</span>}
                </div>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link to={`/incidents/${inc.id}`}>
                  {t('investigation.viewIncident', 'View Incident')}
                  <ArrowRight className="h-4 w-4 ms-1 rtl:rotate-180" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
