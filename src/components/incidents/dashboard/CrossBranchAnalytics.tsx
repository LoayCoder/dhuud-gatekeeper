import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, MapPin } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  useCrossBranchAnalytics,
  LocationBranchData,
} from "@/hooks/use-cross-branch-analytics";
import { useBranches } from "@/hooks/use-branches";
import { cn } from "@/lib/utils";

interface CrossBranchAnalyticsProps {
  startDate?: Date;
  endDate?: Date;
  locationBranchId?: string;
  reporterBranchId?: string;
  onLocationBranchChange?: (branchId: string) => void;
  onReporterBranchChange?: (branchId: string) => void;
  className?: string;
}

export function CrossBranchAnalytics({
  startDate,
  endDate,
  locationBranchId,
  reporterBranchId,
  onLocationBranchChange,
  onReporterBranchChange,
  className,
}: CrossBranchAnalyticsProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  const { data: branches } = useBranches();
  const { data, isLoading } = useCrossBranchAnalytics({
    startDate,
    endDate,
    locationBranchId,
    reporterBranchId,
  });

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!data?.by_location_branch) return [];

    return data.by_location_branch.map((item: LocationBranchData) => ({
      name: isRTL
        ? item.branch_name_ar || item.branch_name
        : item.branch_name,
      sameBranch: item.from_same_branch,
      crossBranch: item.from_other_branches,
      total: item.total,
    }));
  }, [data?.by_location_branch, isRTL]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base">
            {t("hsseDashboard.observationsByLocation", "Observations by Location")}
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            {/* Location Branch Filter */}
            <Select
              value={locationBranchId || "all"}
              onValueChange={(v) =>
                onLocationBranchChange?.(v === "all" ? "" : v)
              }
            >
              <SelectTrigger className="w-[150px] h-8">
                <MapPin className="me-2 h-3.5 w-3.5" />
                <SelectValue
                  placeholder={t(
                    "hsseDashboard.filterByLocationBranch",
                    "Location Branch"
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("common.all", "All")}
                </SelectItem>
                {branches?.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {isRTL ? (branch as any).name_ar || branch.name : branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Reporter Branch Filter */}
            <Select
              value={reporterBranchId || "all"}
              onValueChange={(v) =>
                onReporterBranchChange?.(v === "all" ? "" : v)
              }
            >
              <SelectTrigger className="w-[150px] h-8">
                <Building2 className="me-2 h-3.5 w-3.5" />
                <SelectValue
                  placeholder={t(
                    "hsseDashboard.filterByReporterBranch",
                    "Reporter Branch"
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("common.all", "All")}
                </SelectItem>
                {branches?.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {isRTL ? (branch as any).name_ar || branch.name : branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            {t("common.noData", "No data available")}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{
                top: 5,
                right: 30,
                left: isRTL ? 30 : 80,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                width={isRTL ? 80 : 75}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                  color: "hsl(var(--popover-foreground))",
                }}
                formatter={(value: number, name: string) => [
                  value,
                  name === "sameBranch"
                    ? t("hsseDashboard.sameBranch", "Same Branch")
                    : t("hsseDashboard.crossBranch", "Cross-Branch"),
                ]}
              />
              <Legend
                formatter={(value) =>
                  value === "sameBranch"
                    ? t("hsseDashboard.sameBranch", "Same Branch")
                    : t("hsseDashboard.crossBranch", "Cross-Branch")
                }
              />
              <Bar
                dataKey="sameBranch"
                stackId="a"
                fill="hsl(var(--muted-foreground))"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="crossBranch"
                stackId="a"
                fill="hsl(var(--primary))"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
