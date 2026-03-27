import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, MapPin, Package, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ActionListTable, type ActionListColumn } from '@/components/action-center/ActionListTable';
import { useMatchingAssets } from '@/features/incidents/hooks/use-inspections/use-inspection-template-hooks';
import { format } from 'date-fns';

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
  display_name: string;
  asset_code: string;
  category_name: string;
  type_name: string;
  subtype_name: string;
  zone_name: string;
  building_name: string;
  status: string;
  last_inspection: string;
  next_due: string;
}

const statusVariantMap: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  active: 'success',
  under_maintenance: 'warning',
  out_of_service: 'destructive',
  disposed: 'destructive',
  pending_disposal: 'warning',
  inactive: 'secondary',
};

function formatDateSafe(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    return format(new Date(dateStr), 'dd MMM yyyy');
  } catch {
    return '';
  }
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
    return matchingData.assets.map((a: any) => {
      const parts = (a.name ?? '').split(' - ');
      const baseName = parts.length > 1 ? parts.slice(1).join(' - ') : a.name ?? '';
      const zoneLabel = a.floor_zone?.name ? ` – ${a.floor_zone.name}` : '';
      const subtypeLabel = a.subtype?.name ? ` (${a.subtype.name})` : '';
      const displayName = `${baseName}${zoneLabel}${subtypeLabel}`;

      return {
        id: a.id,
        name: a.name ?? '',
        display_name: displayName,
        asset_code: a.asset_code ?? '',
        category_name: a.category?.name ?? '',
        type_name: a.type?.name ?? '',
        subtype_name: a.subtype?.name ?? '',
        zone_name: a.floor_zone?.name ?? '',
        building_name: a.building?.name ?? '',
        status: a.status ?? 'active',
        last_inspection: formatDateSafe(a.last_inspection_date),
        next_due: formatDateSafe(a.next_inspection_due),
      };
    });
  }, [matchingData]);

  const columns = useMemo<ActionListColumn<AssetRow>[]>(() => [
    {
      key: 'display_name',
      label: t('common.asset', 'Asset'),
      primary: true,
      sortable: true,
      render: (item) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-sm leading-tight">{item.display_name}</span>
          <span className="text-[10px] text-muted-foreground font-mono">
            {t('assets.assetId', 'Asset ID')}: {item.asset_code}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      label: t('common.status', 'Status'),
      sortable: true,
      render: (item) => {
        const variant = statusVariantMap[item.status] ?? 'secondary';
        const label = item.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        return <Badge variant={variant} className="text-[10px] capitalize">{label}</Badge>;
      },
    },
    {
      key: 'category_name',
      label: t('assets.category', 'Category'),
      expandable: true,
      render: (item) => item.category_name
        ? <span className="text-xs">{item.category_name}</span>
        : <span className="text-xs text-muted-foreground">—</span>,
    },
    {
      key: 'type_name',
      label: t('assets.type', 'Type'),
      expandable: true,
      render: (item) => (
        <span className="text-xs text-muted-foreground">
          {item.type_name}{item.subtype_name ? ` / ${item.subtype_name}` : ''}
          {!item.type_name && !item.subtype_name ? '—' : ''}
        </span>
      ),
    },
    {
      key: 'building_name',
      label: t('common.building', 'Building'),
      expandable: true,
      render: (item) => item.building_name
        ? <span className="text-xs">{item.building_name}</span>
        : <span className="text-xs text-muted-foreground">—</span>,
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
      key: 'last_inspection',
      label: t('inspections.lastInspection', 'Last Inspection'),
      expandable: true,
      render: (item) => item.last_inspection ? (
        <span className="inline-flex items-center gap-1 text-xs">
          <Calendar className="h-3 w-3" /> {item.last_inspection}
        </span>
      ) : <span className="text-xs text-muted-foreground">—</span>,
    },
    {
      key: 'next_due',
      label: t('inspections.nextDue', 'Next Due'),
      expandable: true,
      render: (item) => item.next_due ? (
        <span className="inline-flex items-center gap-1 text-xs">
          <Calendar className="h-3 w-3" /> {item.next_due}
        </span>
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
            searchableFields={['display_name', 'asset_code', 'category_name', 'type_name', 'subtype_name', 'zone_name', 'building_name']}
          />
        )}
      </CardContent>
    </Card>
  );
}
