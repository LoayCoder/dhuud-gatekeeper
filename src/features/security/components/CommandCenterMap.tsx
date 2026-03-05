import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Radio, Maximize2, Minimize2, Focus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MapStyleSwitcher } from '@/features/assets';
import { useMapStyle } from '@/hooks/use-map-style';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface GuardLocation {
  id: string;
  guard_id: string;
  guard_name?: string;
  latitude: number;
  longitude: number;
  recorded_at: string;
  accuracy?: number;
  battery_level?: number;
  is_within_zone?: boolean;
  distance_from_zone?: number;
}

interface SecurityZone {
  id: string;
  zone_name: string;
  zone_code: string;
  zone_type: string;
  risk_level: string;
  polygon_coords: number[][];
  is_active: boolean;
}

interface GeofenceAlert {
  id: string;
  guard_id: string;
  guard_name?: string;
  alert_type: string;
  severity?: string;
  latitude?: number;
  longitude?: number;
}

interface CommandCenterMapProps {
  guardLocations: GuardLocation[];
  zones: SecurityZone[];
  alerts: GeofenceAlert[];
  trackingIntervalMinutes?: number;
  onGuardClick?: (guardId: string) => void;
  onAlertClick?: (alertId: string) => void;
}

// Guard status types
type GuardStatus = 'active' | 'warning' | 'alert' | 'offline' | 'unknown';

const statusColors: Record<GuardStatus, string> = {
  active: '#22c55e',   // Green - online and in zone
  warning: '#f59e0b',  // Amber - outside zone or boundary warning
  alert: '#ef4444',    // Red - has active alert
  offline: '#6b7280',  // Gray - stale/no GPS
  unknown: '#9ca3af',  // Light Gray
};

const statusLabels: Record<GuardStatus, string> = {
  active: 'In Zone',
  warning: 'Outside Zone',
  alert: 'Alert Active',
  offline: 'GPS Offline',
  unknown: 'Unknown',
};

const riskColors: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#22c55e',
  critical: '#dc2626',
};

const zoneTypeColors: Record<string, string> = {
  perimeter: '#3b82f6',
  building: '#8b5cf6',
  parking: '#6b7280',
  hazardous: '#ef4444',
  restricted: '#dc2626',
  public: '#22c55e',
};

/**
 * Calculate guard status based on multiple factors:
 * - Staleness (is the data old?)
 * - Alerts (does guard have active alert?)
 * - Zone compliance (is guard within zone?)
 */
function calculateGuardStatus(
  loc: GuardLocation,
  alerts: GeofenceAlert[],
  trackingIntervalMinutes: number
): GuardStatus {
  const hasActiveAlert = alerts.some(a => a.guard_id === loc.guard_id);
  const recordedAt = new Date(loc.recorded_at);
  const now = new Date();
  
  // Consider data stale if older than 2x tracking interval
  const staleThresholdMs = trackingIntervalMinutes * 60 * 1000 * 2;
  const isStale = (now.getTime() - recordedAt.getTime()) > staleThresholdMs;
  
  // Priority order: Offline > Alert > Warning > Active
  if (isStale) return 'offline';
  if (hasActiveAlert) return 'alert';
  if (loc.is_within_zone === false) return 'warning';
  return 'active';
}

