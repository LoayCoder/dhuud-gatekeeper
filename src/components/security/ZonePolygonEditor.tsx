import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Trash2, Undo2, Check, Pencil } from 'lucide-react';

interface ZonePolygonEditorProps {
  polygonCoords: [number, number][] | null;
  onChange: (coords: [number, number][] | null) => void;
  zoneType?: string;
}

const ZONE_COLORS: Record<string, string> = {
  perimeter: '#3b82f6',
  building: '#22c55e',
  restricted: '#ef4444',
  parking: '#f59e0b',
  entrance: '#8b5cf6',
  exit: '#ec4899',
};

export default function ZonePolygonEditor({ polygonCoords, onChange, zoneType = 'building' }: ZonePolygonEditorProps) {
  const { t } = useTranslation();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polygonLayerRef = useRef<L.Polygon | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const previewLineRef = useRef<L.Polyline | null>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const [isEditing, setIsEditing] = useState(false);

  const zoneColor = ZONE_COLORS[zoneType] || '#3b82f6';

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [24.7136, 46.6753], // Riyadh default
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Render existing polygon
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing layers
    if (polygonLayerRef.current) {
      map.removeLayer(polygonLayerRef.current);
      polygonLayerRef.current = null;
    }
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    if (polygonCoords && polygonCoords.length >= 3 && !isDrawing) {
      const polygon = L.polygon(polygonCoords, {
        color: zoneColor,
        fillColor: zoneColor,
        fillOpacity: 0.3,
        weight: 2,
      }).addTo(map);
      
      polygonLayerRef.current = polygon;
      map.fitBounds(polygon.getBounds(), { padding: [50, 50] });

      // Add vertex markers if editing
      if (isEditing) {
        polygonCoords.forEach((coord, index) => {
          const marker = L.circleMarker(coord, {
            radius: 8,
            color: zoneColor,
            fillColor: '#ffffff',
            fillOpacity: 1,
            weight: 2,
          }).addTo(map);

          marker.on('mousedown', () => {
            const onMove = (e: L.LeafletMouseEvent) => {
              const newCoords = [...polygonCoords];
              newCoords[index] = [e.latlng.lat, e.latlng.lng];
              onChange(newCoords);
            };
            map.on('mousemove', onMove);
            map.once('mouseup', () => map.off('mousemove', onMove));
          });

          markersRef.current.push(marker);
        });
      }
    }
  }, [polygonCoords, isDrawing, isEditing, zoneColor, onChange]);

  // Drawing mode handlers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!isDrawing) {
      if (previewLineRef.current) {
        map.removeLayer(previewLineRef.current);
        previewLineRef.current = null;
      }
      return;
    }

    const handleClick = (e: L.LeafletMouseEvent) => {
      const point: [number, number] = [e.latlng.lat, e.latlng.lng];
      setDrawingPoints(prev => [...prev, point]);
    };

    map.on('click', handleClick);
    map.getContainer().style.cursor = 'crosshair';

    return () => {
      map.off('click', handleClick);
      map.getContainer().style.cursor = '';
    };
  }, [isDrawing]);

  // Update preview line while drawing
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isDrawing) return;

    // Clear old markers and lines
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];
    if (previewLineRef.current) {
      map.removeLayer(previewLineRef.current);
    }

    if (drawingPoints.length > 0) {
      // Draw line connecting points
      const line = L.polyline(drawingPoints, {
        color: zoneColor,
        weight: 2,
        dashArray: '5, 10',
      }).addTo(map);
      previewLineRef.current = line;

      // Draw vertex markers
      drawingPoints.forEach((point, i) => {
        const marker = L.circleMarker(point, {
          radius: 8,
          color: zoneColor,
          fillColor: i === 0 ? zoneColor : '#ffffff',
          fillOpacity: 1,
          weight: 2,
        }).addTo(map);
        markersRef.current.push(marker);
      });
    }
  }, [drawingPoints, isDrawing, zoneColor]);

  const startDrawing = () => {
    setIsDrawing(true);
    setIsEditing(false);
    setDrawingPoints([]);
    onChange(null);
  };

  const completePolygon = () => {
    if (drawingPoints.length >= 3) {
      onChange(drawingPoints);
      setIsDrawing(false);
      setDrawingPoints([]);
    }
  };

  const undoLastPoint = () => {
    setDrawingPoints(prev => prev.slice(0, -1));
  };

  const clearPolygon = () => {
    onChange(null);
    setIsDrawing(false);
    setIsEditing(false);
    setDrawingPoints([]);
  };

  const toggleEditing = () => {
    setIsEditing(!isEditing);
    setIsDrawing(false);
  };

  const hasPolygon = polygonCoords && polygonCoords.length >= 3;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {hasPolygon ? (
            <Badge variant="default" className="bg-green-600">
              <Check className="h-3 w-3 me-1" />
              {t('security.zones.polygonDefined', 'Boundary Defined')} ({polygonCoords.length} {t('security.zones.vertices', 'vertices')})
            </Badge>
          ) : (
            <Badge variant="secondary">
              <MapPin className="h-3 w-3 me-1" />
              {t('security.zones.noBoundary', 'No Boundary')}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {isDrawing ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={undoLastPoint} disabled={drawingPoints.length === 0}>
                <Undo2 className="h-4 w-4 me-1" />{t('security.zones.undoPoint', 'Undo')}
              </Button>
              <Button type="button" size="sm" onClick={completePolygon} disabled={drawingPoints.length < 3}>
                <Check className="h-4 w-4 me-1" />{t('security.zones.completePolygon', 'Complete')} ({drawingPoints.length}/3+)
              </Button>
            </>
          ) : (
            <>
              {hasPolygon && (
                <Button type="button" variant={isEditing ? 'default' : 'outline'} size="sm" onClick={toggleEditing}>
                  <Pencil className="h-4 w-4 me-1" />{isEditing ? t('common.done', 'Done') : t('security.zones.editPolygon', 'Edit')}
                </Button>
              )}
              <Button type="button" variant="outline" size="sm" onClick={startDrawing}>
                <MapPin className="h-4 w-4 me-1" />{hasPolygon ? t('security.zones.redrawPolygon', 'Redraw') : t('security.zones.drawPolygon', 'Draw')}
              </Button>
              {hasPolygon && (
                <Button type="button" variant="ghost" size="sm" onClick={clearPolygon} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {isDrawing && (
        <p className="text-sm text-muted-foreground">
          {t('security.zones.clickToAddPoint', 'Click on the map to add boundary points. Minimum 3 points required.')}
        </p>
      )}

      <div ref={mapRef} className="h-[300px] w-full rounded-lg border border-border overflow-hidden" />
    </div>
  );
}
