import { useTranslation } from "react-i18next";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface CompaniesByCityChartProps {
  data: { city: string; count: number }[];
  isLoading: boolean;
}

const COLORS = [
  "hsl(221 83% 53%)",
  "hsl(25 95% 53%)",
  "hsl(142 71% 45%)",
  "hsl(262 83% 58%)",
  "hsl(174 72% 41%)",
  "hsl(340 75% 55%)",
  "hsl(45 93% 47%)",
  "hsl(200 80% 50%)",
  "hsl(280 65% 50%)",
  "hsl(15 80% 55%)",
];

export function CompaniesByCityChart({ data, isLoading }: CompaniesByCityChartProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-44" />
        </CardHeader>
        <CardContent className="h-[280px]">
          <div className="flex items-end gap-2 h-full pb-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="flex-1" style={{ height: `${30 + Math.random() * 60}%` }} />
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
            {t("contractors.charts.companiesByCity", "Companies by City")}
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

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          {t("contractors.charts.companiesByCity", "Companies by City")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: 10, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="city"
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
                angle={-45}
                textAnchor="end"
                interval={0}
                height={60}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [value, t("contractors.stats.companies", "Companies")]}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
