import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { TrendingUp } from "lucide-react";
import { KPITrendData } from "@/hooks/use-kpi-trends";
import { useState } from "react";
import { Toggle } from "@/components/ui/toggle";

interface KPIHistoricalTrendChartProps {
  data: KPITrendData[];
  isLoading?: boolean;
}

const chartConfig = {
  trir: {
    label: "TRIR",
    color: "hsl(var(--chart-1))",
  },
  ltifr: {
    label: "LTIFR",
    color: "hsl(var(--chart-2))",
  },
  dart: {
    label: "DART",
    color: "hsl(var(--chart-3))",
  },
  severity_rate: {
    label: "Severity Rate",
    color: "hsl(var(--chart-4))",
  },
};

type MetricKey = keyof typeof chartConfig;

export function KPIHistoricalTrendChart({ data, isLoading }: KPIHistoricalTrendChartProps) {
  const { t } = useTranslation();
  const [visibleMetrics, setVisibleMetrics] = useState<Set<MetricKey>>(
    new Set(['trir', 'ltifr'])
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }
  const formattedData = (data || []).map(item => ({
    ...item,
    monthLabel: item.month ? format(parseISO(item.month), 'MMM yyyy') : '',
  }));

  const toggleMetric = (metric: MetricKey) => {
    setVisibleMetrics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(metric)) {
        if (newSet.size > 1) newSet.delete(metric);
      } else {
        newSet.add(metric);
      }
      return newSet;
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-primary" />
            {t('kpiDashboard.historicalTrend', 'Historical Trend (12 Months)')}
          </CardTitle>
          
          <div className="flex flex-wrap gap-1">
            {(Object.keys(chartConfig) as MetricKey[]).map((key) => (
              <Toggle
                key={key}
                size="sm"
                pressed={visibleMetrics.has(key)}
                onPressedChange={() => toggleMetric(key)}
                className="text-xs h-7 px-2"
                style={{
                  backgroundColor: visibleMetrics.has(key) 
                    ? chartConfig[key].color 
                    : undefined,
                  color: visibleMetrics.has(key) ? 'white' : undefined,
                }}
              >
                {chartConfig[key].label}
              </Toggle>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="monthLabel" 
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                width={40}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              
              {visibleMetrics.has('trir') && (
                <Line
                  type="monotone"
                  dataKey="trir"
                  name="TRIR"
                  stroke={chartConfig.trir.color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              )}
              {visibleMetrics.has('ltifr') && (
                <Line
                  type="monotone"
                  dataKey="ltifr"
                  name="LTIFR"
                  stroke={chartConfig.ltifr.color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              )}
              {visibleMetrics.has('dart') && (
                <Line
                  type="monotone"
                  dataKey="dart"
                  name="DART"
                  stroke={chartConfig.dart.color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              )}
              {visibleMetrics.has('severity_rate') && (
                <Line
                  type="monotone"
                  dataKey="severity_rate"
                  name="Severity Rate"
                  stroke={chartConfig.severity_rate.color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
