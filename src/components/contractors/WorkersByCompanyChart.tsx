import { useTranslation } from "react-i18next";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LabelList } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface WorkersByCompanyChartProps {
  data: { name: string; approved: number; pending: number; total: number }[];
  isLoading: boolean;
}

const COLORS = {
  approved: "hsl(142 71% 45%)",
  pending: "hsl(45 93% 47%)",
};

export function WorkersByCompanyChart({ data, isLoading }: WorkersByCompanyChartProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="h-[280px]">
          <div className="flex flex-col gap-3 h-full justify-center">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
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
            {t("contractors.charts.workersByCompany", "Workers By Company")}
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

  // Calculate dynamic height based on number of companies
  const barHeight = 32;
  const barGap = 16;
  const chartHeight = Math.max(280, (data.length * (barHeight + barGap)) + 60);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          {t("contractors.charts.workersByCompany", "Workers By Company")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: `${chartHeight}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 40, left: 5, bottom: 40 }}
              barSize={barHeight}
              barGap={4}
            >
              <XAxis 
                type="number" 
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
                domain={[0, 'auto']}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
                width={120}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => value.length > 16 ? `${value.substring(0, 16)}...` : value}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                  fontSize: "12px",
                  padding: "8px 12px",
                }}
                formatter={(value: number, name: string) => [
                  value,
                  name === "approved" 
                    ? String(t("contractors.status.approved", "Approved"))
                    : String(t("contractors.status.pending", "Pending")),
                ]}
              />
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ paddingTop: "20px", fontSize: "12px" }}
                iconType="circle"
                iconSize={10}
                formatter={(value) => {
                  const label = value === "approved"
                    ? t("contractors.status.approved", "Approved")
                    : t("contractors.status.pending", "Pending");
                  return <span style={{ color: "hsl(var(--foreground))", marginInlineStart: "4px" }}>{String(label)}</span>;
                }}
              />
              <Bar 
                dataKey="approved" 
                stackId="workers" 
                fill={COLORS.approved} 
                radius={[0, 0, 0, 0]}
              >
                <LabelList 
                  dataKey="approved" 
                  position="center" 
                  fill="#fff" 
                  fontSize={11}
                  fontWeight={600}
                  formatter={(value: number) => value > 0 ? value : ''}
                />
              </Bar>
              <Bar 
                dataKey="pending" 
                stackId="workers" 
                fill={COLORS.pending} 
                radius={[0, 4, 4, 0]}
              >
                <LabelList 
                  dataKey="pending" 
                  position="center" 
                  fill="#fff" 
                  fontSize={11}
                  fontWeight={600}
                  formatter={(value: number) => value > 0 ? value : ''}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
