import React, { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Globe, RefreshCw, MapPin, Shield, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useThreatMapData, useResolveGeolocations, TimeRange, ThreatLocation } from "@/features/admin/hooks/use-threat-map-data";
import { ThreatMapLegend } from "./ThreatMapLegend";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Default target location (Riyadh, Saudi Arabia)
const TARGET_LOCATION: [number, number] = [24.7136, 46.6753];

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: 'all', label: 'All' },
];

interface ThreatCluster {
  lat: number;
  lng: number;
  threats: ThreatLocation[];
  count: number;
  permanentCount: number;
}

function clusterThreats(threats: ThreatLocation[]): ThreatCluster[] {
  const clusterMap = new Map<string, ThreatCluster>();
  
  threats.forEach(threat => {
    if (threat.latitude === null || threat.longitude === null) return;
    
    // Round to 1 decimal for clustering
    const key = `${threat.latitude.toFixed(1)},${threat.longitude.toFixed(1)}`;
    
    if (!clusterMap.has(key)) {
      clusterMap.set(key, {
        lat: threat.latitude,
        lng: threat.longitude,
        threats: [],
        count: 0,
        permanentCount: 0
      });
    }
    
    const cluster = clusterMap.get(key)!;
    cluster.threats.push(threat);
    cluster.count++;
    if (threat.block_type === 'permanent') {
      cluster.permanentCount++;
    }
  });
  
  return Array.from(clusterMap.values());
}

function createPopupContent(cluster: ThreatCluster, t: (key: string, fallback: string) => string): string {
  if (cluster.count === 1) {
    const threat = cluster.threats[0];
    return `
      <div style="min-width: 180px;">
        <div style="font-weight: 600; margin-bottom: 4px;">${threat.ip_address}</div>
        <div style="font-size: 12px; color: #888; margin-bottom: 6px;">
          ${threat.city || ''} ${threat.country || ''}
        </div>
        <div style="display: flex; align-items: center; gap: 6px; font-size: 12px;">
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${threat.block_type === 'permanent' ? '#ef4444' : '#f97316'};"></span>
          ${threat.block_type === 'permanent' ? t('admin.permanentBlock', 'Permanent') : t('admin.temporaryBlock', 'Temporary')}
        </div>
        ${threat.reason ? `<div style="font-size: 11px; color: #666; margin-top: 4px;">${threat.reason}</div>` : ''}
      </div>
    `;
  }
  
  return `
    <div style="min-width: 160px;">
      <div style="font-weight: 600; margin-bottom: 4px;">${cluster.count} ${t('admin.threats', 'Threats')}</div>
      <div style="font-size: 12px; color: #888; margin-bottom: 6px;">
        ${cluster.threats[0].city || cluster.threats[0].country || t('common.unknownLocation', 'Unknown Location')}
      </div>
      <div style="font-size: 12px;">
        <div style="display: flex; align-items: center; gap: 4px;">
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #ef4444;"></span>
          ${cluster.permanentCount} ${t('admin.permanent', 'Permanent')}
        </div>
        <div style="display: flex; align-items: center; gap: 4px; margin-top: 2px;">
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #f97316;"></span>
          ${cluster.count - cluster.permanentCount} ${t('admin.temporary', 'Temporary')}
        </div>
      </div>
    </div>
  `;
}

