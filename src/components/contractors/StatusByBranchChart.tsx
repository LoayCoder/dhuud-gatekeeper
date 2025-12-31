import { useTranslation } from "react-i18next";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, TooltipProps } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

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

const ROW_HEIGHT = 45;
const MAX_VISIBLE_ROWS = 6;
const Y_AXIS_WIDTH = 130;

// Custom tooltip showing individual values and total
function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  const { t } = useTranslation();
  
  if (!active || !payload || payload.length === 0) return null;
  
  const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);
  
  return (
    <div
      className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md"
      style={{ minWidth: "160px" }}
    >
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <p className="text-xs text-muted-foreground mb-2">
        {t("common.total", "Total")}: {total}
      </p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">
                {t(`contractors.status.${entry.name}`, String(entry.name).charAt(0).toUpperCase() + String(entry.name).slice(1))}
              </span>
            </span>
            <span className="font-medium text-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatusByBranchChart({ data, isLoading }: StatusByBranchChartProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";

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

  const chartHeight = data.length * ROW_HEIGHT;
  const needsScroll = data.length > MAX_VISIBLE_ROWS;
  const visibleHeight = needsScroll ? MAX_VISIBLE_ROWS * ROW_HEIGHT : chartHeight;

  // Custom Y-axis tick for left-aligned labels
  const CustomYAxisTick = (props: { x: number; y: number; payload: { value: string } }) => {
    const { y, payload } = props;
    const maxLength = 22;
    const displayValue = payload.value.length > maxLength 
      ? `${payload.value.slice(0, maxLength)}...` 
      : payload.value;
    
    return (
      <text
        x={isRTL ? undefined : 8}
        y={y}
        dy={4}
        textAnchor={isRTL ? "end" : "start"}
        fill="hsl(var(--foreground))"
        fontSize={11}
        style={isRTL ? { direction: "rtl" } : undefined}
      >
        <title>{payload.value}</title>
        {displayValue}
      </text>
    );
  };

  const chartContent = (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: isRTL ? 10 : 20, left: isRTL ? 20 : 0, bottom: 5 }}
        barCategoryGap="12%"
      >
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          axisLine={{ stroke: "hsl(var(--border))" }}
          tickLine={{ stroke: "hsl(var(--border))" }}
          reversed={isRTL}
        />
        <YAxis
          type="category"
          dataKey="branch"
          tick={CustomYAxisTick}
          width={Y_AXIS_WIDTH}
          axisLine={false}
          tickLine={false}
          interval={0}
          orientation={isRTL ? "right" : "left"}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
        <Bar dataKey="active" stackId="a" fill={COLORS.active} name="active" radius={[0, 0, 0, 0]} barSize={28} />
        <Bar dataKey="suspended" stackId="a" fill={COLORS.suspended} name="suspended" barSize={28} />
        <Bar dataKey="inactive" stackId="a" fill={COLORS.inactive} name="inactive" barSize={28} />
        <Bar dataKey="expired" stackId="a" fill={COLORS.expired} name="expired" radius={[0, 4, 4, 0]} barSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          {t("contractors.charts.statusByBranch", "Status By Branch")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {needsScroll ? (
          <ScrollArea className="rounded-md" style={{ height: `${visibleHeight}px` }}>
            {chartContent}
          </ScrollArea>
        ) : (
          <div style={{ height: `${chartHeight}px` }}>
            {chartContent}
          </div>
        )}
        {/* Legend outside scroll area */}
        <div className="flex flex-wrap justify-center gap-4 pt-2 border-t">
          {Object.entries(COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
              <span className="text-xs text-foreground">
                {t(`contractors.status.${status}`, status.charAt(0).toUpperCase() + status.slice(1))}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
