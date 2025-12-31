import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DEFAULT_TILE, DEFAULT_CENTER } from '@/lib/map-tiles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Radio, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GuardLocation {
  id: string;
  guard_id: string;
  latitude: number;
  longitude: number;
  recorded_at: string;
  accuracy?: number;
  battery_level?: number;
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
  alert_type: string;
  latitude?: number;
  longitude?: number;
}

interface CommandCenterMapProps {
  guardLocations: GuardLocation[];
  zones: SecurityZone[];
  alerts: GeofenceAlert[];
  onGuardClick?: (guardId: string) => void;
  onAlertClick?: (alertId: string) => void;
}

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

export function CommandCenterMap({
  guardLocations,
  zones,
  alerts,
  onGuardClick,
  onAlertClick,
}: CommandCenterMapProps) {
  const { t } = useTranslation();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);
  const zonesLayer = useRef<L.LayerGroup | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = L.map(mapContainer.current, {
      center: DEFAULT_CENTER,
      zoom: 12,
      zoomControl: true,
    });

    // Use premium CartoDB tiles for cleaner appearance
    L.tileLayer(DEFAULT_TILE.url, {
      attribution: DEFAULT_TILE.attribution,
      ...DEFAULT_TILE.options,
    }).addTo(map.current);

    markersLayer.current = L.layerGroup().addTo(map.current);
    zonesLayer.current = L.layerGroup().addTo(map.current);

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update zones
  useEffect(() => {
    if (!map.current || !zonesLayer.current) return;

    zonesLayer.current.clearLayers();

    zones.forEach((zone) => {
      if (!zone.polygon_coords || zone.polygon_coords.length < 3) return;

      const color = zoneTypeColors[zone.zone_type] || riskColors[zone.risk_level] || '#3b82f6';
      
      const polygon = L.polygon(
        zone.polygon_coords.map(coord => [coord[0], coord[1]] as L.LatLngTuple),
        {
          color,
          fillColor: color,
          fillOpacity: 0.15,
          weight: 3,
          dashArray: '5, 5',
        }
      );

      polygon.bindPopup(`
        <div class="p-2">
          <strong>${zone.zone_name}</strong>
          <br/>
          <span class="text-xs">${zone.zone_code} • ${zone.zone_type}</span>
          <br/>
          <span class="text-xs">Risk: ${zone.risk_level}</span>
        </div>
      `);

      zonesLayer.current?.addLayer(polygon);
    });

    // Fit bounds to zones if available
    if (zones.length > 0 && zonesLayer.current.getLayers().length > 0) {
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
          map.current.fitBounds(combinedBounds, { padding: [50, 50] });
        }
      }
    }
  }, [zones]);

  // Update guard markers
  useEffect(() => {
    if (!map.current || !markersLayer.current) return;

    markersLayer.current.clearLayers();

    // Add guard markers
    guardLocations.forEach((loc) => {
      if (!loc.latitude || !loc.longitude) return;

      // Check if guard has active alert
      const hasAlert = alerts.some(a => a.guard_id === loc.guard_id);
      
      const markerColor = hasAlert ? '#ef4444' : '#22c55e';
      const pulseClass = hasAlert ? 'pulse-red' : 'pulse-green';

      const icon = L.divIcon({
        className: 'custom-guard-marker',
        html: `
          <div class="relative">
            <div class="absolute -inset-2 rounded-full ${pulseClass} animate-ping opacity-75" style="background-color: ${markerColor}40;"></div>
            <div class="relative w-4 h-4 rounded-full border-2 border-white shadow-lg" style="background-color: ${markerColor};"></div>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const marker = L.marker([loc.latitude, loc.longitude], { icon });

      const popupContent = `
        <div class="p-2 min-w-[150px]">
          <strong>Guard ${loc.guard_id?.slice(0, 8)}...</strong>
          <br/>
          <span class="text-xs text-gray-500">
            ${new Date(loc.recorded_at).toLocaleTimeString()}
          </span>
          ${loc.battery_level ? `<br/><span class="text-xs">🔋 ${loc.battery_level}%</span>` : ''}
          ${loc.accuracy ? `<br/><span class="text-xs">📍 ±${loc.accuracy.toFixed(0)}m</span>` : ''}
          ${hasAlert ? '<br/><span class="text-xs text-red-500">⚠️ Zone Violation</span>' : ''}
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
      
      marker.bindPopup(`
        <div class="p-2">
          <strong class="text-red-500">${alert.alert_type}</strong>
          <br/>
          <span class="text-xs">Guard: ${alert.guard_id?.slice(0, 8)}...</span>
        </div>
      `);

      if (onAlertClick) {
        marker.on('click', () => onAlertClick(alert.id));
      }

      markersLayer.current?.addLayer(marker);
    });
  }, [guardLocations, alerts, onGuardClick, onAlertClick]);

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
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div
          ref={mapContainer}
          className={cn(
            "w-full rounded-b-lg",
            isExpanded ? "h-[calc(100vh-8rem)]" : "h-[400px]"
          )}
        />
        {/* Legend */}
        <div className="absolute bottom-4 start-4 bg-background/90 backdrop-blur-sm rounded-lg p-2 text-xs space-y-1 z-[1000]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>{t('security.commandCenter.inZone', 'In Zone')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>{t('security.commandCenter.zoneViolation', 'Zone Violation')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
