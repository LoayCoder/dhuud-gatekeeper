import { useTranslation } from "react-i18next";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LabelList } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WorkersByCompanyChartProps {
  data: { name: string; approved: number; pending: number; total: number }[];
  isLoading: boolean;
}

const COLORS = {
  approved: "hsl(142 71% 45%)",
  pending: "hsl(45 93% 47%)",
};

const MAX_LABEL_LENGTH = 22;
const ROW_HEIGHT = 40;
const MAX_VISIBLE_ROWS = 6;
const MIN_Y_AXIS_WIDTH = 100;
const MAX_Y_AXIS_WIDTH = 150;

export function WorkersByCompanyChart({ data, isLoading }: WorkersByCompanyChartProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

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

  // Prepare chart data with smart truncation
  const chartData = data.map((item) => ({
    ...item,
    shortName: item.name.length > MAX_LABEL_LENGTH 
      ? `${item.name.substring(0, MAX_LABEL_LENGTH)}...` 
      : item.name,
  }));

  // Dynamic Y-axis width based on longest label
  const longestLabelLength = Math.max(...chartData.map(d => d.shortName.length));
  const yAxisWidth = Math.min(MAX_Y_AXIS_WIDTH, Math.max(MIN_Y_AXIS_WIDTH, longestLabelLength * 7));

  // Calculate dynamic height
  const minHeight = 200;
  const calculatedHeight = chartData.length * ROW_HEIGHT + 60;
  const needsScroll = chartData.length > MAX_VISIBLE_ROWS;
  const containerHeight = needsScroll ? MAX_VISIBLE_ROWS * ROW_HEIGHT + 60 : Math.max(minHeight, calculatedHeight);
  const chartHeight = calculatedHeight;

  const chartContent = (
    <div style={{ height: `${chartHeight}px`, minHeight: `${minHeight}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 0, bottom: needsScroll ? 5 : 40 }}
          barSize={26}
          barCategoryGap="12%"
        >
          <XAxis 
            type="number" 
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={{ stroke: "hsl(var(--border))" }}
            tickLine={false}
            domain={[0, 'dataMax + 1']}
            allowDecimals={false}
            reversed={isRTL}
          />
          <YAxis
            type="category"
            dataKey="shortName"
            tick={(props) => {
              const { x, y, payload } = props;
              return (
                <text
                  x={isRTL ? x : 8}
                  y={y}
                  dy={4}
                  textAnchor="start"
                  fill="hsl(var(--foreground))"
                  fontSize={11}
                >
                  {payload.value}
                </text>
              );
            }}
            width={yAxisWidth}
            axisLine={false}
            tickLine={false}
            interval={0}
            orientation={isRTL ? "right" : "left"}
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
            labelFormatter={(label) => {
              const item = chartData.find(d => d.shortName === label);
              return item?.name || label;
            }}
          />
          {!needsScroll && (
            <Legend
              verticalAlign="bottom"
              wrapperStyle={{ paddingTop: "16px", fontSize: "12px" }}
              iconType="circle"
              iconSize={10}
              formatter={(value) => {
                const label = value === "approved"
                  ? t("contractors.status.approved", "Approved")
                  : t("contractors.status.pending", "Pending");
                return <span style={{ color: "hsl(var(--foreground))", marginInlineStart: "4px" }}>{String(label)}</span>;
              }}
            />
          )}
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
              fontSize={10}
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
              fontSize={10}
              fontWeight={600}
              formatter={(value: number) => value > 0 ? value : ''}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          {t("contractors.charts.workersByCompany", "Workers By Company")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {needsScroll ? (
          <>
            <ScrollArea style={{ height: `${containerHeight}px` }}>
              {chartContent}
            </ScrollArea>
            <div className="flex items-center justify-center gap-4 pt-3 border-t mt-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.approved }} />
                <span className="text-xs text-foreground">{t("contractors.status.approved", "Approved")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.pending }} />
                <span className="text-xs text-foreground">{t("contractors.status.pending", "Pending")}</span>
              </div>
            </div>
          </>
        ) : (
          chartContent
        )}
      </CardContent>
    </Card>
  );
}
