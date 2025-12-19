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
  Legend,
} from "recharts";
import { ProjectPerformanceItem } from "@/hooks/ptw/use-ptw-analytics";

interface ProjectComparisonChartProps {
  data: ProjectPerformanceItem[];
  isLoading?: boolean;
}

export function ProjectComparisonChart({ data, isLoading }: ProjectComparisonChartProps) {
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

  // Truncate project names for display
  const chartData = data.slice(0, 8).map((item) => ({
    ...item,
    displayName: item.projectName.length > 15
      ? `${item.projectName.slice(0, 15)}...`
      : item.projectName,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("ptw.analytics.projectComparison", "Project Comparison")}</CardTitle>
        <CardDescription>
          {t("ptw.analytics.projectComparisonDesc", "Permit volume by project (top 8)")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="displayName"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                angle={-45}
                textAnchor="end"
                height={60}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                labelFormatter={(_, payload) => {
                  if (payload && payload[0]) {
                    return payload[0].payload.projectName;
                  }
                  return "";
                }}
              />
              <Legend />
              <Bar
                dataKey="activePermits"
                name={t("ptw.analytics.active", "Active")}
                stackId="a"
                fill="hsl(221, 83%, 53%)"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="closedPermits"
                name={t("ptw.analytics.closed", "Closed")}
                stackId="a"
                fill="hsl(142, 76%, 36%)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
