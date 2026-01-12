import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Radio, Maximize2, Minimize2, Compass, Crosshair } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MapStyleSwitcher, MAP_STYLES } from '@/components/maps/MapStyleSwitcher';
import { useMapStyle } from '@/hooks/use-map-style';

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

interface TacticalMapProps {
  guardLocations: GuardLocation[];
  zones: SecurityZone[];
  alerts: GeofenceAlert[];
  onGuardClick?: (guardId: string) => void;
  onAlertClick?: (alertId: string) => void;
}

// Tactical zone colors with higher contrast
const zoneColors: Record<string, { fill: string; stroke: string }> = {
  perimeter: { fill: '#3b82f680', stroke: '#3b82f6' },
  building: { fill: '#8b5cf680', stroke: '#8b5cf6' },
  parking: { fill: '#6b728080', stroke: '#6b7280' },
  hazardous: { fill: '#ef444480', stroke: '#ef4444' },
  restricted: { fill: '#dc262680', stroke: '#dc2626' },
  public: { fill: '#22c55e80', stroke: '#22c55e' },
};

const riskColors: Record<string, { fill: string; stroke: string }> = {
  high: { fill: '#ef444480', stroke: '#ef4444' },
  medium: { fill: '#f59e0b80', stroke: '#f59e0b' },
  low: { fill: '#22c55e80', stroke: '#22c55e' },
  critical: { fill: '#dc262680', stroke: '#dc2626' },
};