export function ThreatMapWidget() {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [showFlows, setShowFlows] = useState(true);
  
  const { data, isLoading, refetch } = useThreatMapData(timeRange);
  const resolveGeo = useResolveGeolocations();
  
  // Map refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const flowsLayerRef = useRef<L.LayerGroup | null>(null);
  const targetMarkerRef = useRef<L.CircleMarker | null>(null);
  
  const threatsWithLocation = useMemo(() => {
    return data?.threats.filter(t => t.latitude !== null && t.longitude !== null) || [];
  }, [data?.threats]);

  const clusters = useMemo(() => clusterThreats(threatsWithLocation), [threatsWithLocation]);

  const unresolvedIps = useMemo(() => {
    return data?.threats.filter(t => t.latitude === null).map(t => t.ip_address) || [];
  }, [data?.threats]);

  const handleResolveGeo = async () => {
    if (unresolvedIps.length > 0) {
      await resolveGeo.mutateAsync(unresolvedIps.slice(0, 20));
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    
    mapRef.current = L.map(mapContainerRef.current, {
      center: TARGET_LOCATION,
      zoom: 2,
      zoomControl: false,
    });
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
    }).addTo(mapRef.current);
    
    L.control.zoom({ position: 'topright' }).addTo(mapRef.current);
    
    markersLayerRef.current = L.layerGroup().addTo(mapRef.current);
    flowsLayerRef.current = L.layerGroup().addTo(mapRef.current);
    
    // Add target location marker
    targetMarkerRef.current = L.circleMarker(TARGET_LOCATION, {
      radius: 12,
      fillColor: '#22c55e',
      fillOpacity: 0.9,
      color: '#16a34a',
      weight: 3
    }).addTo(mapRef.current);
    
    targetMarkerRef.current.bindPopup(`
      <div style="text-align: center;">
        <div style="font-weight: 600; margin-bottom: 4px;">${t('admin.yourLocation', 'Your Location')}</div>
        <div style="font-size: 12px; color: #888;">Protected Server</div>
      </div>
    `);
    
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      flowsLayerRef.current = null;
      targetMarkerRef.current = null;
    };
  }, [t]);

  // Update threat markers
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return;
    
    markersLayerRef.current.clearLayers();
    
    clusters.forEach(cluster => {
      const radius = Math.min(6 + cluster.count * 2, 16);
      const fillColor = cluster.permanentCount > cluster.count / 2 ? '#ef4444' : '#f97316';
      
      const marker = L.circleMarker([cluster.lat, cluster.lng], {
        radius,
        fillColor,
        fillOpacity: 0.8,
        color: fillColor,
        weight: 2
      });
      
      marker.bindPopup(createPopupContent(cluster, t));
      marker.addTo(markersLayerRef.current!);
    });
    
    // Fit bounds if we have data
    if (clusters.length > 0) {
      const allLats = clusters.map(c => c.lat).concat(TARGET_LOCATION[0]);
      const allLngs = clusters.map(c => c.lng).concat(TARGET_LOCATION[1]);
      
      const bounds = L.latLngBounds(
        [Math.min(...allLats) - 5, Math.min(...allLngs) - 10],
        [Math.max(...allLats) + 5, Math.max(...allLngs) + 10]
      );
      
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [clusters, t]);

  // Update flow lines
  useEffect(() => {
    if (!mapRef.current || !flowsLayerRef.current) return;
    
    flowsLayerRef.current.clearLayers();
    
    if (!showFlows) return;
    
    threatsWithLocation.forEach(threat => {
      const color = threat.block_type === 'permanent' ? '#ef4444' : '#f97316';
      
      const polyline = L.polyline(
        [[threat.latitude!, threat.longitude!], TARGET_LOCATION],
        { 
          color,
          weight: 1.5,
          opacity: 0.4,
          dashArray: '5, 10'
        }
      );
      
      polyline.addTo(flowsLayerRef.current!);
    });
  }, [threatsWithLocation, showFlows]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-destructive" />
            <CardTitle className="text-lg">{t('admin.threatGeography', 'Threat Geography')}</CardTitle>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* Time range buttons */}
            <div className="flex bg-muted rounded-md p-0.5">
              {TIME_RANGES.map(({ value, label }) => (
                <Button
                  key={value}
                  variant={timeRange === value ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setTimeRange(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1"
              onClick={() => setShowFlows(!showFlows)}
            >
              <span className={showFlows ? 'text-destructive' : 'text-muted-foreground'}>⚡</span>
              {t('common.flows', 'Flows')}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Stats bar */}
        <div className="flex items-center gap-4 px-4 py-2 bg-muted/50 border-y text-sm overflow-x-auto">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="font-medium">{data?.stats.total_blocked || 0}</span>
            <span className="text-muted-foreground">{t('admin.blocked', 'Blocked')}</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <div className="h-2.5 w-2.5 rounded-full bg-destructive" />
            <span>{data?.stats.permanent_blocks || 0}</span>
            <span className="text-muted-foreground text-xs">{t('admin.permanent', 'Perm')}</span>
          </div>
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
            <span>{data?.stats.temporary_blocks || 0}</span>
            <span className="text-muted-foreground text-xs">{t('admin.temporary', 'Temp')}</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{data?.stats.countries_count || 0}</span>
            <span className="text-muted-foreground text-xs">{t('admin.countries', 'Countries')}</span>
          </div>
          
          {unresolvedIps.length > 0 && (
            <>
              <div className="h-4 w-px bg-border" />
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs gap-1 text-warning"
                onClick={handleResolveGeo}
                disabled={resolveGeo.isPending}
              >
                {resolveGeo.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <MapPin className="h-3 w-3" />
                )}
                {t('admin.resolveLocations', 'Resolve {{count}} IPs', { count: Math.min(unresolvedIps.length, 20) })}
              </Button>
            </>
          )}
        </div>

        {/* Map container */}
        <div className="relative h-[400px] w-full">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-[1001]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          
          <div 
            ref={mapContainerRef} 
            className="h-full w-full"
            style={{ background: 'hsl(var(--background))' }}
          />
          
          {/* Legend overlay */}
          <ThreatMapLegend 
            stats={data?.stats}
            className="absolute bottom-4 start-4 z-[1000]"
          />
        </div>
      </CardContent>
    </Card>
  );
}
