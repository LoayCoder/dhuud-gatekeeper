import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { CheckCircle, XCircle, AlertTriangle, Clock, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAssetInspections } from '@/hooks/use-inspections';
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
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'fail':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'partial':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
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
        return <Badge className="bg-green-600">{t('inspections.results.pass')}</Badge>;
      case 'fail':
        return <Badge variant="destructive">{t('inspections.results.fail')}</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-600">{t('inspections.results.partial')}</Badge>;
      default:
        return null;
    }
  };
  
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }
  
  if (!inspections?.length) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            {t('inspections.noInspections')}
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-3">
      {inspections.map((inspection) => (
        <Card key={inspection.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getResultIcon(inspection.overall_result)}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{inspection.reference_id}</span>
                    {getResultBadge(inspection.overall_result, inspection.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {direction === 'rtl' && (inspection.template as any)?.name_ar
                      ? (inspection.template as any).name_ar
                      : (inspection.template as any)?.name}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-end">
                  <p className="text-sm font-medium">
                    {format(new Date(inspection.inspection_date), 'PP')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(inspection.inspector as any)?.full_name}
                  </p>
                </div>
                
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/assets/inspections/${inspection.id}`}>
                    <ExternalLink className="h-4 w-4 me-1" />
                    {t('common.view')}
                  </Link>
                </Button>
              </div>
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
