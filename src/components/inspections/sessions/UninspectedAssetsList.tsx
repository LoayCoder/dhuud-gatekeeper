import { useTranslation } from 'react-i18next';
import { MapPin, QrCode } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { SessionAsset } from '@/hooks/use-inspection-sessions';

interface UninspectedAssetsListProps {
  assets: SessionAsset[];
  onSelectAsset: (asset: SessionAsset) => void;
  onScanQR: () => void;
}

export function UninspectedAssetsList({ assets, onSelectAsset, onScanQR }: UninspectedAssetsListProps) {
  const { t, i18n } = useTranslation();
  
  if (assets.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">{t('inspectionSessions.allAssetsInspected')}</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {t('inspectionSessions.uninspectedAssets')} ({assets.length})
          </CardTitle>
          <Button size="sm" onClick={onScanQR}>
            <QrCode className="me-2 h-4 w-4" />
            {t('inspectionSessions.scanQR')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {assets.map((sessionAsset) => {
              const asset = sessionAsset.asset;
              if (!asset) return null;
              
              return (
                <div
                  key={sessionAsset.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => onSelectAsset(sessionAsset)}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{asset.asset_code}</span>
                      <Badge variant="outline" className="text-xs">
                        {i18n.language === 'ar' && asset.type?.name_ar ? asset.type.name_ar : asset.type?.name}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{asset.name}</p>
                    {asset.building && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{asset.building.name}</span>
                        {asset.floor_zone && <span>/ {asset.floor_zone.name}</span>}
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="sm">
                    {t('common.inspect')}
                  </Button>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
