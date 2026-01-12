import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
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
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polygonRef = useRef<L.Polygon | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

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

  const tileConfig = MAP_STYLES[mapStyle];
  const polygonColors = getPolygonColors();

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const defaultCenter: [number, number] = guardPosition 
      ? [guardPosition.lat, guardPosition.lng] 
      : zonePolygon && zonePolygon.length > 0 
        ? zonePolygon[0] 
        : [24.7136, 46.6753];

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 17,
      zoomControl: false,
    });

    L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
    }).addTo(map);

    mapRef.current = map;
    setIsMapReady(true);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update polygon
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;

    // Remove existing polygon
    if (polygonRef.current) {
      polygonRef.current.remove();
      polygonRef.current = null;
    }

    // Add zone polygon
    if (zonePolygon && zonePolygon.length >= 3) {
      polygonRef.current = L.polygon(zonePolygon, {
        color: polygonColors.color,
        fillColor: polygonColors.fillColor,
        fillOpacity: polygonColors.fillOpacity,
        weight: 3,
      }).addTo(mapRef.current);

      // Fit bounds
      const bounds = L.latLngBounds(zonePolygon);
      if (guardPosition) {
        bounds.extend([guardPosition.lat, guardPosition.lng]);
      }
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [zonePolygon, polygonColors, guardPosition, isMapReady]);

  // Update marker and circle
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;

    // Remove existing marker and circle
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    if (circleRef.current) {
      circleRef.current.remove();
      circleRef.current = null;
    }

    // Add guard marker
    if (guardPosition) {
      markerRef.current = L.marker([guardPosition.lat, guardPosition.lng], {
        icon: createGuardIcon(boundaryStatus),
      }).addTo(mapRef.current);

      markerRef.current.bindPopup(`
        <div style="text-align: center;">
          <p style="font-weight: 500;">${t('security.myLocation.yourPosition', 'Your Position')}</p>
          <p style="font-size: 12px; color: #666;">
            ${guardPosition.lat.toFixed(6)}, ${guardPosition.lng.toFixed(6)}
          </p>
        </div>
      `);

      // Add warning circle
      if (boundaryStatus !== 'outside') {
        circleRef.current = L.circle([guardPosition.lat, guardPosition.lng], {
          radius: 50,
          color: '#eab308',
          fillColor: '#fef08a',
          fillOpacity: 0.1,
          weight: 1,
          dashArray: '5, 5',
        }).addTo(mapRef.current);
      }
    }
  }, [guardPosition, boundaryStatus, isMapReady, t]);

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
          <div ref={mapContainerRef} className="h-full w-full" />

          {/* Legend Overlay */}
          <div className="absolute bottom-2 start-2 bg-background/90 backdrop-blur-sm rounded-lg p-2 text-xs border shadow-sm z-[1000]">
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