export function CommandCenterMap({
  guardLocations,
  zones,
  alerts,
  trackingIntervalMinutes = 5,
  onGuardClick,
  onAlertClick,
}: CommandCenterMapProps) {
  const { t } = useTranslation();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);
  const zonesLayer = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const hasInitialFit = useRef(false);
  const { mapStyle, setMapStyle, tileLayerConfig } = useMapStyle('command-center-map-style');

  // Calculate status counts for display
  const statusCounts = useMemo(() => {
    const counts: Record<GuardStatus, number> = {
      active: 0, warning: 0, alert: 0, offline: 0, unknown: 0
    };
    guardLocations.forEach(loc => {
      const status = calculateGuardStatus(loc, alerts, trackingIntervalMinutes);
      counts[status]++;
    });
    return counts;
  }, [guardLocations, alerts, trackingIntervalMinutes]);

  // Fit to view handler - fits map to show all zones and guards
  const handleFitToView = useCallback(() => {
    if (!map.current || !zonesLayer.current) return;
    
    const allBounds: L.LatLngBounds[] = [];
    
    // Include zone bounds
    zonesLayer.current.getLayers().forEach(layer => {
      if (layer instanceof L.Polygon) {
        allBounds.push(layer.getBounds());
      }
    });
    
    // Include guard location bounds
    guardLocations.forEach(loc => {
      if (loc.latitude && loc.longitude) {
        allBounds.push(L.latLngBounds(
          [loc.latitude, loc.longitude],
          [loc.latitude, loc.longitude]
        ));
      }
    });
    
    if (allBounds.length > 0) {
      const combinedBounds = allBounds.reduce((acc, bounds) => acc.extend(bounds), allBounds[0]);
      if (combinedBounds.isValid()) {
        map.current.fitBounds(combinedBounds, { 
          padding: [50, 50],
          animate: true,
          duration: 0.5
        });
      }
    }
  }, [guardLocations]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Default center (can be configured per tenant)
    const defaultCenter: L.LatLngExpression = [24.7136, 46.6753]; // Riyadh

    map.current = L.map(mapContainer.current, {
      center: defaultCenter,
      zoom: 12,
      zoomControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      touchZoom: true,
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true,
    });

    // Position zoom control appropriately (end for RTL support)
    map.current.zoomControl.setPosition('topright');

    // Add initial tile layer
    tileLayerRef.current = L.tileLayer(tileLayerConfig.url, {
      attribution: tileLayerConfig.attribution,
      maxZoom: 19,
    }).addTo(map.current);

    markersLayer.current = L.layerGroup().addTo(map.current);
    zonesLayer.current = L.layerGroup().addTo(map.current);

    setIsMapReady(true);

    return () => {
      map.current?.remove();
      map.current = null;
      setIsMapReady(false);
      hasInitialFit.current = false;
    };
  }, []);

  // Handle resize when expanded/collapsed or window resized
  useEffect(() => {
    if (!map.current) return;
    
    const handleResize = () => {
      setTimeout(() => map.current?.invalidateSize(), 100);
    };
    
    // Invalidate on expand change with multiple delays for smooth transition
    const timers = [
      setTimeout(() => map.current?.invalidateSize(), 100),
      setTimeout(() => map.current?.invalidateSize(), 300),
      setTimeout(() => map.current?.invalidateSize(), 500),
    ];
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      timers.forEach(clearTimeout);
    };
  }, [isExpanded]);

  // Update zones
  useEffect(() => {
    if (!map.current || !zonesLayer.current || !isMapReady) return;

    zonesLayer.current.clearLayers();

    zones.forEach((zone) => {
      if (!zone.polygon_coords || zone.polygon_coords.length < 3) return;

      const color = zoneTypeColors[zone.zone_type] || riskColors[zone.risk_level] || '#3b82f6';
      
      const polygon = L.polygon(
        zone.polygon_coords.map(coord => [coord[0], coord[1]] as L.LatLngTuple),
        {
          color,
          fillColor: color,
          fillOpacity: 0.2,
          weight: 2,
        }
      );

      polygon.bindPopup(`
        <div class="p-2">
          <strong>${zone.zone_name}</strong>
          <br/>
          <span class="text-xs">${zone.zone_code} â€¢ ${zone.zone_type}</span>
          <br/>
          <span class="text-xs">Risk: ${zone.risk_level}</span>
        </div>
      `);

      zonesLayer.current?.addLayer(polygon);
    });

    // Only fit bounds on INITIAL load, not on every update
    if (!hasInitialFit.current && zones.length > 0 && zonesLayer.current.getLayers().length > 0) {
      const layers = zonesLayer.current.getLayers();
      const allBounds: L.LatLngBounds[] = [];
      layers.forEach(layer => {
        if (layer instanceof L.Polygon) {
          allBounds.push(layer.getBounds());
        }
      });
      if (allBounds.length > 0) {
        const combinedBounds = allBounds.reduce((acc, bounds) => acc.extend(bounds), allBounds[0]);
        if (combinedBounds.isValid()) {
          map.current.fitBounds(combinedBounds, { 
            padding: [50, 50],
            animate: true,
            duration: 0.5
          });
          hasInitialFit.current = true;
        }
      }
    }
  }, [zones, isMapReady]);

  // Update guard markers
  useEffect(() => {
    if (!map.current || !markersLayer.current || !isMapReady) return;

    markersLayer.current.clearLayers();

    // Add guard markers with status-based coloring
    guardLocations.forEach((loc) => {
      if (!loc.latitude || !loc.longitude) return;

      const status = calculateGuardStatus(loc, alerts, trackingIntervalMinutes);
      const markerColor = statusColors[status];
      const isOnline = status !== 'offline';
      const showPulse = status === 'active' || status === 'alert';

      const icon = L.divIcon({
        className: 'custom-guard-marker',
        html: `
          <div class="relative">
            ${showPulse ? `<div class="absolute -inset-2 rounded-full animate-ping opacity-75" style="background-color: ${markerColor}40;"></div>` : ''}
            <div class="relative w-4 h-4 rounded-full border-2 border-white shadow-lg ${!isOnline ? 'opacity-50' : ''}" style="background-color: ${markerColor};"></div>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const marker = L.marker([loc.latitude, loc.longitude], { icon });

      const guardDisplayName = loc.guard_name || `Guard ${loc.guard_id?.slice(0, 8)}`;
      const statusLabel = t(`security.commandCenter.status.${status}`, statusLabels[status]);
      const statusEmoji = status === 'active' ? 'ðŸŸ¢' : status === 'warning' ? 'ðŸŸ ' : status === 'alert' ? 'ðŸ”´' : 'âš«';
      
      // Calculate time ago
      const recordedAt = new Date(loc.recorded_at);
      const now = new Date();
      const minutesAgo = Math.floor((now.getTime() - recordedAt.getTime()) / (1000 * 60));
      const timeAgoText = minutesAgo < 1 ? 'Just now' : minutesAgo < 60 ? `${minutesAgo}m ago` : `${Math.floor(minutesAgo / 60)}h ago`;
      
      const popupContent = `
        <div class="p-2 min-w-[180px]">
          <strong class="text-sm">${guardDisplayName}</strong>
          <br/>
          <span class="text-xs font-medium" style="color: ${markerColor};">${statusEmoji} ${statusLabel}</span>
          <br/>
          <span class="text-xs text-gray-500">
            ${new Date(loc.recorded_at).toLocaleTimeString()} (${timeAgoText})
          </span>
          ${loc.battery_level ? `<br/><span class="text-xs">ðŸ”‹ ${loc.battery_level}%</span>` : ''}
          ${loc.accuracy ? `<br/><span class="text-xs">ðŸ“ Â±${loc.accuracy.toFixed(0)}m</span>` : ''}
          ${loc.distance_from_zone != null && loc.is_within_zone === false ? `<br/><span class="text-xs text-orange-500">ðŸ“ ${loc.distance_from_zone.toFixed(0)}m outside zone</span>` : ''}
        </div>
      `;

      marker.bindPopup(popupContent);
      
      if (onGuardClick) {
        marker.on('click', () => onGuardClick(loc.guard_id));
      }

      markersLayer.current?.addLayer(marker);
    });

    // Add alert markers (for alerts with location)
    alerts.forEach((alert) => {
      if (!alert.latitude || !alert.longitude) return;

      const icon = L.divIcon({
        className: 'custom-alert-marker',
        html: `
          <div class="flex items-center justify-center w-6 h-6 rounded-full bg-destructive text-white text-xs font-bold animate-pulse">
            !
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([alert.latitude, alert.longitude], { icon });
      
      const alertGuardName = alert.guard_name || `Guard ${alert.guard_id?.slice(0, 8)}`;
      marker.bindPopup(`
        <div class="p-2 min-w-[140px]">
          <strong class="text-red-500">${alert.alert_type}</strong>
          ${alert.severity ? `<br/><span class="text-xs uppercase font-medium text-orange-600">${alert.severity}</span>` : ''}
          <br/>
          <span class="text-xs">Guard: ${alertGuardName}</span>
        </div>
      `);

      if (onAlertClick) {
        marker.on('click', () => onAlertClick(alert.id));
      }

      markersLayer.current?.addLayer(marker);
    });
  }, [guardLocations, alerts, trackingIntervalMinutes, onGuardClick, onAlertClick, isMapReady, t]);

  // Update tile layer when style changes
  useEffect(() => {
    if (!map.current || !isMapReady) return;

    // Remove old tile layer
    if (tileLayerRef.current) {
      map.current.removeLayer(tileLayerRef.current);
    }

    // Add new tile layer at the bottom
    tileLayerRef.current = L.tileLayer(tileLayerConfig.url, {
      attribution: tileLayerConfig.attribution,
      maxZoom: 19,
    }).addTo(map.current);
    
    // Ensure tile layer is at the bottom (behind markers/zones)
    tileLayerRef.current.bringToBack();
  }, [tileLayerConfig, isMapReady]);

  return (
    <Card className={cn(isExpanded && "fixed inset-4 z-50")}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-green-500 animate-pulse" />
            {t('security.commandCenter.liveMap', 'Live Map')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {guardLocations.length} {t('security.commandCenter.guardsActive', 'active')}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleFitToView}
              title={t('security.commandCenter.fitToView', 'Fit to View')}
            >
              <Focus className="h-4 w-4" />
            </Button>
            <MapStyleSwitcher value={mapStyle} onChange={setMapStyle} compact />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 relative">
        <div
          ref={mapContainer}
          className={cn(
            "w-full rounded-b-lg",
            isExpanded ? "h-[calc(100vh-8rem)]" : "h-[400px]"
          )}
        />
        {/* Legend with status indicators */}
        <div className="absolute bottom-4 start-4 bg-background/95 backdrop-blur-sm rounded-lg p-3 text-xs space-y-1.5 z-[1000] shadow-lg">
          <div className="font-medium mb-2 text-foreground">{t('security.commandCenter.guardStatus', 'Guard Status')}</div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColors.active }} />
            <span className="text-foreground">{t('security.commandCenter.status.active', 'In Zone')}</span>
            {statusCounts.active > 0 && <Badge variant="secondary" className="text-[10px] px-1 h-4">{statusCounts.active}</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColors.warning }} />
            <span className="text-foreground">{t('security.commandCenter.status.warning', 'Outside Zone')}</span>
            {statusCounts.warning > 0 && <Badge variant="outline" className="text-[10px] px-1 h-4 text-amber-600 border-amber-300">{statusCounts.warning}</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColors.alert }} />
            <span className="text-foreground">{t('security.commandCenter.status.alert', 'Alert Active')}</span>
            {statusCounts.alert > 0 && <Badge variant="destructive" className="text-[10px] px-1 h-4">{statusCounts.alert}</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full opacity-50" style={{ backgroundColor: statusColors.offline }} />
            <span className="text-muted-foreground">{t('security.commandCenter.status.offline', 'GPS Offline')}</span>
            {statusCounts.offline > 0 && <Badge variant="outline" className="text-[10px] px-1 h-4 text-muted-foreground">{statusCounts.offline}</Badge>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

