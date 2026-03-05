import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { MapPin, Trash2, RotateCcw, Check, Pencil, Ruler, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Fix Leaflet default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Coordinate {
  lat: number;
  lng: number;
}

interface LocationBoundaryPickerProps {
  latitude?: number | null;
  longitude?: number | null;
  boundaryPolygon?: Coordinate[] | null;
  geofenceRadius?: number;
  onLocationChange?: (lat: number, lng: number) => void;
  onPolygonChange?: (polygon: Coordinate[] | null) => void;
  onRadiusChange?: (radius: number) => void;
  showMarkerMode?: boolean;
  showPolygonMode?: boolean;
  showRadiusSlider?: boolean;
  readOnly?: boolean;
  mapHeight?: string;
  title?: string;
  defaultCenter?: [number, number];
}

type DrawMode = 'marker' | 'polygon' | 'none';

// Calculate polygon area using Shoelace formula with geodetic projection
function calculatePolygonArea(coords: Coordinate[]): number {
  if (coords.length < 3) return 0;
  
  const earthRadius = 6371000; // meters
  const toRad = (deg: number) => deg * Math.PI / 180;
  
  const centerLat = coords.reduce((sum, c) => sum + c.lat, 0) / coords.length;
  const centerLng = coords.reduce((sum, c) => sum + c.lng, 0) / coords.length;
  
  const projected = coords.map(({ lat, lng }) => {
    const x = earthRadius * toRad(lng - centerLng) * Math.cos(toRad(centerLat));
    const y = earthRadius * toRad(lat - centerLat);
    return [x, y];
  });
  
  let area = 0;
  for (let i = 0; i < projected.length; i++) {
    const j = (i + 1) % projected.length;
    area += projected[i][0] * projected[j][1];
    area -= projected[j][0] * projected[i][1];
  }
  
  return Math.abs(area / 2);
}

function formatArea(areaM2: number): string {
  if (areaM2 >= 10000) {
    return `${(areaM2 / 10000).toFixed(2)} ha`;
  }
  return `${Math.round(areaM2).toLocaleString()} m²`;
}

export function LocationBoundaryPicker({
  latitude,
  longitude,
  boundaryPolygon,
  geofenceRadius = 100,
  onLocationChange,
  onPolygonChange,
  onRadiusChange,
  showMarkerMode = true,
  showPolygonMode = true,
  showRadiusSlider = true,
  readOnly = false,
  mapHeight = '400px',
  title,
  defaultCenter = [24.7136, 46.6753],
}: LocationBoundaryPickerProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const polygonRef = useRef<L.Polygon | null>(null);
  const tempMarkersRef = useRef<L.LayerGroup | null>(null);
  const radiusCircleRef = useRef<L.Circle | null>(null);
  const polygonRadiusLayerRef = useRef<L.LayerGroup | null>(null);
  
  const [mode, setMode] = useState<DrawMode>(showMarkerMode ? 'marker' : (showPolygonMode ? 'polygon' : 'none'));
  const [polygonPoints, setPolygonPoints] = useState<Coordinate[]>(boundaryPolygon ?? []);
  const [markerPosition, setMarkerPosition] = useState<Coordinate | null>(
    latitude && longitude ? { lat: latitude, lng: longitude } : null
  );
  const [boundaryConfirmed, setBoundaryConfirmed] = useState(!!boundaryPolygon && boundaryPolygon.length >= 3);
  const [localRadius, setLocalRadius] = useState(geofenceRadius);
  const [showRadiusBuffer, setShowRadiusBuffer] = useState(false);

  // Polygon area calculation
  const polygonArea = polygonPoints.length >= 3 ? calculatePolygonArea(polygonPoints) : 0;

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    const center: L.LatLngExpression = markerPosition 
      ? [markerPosition.lat, markerPosition.lng] 
      : defaultCenter;

    mapInstance.current = L.map(mapContainer.current, {
      center,
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapInstance.current);

    tempMarkersRef.current = L.layerGroup().addTo(mapInstance.current);
    polygonRadiusLayerRef.current = L.layerGroup().addTo(mapInstance.current);

    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, []);

  // Handle map resize when container becomes visible
  useEffect(() => {
    if (!mapInstance.current) return;
    
    const timers = [
      setTimeout(() => mapInstance.current?.invalidateSize(), 100),
      setTimeout(() => mapInstance.current?.invalidateSize(), 300),
      setTimeout(() => mapInstance.current?.invalidateSize(), 500),
    ];
    
    return () => timers.forEach(clearTimeout);
  }, []);

  // Handle map clicks
  useEffect(() => {
    if (!mapInstance.current || readOnly) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      if (mode === 'marker') {
        const newPos = { lat: e.latlng.lat, lng: e.latlng.lng };
        setMarkerPosition(newPos);
        onLocationChange?.(e.latlng.lat, e.latlng.lng);
      } else if (mode === 'polygon') {
        setPolygonPoints(prev => [...prev, { lat: e.latlng.lat, lng: e.latlng.lng }]);
        setBoundaryConfirmed(false);
      }
    };

    mapInstance.current.on('click', handleClick);
    mapInstance.current.getContainer().style.cursor = mode === 'polygon' ? 'crosshair' : 'grab';
    
    return () => {
      mapInstance.current?.off('click', handleClick);
      if (mapInstance.current) {
        mapInstance.current.getContainer().style.cursor = '';
      }
    };
  }, [mode, readOnly, onLocationChange]);

  // Update marker and radius circle
  useEffect(() => {
    if (!mapInstance.current) return;

    if (markerRef.current) {
      mapInstance.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }

    if (radiusCircleRef.current) {
      mapInstance.current.removeLayer(radiusCircleRef.current);
      radiusCircleRef.current = null;
    }

    if (markerPosition) {
      markerRef.current = L.marker([markerPosition.lat, markerPosition.lng])
        .addTo(mapInstance.current);

      // Draw geofence radius circle
      if (showRadiusSlider && localRadius > 0) {
        radiusCircleRef.current = L.circle([markerPosition.lat, markerPosition.lng], {
          radius: localRadius,
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.1,
          weight: 2,
          dashArray: '5, 5',
        }).addTo(mapInstance.current);
      }
    }
  }, [markerPosition, localRadius, showRadiusSlider]);

  // Update polygon
  useEffect(() => {
    if (!mapInstance.current) return;

    if (polygonRef.current) {
      mapInstance.current.removeLayer(polygonRef.current);
      polygonRef.current = null;
    }

    tempMarkersRef.current?.clearLayers();
    polygonRadiusLayerRef.current?.clearLayers();

    if (polygonPoints.length >= 3) {
      polygonRef.current = L.polygon(
        polygonPoints.map(p => [p.lat, p.lng] as L.LatLngTuple),
        {
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.2,
          weight: 2,
        }
      ).addTo(mapInstance.current);

      // Draw radius buffer around polygon vertices
      if (showRadiusBuffer && polygonRadiusLayerRef.current) {
        polygonPoints.forEach(point => {
          const circle = L.circle([point.lat, point.lng], {
            radius: localRadius,
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.1,
            weight: 1,
            dashArray: '5, 5',
          });
          polygonRadiusLayerRef.current?.addLayer(circle);
        });
      }
    } else if (polygonPoints.length > 0 && mode === 'polygon') {
      // Show temp markers for points being drawn
      polygonPoints.forEach(point => {
        L.circleMarker([point.lat, point.lng], {
          radius: 6,
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 1,
          weight: 2,
        }).addTo(tempMarkersRef.current!);
      });
    }
  }, [polygonPoints, mode, showRadiusBuffer, localRadius]);

  // Sync external props
  useEffect(() => {
    if (latitude && longitude) {
      setMarkerPosition({ lat: latitude, lng: longitude });
    }
  }, [latitude, longitude]);

  useEffect(() => {
    if (boundaryPolygon) {
      setPolygonPoints(boundaryPolygon);
      setBoundaryConfirmed(boundaryPolygon.length >= 3);
    }
  }, [boundaryPolygon]);

  useEffect(() => {
    setLocalRadius(geofenceRadius);
  }, [geofenceRadius]);

  const handleUndoPolygonPoint = () => {
    setPolygonPoints(prev => prev.slice(0, -1));
    setBoundaryConfirmed(false);
  };

  const handleClearPolygon = () => {
    setPolygonPoints([]);
    setBoundaryConfirmed(false);
    onPolygonChange?.(null);
  };

  const handleConfirmBoundary = () => {
    if (polygonPoints.length >= 3) {
      onPolygonChange?.(polygonPoints);
      setBoundaryConfirmed(true);
      toast.success(t('location.boundaryConfirmed', 'Boundary confirmed'));
    }
  };

  const handleRadiusChange = (value: number[]) => {
    setLocalRadius(value[0]);
    onRadiusChange?.(value[0]);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {title || t('location.locationAndBoundary', 'Location & Boundary')}
          </CardTitle>
          
          {!readOnly && (showMarkerMode || showPolygonMode) && (
            <div className="flex items-center gap-2">
              {showMarkerMode && (
                <Button
                  type="button"
                  size="sm"
                  variant={mode === 'marker' ? 'default' : 'outline'}
                  onClick={() => setMode('marker')}
                >
                  <MapPin className={cn("h-4 w-4", isRTL ? "ms-1" : "me-1")} />
                  {t('location.setMarker', 'Set Marker')}
                </Button>
              )}
              {showPolygonMode && (
                <Button
                  type="button"
                  size="sm"
                  variant={mode === 'polygon' ? 'default' : 'outline'}
                  onClick={() => setMode('polygon')}
                >
                  <Pencil className={cn("h-4 w-4", isRTL ? "ms-1" : "me-1")} />
                  {t('location.drawBoundary', 'Draw Boundary')}
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Geofence Radius Slider */}
        {showRadiusSlider && !readOnly && (
          <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Circle className="h-4 w-4" />
                {t('location.geofenceRadius', 'Geofence Radius')}
              </Label>
              <Badge variant="outline">{localRadius}m</Badge>
            </div>
            <Slider
              value={[localRadius]}
              onValueChange={handleRadiusChange}
              min={10}
              max={500}
              step={10}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              {t('location.geofenceRadiusDescription', 'Alert trigger zone around the location')}
            </p>
          </div>
        )}

        {/* Map Container */}
        <div 
          ref={mapContainer}
          className="relative rounded-lg overflow-hidden border"
          style={{ height: mapHeight, zIndex: 0 }}
        />
        
        {/* Polygon controls */}
        {mode === 'polygon' && !readOnly && (
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {t('location.polygonPoints', '{{count}} points', { count: polygonPoints.length })}
              </Badge>
              {polygonPoints.length >= 3 && (
                <Badge variant="outline" className="gap-1">
                  <Ruler className="h-3 w-3" />
                  {formatArea(polygonArea)}
                </Badge>
              )}
              {polygonPoints.length > 0 && polygonPoints.length < 3 && (
                <span className="text-sm text-muted-foreground">
                  {t('location.needMorePoints', 'Need {{count}} more points', { count: 3 - polygonPoints.length })}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleUndoPolygonPoint}
                disabled={polygonPoints.length === 0}
              >
                <RotateCcw className={cn("h-4 w-4", isRTL ? "ms-1" : "me-1")} />
                {t('common.undo', 'Undo')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleClearPolygon}
                disabled={polygonPoints.length === 0}
              >
                <Trash2 className={cn("h-4 w-4", isRTL ? "ms-1" : "me-1")} />
                {t('common.clear', 'Clear')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={boundaryConfirmed ? 'secondary' : 'default'}
                onClick={handleConfirmBoundary}
                disabled={polygonPoints.length < 3}
                className={cn(
                  boundaryConfirmed && 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700'
                )}
              >
                <Check className={cn("h-4 w-4", isRTL ? "ms-1" : "me-1")} />
                {boundaryConfirmed ? t('location.boundarySet', 'Boundary Set') : t('location.confirmBoundary', 'Confirm Boundary')}
              </Button>
            </div>
          </div>
        )}

        {/* Polygon info (non-drawing mode) */}
        {mode !== 'polygon' && polygonPoints.length >= 3 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="default" className="bg-green-600">
              <Check className="h-3 w-3 me-1" />
              {t('location.boundaryDefined', 'Boundary defined')} ({polygonPoints.length} {t('location.vertices', 'vertices')})
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Ruler className="h-3 w-3" />
              {formatArea(polygonArea)}
            </Badge>
          </div>
        )}

        {/* Radius buffer toggle for polygon */}
        {polygonPoints.length >= 3 && (
          <div className="flex items-center gap-2">
            <Checkbox 
              id="show-radius-buffer"
              checked={showRadiusBuffer}
              onCheckedChange={(checked) => setShowRadiusBuffer(checked === true)}
            />
            <Label htmlFor="show-radius-buffer" className="text-sm text-muted-foreground cursor-pointer">
              {t('location.showRadiusBuffer', 'Show radius buffer')} ({localRadius}m)
            </Label>
          </div>
        )}
        
        {/* Current coordinates display */}
        {markerPosition && (
          <div className="text-sm text-muted-foreground">
            {t('location.coordinates', 'Coordinates')}: {markerPosition.lat.toFixed(6)}, {markerPosition.lng.toFixed(6)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
