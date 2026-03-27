import { useTranslation } from 'react-i18next';
import { AlertTriangle, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMatchingAssets } from '@/features/incidents/hooks/use-inspections/use-inspection-template-hooks';

interface TemplateItemBuilderProps {
  templateId: string;
  templateType?: 'asset' | 'area' | 'audit';
  typeId?: string | null;
  subtypeId?: string | null;
  branchId?: string | null;
  siteId?: string | null;
  buildingId?: string | null;
  categoryId?: string | null;
}

export function TemplateItemBuilder({ templateId, templateType, typeId, subtypeId, branchId, siteId, buildingId, categoryId }: TemplateItemBuilderProps) {
  const { t } = useTranslation();
  
  const showMatchingAssets = templateType === 'asset';
  const { data: matchingData, isLoading: matchingLoading } = useMatchingAssets({
    branchId,
    siteId,
    buildingId,
    categoryId,
    typeId,
    subtypeId,
    enabled: showMatchingAssets,
  });

  if (!showMatchingAssets) {
    return null;
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="h-5 w-5 text-muted-foreground" />
          {t('inspections.matchingAssets', 'Matching Assets')}
          {!matchingLoading && matchingData && (
            <Badge variant="secondary" className="text-xs">
              {matchingData.count}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {matchingLoading ? (
          <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
        ) : !matchingData || matchingData.count === 0 ? (
          <div className="py-3 text-center">
            <AlertTriangle className="h-5 w-5 text-warning mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">
              {t('inspections.noMatchingAssets', 'No assets match this template scope. Check the category, type, site, and building filters.')}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {matchingData.sample.map((asset) => (
              <div key={asset.id} className="flex items-center gap-2 text-xs p-2 bg-muted/30 rounded">
                <Badge variant="outline" className="text-[10px] shrink-0">{asset.asset_code}</Badge>
                <span className="truncate">{asset.name}</span>
                {asset.building?.name && (
                  <span className="text-muted-foreground shrink-0">• {asset.building.name}</span>
                )}
              </div>
            ))}
            {matchingData.count > 5 && (
              <p className="text-[10px] text-muted-foreground text-center pt-1">
                {t('inspections.andMoreAssets', '...and {{count}} more', { count: matchingData.count - 5 })}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
