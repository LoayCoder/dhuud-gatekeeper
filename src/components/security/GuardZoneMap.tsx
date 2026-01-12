import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Polygon, Circle, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Map, Navigation, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MAP_STYLES, MapStyleKey } from '@/components/maps/MapStyleSwitcher';
import type { BoundaryProximityLevel } from '@/lib/zone-detection';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface GuardZoneMapProps {
  zonePolygon: [number, number][] | null;
  guardPosition: { lat: number; lng: number } | null;
  boundaryStatus: BoundaryProximityLevel;
  distanceToEdge?: number;
  zoneName: string;
  className?: string;
  mapStyle?: MapStyleKey;
}

// Custom guard marker icon
function createGuardIcon(status: BoundaryProximityLevel) {
  const colors = {
    safe: '#22c55e',
    warning: '#eab308',
    danger: '#ef4444',
    outside: '#dc2626',
  };

  return L.divIcon({
    className: 'guard-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: ${colors[status]};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        animation: pulse 2s infinite;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
        </svg>
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      </style>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

// Component to auto-center map on position
function MapAutoCenter({ position, polygon }: { position: { lat: number; lng: number } | null; polygon: [number, number][] | null }) {
  const map = useMap();

  useEffect(() => {
    if (polygon && polygon.length >= 3) {
      // Fit bounds to polygon
      const bounds = L.latLngBounds(polygon.map(([lat, lng]) => [lat, lng] as [number, number]));
      if (position) {
        bounds.extend([position.lat, position.lng]);
      }
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (position) {
      map.setView([position.lat, position.lng], 17);
    }
  }, [map, position, polygon]);

  return null;
}

export function GuardZoneMap({
  zonePolygon,
  guardPosition,
  boundaryStatus,
  distanceToEdge,
  zoneName,
  className,
  mapStyle = 'street',
}: GuardZoneMapProps) {
  const { t } = useTranslation();
  const mapRef = useRef<L.Map | null>(null);

  // Zone polygon colors based on status
  const getPolygonColors = () => {
    switch (boundaryStatus) {
      case 'safe':
        return { fillColor: '#22c55e', color: '#16a34a', fillOpacity: 0.15 };
      case 'warning':
        return { fillColor: '#eab308', color: '#ca8a04', fillOpacity: 0.2 };
      case 'danger':
        return { fillColor: '#ef4444', color: '#dc2626', fillOpacity: 0.25 };
      case 'outside':
        return { fillColor: '#dc2626', color: '#b91c1c', fillOpacity: 0.2 };
      default:
        return { fillColor: '#3b82f6', color: '#2563eb', fillOpacity: 0.15 };
    }
  };

  const getStatusBadge = () => {
    switch (boundaryStatus) {
      case 'safe':
        return (
          <Badge className="bg-green-500 text-white">
            <CheckCircle className="h-3 w-3 me-1" />
            {t('security.zone.safe', 'Safe Zone')}
          </Badge>
        );
      case 'warning':
        return (
          <Badge className="bg-yellow-500 text-white">
            <AlertTriangle className="h-3 w-3 me-1" />
            {t('security.zone.warning', 'Near Boundary')}
          </Badge>
        );
      case 'danger':
        return (
          <Badge className="bg-red-500 text-white animate-pulse">
            <AlertTriangle className="h-3 w-3 me-1" />
            {t('security.zone.danger', 'At Boundary!')}
          </Badge>
        );
      case 'outside':
        return (
          <Badge variant="destructive" className="animate-pulse">
            <AlertTriangle className="h-3 w-3 me-1" />
            {t('security.zone.outside', 'Outside Zone!')}
          </Badge>
        );
    }
  };

  const defaultCenter: [number, number] = guardPosition 
    ? [guardPosition.lat, guardPosition.lng] 
    : zonePolygon && zonePolygon.length > 0 
      ? zonePolygon[0] 
      : [24.7136, 46.6753]; // Default to Riyadh

  const tileConfig = MAP_STYLES[mapStyle];
  const polygonColors = getPolygonColors();

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Map className="h-5 w-5" />
            {zoneName || t('security.myLocation.zoneMap', 'Zone Map')}
          </CardTitle>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {distanceToEdge !== undefined && boundaryStatus !== 'outside' && (
              <Badge variant="outline" className="text-xs">
                <Navigation className="h-3 w-3 me-1" />
                {Math.abs(distanceToEdge).toFixed(0)}m {t('security.zone.toEdge', 'to edge')}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[300px] sm:h-[350px] w-full relative">
          <MapContainer
            center={defaultCenter}
            zoom={17}
            style={{ height: '100%', width: '100%' }}
            ref={mapRef}
            zoomControl={false}
          >
            <TileLayer
              attribution={tileConfig.attribution}
              url={tileConfig.url}
            />
            
            <MapAutoCenter position={guardPosition} polygon={zonePolygon} />

            {/* Zone Polygon */}
            {zonePolygon && zonePolygon.length >= 3 && (
              <Polygon
                positions={zonePolygon.map(([lat, lng]) => [lat, lng] as [number, number])}
                pathOptions={{
                  color: polygonColors.color,
                  fillColor: polygonColors.fillColor,
                  fillOpacity: polygonColors.fillOpacity,
                  weight: 3,
                }}
              />
            )}

            {/* Warning boundary ring (50m from edge) */}
            {guardPosition && boundaryStatus !== 'outside' && (
              <Circle
                center={[guardPosition.lat, guardPosition.lng]}
                radius={50}
                pathOptions={{
                  color: '#eab308',
                  fillColor: '#fef08a',
                  fillOpacity: 0.1,
                  weight: 1,
                  dashArray: '5, 5',
                }}
              />
            )}

            {/* Guard Position Marker */}
            {guardPosition && (
              <Marker
                position={[guardPosition.lat, guardPosition.lng]}
                icon={createGuardIcon(boundaryStatus)}
              >
                <Popup>
                  <div className="text-center">
                    <p className="font-medium">{t('security.myLocation.yourPosition', 'Your Position')}</p>
                    <p className="text-xs text-muted-foreground">
                      {guardPosition.lat.toFixed(6)}, {guardPosition.lng.toFixed(6)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>

          {/* Legend Overlay */}
          <div className="absolute bottom-2 start-2 bg-background/90 backdrop-blur-sm rounded-lg p-2 text-xs border shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow" />
              <span>{t('security.zone.safe', 'Safe')}</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-yellow-500 border-2 border-white shadow" />
              <span>{t('security.zone.warning', 'Warning')} (&lt;50m)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow" />
              <span>{t('security.zone.danger', 'Danger')} (&lt;20m)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}