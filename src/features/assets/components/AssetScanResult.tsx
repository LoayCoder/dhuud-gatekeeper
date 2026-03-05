import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Eye, AlertTriangle, Package, MapPin, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AssetScanResultProps {
  assetId: string;
  onClear: () => void;
  mode?: 'navigate' | 'select';
  onSelect?: (asset: ScannedAsset) => void;
}

export interface ScannedAsset {
  id: string;
  asset_code: string;
  name: string;
  status: string;
  site_id: string | null;
  branch_id: string | null;
  site?: { id: string; name: string } | null;
  building?: { name: string } | null;
  category?: { name: string; name_ar: string | null } | null;
}

export function AssetScanResult({ assetId, onClear, mode = 'navigate', onSelect }: AssetScanResultProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isArabic = i18n.language === 'ar';

  const { data: asset, isLoading, error } = useQuery({
    queryKey: ['scanned-asset', assetId, profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) throw new Error('Tenant ID required');
      
      const { data, error } = await supabase
        .from('hsse_assets')
        .select(`
          id,
          asset_code,
          name,
          status,
          site_id,
          branch_id,
          site:sites(id, name),
          building:buildings(name),
          category:asset_categories(name, name_ar)
        `)
        .eq('id', assetId)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      return data as ScannedAsset;
    },
    enabled: !!profile?.tenant_id,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !asset) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6 text-center text-destructive">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
          <p>{t('assets.scanner.assetNotFound')}</p>
          <Button variant="outline" onClick={onClear} className="mt-4">
            {t('assets.scanner.scanAgain')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const categoryName = isArabic && asset.category?.name_ar 
    ? asset.category.name_ar 
    : asset.category?.name;

  const handleViewDetails = () => {
    navigate(`/assets/${asset.id}`);
  };

  const handleReportEvent = () => {
    navigate(`/incidents/report?assetId=${asset.id}`);
  };

  const handleSelect = () => {
    onSelect?.(asset);
  };

  return (
    <Card className="border-primary">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-primary">
          <Package className="h-5 w-5" />
          {t('assets.scanner.assetFound')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Asset Info */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="font-mono text-lg font-bold truncate overflow-x-auto scrollbar-hide whitespace-nowrap max-w-[60%]">
              {asset.asset_code}
            </span>
            <Badge variant={asset.status === 'active' ? 'default' : 'secondary'} className="flex-shrink-0">
              {t(`assets.status.${asset.status}`)}
            </Badge>
          </div>
          <p className="text-lg overflow-x-auto scrollbar-hide whitespace-nowrap pb-1">{asset.name}</p>
          
          {categoryName && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
              <Tag className="h-4 w-4 flex-shrink-0" />
              <span className="overflow-x-auto scrollbar-hide whitespace-nowrap">
                {categoryName}
              </span>
            </div>
          )}
          
          {(asset.site?.name || asset.building?.name) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="overflow-x-auto scrollbar-hide whitespace-nowrap">
                {[asset.site?.name, asset.building?.name].filter(Boolean).join(' · ')}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2">
          {mode === 'navigate' ? (
            <>
              <Button onClick={handleViewDetails} className="w-full">
                <Eye className="h-4 w-4 me-2" />
                {t('assets.scanner.viewDetails')}
              </Button>
              <Button variant="destructive" onClick={handleReportEvent} className="w-full">
                <AlertTriangle className="h-4 w-4 me-2" />
                {t('assets.scanner.reportEvent')}
              </Button>
            </>
          ) : (
            <Button onClick={handleSelect} className="w-full">
              {t('common.select')}
            </Button>
          )}
          <Button variant="outline" onClick={onClear} className="w-full">
            {t('assets.scanner.scanAgain')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
