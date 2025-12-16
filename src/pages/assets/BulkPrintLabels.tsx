import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Printer, Download, Grid, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AssetQRCode } from '@/components/assets/AssetQRCode';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ModuleGate } from '@/components/ModuleGate';
import { HSSERoute } from '@/components/HSSERoute';

interface BulkAsset {
  id: string;
  asset_code: string;
  name: string;
  site?: { name: string } | null;
  floor_zone?: { name: string } | null;
}

function BulkPrintLabelsContent() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const direction = i18n.dir();

  const [assets, setAssets] = useState<BulkAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [columnsPerRow, setColumnsPerRow] = useState(4);

  // Get asset IDs from location state
  const assetIds = (location.state as { assetIds?: string[] })?.assetIds || [];

  useEffect(() => {
    const fetchAssets = async () => {
      if (!assetIds.length || !profile?.tenant_id) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('hsse_assets')
        .select(`
          id, asset_code, name,
          site:sites!hsse_assets_site_id_fkey(name),
          floor_zone:floors_zones!hsse_assets_floor_zone_id_fkey(name)
        `)
        .eq('tenant_id', profile.tenant_id)
        .in('id', assetIds)
        .is('deleted_at', null)
        .order('asset_code');

      if (!error && data) {
        setAssets(data as BulkAsset[]);
      }
      setLoading(false);
    };

    fetchAssets();
  }, [assetIds, profile?.tenant_id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!assets.length) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/assets')}>
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          </Button>
          <h1 className="text-2xl font-bold">{t('assets.bulkPrintLabels')}</h1>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t('assets.noAssetsToprint')}</p>
            <Button className="mt-4" onClick={() => navigate('/assets/register')}>
              {t('assets.registerNew')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - Hidden on print */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/assets')}>
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t('assets.bulkPrintLabels')}</h1>
            <p className="text-muted-foreground">
              {t('assets.bulkPrintDescription', { count: assets.length })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Grid className="h-4 w-4 text-muted-foreground" />
            <Select
              value={String(columnsPerRow)}
              onValueChange={(v) => setColumnsPerRow(Number(v))}
              dir={direction}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="5">5</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 me-2" />
            {t('common.print')}
          </Button>
        </div>
      </div>

      {/* Labels Grid */}
      <Card className="print:shadow-none print:border-none">
        <CardHeader className="print:hidden">
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {t('assets.labelPreview')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="grid gap-4 print:gap-2"
            style={{
              gridTemplateColumns: `repeat(${columnsPerRow}, minmax(0, 1fr))`,
            }}
          >
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="flex flex-col items-center p-2 border rounded-lg print:border-dashed print:break-inside-avoid"
              >
                <AssetQRCode
                  assetId={asset.id}
                  assetCode={asset.asset_code}
                  assetName={asset.name}
                  siteName={asset.site?.name}
                  zoneName={asset.floor_zone?.name}
                />
                <p className="mt-2 text-xs font-mono text-center truncate w-full">
                  {asset.asset_code}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border-none {
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function BulkPrintLabels() {
  return (
    <ModuleGate module="asset_management">
      <HSSERoute>
        <BulkPrintLabelsContent />
      </HSSERoute>
    </ModuleGate>
  );
}
