import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MyActionsViewProps } from '../types';

export function InvestigationsTab({ viewProps }: { viewProps: MyActionsViewProps }) {
  const { t, i18n } = useTranslation();
  const { myInvestigations } = viewProps;

  if (!myInvestigations?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="font-semibold text-lg">{t('investigation.assignedInvestigations', 'Assigned Investigations')}</h3>
          <p className="text-muted-foreground text-sm">{t('investigation.noActionsDescription', 'You have no pending corrective actions.')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {myInvestigations.map((inv: any) => (
        <Card key={inv.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{inv.title || inv.reference_id || inv.id}</span>
                  {inv.severity && <Badge variant="destructive" className="text-xs">{inv.severity}</Badge>}
                  {inv.status && <Badge variant="outline" className="text-xs">{inv.status}</Badge>}
                </div>
                {(inv.occurred_at || inv.created_at) && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(inv.occurred_at || inv.created_at).toLocaleDateString(i18n.language)}
                  </p>
                )}
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link to={`/incidents/${inv.incident_id || inv.id}/investigation`}>
                  {t('investigation.viewInvestigation', 'View Investigation')}
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
