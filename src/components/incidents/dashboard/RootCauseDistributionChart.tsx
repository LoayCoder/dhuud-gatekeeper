import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  LabelList
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Search, TrendingUp } from "lucide-react";
import { RootCauseDistribution } from "@/hooks/use-rca-analytics";

interface RootCauseDistributionChartProps {
  data: RootCauseDistribution[];
  isLoading?: boolean;
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(220 70% 50%)',
  'hsl(280 70% 50%)',
  'hsl(340 70% 50%)',
  'hsl(40 70% 50%)',
  'hsl(160 70% 50%)',
];

const chartConfig = {
  count: {
    label: "Count",
    color: "hsl(var(--chart-1))",
  },
};

export function RootCauseDistributionChart({ data, isLoading }: RootCauseDistributionChartProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            {t('hsseDashboard.rootCauses.title', 'Root Cause Distribution')}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[350px] animate-pulse bg-muted/30 rounded" />
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            {t('hsseDashboard.rootCauses.title', 'Root Cause Distribution')}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[350px] flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{t('hsseDashboard.rootCauses.noData', 'No root cause data available')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format data for horizontal bar chart
  const chartData = data.map((item, index) => ({
    ...item,
    fill: COLORS[index % COLORS.length],
    shortCategory: item.category.length > 20 ? item.category.substring(0, 18) + '...' : item.category
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          {t('hsseDashboard.rootCauses.title', 'Root Cause Distribution')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('hsseDashboard.rootCauses.subtitle', 'Top categories from completed investigations')}
        </p>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis 
                type="number" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                type="category" 
                dataKey="shortCategory" 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={130}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent 
                    formatter={(value, name, item) => (
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{item.payload.category}</span>
                        <span>{value} occurrences ({item.payload.percentage}%)</span>
                      </div>
                    )}
                  />
                }
              />
              <Bar 
                dataKey="count" 
                radius={[0, 4, 4, 0]}
                maxBarSize={30}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
                <LabelList 
                  dataKey="percentage" 
                  position="right" 
                  formatter={(value: number) => `${value}%`}
                  style={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
