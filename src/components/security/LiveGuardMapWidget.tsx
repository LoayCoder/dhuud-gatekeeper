import { useEffect, useRef, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Radio, Maximize2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGuardLocations, useGeofenceAlerts } from '@/hooks/use-live-tracking';
import { useSecurityZones } from '@/hooks/use-security-zones';
import { useNavigate } from 'react-router-dom';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

type GuardStatus = 'active' | 'warning' | 'alert' | 'offline';

const statusColors: Record<GuardStatus, string> = {
  active: '#22c55e',
  warning: '#f59e0b',
  alert: '#ef4444',
  offline: '#6b7280',
};

interface LiveGuardMapWidgetProps {
  className?: string;
  compact?: boolean;
}

export function LiveGuardMapWidget({ className, compact = false }: LiveGuardMapWidgetProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);
  const zonesLayer = useRef<L.LayerGroup | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  const { data: guardLocations = [], isLoading: loadingGuards } = useGuardLocations();
  const { data: alerts = [] } = useGeofenceAlerts('pending');
  const { data: zones = [] } = useSecurityZones();

  // Calculate status counts
  const statusCounts = useMemo(() => {
    const counts: Record<GuardStatus, number> = { active: 0, warning: 0, alert: 0, offline: 0 };
    
    guardLocations.forEach((loc: any) => {
      const hasAlert = alerts.some((a: any) => a.guard_id === loc.guard_id);
      const isStale = new Date().getTime() - new Date(loc.recorded_at).getTime() > 10 * 60 * 1000;
      
      if (isStale) counts.offline++;
      else if (hasAlert) counts.alert++;
      else if (loc.is_within_zone === false) counts.warning++;
      else counts.active++;
    });
    
    return counts;
  }, [guardLocations, alerts]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const defaultCenter: L.LatLngExpression = [24.7136, 46.6753];

    map.current = L.map(mapContainer.current, {
      center: defaultCenter,
      zoom: 12,
      zoomControl: !compact,
      scrollWheelZoom: !compact,
      dragging: !compact,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map.current);

    markersLayer.current = L.layerGroup().addTo(map.current);
    zonesLayer.current = L.layerGroup().addTo(map.current);

    setIsMapReady(true);

    return () => {
      map.current?.remove();
      map.current = null;
      setIsMapReady(false);
    };
  }, [compact]);

  // Update zones
  useEffect(() => {
    if (!map.current || !zonesLayer.current || !isMapReady) return;

    zonesLayer.current.clearLayers();

    zones.forEach((zone: any) => {
      if (!zone.polygon_coords || zone.polygon_coords.length < 3) return;

      const polygon = L.polygon(
        zone.polygon_coords.map((coord: number[]) => [coord[0], coord[1]] as L.LatLngTuple),
        {
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.1,
          weight: 1,
        }
      );

      zonesLayer.current?.addLayer(polygon);
    });

    // Fit to zones on first load
    if (zones.length > 0) {
      const allBounds: L.LatLngBounds[] = [];
      zonesLayer.current.getLayers().forEach(layer => {
        if (layer instanceof L.Polygon) {
          allBounds.push(layer.getBounds());
        }
      });
      if (allBounds.length > 0) {
        const combined = allBounds.reduce((acc, b) => acc.extend(b), allBounds[0]);
        if (combined.isValid()) {
          map.current?.fitBounds(combined, { padding: [20, 20] });
        }
      }
    }
  }, [zones, isMapReady]);

  // Update guard markers
  useEffect(() => {
    if (!map.current || !markersLayer.current || !isMapReady) return;

    markersLayer.current.clearLayers();

    guardLocations.forEach((loc: any) => {
      if (!loc.latitude || !loc.longitude) return;

      const hasAlert = alerts.some((a: any) => a.guard_id === loc.guard_id);
      const isStale = new Date().getTime() - new Date(loc.recorded_at).getTime() > 10 * 60 * 1000;
      
      let status: GuardStatus = 'active';
      if (isStale) status = 'offline';
      else if (hasAlert) status = 'alert';
      else if (loc.is_within_zone === false) status = 'warning';

      const color = statusColors[status];

      const icon = L.divIcon({
        className: 'custom-guard-marker',
        html: `
          <div class="relative">
            ${status === 'active' ? `<div class="absolute -inset-1 rounded-full animate-ping opacity-50" style="background-color: ${color}40;"></div>` : ''}
            <div class="relative w-3 h-3 rounded-full border border-white shadow" style="background-color: ${color};"></div>
          </div>
        `,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

      const marker = L.marker([loc.latitude, loc.longitude], { icon });
      marker.bindPopup(`<strong>${loc.guard_name || 'Guard'}</strong><br/><span class="text-xs">${status}</span>`);
      markersLayer.current?.addLayer(marker);
    });
  }, [guardLocations, alerts, isMapReady]);

  const isLoading = loadingGuards;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Radio className="h-4 w-4 text-green-500 animate-pulse" />
            {t('security.dashboard.liveGuardMap', 'Live Guard Positions')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {guardLocations.length} {t('security.guards', 'guards')}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => navigate('/security/command-center')}
            >
              <Maximize2 className="h-3.5 w-3.5 me-1" />
              {t('common.expand', 'Expand')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 relative">
        {isLoading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : (
          <>
            <div
              ref={mapContainer}
              className="w-full h-[280px]"
            />
            {/* Status Legend */}
            <div className="absolute bottom-2 start-2 bg-background/90 backdrop-blur-sm rounded-md p-2 text-xs space-y-1 z-[1000] shadow">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusColors.active }} />
                <span>{t('security.status.active', 'Active')}</span>
                {statusCounts.active > 0 && <Badge variant="secondary" className="text-[10px] px-1 h-4">{statusCounts.active}</Badge>}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusColors.warning }} />
                <span>{t('security.status.warning', 'Outside Zone')}</span>
                {statusCounts.warning > 0 && <Badge variant="outline" className="text-[10px] px-1 h-4 text-amber-600">{statusCounts.warning}</Badge>}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusColors.alert }} />
                <span>{t('security.status.alert', 'Alert')}</span>
                {statusCounts.alert > 0 && <Badge variant="destructive" className="text-[10px] px-1 h-4">{statusCounts.alert}</Badge>}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full opacity-50" style={{ backgroundColor: statusColors.offline }} />
                <span className="text-muted-foreground">{t('security.status.offline', 'Offline')}</span>
                {statusCounts.offline > 0 && <Badge variant="outline" className="text-[10px] px-1 h-4">{statusCounts.offline}</Badge>}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
