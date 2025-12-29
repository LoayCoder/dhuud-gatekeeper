import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Map, 
  List, 
  Filter, 
  RefreshCw,
  Flame,
  Construction,
  Radiation,
  Shovel,
  Zap,
  Shield,
  Mountain,
  Wrench,
  FileWarning
} from "lucide-react";
import { usePTWPermits, useActivePermitsForMap } from "@/hooks/ptw";
import { Skeleton } from "@/components/ui/skeleton";
import { PermitConsoleMap } from "@/components/ptw/PermitConsoleMap";
import { PermitListView } from "@/components/ptw/PermitListView";

const permitTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  hot_work: Flame,
  lifting: Construction,
  radiography: Radiation,
  excavation: Shovel,
  confined_space: Shield,
  electrical: Zap,
  height: Mountain,
  cold_work: Wrench,
  general: FileWarning,
};

export default function PermitConsole() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("map");
  
  const { data: mapPermits, isLoading: mapLoading, refetch: refetchMap } = useActivePermitsForMap();
  const { data: allPermits, isLoading: listLoading } = usePTWPermits();

  const activeCount = mapPermits?.length || 0;
  const pendingCount = allPermits?.filter(p => ["requested", "endorsed"].includes(p.status)).length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("ptw.console.title", "Permit Console")}
          </h1>
          <p className="text-muted-foreground">
            {t("ptw.console.description", "Monitor and manage active work permits")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="gap-1">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              {activeCount} {t("ptw.console.active", "Active")}
            </Badge>
            <Badge variant="outline" className="gap-1">
              {pendingCount} {t("ptw.console.pending", "Pending")}
            </Badge>
          </div>
          <Button variant="outline" size="icon" onClick={() => refetchMap()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            {t("ptw.console.legend", "Permit Types")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {Object.entries(permitTypeIcons).map(([code, Icon]) => (
              <div key={code} className="flex items-center gap-2 text-sm">
                <div className="p-1.5 rounded-full bg-muted">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-muted-foreground capitalize">
                  {code.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="map" className="gap-2">
            <Map className="h-4 w-4" />
            {t("ptw.console.mapView", "Map View")}
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-2">
            <List className="h-4 w-4" />
            {t("ptw.console.listView", "List View")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="mt-4">
          {mapLoading ? (
            <Skeleton className="h-[600px] w-full rounded-lg" />
          ) : (
            <PermitConsoleMap permits={(mapPermits || []).map(p => ({
              id: p.id,
              reference_id: p.reference_id,
              gps_lat: p.gps_lat ?? 0,
              gps_lng: p.gps_lng ?? 0,
              permit_type: p.permit_type ? { name: p.permit_type.name, code: p.permit_type.name.toLowerCase().replace(' ', '_') } : undefined
            }))} />
          )}
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <PermitListView permits={allPermits || []} isLoading={listLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
