import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Package, Maximize2, X, Filter, AlertTriangle } from 'lucide-react';
import { useAssetsWithGPS } from '@/hooks/use-asset-location';
import { cn } from '@/lib/utils';
import { MapStyleSwitcher } from '@/components/maps/MapStyleSwitcher';
import { useMapStyle } from '@/hooks/use-map-style';

// Full status colors with all possible asset statuses
const STATUS_COLORS: Record<string, { color: string; label: string }> = {
  active: { color: '#22c55e', label: 'active' },
  inactive: { color: '#6b7280', label: 'inactive' },
  under_maintenance: { color: '#eab308', label: 'under_maintenance' },
  out_of_service: { color: '#ef4444', label: 'out_of_service' },
  disposed: { color: '#9ca3af', label: 'disposed' },
  pending_disposal: { color: '#f97316', label: 'pending_disposal' },
};

function createAssetMarkerIcon(status: string, locationSource: 'asset' | 'site' | null) {
  const statusConfig = STATUS_COLORS[status] || STATUS_COLORS.active;
  const color = statusConfig.color;
  
  // Dashed border for inherited (site) location, solid for own GPS
  const borderStyle = locationSource === 'site' 
    ? 'border: 2px dashed white;' 
    : 'border: 3px solid white;';
  
  // Different icon for inherited location
  const icon = locationSource === 'site' 
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
         <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
         <circle cx="12" cy="10" r="3"/>
       </svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
         <path d="m7.5 4.27 9 5.15"/>
         <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
         <path d="m3.3 7 8.7 5 8.7-5"/>
         <path d="M12 22V12"/>
       </svg>`;
  
  return L.divIcon({
    className: 'custom-asset-marker',
    html: `
      <div style="
        background: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        ${borderStyle}
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        ${icon}
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
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [localSiteFilter, setLocalSiteFilter] = useState(siteFilter || 'all');
  const [localStatusFilter, setLocalStatusFilter] = useState(statusFilter || 'all');
  const { mapStyle, setMapStyle, tileLayerConfig } = useMapStyle('asset-map-style');

  const { data: assets, isLoading, error, refetch } = useAssetsWithGPS({
    siteId: localSiteFilter !== 'all' ? localSiteFilter : undefined,
    status: localStatusFilter !== 'all' ? localStatusFilter : undefined,
  });

  // Setup global navigation handlers for popup buttons
  useEffect(() => {
    (window as any).navigateToAsset = (id: string) => navigate(`/assets/${id}`);
    (window as any).navigateToEditAsset = (id: string) => navigate(`/assets/register?edit=${id}`);
    return () => {
      delete (window as any).navigateToAsset;
      delete (window as any).navigateToEditAsset;
    };
  }, [navigate]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    mapInstance.current = L.map(mapRef.current, {
      center: [24.7136, 46.6753], // Default to Riyadh, Saudi Arabia
      zoom: 10,
      zoomControl: true,
    });

    // Add initial tile layer
    tileLayerRef.current = L.tileLayer(tileLayerConfig.url, {
      attribution: tileLayerConfig.attribution,
      maxZoom: 19,
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
      // Use effective coordinates (asset's own OR site's fallback)
      if (!asset.effective_lat || !asset.effective_lng) return;

      const marker = L.marker([asset.effective_lat, asset.effective_lng], {
        icon: createAssetMarkerIcon(asset.status || 'active', asset.location_source),
      });

      const statusConfig = STATUS_COLORS[asset.status || 'active'] || STATUS_COLORS.active;
      const categoryName = i18n.language === 'ar' && asset.category?.name_ar 
        ? asset.category.name_ar 
        : asset.category?.name || '-';

      // Location source indicator
      const locationIndicator = asset.location_source === 'site' 
        ? `<div style="display: flex; align-items: center; gap: 4px; color: #f59e0b; font-size: 11px; margin-bottom: 8px; padding: 4px 8px; background: #fef3c7; border-radius: 4px;">
             <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
               <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
               <circle cx="12" cy="10" r="3"/>
             </svg>
             ${t('assets.usingLocationFromSite', 'Using site location')}: ${asset.site?.name}
           </div>`
        : (asset.location_verified 
            ? `<div style="display: flex; align-items: center; gap: 4px; color: #22c55e; font-size: 11px; margin-bottom: 8px;">
                 <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                   <polyline points="20 6 9 17 4 12"></polyline>
                 </svg>
                 ${t('assets.locationVerified', 'Location Verified')}
               </div>`
            : '');

      // Rich popup content with all asset info
      const popupContent = `
        <div class="asset-popup" style="min-width: 240px; direction: ${direction}; font-family: var(--font-rubik), sans-serif;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="
              background: ${statusConfig.color};
              width: 10px;
              height: 10px;
              border-radius: 50%;
              display: inline-block;
              flex-shrink: 0;
            "></span>
            <h4 style="font-weight: 600; margin: 0; font-size: 14px; line-height: 1.3;">${asset.name}</h4>
          </div>
          <p style="font-size: 11px; color: #6b7280; margin: 0 0 8px 0; font-family: monospace;">${asset.asset_code}</p>
          
          ${locationIndicator}
          
          <div style="display: grid; gap: 6px; font-size: 12px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #6b7280;">${t('assets.fields.category')}:</span>
              <span style="font-weight: 500;">${categoryName}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #6b7280;">${t('assets.fields.status')}:</span>
              <span style="font-weight: 500; color: ${statusConfig.color};">${t(`assets.status.${asset.status || 'active'}`)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #6b7280;">${t('assets.fields.site')}:</span>
              <span style="font-weight: 500;">${asset.site?.name || '-'}</span>
            </div>
          </div>
          
          <div style="display: flex; gap: 8px;">
            <button 
              onclick="window.navigateToAsset('${asset.id}')"
              style="
                background: hsl(221.2, 83.2%, 53.3%);
                color: white;
                border: none;
                padding: 8px 12px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 500;
                flex: 1;
                transition: opacity 0.2s;
              "
              onmouseover="this.style.opacity='0.9'"
              onmouseout="this.style.opacity='1'"
            >
              ${t('common.viewDetails')}
            </button>
            <button 
              onclick="window.navigateToEditAsset('${asset.id}')"
              style="
                background: transparent;
                color: hsl(221.2, 83.2%, 53.3%);
                border: 1px solid hsl(221.2, 83.2%, 53.3%);
                padding: 8px 12px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 500;
                transition: background 0.2s;
              "
              onmouseover="this.style.background='hsl(221.2, 83.2%, 53.3%, 0.1)'"
              onmouseout="this.style.background='transparent'"
            >
              ${t('common.edit')}
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        maxWidth: 280,
        className: 'asset-marker-popup',
      });

      marker.addTo(mapInstance.current!);
      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers
    if (markersRef.current.length > 0) {
      const group = L.featureGroup(markersRef.current);
      mapInstance.current.fitBounds(group.getBounds(), { padding: [50, 50] });
    }
  }, [assets, direction, t, i18n.language]);

  // Update tile layer when style changes
  useEffect(() => {
    if (!mapInstance.current) return;

    // Remove old tile layer
    if (tileLayerRef.current) {
      mapInstance.current.removeLayer(tileLayerRef.current);
    }

    // Add new tile layer
    tileLayerRef.current = L.tileLayer(tileLayerConfig.url, {
      attribution: tileLayerConfig.attribution,
      maxZoom: 19,
    }).addTo(mapInstance.current);
  }, [tileLayerConfig]);

  // Get unique sites for filter
  const sites = assets?.reduce((acc, asset) => {
    if (asset.site && !acc.find((s) => s.id === asset.site!.id)) {
      acc.push(asset.site);
    }
    return acc;
  }, [] as { id: string; name: string }[]) || [];

  const assetCount = assets?.length || 0;
  const assetsWithOwnGps = assets?.filter(a => a.location_source === 'asset').length || 0;
  const assetsWithSiteGps = assets?.filter(a => a.location_source === 'site').length || 0;

  // Loading state
  if (isLoading) {
    return (
      <Card className={cn('overflow-hidden', className)}>
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

  // Error state
  if (error) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5 text-primary" />
            {t('assets.assetMap')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex flex-col items-center justify-center rounded-lg border bg-muted/30">
            <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
            <p className="text-muted-foreground font-medium">{t('common.loadError', 'Failed to load data')}</p>
            <Button variant="outline" onClick={() => refetch()} className="mt-4">
              {t('common.retry', 'Retry')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state component
  const EmptyState = () => (
    <div className="h-[400px] flex flex-col items-center justify-center rounded-lg border bg-muted/30">
      <MapPin className="h-12 w-12 text-muted-foreground/50 mb-3" />
      <p className="text-muted-foreground font-medium">{t('assets.noAssetsWithLocation')}</p>
      <p className="text-sm text-muted-foreground mt-1 text-center px-4">
        {t('assets.addGPSCoordinates')}
      </p>
      <Button 
        variant="outline" 
        className="mt-4"
        onClick={() => navigate('/assets')}
      >
        <MapPin className="h-4 w-4 me-2" />
        {t('assets.manageAssetLocations', 'Manage Asset Locations')}
      </Button>
    </div>
  );

  // Filters and legend component
  const FiltersAndLegend = () => (
    <div className="space-y-3 mb-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
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
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t('assets.status.label')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            {Object.keys(STATUS_COLORS).map((status) => (
              <SelectItem key={status} value={status}>
                {t(`assets.status.${status}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <MapStyleSwitcher value={mapStyle} onChange={setMapStyle} />

        <Badge variant="outline" className="h-9 px-3 flex items-center gap-1">
          <Package className="h-3 w-3" />
          {assetCount} {t('assets.onMap', 'on map')}
        </Badge>
      </div>

      {/* Legend - clickable to filter */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(STATUS_COLORS).map(([status, config]) => (
          <button
            key={status}
            onClick={() => setLocalStatusFilter(status === localStatusFilter ? 'all' : status)}
            className={cn(
              "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border transition-colors",
              localStatusFilter === status 
                ? "bg-primary/10 border-primary text-primary" 
                : "hover:bg-muted border-transparent"
            )}
          >
            <span
              className="w-2.5 h-2.5 rounded-full border border-white shadow-sm flex-shrink-0"
              style={{ backgroundColor: config.color }}
            />
            <span>{t(`assets.status.${status}`)}</span>
          </button>
        ))}
      </div>

      {/* Location source legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full border-[3px] border-solid border-muted-foreground/50 bg-green-500"></span>
          <span>{t('assets.ownLocation', 'Own GPS')} ({assetsWithOwnGps})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full border-2 border-dashed border-muted-foreground/50 bg-green-500"></span>
          <span>{t('assets.inheritedLocation', 'Site GPS')} ({assetsWithSiteGps})</span>
        </div>
      </div>
    </div>
  );

  // Map content
  const mapContent = (
    <>
      <FiltersAndLegend />
      
      {/* Map container with proper containment */}
      <div className="relative rounded-lg border overflow-hidden" style={{ height: fullscreen ? 'calc(100vh - 220px)' : '400px' }}>
        {assetCount > 0 ? (
          <div ref={mapRef} className="absolute inset-0 z-0" />
        ) : (
          <EmptyState />
        )}
      </div>
    </>
  );

  // Fullscreen mode
  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <div className="p-4 h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">{t('assets.assetMap')}</h1>
              <p className="text-muted-foreground">{t('assets.assetMapDescription')}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-1">{mapContent}</div>
        </div>
      </div>
    );
  }

  // Normal card mode
  return (
    <Card className={cn('overflow-hidden', className)}>
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
      <CardContent>{mapContent}</CardContent>
    </Card>
  );
}
