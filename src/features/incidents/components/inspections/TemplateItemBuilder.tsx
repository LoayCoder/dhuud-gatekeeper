import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, MapPin, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ActionListTable, type ActionListColumn } from '@/components/action-center/ActionListTable';
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

interface AssetRow extends Record<string, unknown> {
  id: string;
  name: string;
  asset_code: string;
  type_name: string;
  subtype_name: string;
  zone_name: string;
  building_name: string;
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

  const rows = useMemo<AssetRow[]>(() => {
    if (!matchingData?.assets) return [];
    return matchingData.assets.map((a: any) => ({
      id: a.id,
      name: a.name ?? '',
      asset_code: a.asset_code ?? '',
      type_name: a.type?.name ?? '',
      subtype_name: a.subtype?.name ?? '',
      zone_name: a.floor_zone?.name ?? '',
      building_name: a.building?.name ?? '',
    }));
  }, [matchingData]);

  const columns = useMemo<ActionListColumn<AssetRow>[]>(() => [
    {
      key: 'name',
      label: t('common.asset', 'Asset'),
      primary: true,
      sortable: true,
      render: (item) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-sm">{item.name}</span>
          <Badge variant="outline" className="text-[10px] w-fit">{item.asset_code}</Badge>
        </div>
      ),
    },
    {
      key: 'type_name',
      label: t('assets.type', 'Type'),
      sortable: true,
      render: (item) => (
        <span className="text-xs text-muted-foreground">
          {item.type_name}{item.subtype_name ? ` / ${item.subtype_name}` : ''}
          {!item.type_name && !item.subtype_name ? '—' : ''}
        </span>
      ),
    },
    {
      key: 'zone_name',
      label: t('common.zone', 'Zone'),
      expandable: true,
      render: (item) => item.zone_name ? (
        <span className="inline-flex items-center gap-1 text-xs">
          <MapPin className="h-3 w-3" /> {item.zone_name}
        </span>
      ) : <span className="text-xs text-muted-foreground">—</span>,
    },
    {
      key: 'building_name',
      label: t('common.building', 'Building'),
      expandable: true,
      render: (item) => item.building_name ? (
        <span className="text-xs">{item.building_name}</span>
      ) : <span className="text-xs text-muted-foreground">—</span>,
    },
  ], [t]);

  if (!showMatchingAssets) {
    return null;
  }

  const totalCount = matchingData?.count ?? 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
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
        {!matchingLoading && totalCount === 0 ? (
          <div className="py-3 text-center">
            <AlertTriangle className="h-5 w-5 text-warning mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">
              {t('inspections.noMatchingAssets', 'No assets match this template scope. Check the category, type, site, and building filters.')}
            </p>
          </div>
        ) : (
          <ActionListTable<AssetRow>
            items={rows}
            columns={columns}
            isLoading={matchingLoading}
            emptyIcon={<AlertTriangle className="h-10 w-10 mb-2 opacity-40" />}
            emptyMessage={t('inspections.noMatchingAssets', 'No assets match this template scope.')}
            searchableFields={['name', 'asset_code', 'type_name', 'subtype_name', 'zone_name', 'building_name']}
          />
        )}
      </CardContent>
    </Card>
  );
}
