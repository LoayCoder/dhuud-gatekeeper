import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Globe, RefreshCw, MapPin, Shield, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useThreatMapData, useResolveGeolocations, TimeRange } from "@/hooks/admin/use-threat-map-data";
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, useMap } from "react-leaflet";
import { ThreatMapLegend } from "./ThreatMapLegend";
import { AttackFlowAnimation } from "./AttackFlowAnimation";
import { ThreatClusterMarkers } from "./ThreatClusterMarkers";
import "leaflet/dist/leaflet.css";

// Default target location (Riyadh, Saudi Arabia)
const TARGET_LOCATION: [number, number] = [24.7136, 46.6753];

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: 'all', label: 'All' },
];

function MapController({ bounds }: { bounds?: [[number, number], [number, number]] }) {
  const map = useMap();
  
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  
  return null;
}

export function ThreatMapWidget() {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [showFlows, setShowFlows] = useState(true);
  
  const { data, isLoading, refetch } = useThreatMapData(timeRange);
  const resolveGeo = useResolveGeolocations();
  
  const threatsWithLocation = useMemo(() => {
    return data?.threats.filter(t => t.latitude !== null && t.longitude !== null) || [];
  }, [data?.threats]);

  const unresolvedIps = useMemo(() => {
    return data?.threats.filter(t => t.latitude === null).map(t => t.ip_address) || [];
  }, [data?.threats]);

  const handleResolveGeo = async () => {
    if (unresolvedIps.length > 0) {
      await resolveGeo.mutateAsync(unresolvedIps.slice(0, 20));
    }
  };

  const bounds = useMemo(() => {
    if (threatsWithLocation.length === 0) return undefined;
    
    const lats = threatsWithLocation.map(t => t.latitude!);
    const lngs = threatsWithLocation.map(t => t.longitude!);
    
    return [
      [Math.min(...lats, TARGET_LOCATION[0]) - 5, Math.min(...lngs, TARGET_LOCATION[1]) - 10],
      [Math.max(...lats, TARGET_LOCATION[0]) + 5, Math.max(...lngs, TARGET_LOCATION[1]) + 10]
    ] as [[number, number], [number, number]];
  }, [threatsWithLocation]);

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
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <MapContainer
              center={TARGET_LOCATION}
              zoom={2}
              className="h-full w-full"
              style={{ background: 'hsl(var(--background))' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              
              <MapController bounds={bounds} />
              
              {/* Target location (shield) */}
              <CircleMarker
                center={TARGET_LOCATION}
                radius={12}
                pathOptions={{
                  fillColor: '#22c55e',
                  fillOpacity: 0.9,
                  color: '#16a34a',
                  weight: 3
                }}
              >
                <Popup>
                  <div className="text-center">
                    <Shield className="h-5 w-5 mx-auto text-green-500 mb-1" />
                    <div className="font-medium">{t('admin.yourLocation', 'Your Location')}</div>
                    <div className="text-xs text-muted-foreground">Protected Server</div>
                  </div>
                </Popup>
              </CircleMarker>
              
              {/* Attack flow lines */}
              {showFlows && threatsWithLocation.map(threat => (
                <AttackFlowAnimation
                  key={threat.id}
                  from={[threat.latitude!, threat.longitude!]}
                  to={TARGET_LOCATION}
                  isPermanent={threat.block_type === 'permanent'}
                />
              ))}
              
              {/* Threat markers */}
              <ThreatClusterMarkers threats={threatsWithLocation} />
            </MapContainer>
          )}
          
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
