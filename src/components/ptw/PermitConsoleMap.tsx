import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Flame, 
  Construction, 
  Shield, 
  Shovel, 
  Radiation, 
  Zap, 
  Mountain,
  FileWarning,
  Maximize2,
  Minimize2
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DEFAULT_TILE, DEFAULT_CENTER } from "@/lib/map-tiles";
import { Link } from "react-router-dom";

interface PermitConsoleMapProps {
  permits: Array<{
    id: string;
    reference_id: string;
    gps_lat: number | null;
    gps_lng: number | null;
    permit_type?: { name: string; code: string } | null;
  }>;
}

const permitTypeColors: Record<string, string> = {
  hot_work: "#ef4444",
  lifting: "#f59e0b",
  confined_space: "#8b5cf6",
  excavation: "#78716c",
  radiography: "#06b6d4",
  electrical: "#eab308",
  height: "#3b82f6",
  general: "#6b7280",
};

const permitTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  hot_work: Flame,
  lifting: Construction,
  confined_space: Shield,
  excavation: Shovel,
  radiography: Radiation,
  electrical: Zap,
  height: Mountain,
  general: FileWarning,
};

// Create custom marker icon for permit type with improved visibility
const createPermitMarkerIcon = (permitCode: string) => {
  const color = permitTypeColors[permitCode] || permitTypeColors.general;
  
  return L.divIcon({
    className: "custom-permit-marker",
    html: `
      <div style="
        background-color: ${color};
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 4px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s ease;
      ">
        <div style="
          width: 14px;
          height: 14px;
          background-color: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

export function PermitConsoleMap({ permits }: PermitConsoleMapProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar" || i18n.language === "ur";
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedPermit, setSelectedPermit] = useState<string | null>(null);

  // Filter permits with valid GPS coordinates
  const validPermits = permits.filter(p => p.gps_lat && p.gps_lng);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map if not already created
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapContainer.current, {
        center: DEFAULT_CENTER,
        zoom: 12,
        zoomControl: !isRTL,
      });

      // Use premium CartoDB tiles for cleaner appearance
      L.tileLayer(DEFAULT_TILE.url, {
        attribution: DEFAULT_TILE.attribution,
        ...DEFAULT_TILE.options,
      }).addTo(mapInstance.current);

      // Add zoom control on the correct side for RTL
      if (isRTL) {
        L.control.zoom({ position: "topright" }).addTo(mapInstance.current);
      }

      // Create markers layer
      markersLayer.current = L.layerGroup().addTo(mapInstance.current);
    }

    // Clear existing markers
    markersLayer.current?.clearLayers();

    // Add permit markers
    validPermits.forEach((permit) => {
      if (!permit.gps_lat || !permit.gps_lng) return;

      const permitCode = permit.permit_type?.code?.toLowerCase().replace(" ", "_") || "general";
      const marker = L.marker([permit.gps_lat, permit.gps_lng], {
        icon: createPermitMarkerIcon(permitCode),
      });

      // Create popup content
      const popupContent = `
        <div style="min-width: 200px; font-family: system-ui, sans-serif;">
          <div style="font-weight: 600; margin-bottom: 4px;">${permit.reference_id}</div>
          <div style="color: #6b7280; font-size: 12px; margin-bottom: 8px;">
            ${permit.permit_type?.name || t("ptw.console.unknownType", "Unknown Type")}
          </div>
          <a href="/ptw/view/${permit.id}" style="
            display: inline-block;
            padding: 4px 12px;
            background-color: hsl(var(--primary));
            color: hsl(var(--primary-foreground));
            border-radius: 4px;
            text-decoration: none;
            font-size: 12px;
          ">${t("ptw.console.viewPermit", "View Permit")}</a>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on("click", () => setSelectedPermit(permit.id));
      markersLayer.current?.addLayer(marker);
    });

    // Fit bounds if there are permits
    if (validPermits.length > 0) {
      const bounds = L.latLngBounds(
        validPermits.map(p => [p.gps_lat!, p.gps_lng!] as [number, number])
      );
      mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
    }

    return () => {
      // Cleanup on unmount
    };
  }, [permits, isRTL, t]);

  // Handle fullscreen toggle
  useEffect(() => {
    if (mapInstance.current) {
      setTimeout(() => {
        mapInstance.current?.invalidateSize();
      }, 100);
    }
  }, [isFullscreen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  return (
    <Card className={`relative overflow-hidden ${isFullscreen ? "fixed inset-4 z-50" : ""}`}>
      {/* Toolbar */}
      <div className="absolute top-4 end-4 z-[1000] flex gap-2">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="bg-background/90 backdrop-blur-sm"
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Map Container */}
      <div
        ref={mapContainer}
        className={`w-full ${isFullscreen ? "h-full" : "h-[600px]"}`}
        style={{ zIndex: 1 }}
      />

      {/* No permits message */}
      {validPermits.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-[500]">
          <div className="text-center">
            <FileWarning className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {t("ptw.console.noActivePermits", "No active permits with GPS location")}
            </p>
          </div>
        </div>
      )}

      {/* Selected Permit Card */}
      {selectedPermit && (
        <div className="absolute bottom-4 start-4 end-4 z-[1000] sm:start-4 sm:end-auto sm:w-80">
          {(() => {
            const permit = permits.find(p => p.id === selectedPermit);
            if (!permit) return null;
            const IconComponent = permitTypeIcons[permit.permit_type?.code || "general"] || FileWarning;
            
            return (
              <Card className="bg-background/95 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div 
                      className="p-2 rounded-full shrink-0"
                      style={{ backgroundColor: permitTypeColors[permit.permit_type?.code || "general"] + "20" }}
                    >
                      <IconComponent 
                        className="h-5 w-5"
                        style={{ color: permitTypeColors[permit.permit_type?.code || "general"] }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{permit.reference_id}</p>
                      <p className="text-sm text-muted-foreground">{permit.permit_type?.name}</p>
                      <div className="flex gap-2 mt-3">
                        <Button asChild size="sm">
                          <Link to={`/ptw/view/${permit.id}`}>
                            {t("ptw.console.viewDetails", "View Details")}
                          </Link>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedPermit(null)}
                        >
                          {t("common.close", "Close")}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </div>
      )}
    </Card>
  );
}
