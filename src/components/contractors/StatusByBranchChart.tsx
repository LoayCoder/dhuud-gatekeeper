import { useTranslation } from "react-i18next";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatusByBranchChartProps {
  data: { branch: string; active: number; suspended: number; inactive: number; expired: number }[];
  isLoading: boolean;
}

const COLORS = {
  active: "hsl(142 71% 45%)",
  suspended: "hsl(0 84% 60%)",
  inactive: "hsl(215 20% 65%)",
  expired: "hsl(45 93% 47%)",
};

export function StatusByBranchChart({ data, isLoading }: StatusByBranchChartProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[280px]">
          <Skeleton className="h-full w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            {t("contractors.charts.statusByBranch", "Status By Branch")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[280px]">
          <p className="text-muted-foreground text-sm">
            {t("common.noData", "No data available")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartHeight = Math.max(280, data.length * 50);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          {t("contractors.charts.statusByBranch", "Status By Branch")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: `${chartHeight}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={data} 
              layout="vertical" 
              margin={{ top: 5, right: 30, left: 10, bottom: 30 }}
              barCategoryGap="20%"
            >
              <XAxis 
                type="number" 
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={{ stroke: "hsl(var(--border))" }}
              />
              <YAxis 
                type="category" 
                dataKey="branch" 
                tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }} 
                width={100}
                tickFormatter={(value) => value.length > 14 ? `${value.slice(0, 14)}...` : value}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                  fontSize: "12px",
                }}
                formatter={(value: number, name: string) => [
                  value, 
                  t(`contractors.status.${name}`, name.charAt(0).toUpperCase() + name.slice(1))
                ]}
                labelFormatter={(label) => label}
              />
              <Legend 
                verticalAlign="bottom"
                wrapperStyle={{ paddingTop: "16px", fontSize: "12px" }}
                formatter={(value) => {
                  const label = t(`contractors.status.${value}`, value.charAt(0).toUpperCase() + value.slice(1));
                  return <span style={{ color: "hsl(var(--foreground))" }}>{String(label)}</span>;
                }}
              />
              <Bar 
                dataKey="active" 
                stackId="a" 
                fill={COLORS.active} 
                name="active"
                radius={[0, 0, 0, 0]}
              />
              <Bar 
                dataKey="suspended" 
                stackId="a" 
                fill={COLORS.suspended} 
                name="suspended"
              />
              <Bar 
                dataKey="inactive" 
                stackId="a" 
                fill={COLORS.inactive} 
                name="inactive"
              />
              <Bar 
                dataKey="expired" 
                stackId="a" 
                fill={COLORS.expired} 
                name="expired"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
