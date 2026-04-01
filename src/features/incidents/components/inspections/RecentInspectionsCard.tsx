import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { CheckCircle, XCircle, AlertTriangle, ClipboardCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useRecentInspections, type AssetInspectionResult } from '@/features/incidents';
import i18n from '@/i18n';

export function RecentInspectionsCard() {
  const { t } = useTranslation();
  const direction = i18n.dir();
  
  const { data: inspections, isLoading } = useRecentInspections(5);
  
  const getResultIcon = (result: string | null) => {
    switch (result) {
      case 'pass':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'fail':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'partial':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      default:
        return null;
    }
  };
  
  const getResultBadge = (result: string | null) => {
    switch (result) {
      case 'pass':
        return <Badge className="bg-success text-success-foreground text-xs">{t('inspections.results.pass')}</Badge>;
      case 'fail':
        return <Badge variant="destructive" className="text-xs">{t('inspections.results.fail')}</Badge>;
      case 'partial':
        return <Badge className="bg-warning text-warning-foreground text-xs">{t('inspections.results.partial')}</Badge>;
      default:
        return null;
    }
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          {t('inspections.recentInspections')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : inspections?.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('inspections.noInspections')}
          </p>
        ) : (
          <div className="space-y-2">
            {inspections?.map((inspection) => (
              <Link
                key={inspection.id}
                to={`/assets/${inspection.asset_id}/inspections/${inspection.id}`}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {getResultIcon(inspection.overall_result)}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {inspection.asset?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {inspection.reference_id}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {getResultBadge(inspection.overall_result)}
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {inspection.completed_at && format(new Date(inspection.completed_at), 'MMM d')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
