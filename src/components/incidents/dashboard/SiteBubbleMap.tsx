import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SiteBubbleData } from "@/hooks/use-location-heatmap";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface Props {
  data: SiteBubbleData[];
  onSiteClick?: (siteId: string) => void;
}

function getSeverityColor(score: number, maxScore: number): string {
  const normalized = maxScore > 0 ? score / maxScore : 0;
  if (normalized >= 0.75) return "hsl(var(--destructive))";
  if (normalized >= 0.5) return "hsl(var(--warning))";
  if (normalized >= 0.25) return "hsl(var(--chart-4))";
  return "hsl(var(--chart-2))";
}

export function SiteBubbleMap({ data, onSiteClick }: Props) {
  const { t } = useTranslation();

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            {t('dashboard.siteBubbleMap', 'Site Event Distribution')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {t('dashboard.noSiteData', 'No site data available')}
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxSeverity = Math.max(...data.map(s => s.severity_score), 1);
  const maxEvents = Math.max(...data.map(s => s.total_events), 1);

  // Prepare data for scatter chart
  const chartData = data.slice(0, 20).map((site, index) => ({
    x: index,
    y: site.total_events,
    z: Math.max(site.total_events * 100, 200), // bubble size
    ...site,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          {t('dashboard.siteBubbleMap', 'Site Event Distribution')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <XAxis 
                type="number" 
                dataKey="x" 
                hide 
                domain={[-1, chartData.length]}
              />
              <YAxis 
                type="number" 
                dataKey="y" 
                hide 
                domain={[0, maxEvents * 1.2]}
              />
              <ZAxis 
                type="number" 
                dataKey="z" 
                range={[100, 1000]} 
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const site = payload[0].payload as SiteBubbleData & { x: number; y: number; z: number };
                    return (
                      <div className="bg-popover border rounded-lg p-2 shadow-lg text-xs">
                        <div className="font-semibold">{site.site_name}</div>
                        <div className="text-muted-foreground">{site.branch_name}</div>
                        <div className="mt-1 space-y-0.5">
                          <div>{t('dashboard.totalEvents', 'Total')}: {site.total_events}</div>
                          <div>{t('dashboard.incidents', 'Incidents')}: {site.incidents}</div>
                          <div>{t('dashboard.observations', 'Observations')}: {site.observations}</div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter 
                data={chartData} 
                onClick={(data) => onSiteClick?.(data.site_id)}
                cursor="pointer"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getSeverityColor(entry.severity_score, maxSeverity)}
                    fillOpacity={0.7}
                    stroke={getSeverityColor(entry.severity_score, maxSeverity)}
                    strokeWidth={2}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Site labels */}
        <div className="flex flex-wrap gap-1 mt-2 justify-center">
          {chartData.slice(0, 8).map((site) => (
            <button
              key={site.site_id}
              onClick={() => onSiteClick?.(site.site_id)}
              className="text-xs px-2 py-0.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
            >
              {site.site_name}
            </button>
          ))}
          {data.length > 8 && (
            <span className="text-xs text-muted-foreground px-2 py-0.5">
              +{data.length - 8} {t('dashboard.more', 'more')}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
