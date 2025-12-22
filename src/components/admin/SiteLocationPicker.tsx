import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Polygon, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Trash2, RotateCcw, Save, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  onLocationChange: (lat: number, lng: number) => void;
  onPolygonChange: (polygon: Coordinate[] | null) => void;
  readOnly?: boolean;
}

type DrawMode = 'marker' | 'polygon';

function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  
  return null;
}

function MapClickHandler({ 
  mode, 
  onMarkerClick, 
  onPolygonClick,
  readOnly 
}: { 
  mode: DrawMode;
  onMarkerClick: (lat: number, lng: number) => void;
  onPolygonClick: (lat: number, lng: number) => void;
  readOnly?: boolean;
}) {
  useMapEvents({
    click: (e) => {
      if (readOnly) return;
      
      if (mode === 'marker') {
        onMarkerClick(e.latlng.lat, e.latlng.lng);
      } else {
        onPolygonClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  
  return null;
}

export function SiteLocationPicker({
  latitude,
  longitude,
  boundaryPolygon,
  onLocationChange,
  onPolygonChange,
  readOnly = false,
}: SiteLocationPickerProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  
  const [mode, setMode] = useState<DrawMode>('marker');
  const [polygonPoints, setPolygonPoints] = useState<Coordinate[]>(boundaryPolygon ?? []);
  const [markerPosition, setMarkerPosition] = useState<Coordinate | null>(
    latitude && longitude ? { lat: latitude, lng: longitude } : null
  );

  // Default center (Saudi Arabia)
  const defaultCenter: [number, number] = [24.7136, 46.6753];
  const center: [number, number] = markerPosition 
    ? [markerPosition.lat, markerPosition.lng] 
    : defaultCenter;

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

  const handleMarkerClick = useCallback((lat: number, lng: number) => {
    setMarkerPosition({ lat, lng });
    onLocationChange(lat, lng);
  }, [onLocationChange]);

  const handlePolygonClick = useCallback((lat: number, lng: number) => {
    setPolygonPoints(prev => [...prev, { lat, lng }]);
  }, []);

  const handleUndoPolygonPoint = () => {
    setPolygonPoints(prev => prev.slice(0, -1));
  };

  const handleClearPolygon = () => {
    setPolygonPoints([]);
    onPolygonChange(null);
  };

  const handleSavePolygon = () => {
    if (polygonPoints.length >= 3) {
      onPolygonChange(polygonPoints);
    }
  };

  const polygonPositions: [number, number][] = polygonPoints.map(p => [p.lat, p.lng]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {t('admin.orgStructure.siteLocation')}
          </CardTitle>
          
          {!readOnly && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={mode === 'marker' ? 'default' : 'outline'}
                onClick={() => setMode('marker')}
              >
                <MapPin className={cn("h-4 w-4", isRTL ? "ms-1" : "me-1")} />
                {t('admin.orgStructure.setMarker')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === 'polygon' ? 'default' : 'outline'}
                onClick={() => setMode('polygon')}
              >
                <Pencil className={cn("h-4 w-4", isRTL ? "ms-1" : "me-1")} />
                {t('admin.orgStructure.drawBoundary')}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="relative h-[400px] rounded-lg overflow-hidden border">
          <MapContainer
            center={center}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <MapController center={center} />
            
            <MapClickHandler 
              mode={mode}
              onMarkerClick={handleMarkerClick}
              onPolygonClick={handlePolygonClick}
              readOnly={readOnly}
            />
            
            {markerPosition && (
              <Marker position={[markerPosition.lat, markerPosition.lng]} />
            )}
            
            {polygonPositions.length >= 3 && (
              <Polygon 
                positions={polygonPositions}
                pathOptions={{ 
                  color: 'hsl(var(--primary))',
                  fillColor: 'hsl(var(--primary))',
                  fillOpacity: 0.2,
                  weight: 2,
                }}
              />
            )}
            
            {/* Show polygon points being drawn */}
            {mode === 'polygon' && polygonPositions.length > 0 && polygonPositions.length < 3 && (
              <>
                {polygonPoints.map((point, idx) => (
                  <Marker 
                    key={idx} 
                    position={[point.lat, point.lng]}
                    icon={L.divIcon({
                      className: 'custom-div-icon',
                      html: `<div style="background-color: hsl(var(--primary)); width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
                      iconSize: [12, 12],
                      iconAnchor: [6, 6],
                    })}
                  />
                ))}
              </>
            )}
          </MapContainer>
        </div>
        
        {/* Polygon controls */}
        {mode === 'polygon' && !readOnly && (
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {t('admin.orgStructure.polygonPoints', { count: polygonPoints.length })}
              </Badge>
              {polygonPoints.length < 3 && (
                <span className="text-sm text-muted-foreground">
                  {t('admin.orgStructure.needMorePoints', { count: 3 - polygonPoints.length })}
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
                onClick={handleSavePolygon}
                disabled={polygonPoints.length < 3}
              >
                <Save className={cn("h-4 w-4", isRTL ? "ms-1" : "me-1")} />
                {t('common.save')}
              </Button>
            </div>
          </div>
        )}
        
        {/* Current coordinates display */}
        {markerPosition && (
          <div className="text-sm text-muted-foreground">
            {t('admin.orgStructure.coordinates')}: {markerPosition.lat.toFixed(6)}, {markerPosition.lng.toFixed(6)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
