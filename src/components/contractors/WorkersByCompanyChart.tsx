import { useTranslation } from "react-i18next";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface WorkersByCompanyChartProps {
  data: { name: string; approved: number; pending: number; total: number }[];
  isLoading: boolean;
}

export function WorkersByCompanyChart({ data, isLoading }: WorkersByCompanyChartProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="h-[280px]">
          <div className="flex flex-col gap-2 h-full justify-center">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            {t("contractors.charts.workersByCompany", "Workers by Company")}
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

  // Truncate long company names
  const chartData = data.map((item) => ({
    ...item,
    displayName: item.name.length > 15 ? `${item.name.substring(0, 15)}...` : item.name,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          {t("contractors.charts.workersByCompany", "Workers by Company")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis
                type="category"
                dataKey="displayName"
                tick={{ fontSize: 11 }}
                width={100}
                stroke="hsl(var(--muted-foreground))"
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
                  name === "approved" 
                    ? t("contractors.status.approved", "Approved")
                    : t("contractors.status.pending", "Pending"),
                ]}
                labelFormatter={(label) => {
                  const item = data.find(d => d.name.startsWith(label.replace("...", "")));
                  return item?.name || label;
                }}
              />
              <Legend
                formatter={(value) => (
                  <span className="text-xs">
                    {value === "approved"
                      ? t("contractors.status.approved", "Approved")
                      : t("contractors.status.pending", "Pending")}
                  </span>
                )}
              />
              <Bar dataKey="approved" stackId="workers" fill="hsl(142 71% 45%)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="pending" stackId="workers" fill="hsl(45 93% 47%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
