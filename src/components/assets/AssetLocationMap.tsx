import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Package, Maximize2, X, Filter } from 'lucide-react';
import { useAssetsWithGPS } from '@/hooks/use-asset-location';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  active: '#22c55e',
  inactive: '#6b7280',
  under_maintenance: '#eab308',
  out_of_service: '#ef4444',
  disposed: '#9ca3af',
};

function createAssetMarkerIcon(status: string) {
  const color = STATUS_COLORS[status] || STATUS_COLORS.active;
  
  return L.divIcon({
    className: 'custom-asset-marker',
    html: `
      <div style="
        background: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m7.5 4.27 9 5.15"/>
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
          <path d="m3.3 7 8.7 5 8.7-5"/>
          <path d="M12 22V12"/>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

interface AssetLocationMapProps {
  className?: string;
  siteFilter?: string | null;
  statusFilter?: string | null;
  fullscreen?: boolean;
  onClose?: () => void;
}

export function AssetLocationMap({
  className,
  siteFilter,
  statusFilter,
  fullscreen = false,
  onClose,
}: AssetLocationMapProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const direction = i18n.dir();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const [localSiteFilter, setLocalSiteFilter] = useState(siteFilter || 'all');
  const [localStatusFilter, setLocalStatusFilter] = useState(statusFilter || 'all');

  const { data: assets, isLoading } = useAssetsWithGPS({
    siteId: localSiteFilter !== 'all' ? localSiteFilter : undefined,
    status: localStatusFilter !== 'all' ? localStatusFilter : undefined,
  });

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    mapInstance.current = L.map(mapRef.current, {
      center: [24.7136, 46.6753], // Default to Riyadh, Saudi Arabia
      zoom: 10,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(mapInstance.current);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Update markers when assets change
  useEffect(() => {
    if (!mapInstance.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    if (!assets?.length) return;

    // Add markers for each asset
    assets.forEach((asset) => {
      if (!asset.gps_lat || !asset.gps_lng) return;

      const marker = L.marker([asset.gps_lat, asset.gps_lng], {
        icon: createAssetMarkerIcon(asset.status || 'active'),
      });

      marker.bindPopup(`
        <div style="min-width: 180px; direction: ${direction};">
          <h4 style="font-weight: 600; margin: 0 0 4px 0;">${asset.name}</h4>
          <p style="font-size: 12px; color: #6b7280; margin: 0 0 8px 0;">${asset.asset_code}</p>
          <p style="font-size: 12px; margin: 0 0 4px 0;">
            <strong>${t('assets.site')}:</strong> ${asset.site?.name || '-'}
          </p>
          <p style="font-size: 12px; margin: 0 0 8px 0;">
            <strong>${t('assets.status.label')}:</strong> ${t(`assets.status.${asset.status || 'active'}`)}
          </p>
          <button 
            onclick="window.location.href='/assets/${asset.id}'"
            style="
              background: hsl(var(--primary));
              color: white;
              border: none;
              padding: 6px 12px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 12px;
              width: 100%;
            "
          >
            ${t('common.viewDetails')}
          </button>
        </div>
      `);

      marker.addTo(mapInstance.current!);
      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers
    if (markersRef.current.length > 0) {
      const group = L.featureGroup(markersRef.current);
      mapInstance.current.fitBounds(group.getBounds(), { padding: [50, 50] });
    }
  }, [assets, direction, t]);

  // Get unique sites for filter
  const sites = assets?.reduce((acc, asset) => {
    if (asset.site && !acc.find((s) => s.id === asset.site!.id)) {
      acc.push(asset.site);
    }
    return acc;
  }, [] as { id: string; name: string }[]) || [];

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const assetCount = assets?.length || 0;

  const mapContent = (
    <>
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Select value={localSiteFilter} onValueChange={setLocalSiteFilter} dir={direction}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-4 w-4 me-2" />
            <SelectValue placeholder={t('assets.site')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            {sites.map((site) => (
              <SelectItem key={site.id} value={site.id}>
                {site.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={localStatusFilter} onValueChange={setLocalStatusFilter} dir={direction}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t('assets.status.label')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            <SelectItem value="active">{t('assets.status.active')}</SelectItem>
            <SelectItem value="inactive">{t('assets.status.inactive')}</SelectItem>
            <SelectItem value="under_maintenance">{t('assets.status.under_maintenance')}</SelectItem>
            <SelectItem value="out_of_service">{t('assets.status.out_of_service')}</SelectItem>
          </SelectContent>
        </Select>

        <Badge variant="outline" className="h-9 px-3 flex items-center gap-1">
          <Package className="h-3 w-3" />
          {t('assets.assetsWithLocation', { count: assetCount })}
        </Badge>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {Object.entries(STATUS_COLORS).slice(0, 4).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5 text-xs">
            <span
              className="w-3 h-3 rounded-full border border-white shadow-sm"
              style={{ backgroundColor: color }}
            />
            <span className="text-muted-foreground">{t(`assets.status.${status}`)}</span>
          </div>
        ))}
      </div>

      {/* Map */}
      <div
        ref={mapRef}
        className={cn(
          'rounded-lg border',
          fullscreen ? 'h-[calc(100vh-200px)]' : 'h-[400px]'
        )}
      />

      {assetCount === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
          <div className="text-center">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground">{t('assets.noAssetsWithLocation')}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t('assets.addGPSCoordinates')}
            </p>
          </div>
        </div>
      )}
    </>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">{t('assets.assetMap')}</h1>
              <p className="text-muted-foreground">{t('assets.assetMapDescription')}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          {mapContent}
        </div>
      </div>
    );
  }

  return (
    <Card className={cn('relative', className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5 text-primary" />
            {t('assets.assetMap')}
          </CardTitle>
          <CardDescription>{t('assets.assetMapDescription')}</CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/assets/map')}
          title={t('common.fullscreen')}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="relative">{mapContent}</CardContent>
    </Card>
  );
}