export function TacticalMap({
  guardLocations,
  zones,
  alerts,
  onGuardClick,
  onAlertClick,
}: TacticalMapProps) {
  const { t } = useTranslation();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);
  const zonesLayer = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Default to dark map style for tactical look
  const { mapStyle, setMapStyle, tileLayerConfig } = useMapStyle('tactical-map-style');

  // Initialize map with dark theme
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const defaultCenter: L.LatLngExpression = [24.7136, 46.6753];

    map.current = L.map(mapContainer.current, {
      center: defaultCenter,
      zoom: 12,
      zoomControl: false, // We'll add custom controls
    });

    // Use dark map style by default
    const darkStyle = MAP_STYLES['dark'];
    tileLayerRef.current = L.tileLayer(darkStyle.url, {
      attribution: darkStyle.attribution,
      maxZoom: 19,
    }).addTo(map.current);

    // Add zoom control on the right
    L.control.zoom({ position: 'topright' }).addTo(map.current);

    markersLayer.current = L.layerGroup().addTo(map.current);
    zonesLayer.current = L.layerGroup().addTo(map.current);

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update zones with tactical styling
  useEffect(() => {
    if (!map.current || !zonesLayer.current) return;

    zonesLayer.current.clearLayers();

    zones.forEach((zone) => {
      if (!zone.polygon_coords || zone.polygon_coords.length < 3) return;

      const colors = zoneColors[zone.zone_type] || riskColors[zone.risk_level] || { fill: '#3b82f680', stroke: '#3b82f6' };
      
      const polygon = L.polygon(
        zone.polygon_coords.map(coord => [coord[0], coord[1]] as L.LatLngTuple),
        {
          color: colors.stroke,
          fillColor: colors.fill,
          fillOpacity: 0.3,
          weight: 2,
          dashArray: zone.zone_type === 'restricted' ? '10, 5' : undefined,
        }
      );

      polygon.bindPopup(`
        <div style="background: #1a1f2e; color: #e5e7eb; padding: 12px; border-radius: 8px; border: 1px solid #2dd4bf40; font-family: 'Roboto Mono', monospace;">
          <div style="font-weight: 600; color: #2dd4bf; text-transform: uppercase; font-size: 11px; letter-spacing: 0.1em; margin-bottom: 8px;">Zone Intel</div>
          <div style="font-size: 14px; font-weight: 500; margin-bottom: 4px;">${zone.zone_name}</div>
          <div style="font-size: 11px; color: #9ca3af;">${zone.zone_code} • ${zone.zone_type.toUpperCase()}</div>
          <div style="font-size: 11px; color: ${zone.risk_level === 'high' ? '#ef4444' : zone.risk_level === 'medium' ? '#f59e0b' : '#22c55e'}; margin-top: 4px;">RISK: ${zone.risk_level.toUpperCase()}</div>
        </div>
      `, { className: 'tactical-popup' });

      zonesLayer.current?.addLayer(polygon);
    });

    // Fit bounds
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

  // Update guard markers with tactical styling
  useEffect(() => {
    if (!map.current || !markersLayer.current) return;

    markersLayer.current.clearLayers();

    // Add guard markers
    guardLocations.forEach((loc) => {
      if (!loc.latitude || !loc.longitude) return;

      const hasAlert = alerts.some(a => a.guard_id === loc.guard_id);
      
      // Tactical marker design
      const icon = L.divIcon({
        className: 'tactical-guard-marker',
        html: `
          <div style="position: relative; width: 32px; height: 32px;">
            ${hasAlert ? `
              <div style="position: absolute; inset: -4px; border-radius: 50%; background: #ef4444; opacity: 0.3; animation: pulse 1s ease-in-out infinite;"></div>
            ` : ''}
            <div style="
              position: absolute;
              inset: 0;
              border-radius: 50%;
              background: ${hasAlert ? '#ef4444' : '#2dd4bf'};
              border: 2px solid ${hasAlert ? '#ef4444' : '#2dd4bf'};
              box-shadow: 0 0 10px ${hasAlert ? '#ef444480' : '#2dd4bf80'};
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <div style="
                width: 8px;
                height: 8px;
                background: ${hasAlert ? '#fecaca' : '#d1fae5'};
                border-radius: 50%;
              "></div>
            </div>
            ${loc.is_within_zone === false ? `
              <div style="
                position: absolute;
                top: -6px;
                right: -6px;
                width: 14px;
                height: 14px;
                background: #ef4444;
                border-radius: 50%;
                border: 2px solid #1a1f2e;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 8px;
                color: white;
                font-weight: bold;
              ">!</div>
            ` : ''}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([loc.latitude, loc.longitude], { icon });

      const guardName = loc.guard_name || `Guard ${loc.guard_id?.slice(0, 8)}`;
      const zoneStatus = loc.is_within_zone === false ? 'OUTSIDE ZONE' : 'IN ZONE';
      const zoneStatusColor = loc.is_within_zone === false ? '#ef4444' : '#2dd4bf';
      
      marker.bindPopup(`
        <div style="background: #1a1f2e; color: #e5e7eb; padding: 12px; border-radius: 8px; border: 1px solid ${hasAlert ? '#ef444480' : '#2dd4bf40'}; font-family: 'Roboto Mono', monospace; min-width: 180px;">
          <div style="font-weight: 600; color: ${hasAlert ? '#ef4444' : '#2dd4bf'}; text-transform: uppercase; font-size: 11px; letter-spacing: 0.1em; margin-bottom: 8px;">Personnel</div>
          <div style="font-size: 14px; font-weight: 500; margin-bottom: 8px;">${guardName}</div>
          <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #9ca3af;">STATUS</span>
              <span style="color: ${zoneStatusColor}; font-weight: 600;">${zoneStatus}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #9ca3af;">LAST PING</span>
              <span>${new Date(loc.recorded_at).toLocaleTimeString()}</span>
            </div>
            ${loc.battery_level !== undefined ? `
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #9ca3af;">BATTERY</span>
                <span style="color: ${loc.battery_level < 20 ? '#ef4444' : '#2dd4bf'};">${loc.battery_level}%</span>
              </div>
            ` : ''}
            ${loc.accuracy ? `
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #9ca3af;">ACCURACY</span>
                <span>±${loc.accuracy.toFixed(0)}m</span>
              </div>
            ` : ''}
          </div>
          ${hasAlert ? `
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ef444440; color: #ef4444; font-size: 11px; font-weight: 600;">⚠ ALERT ACTIVE</div>
          ` : ''}
        </div>
      `, { className: 'tactical-popup' });
      
      if (onGuardClick) {
        marker.on('click', () => onGuardClick(loc.guard_id));
      }

      markersLayer.current?.addLayer(marker);
    });

    // Add alert markers
    alerts.forEach((alert) => {
      if (!alert.latitude || !alert.longitude) return;

      const icon = L.divIcon({
        className: 'tactical-alert-marker',
        html: `
          <div style="
            width: 28px;
            height: 28px;
            background: #ef4444;
            border: 2px solid #fecaca;
            border-radius: 4px;
            transform: rotate(45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 15px #ef4444;
            animation: pulse 1s ease-in-out infinite;
          ">
            <span style="transform: rotate(-45deg); color: white; font-weight: bold; font-size: 16px;">!</span>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([alert.latitude, alert.longitude], { icon });
      
      marker.bindPopup(`
        <div style="background: #1a1f2e; color: #e5e7eb; padding: 12px; border-radius: 8px; border: 1px solid #ef444480; font-family: 'Roboto Mono', monospace;">
          <div style="font-weight: 600; color: #ef4444; text-transform: uppercase; font-size: 11px; letter-spacing: 0.1em; margin-bottom: 8px;">Alert</div>
          <div style="font-size: 14px; font-weight: 500; color: #ef4444;">${alert.alert_type}</div>
          ${alert.severity ? `<div style="font-size: 11px; color: #f59e0b; text-transform: uppercase; margin-top: 4px;">${alert.severity}</div>` : ''}
          <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">Guard: ${alert.guard_name || alert.guard_id?.slice(0, 8)}</div>
        </div>
      `, { className: 'tactical-popup' });

      if (onAlertClick) {
        marker.on('click', () => onAlertClick(alert.id));
      }

      markersLayer.current?.addLayer(marker);
    });
  }, [guardLocations, alerts, onGuardClick, onAlertClick]);

  // Update tile layer when style changes
  useEffect(() => {
    if (!map.current) return;

    if (tileLayerRef.current) {
      map.current.removeLayer(tileLayerRef.current);
    }

    tileLayerRef.current = L.tileLayer(tileLayerConfig.url, {
      attribution: tileLayerConfig.attribution,
      maxZoom: 19,
    }).addTo(map.current);
  }, [tileLayerConfig]);

  return (
    <div className={cn(
      'tactical-card overflow-hidden',
      isExpanded && 'fixed inset-4 z-50'
    )}>
      {/* Header */}
      <div className="p-4 border-b border-[hsl(var(--tactical-border))] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Radio className="h-5 w-5 tactical-text-accent animate-pulse" />
          <span className="text-sm font-medium uppercase tracking-wider tactical-text">
            {t('security.tactical.liveMap', 'Tactical Map')}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] tactical-mono bg-[hsl(var(--tactical-accent)/0.2)] tactical-text-accent">
            {guardLocations.length} ACTIVE
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <MapStyleSwitcher value={mapStyle} onChange={setMapStyle} compact />
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="tactical-btn p-2"
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative">
        <div
          ref={mapContainer}
          className={cn(
            'w-full',
            isExpanded ? 'h-[calc(100vh-10rem)]' : 'h-[450px]'
          )}
        />

        {/* Tactical Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Scanline effect */}
          <div className="absolute inset-0 scanline-overlay opacity-50" />
          
          {/* Corner brackets */}
          <div className="absolute top-4 start-4 w-8 h-8 border-t-2 border-s-2 border-[hsl(var(--tactical-accent)/0.5)]" />
          <div className="absolute top-4 end-4 w-8 h-8 border-t-2 border-e-2 border-[hsl(var(--tactical-accent)/0.5)]" />
          <div className="absolute bottom-4 start-4 w-8 h-8 border-b-2 border-s-2 border-[hsl(var(--tactical-accent)/0.5)]" />
          <div className="absolute bottom-4 end-4 w-8 h-8 border-b-2 border-e-2 border-[hsl(var(--tactical-accent)/0.5)]" />
        </div>

        {/* Legend */}
        <div className="absolute bottom-6 start-6 tactical-card p-3 space-y-2 z-[1000] pointer-events-auto">
          <div className="text-[10px] uppercase tracking-wider tactical-text-dim mb-2">
            {t('security.tactical.legend', 'Legend')}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-[hsl(var(--tactical-accent))]" />
            <span className="tactical-text-dim">{t('security.tactical.inZone', 'In Zone')}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-[hsl(var(--tactical-critical))]" />
            <span className="tactical-text-dim">{t('security.tactical.alert', 'Alert/Violation')}</span>
          </div>
        </div>

        {/* Coordinates Display */}
        <div className="absolute bottom-6 end-6 tactical-card px-3 py-2 z-[1000]">
          <div className="tactical-mono text-[10px] tactical-text-dim">
            <Crosshair className="inline h-3 w-3 me-1" />
            {zones[0]?.polygon_coords?.[0] 
              ? `${zones[0].polygon_coords[0][0].toFixed(4)}°N ${zones[0].polygon_coords[0][1].toFixed(4)}°E`
              : '24.7136°N 46.6753°E'
            }
          </div>
        </div>
      </div>
    </div>
  );
}
