import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { useDashboardDrilldown } from "@/hooks/use-dashboard-drilldown";

export interface WaterfallStage {
  stage: string;
  stageKey: string;
  entering: number;
  leaving: number;
  net: number;
  running_total: number;
  type: 'start' | 'positive' | 'negative' | 'total';
}

interface IncidentWaterfallChartProps {
  data: WaterfallStage[];
  isLoading?: boolean;
}

export function IncidentWaterfallChart({ data, isLoading }: IncidentWaterfallChartProps) {
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
          <CardTitle className="text-lg">{t('hsseDashboard.waterfallChart.title', 'Incident Progression Flow')}</CardTitle>
          <CardDescription>{t('hsseDashboard.waterfallChart.subtitle', 'Net movement through workflow stages')}</CardDescription>
        </CardHeader>
        <CardContent className="h-[320px] flex items-center justify-center">
          <p className="text-muted-foreground">{t('hsseDashboard.noData')}</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate waterfall bars with invisible bases
  const waterfallData = data.map((item, index) => {
    if (item.type === 'start') {
      return {
        ...item,
        base: 0,
        value: item.running_total,
      };
    } else if (item.type === 'total') {
      return {
        ...item,
        base: 0,
        value: item.running_total,
      };
    } else {
      // For intermediate bars, base is the previous running total
      const prevTotal = index > 0 ? data[index - 1].running_total : 0;
      const currentNet = item.net;
      
      if (currentNet >= 0) {
        return {
          ...item,
          base: prevTotal,
          value: currentNet,
        };
      } else {
        return {
          ...item,
          base: prevTotal + currentNet,
          value: Math.abs(currentNet),
        };
      }
    }
  });

  const chartConfig = {
    value: {
      label: t('hsseDashboard.waterfallChart.netChange', 'Net Change'),
      color: "hsl(var(--chart-1))",
    },
  };

  const getBarColor = (item: any) => {
    if (item.type === 'start') return 'hsl(var(--chart-1))';
    if (item.type === 'total') return 'hsl(var(--primary))';
    if (item.net >= 0) return 'hsl(var(--chart-3))';
    return 'hsl(var(--destructive))';
  };

  const handleBarClick = (entry: any) => {
    if (entry?.stageKey) {
      drillDown({ status: entry.stageKey }, `Status: ${entry.stage}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('hsseDashboard.waterfallChart.title', 'Incident Progression Flow')}</CardTitle>
        <CardDescription>{t('hsseDashboard.waterfallChart.subtitle', 'Net movement through workflow stages')}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={waterfallData}
              margin={{ top: 20, right: 20, left: 0, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
              <XAxis 
                dataKey="stage" 
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value, name, item) => {
                      const entry = item.payload;
                      if (entry.type === 'start' || entry.type === 'total') {
                        return [entry.running_total, t('hsseDashboard.waterfallChart.total', 'Total')];
                      }
                      const sign = entry.net >= 0 ? '+' : '';
                      return [`${sign}${entry.net}`, t('hsseDashboard.waterfallChart.netChange', 'Net Change')];
                    }}
                  />
                } 
              />
              
              <ReferenceLine y={0} stroke="hsl(var(--border))" />

              {/* Invisible base bar */}
              <Bar 
                dataKey="base" 
                stackId="stack"
                fill="transparent"
              />

              {/* Value bar */}
              <Bar 
                dataKey="value" 
                stackId="stack"
                radius={[4, 4, 0, 0]}
                cursor="pointer"
                onClick={(data) => handleBarClick(data)}
              >
                {waterfallData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getBarColor(entry)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-chart-3" />
            <span>{t('hsseDashboard.waterfallChart.entering', 'Entering Stage')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-destructive" />
            <span>{t('hsseDashboard.waterfallChart.leaving', 'Leaving Stage')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-primary" />
            <span>{t('hsseDashboard.waterfallChart.currentOpen', 'Current Open')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
