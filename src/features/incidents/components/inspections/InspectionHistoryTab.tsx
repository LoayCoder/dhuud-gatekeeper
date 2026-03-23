import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { CheckCircle, XCircle, AlertTriangle, Clock, ExternalLink, ClipboardCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAssetInspections, type AssetInspectionResult } from '@/features/incidents';
import i18n from '@/i18n';

interface InspectionHistoryTabProps {
  assetId: string;
}

export function InspectionHistoryTab({ assetId }: InspectionHistoryTabProps) {
  const { t } = useTranslation();
  const direction = i18n.dir();
  
  const { data: inspections, isLoading } = useAssetInspections(assetId);
  
  const getResultIcon = (result: string | null) => {
    switch (result) {
      case 'pass':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'fail':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'partial':
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };
  
  const getResultBadge = (result: string | null, status: string) => {
    if (status === 'in_progress') {
      return <Badge variant="secondary">{t('inspections.inProgress')}</Badge>;
    }
    if (status === 'cancelled') {
      return <Badge variant="outline">{t('inspections.cancelled')}</Badge>;
    }
    
    switch (result) {
      case 'pass':
        return <Badge className="bg-success text-success-foreground">{t('inspections.results.pass')}</Badge>;
      case 'fail':
        return <Badge variant="destructive">{t('inspections.results.fail')}</Badge>;
      case 'partial':
        return <Badge className="bg-warning text-warning-foreground">{t('inspections.results.partial')}</Badge>;
      default:
        return <Badge variant="secondary">{t('inspections.pending')}</Badge>;
    }
  };
  
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }
  
  if (!inspections?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-3">
          <ClipboardCheck className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">{t('inspections.noInspections')}</p>
          <p className="text-sm text-muted-foreground">{t('inspections.noInspectionsHint')}</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-3">
      {inspections.map((inspection) => (
        <Card key={inspection.id} className="hover:shadow-sm transition-shadow">
          <CardContent className="py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {getResultIcon(inspection.overall_result)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm text-muted-foreground">{inspection.reference_id}</span>
                    {getResultBadge(inspection.overall_result, inspection.status)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {inspection.template?.name}
                  </p>
                  <p className="text-sm font-medium mt-0.5">
                    {format(new Date(inspection.inspection_date), 'PP')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {inspection.inspector?.full_name}
                  </p>
                </div>
              </div>
              
              <Button variant="outline" size="sm" className="shrink-0" asChild>
                <Link to={`/assets/${assetId}/inspections/${inspection.id}`}>
                  <ExternalLink className="h-4 w-4 me-1" />
                  {t('common.view')}
                </Link>
              </Button>
            </div>
            
            {inspection.summary_notes && (
              <p className="mt-2 text-sm text-muted-foreground border-t pt-2">
                {inspection.summary_notes}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
