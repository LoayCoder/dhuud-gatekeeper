import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClipboardList, ArrowRight, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MyActionsViewProps } from '../types';

export function InspectionsTab({ viewProps }: { viewProps: MyActionsViewProps }) {
  const { t, i18n } = useTranslation();
  const { myInspections } = viewProps;

  if (!myInspections?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="font-semibold text-lg">{t('inspections.title', 'Inspections')}</h3>
          <p className="text-muted-foreground text-sm">{t('inspections.noInspections', 'No inspections scheduled.')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {myInspections.map((insp: any) => (
        <Card key={insp.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium">{insp.title || insp.template_name || insp.reference_id}</span>
                  {insp.status && <Badge variant="outline" className="text-xs">{insp.status}</Badge>}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {insp.scheduled_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(insp.scheduled_date).toLocaleDateString(i18n.language)}
                    </span>
                  )}
                  {insp.location_name && <span>{insp.location_name}</span>}
                </div>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link to={`/inspections/sessions/${insp.id}`}>
                  {t('common.view', 'View')}
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
