import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { useDashboardDrilldown } from "@/hooks/use-dashboard-drilldown";
import { RootCauseDistribution } from "@/hooks/use-rca-analytics";
import { DataFreshnessBadge } from "./DataFreshnessBadge";

interface RootCauseParetoChartProps {
  data: RootCauseDistribution[];
  isLoading?: boolean;
  dataUpdatedAt?: number;
  isFetching?: boolean;
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function RootCauseParetoChart({ data, isLoading, dataUpdatedAt, isFetching }: RootCauseParetoChartProps) {
  const { t } = useTranslation();
  const { drillDown } = useDashboardDrilldown();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent className="h-[320px] flex items-center justify-center">
          <Skeleton className="h-[280px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('hsseDashboard.paretoChart.title', 'Root Cause Pareto Analysis')}</CardTitle>
          <CardDescription>{t('hsseDashboard.paretoChart.subtitle', 'Vital few causes (80/20 rule)')}</CardDescription>
        </CardHeader>
        <CardContent className="h-[320px] flex items-center justify-center">
          <p className="text-muted-foreground">{t('hsseDashboard.noData')}</p>
        </CardContent>
      </Card>
    );
  }

  // Sort by count descending and calculate cumulative percentage
  const sortedData = [...data].sort((a, b) => b.count - a.count);
  const totalCount = sortedData.reduce((sum, item) => sum + item.count, 0);
  
  let cumulative = 0;
  const paretoData = sortedData.map((item, index) => {
    cumulative += item.count;
    return {
      ...item,
      cumulativePercent: totalCount > 0 ? Math.round((cumulative / totalCount) * 100) : 0,
      colorIndex: index % CHART_COLORS.length,
    };
  });

  // Find the 80% threshold index
  const thresholdIndex = paretoData.findIndex(item => item.cumulativePercent >= 80);

  const chartConfig = {
    count: {
      label: t('hsseDashboard.paretoChart.count', 'Occurrences'),
      color: "hsl(var(--chart-1))",
    },
    cumulativePercent: {
      label: t('hsseDashboard.paretoChart.cumulativePercent', 'Cumulative %'),
      color: "hsl(var(--chart-2))",
    },
  };

  const handleBarClick = (entry: any) => {
    if (entry?.category) {
      drillDown({ rootCauseCategory: entry.category }, `Root Cause: ${entry.category}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{t('hsseDashboard.paretoChart.title', 'Root Cause Pareto Analysis')}</CardTitle>
            <CardDescription>{t('hsseDashboard.paretoChart.subtitle', 'Vital few causes (80/20 rule)')}</CardDescription>
          </div>
          <DataFreshnessBadge dataUpdatedAt={dataUpdatedAt} isFetching={isFetching} />
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={paretoData}
              margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
              <XAxis 
                dataKey="category" 
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
              />
              <YAxis 
                yAxisId="left"
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                label={{ 
                  value: t('hsseDashboard.paretoChart.count', 'Count'), 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))', fontSize: 11 }
                }}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}%`}
                label={{ 
                  value: t('hsseDashboard.paretoChart.cumulativePercent', 'Cumulative %'), 
                  angle: 90, 
                  position: 'insideRight',
                  style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))', fontSize: 11 }
                }}
              />
              <Tooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value, name) => {
                      if (name === 'cumulativePercent') return [`${value}%`, 'Cumulative'];
                      return [value, 'Count'];
                    }}
                  />
                } 
              />
              
              {/* 80% threshold line */}
              <ReferenceLine 
                yAxisId="right"
                y={80} 
                stroke="hsl(var(--destructive))" 
                strokeDasharray="5 5" 
                strokeWidth={2}
                label={{ 
                  value: t('hsseDashboard.paretoChart.threshold', '80% Threshold'), 
                  position: 'insideTopRight',
                  fill: 'hsl(var(--destructive))',
                  fontSize: 11,
                }}
              />

              <Bar 
                yAxisId="left"
                dataKey="count" 
                radius={[4, 4, 0, 0]}
                cursor="pointer"
                onClick={(data) => handleBarClick(data)}
              >
                {paretoData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={index <= thresholdIndex ? CHART_COLORS[0] : CHART_COLORS[3]}
                    opacity={index <= thresholdIndex ? 1 : 0.6}
                  />
                ))}
              </Bar>

              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="cumulativePercent" 
                stroke="hsl(var(--chart-2))" 
                strokeWidth={3}
                dot={{ fill: 'hsl(var(--chart-2))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_COLORS[0] }} />
            <span>{t('hsseDashboard.paretoChart.vitalFew', 'Vital Few (≤80%)')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_COLORS[3], opacity: 0.6 }} />
            <span>{t('hsseDashboard.paretoChart.trivialMany', 'Trivial Many')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 rounded" style={{ backgroundColor: 'hsl(var(--chart-2))' }} />
            <span>{t('hsseDashboard.paretoChart.cumulativeLine', 'Cumulative %')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
