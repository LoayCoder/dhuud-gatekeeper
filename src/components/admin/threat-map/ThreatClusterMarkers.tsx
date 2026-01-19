import React from "react";
import { CircleMarker, Popup } from "react-leaflet";
import { ThreatLocation } from "@/hooks/admin/use-threat-map-data";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ThreatClusterMarkersProps {
  threats: ThreatLocation[];
}

export function ThreatClusterMarkers({ threats }: ThreatClusterMarkersProps) {
  const { t } = useTranslation();
  
  // Group threats by approximate location (cluster nearby IPs)
  const clusters = React.useMemo(() => {
    const clusterMap = new Map<string, ThreatLocation[]>();
    
    threats.forEach(threat => {
      // Round to 1 decimal place for clustering
      const key = `${Math.round(threat.latitude! * 10) / 10},${Math.round(threat.longitude! * 10) / 10}`;
      
      if (!clusterMap.has(key)) {
        clusterMap.set(key, []);
      }
      clusterMap.get(key)!.push(threat);
    });
    
    return Array.from(clusterMap.entries()).map(([key, items]) => {
      const [lat, lng] = key.split(',').map(Number);
      const permanentCount = items.filter(i => i.block_type === 'permanent').length;
      
      return {
        lat,
        lng,
        threats: items,
        count: items.length,
        permanentCount,
        primaryThreat: items[0]
      };
    });
  }, [threats]);

  return (
    <>
      {clusters.map((cluster, index) => {
        const isPermanent = cluster.permanentCount > cluster.count / 2;
        const baseColor = isPermanent ? '#ef4444' : '#f97316';
        const radius = Math.min(8 + cluster.count * 2, 20);
        
        return (
          <CircleMarker
            key={index}
            center={[cluster.lat, cluster.lng]}
            radius={radius}
            pathOptions={{
              fillColor: baseColor,
              fillOpacity: 0.8,
              color: '#ffffff',
              weight: 2,
              className: 'threat-marker-pulse'
            }}
          >
            <Popup>
              <div className="min-w-[200px] p-1">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className={`h-4 w-4 ${isPermanent ? 'text-destructive' : 'text-orange-500'}`} />
                  <span className="font-semibold">
                    {cluster.count > 1 
                      ? t('admin.threatCluster', '{{count}} Threats', { count: cluster.count })
                      : t('admin.blockedIP', 'Blocked IP')
                    }
                  </span>
                </div>
                
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>
                      {cluster.primaryThreat.city && `${cluster.primaryThreat.city}, `}
                      {cluster.primaryThreat.country || t('common.unknown', 'Unknown')}
                    </span>
                  </div>
                  
                  {cluster.count === 1 ? (
                    <>
                      <div className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                        {cluster.primaryThreat.ip_address}
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {formatDistanceToNow(new Date(cluster.primaryThreat.blocked_at), { addSuffix: true })}
                        </span>
                      </div>
                      
                      {cluster.primaryThreat.reason && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {cluster.primaryThreat.reason}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant={isPermanent ? "destructive" : "outline"} className="text-xs">
                          {isPermanent ? t('admin.permanent', 'Permanent') : t('admin.temporary', 'Temporary')}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {cluster.primaryThreat.failed_attempts} {t('admin.attempts', 'attempts')}
                        </Badge>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="flex items-center gap-1">
                          <div className="h-2 w-2 rounded-full bg-destructive" />
                          <span>{cluster.permanentCount} {t('admin.permanent', 'Perm')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="h-2 w-2 rounded-full bg-orange-500" />
                          <span>{cluster.count - cluster.permanentCount} {t('admin.temporary', 'Temp')}</span>
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground mt-1">
                        {t('admin.clickToExpand', 'Multiple IPs from this location')}
                      </div>
                      
                      <div className="mt-2 max-h-24 overflow-y-auto space-y-0.5">
                        {cluster.threats.slice(0, 5).map(threat => (
                          <div key={threat.id} className="font-mono text-xs bg-muted/50 px-1 py-0.5 rounded flex justify-between">
                            <span>{threat.ip_address}</span>
                            <span className={threat.block_type === 'permanent' ? 'text-destructive' : 'text-orange-500'}>
                              {threat.failed_attempts}
                            </span>
                          </div>
                        ))}
                        {cluster.threats.length > 5 && (
                          <div className="text-xs text-muted-foreground text-center">
                            +{cluster.threats.length - 5} {t('common.more', 'more')}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}
