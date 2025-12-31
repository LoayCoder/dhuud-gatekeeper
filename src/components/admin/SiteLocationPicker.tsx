import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DEFAULT_TILE, DEFAULT_CENTER, BOUNDARY_STYLES } from '@/lib/map-tiles';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Trash2, RotateCcw, Check, Pencil, Navigation, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useGPSCapture } from '@/hooks/use-gps-capture';

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

interface SiteLocationPickerProps {
  latitude?: number | null;
  longitude?: number | null;
  boundaryPolygon?: Coordinate[] | null;
  geofenceRadius?: number;
  onLocationChange: (lat: number, lng: number) => void;
  onPolygonChange: (polygon: Coordinate[] | null) => void;
  readOnly?: boolean;
}

type DrawMode = 'marker' | 'polygon';

export function SiteLocationPicker({
  latitude,
  longitude,
  boundaryPolygon,
  geofenceRadius = 100,
  onLocationChange,
  onPolygonChange,
  readOnly = false,
}: SiteLocationPickerProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const { isCapturing, captureGPS } = useGPSCapture();
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const polygonRef = useRef<L.Polygon | null>(null);
  const tempMarkersRef = useRef<L.LayerGroup | null>(null);
  
  const [mode, setMode] = useState<DrawMode>('marker');
  const [polygonPoints, setPolygonPoints] = useState<Coordinate[]>(boundaryPolygon ?? []);
  const [markerPosition, setMarkerPosition] = useState<Coordinate | null>(
    latitude && longitude ? { lat: latitude, lng: longitude } : null
  );
  const [boundaryConfirmed, setBoundaryConfirmed] = useState(false);

  const handleUseCurrentLocation = async () => {
    const coords = await captureGPS();
    if (coords) {
      setMarkerPosition({ lat: coords.lat, lng: coords.lng });
      onLocationChange(coords.lat, coords.lng);
      mapInstance.current?.setView([coords.lat, coords.lng], 15);
      toast.success(t('patrolCheckpoint.locationCaptured'), {
        description: `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
      });
    } else {
      toast.error(t('location.locationFailed'));
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    const center: L.LatLngExpression = markerPosition 
      ? [markerPosition.lat, markerPosition.lng] 
      : DEFAULT_CENTER;

    mapInstance.current = L.map(mapContainer.current, {
      center,
      zoom: 13,
      zoomControl: true,
    });

    // Use premium CartoDB tiles for cleaner appearance
    L.tileLayer(DEFAULT_TILE.url, {
      attribution: DEFAULT_TILE.attribution,
      ...DEFAULT_TILE.options,
    }).addTo(mapInstance.current);

    tempMarkersRef.current = L.layerGroup().addTo(mapInstance.current);

    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, []);

  // Handle map resize when container becomes visible (important for dialogs)
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
        onLocationChange(e.latlng.lat, e.latlng.lng);
      } else {
        setPolygonPoints(prev => [...prev, { lat: e.latlng.lat, lng: e.latlng.lng }]);
      }
    };

    mapInstance.current.on('click', handleClick);
    return () => {
      mapInstance.current?.off('click', handleClick);
    };
  }, [mode, readOnly, onLocationChange]);

  // Update marker when position changes
  useEffect(() => {
    if (!mapInstance.current) return;

    if (markerRef.current) {
      mapInstance.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }

    if (markerPosition) {
      markerRef.current = L.marker([markerPosition.lat, markerPosition.lng])
        .addTo(mapInstance.current);
    }
  }, [markerPosition]);

  // Update polygon when points change
  useEffect(() => {
    if (!mapInstance.current) return;

    // Clear existing polygon
    if (polygonRef.current) {
      mapInstance.current.removeLayer(polygonRef.current);
      polygonRef.current = null;
    }

    // Clear temp markers
    tempMarkersRef.current?.clearLayers();

    // Draw polygon if we have 3+ points
    if (polygonPoints.length >= 3) {
      polygonRef.current = L.polygon(
        polygonPoints.map(p => [p.lat, p.lng] as L.LatLngTuple),
        BOUNDARY_STYLES.default
      ).addTo(mapInstance.current);
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
  }, [polygonPoints, mode]);

  // Sync external props
  useEffect(() => {
    if (latitude && longitude) {
      setMarkerPosition({ lat: latitude, lng: longitude });
    }
  }, [latitude, longitude]);

  useEffect(() => {
    if (boundaryPolygon) {
      setPolygonPoints(boundaryPolygon);
    }
  }, [boundaryPolygon]);

  const handleUndoPolygonPoint = () => {
    setPolygonPoints(prev => prev.slice(0, -1));
    setBoundaryConfirmed(false);
  };

  const handleClearPolygon = () => {
    setPolygonPoints([]);
    setBoundaryConfirmed(false);
    onPolygonChange(null);
  };

  const handleConfirmBoundary = () => {
    if (polygonPoints.length >= 3) {
      onPolygonChange(polygonPoints);
      setBoundaryConfirmed(true);
      toast.success(t('orgStructure.boundaryConfirmed'), {
        description: t('orgStructure.boundaryConfirmedDescription'),
      });
    }
  };

  // Reset confirmation when polygon points change after confirmation
  useEffect(() => {
    if (boundaryConfirmed && polygonPoints.length < 3) {
      setBoundaryConfirmed(false);
    }
  }, [polygonPoints, boundaryConfirmed]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {t('orgStructure.siteLocation')}
          </CardTitle>
          
          {!readOnly && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                size="sm"
                variant={mode === 'marker' ? 'default' : 'outline'}
                onClick={() => setMode('marker')}
              >
                <MapPin className={cn("h-4 w-4", isRTL ? "ms-1" : "me-1")} />
                {t('orgStructure.setMarker')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === 'polygon' ? 'default' : 'outline'}
                onClick={() => setMode('polygon')}
              >
                <Pencil className={cn("h-4 w-4", isRTL ? "ms-1" : "me-1")} />
                {t('orgStructure.drawBoundary')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleUseCurrentLocation}
                disabled={isCapturing}
              >
                {isCapturing ? (
                  <Loader2 className={cn("h-4 w-4 animate-spin", isRTL ? "ms-1" : "me-1")} />
                ) : (
                  <Navigation className={cn("h-4 w-4", isRTL ? "ms-1" : "me-1")} />
                )}
                {t('location.useCurrentLocation')}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div 
          ref={mapContainer}
          className="relative h-[400px] rounded-lg overflow-hidden border"
          style={{ zIndex: 0 }}
        />
        
        {/* Polygon controls */}
        {mode === 'polygon' && !readOnly && (
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {t('orgStructure.polygonPoints', { count: polygonPoints.length })}
              </Badge>
              {polygonPoints.length < 3 && (
                <span className="text-sm text-muted-foreground">
                  {t('orgStructure.needMorePoints', { count: 3 - polygonPoints.length })}
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
                {t('common.undo')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleClearPolygon}
                disabled={polygonPoints.length === 0}
              >
                <Trash2 className={cn("h-4 w-4", isRTL ? "ms-1" : "me-1")} />
                {t('common.clear')}
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
                {boundaryConfirmed ? t('orgStructure.boundarySet') : t('orgStructure.confirmBoundary')}
              </Button>
            </div>
          </div>
        )}
        
        {/* Current coordinates display */}
        {markerPosition && (
          <div className="text-sm text-muted-foreground">
            {t('orgStructure.coordinates')}: {markerPosition.lat.toFixed(6)}, {markerPosition.lng.toFixed(6)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}