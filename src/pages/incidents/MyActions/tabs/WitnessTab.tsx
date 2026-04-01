import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MyActionsViewProps } from '../types';

export function WitnessTab({ viewProps }: { viewProps: MyActionsViewProps }) {
  const { t, i18n } = useTranslation();
  const { witnessStatements, selectedWitnessTask, setSelectedWitnessTask } = viewProps;

  const pending = (witnessStatements || []).filter((w: any) => w.status !== 'completed');
  const completed = (witnessStatements || []).filter((w: any) => w.status === 'completed');

  if (!witnessStatements?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="font-semibold text-lg">{t('investigation.witness', 'Witness')}</h3>
          <p className="text-muted-foreground text-sm">{t('investigation.noActionsDescription', 'You have no pending corrective actions.')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {pending.map((ws: any) => (
        <Card key={ws.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium">{ws.reference_id || ws.incident_id}</span>
                  <Badge variant="secondary" className="text-xs">{ws.status}</Badge>
                </div>
                {ws.created_at && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(ws.created_at).toLocaleDateString(i18n.language)}
                  </p>
                )}
              </div>
              <Button size="sm" variant="default" asChild>
                <Link to={`/incidents/${ws.incident_id}`}>
                  {t('investigation.viewIncident', 'View Incident')}
                  <ArrowRight className="h-4 w-4 ms-1 rtl:rotate-180" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      {completed.length > 0 && (
        <div className="space-y-2 mt-4">
          <h4 className="text-sm font-medium text-muted-foreground">{t('investigation.completedActions', 'Completed')} ({completed.length})</h4>
          {completed.map((ws: any) => (
            <Card key={ws.id} className="opacity-60">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-success" />
                  <span className="text-sm">{ws.reference_id || ws.incident_id}</span>
                  <Badge variant="outline" className="text-xs">{ws.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
