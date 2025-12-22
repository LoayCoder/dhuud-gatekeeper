import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDashboardDrilldown } from "@/hooks/use-dashboard-drilldown";
import { BranchHeatmapData } from "@/hooks/use-location-heatmap";

interface Props {
  data: BranchHeatmapData[];
  onBranchClick?: (branchId: string) => void;
}

function getDensityColor(density: number): string {
  if (density >= 75) return "hsl(var(--destructive))";
  if (density >= 50) return "hsl(var(--warning))";
  if (density >= 25) return "hsl(var(--chart-4))";
  return "hsl(var(--chart-2))";
}

function getDensityBg(density: number): string {
  if (density >= 75) return "bg-destructive/20";
  if (density >= 50) return "bg-warning/20";
  if (density >= 25) return "bg-chart-4/20";
  return "bg-chart-2/20";
}

export function BranchHeatmapGrid({ data, onBranchClick }: Props) {
  const { t } = useTranslation();
  const { drillDown } = useDashboardDrilldown();

  const handleBranchClick = (branchId: string) => {
    if (onBranchClick) {
      onBranchClick(branchId);
    } else {
      drillDown({ branchId });
    }
  };

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {t('dashboard.locationHotspots', 'Location Hotspots')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {t('dashboard.noLocationData', 'No location data available')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          {t('dashboard.branchHeatmap', 'Branch Event Density')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {data.slice(0, 12).map((branch) => (
              <Tooltip key={branch.branch_id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleBranchClick(branch.branch_id)}
                    className={`
                      relative p-3 rounded-lg border transition-all
                      hover:scale-105 hover:shadow-md cursor-pointer
                      ${getDensityBg(branch.density_score)}
                    `}
                    style={{
                      borderColor: getDensityColor(branch.density_score),
                      borderWidth: '2px',
                    }}
                  >
                    <div className="text-xs font-medium truncate">
                      {branch.branch_name}
                    </div>
                    <div 
                      className="text-lg font-bold"
                      style={{ color: getDensityColor(branch.density_score) }}
                    >
                      {branch.total_events}
                    </div>
                    <div 
                      className="absolute bottom-1 end-1 w-2 h-2 rounded-full"
                      style={{ backgroundColor: getDensityColor(branch.density_score) }}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <div className="space-y-1">
                    <div className="font-semibold">{branch.branch_name}</div>
                    <div className="flex gap-2">
                      <span className="text-destructive">●</span> {t('severity.level_5.label', 'Catastrophic')}: {branch.level_5_count}
                    </div>
                    <div className="flex gap-2">
                      <span className="text-warning">●</span> {t('severity.level_4.label', 'Major')}: {branch.level_4_count}
                    </div>
                    <div className="flex gap-2">
                      <span className="text-orange-500">●</span> {t('severity.level_3.label', 'Serious')}: {branch.level_3_count}
                    </div>
                    <div className="flex gap-2">
                      <span className="text-chart-4">●</span> {t('severity.level_2.label', 'Moderate')}: {branch.level_2_count}
                    </div>
                    <div className="flex gap-2">
                      <span className="text-chart-2">●</span> {t('severity.level_1.label', 'Low')}: {branch.level_1_count}
                    </div>
                    <p className="text-muted-foreground mt-1">{t('hsseDashboard.clickToFilter', 'Click to view')}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-chart-2" />
            <span>{t('dashboard.lowDensity', 'Low')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-chart-4" />
            <span>{t('dashboard.mediumDensity', 'Medium')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-warning" />
            <span>{t('dashboard.highDensity', 'High')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-destructive" />
            <span>{t('dashboard.criticalDensity', 'Critical')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
