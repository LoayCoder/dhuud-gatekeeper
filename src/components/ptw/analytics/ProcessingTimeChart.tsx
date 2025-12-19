import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "recharts";
import { ProcessingTimeItem } from "@/hooks/ptw/use-ptw-analytics";

interface ProcessingTimeChartProps {
  data: ProcessingTimeItem[];
  isLoading?: boolean;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(221, 83%, 53%)",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
];

export function ProcessingTimeChart({ data, isLoading }: ProcessingTimeChartProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("ptw.analytics.processingTimes", "Processing Times")}</CardTitle>
        <CardDescription>
          {t("ptw.analytics.processingTimesDesc", "Average time between workflow stages (hours)")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 10, right: 20, left: 20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <YAxis
                type="category"
                dataKey="stage"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={100}
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value: number) => [`${value}h`, t("ptw.analytics.avgHours", "Avg Hours")]}
              />
              <Bar dataKey="avgHours" radius={[0, 4, 4, 0]}>
                {data.map((entry, index) => (
                  <Cell key={entry.stageKey} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
