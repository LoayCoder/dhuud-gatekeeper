import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ChevronDown, ChevronUp, MapPin, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  const [expanded, setExpanded] = useState(false);

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

  const assets = matchingData?.assets ?? [];
  const totalCount = matchingData?.count ?? 0;
  const displayed = expanded ? assets : assets.slice(0, 5);
  const hasMore = totalCount > 5;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="h-5 w-5 text-muted-foreground" />
          {t('inspections.matchingAssets', 'Matching Assets')}
          {!matchingLoading && matchingData && (
            <Badge variant="secondary" className="text-xs">
              {totalCount}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {matchingLoading ? (
          <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
        ) : totalCount === 0 ? (
          <div className="py-3 text-center">
            <AlertTriangle className="h-5 w-5 text-warning mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">
              {t('inspections.noMatchingAssets', 'No assets match this template scope. Check the category, type, site, and building filters.')}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <ScrollArea className={expanded && hasMore ? 'max-h-72' : undefined}>
              <div className="space-y-1.5">
                {displayed.map((asset) => (
                  <div key={asset.id} className="flex items-start gap-2 p-2.5 border rounded-md bg-muted/20">
                    <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">{asset.asset_code}</Badge>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{asset.name}</p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                        {(asset.type?.name || asset.subtype?.name) && (
                          <span className="text-xs text-muted-foreground">
                            {asset.type?.name}{asset.subtype?.name ? ` / ${asset.subtype.name}` : ''}
                          </span>
                        )}
                        {asset.floor_zone?.name && (
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <MapPin className="h-3 w-3" />
                            {asset.floor_zone.name}
                          </span>
                        )}
                        {asset.building?.name && (
                          <span className="text-xs text-muted-foreground">
                            • {asset.building.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            {hasMore && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5 me-1" />
                    {t('common.showLess', 'Show less')}
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5 me-1" />
                    {t('inspections.showAllAssets', 'Show all {{count}} assets', { count: totalCount })}
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
