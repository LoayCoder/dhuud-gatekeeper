import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { 
  Package, 
  AlertTriangle, 
  Wrench, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Activity,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import {
  useAssetDashboardStats,
  useAssetConditionDistribution,
  useAssetCategoryDistribution,
  useOverdueInspections,
  useOverdueMaintenance,
  useRecentAssetActivity,
} from "@/hooks/use-asset-dashboard";
import { PendingTransfersCard } from "@/components/assets";
import { RecentInspectionsCard, InspectionStatsCard } from "@/components/inspections";
import { format, formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";

const CONDITION_COLORS = {
  excellent: "hsl(142, 76%, 36%)",
  good: "hsl(142, 69%, 58%)",
  fair: "hsl(48, 96%, 53%)",
  poor: "hsl(25, 95%, 53%)",
  critical: "hsl(0, 84%, 60%)",
};

export default function AssetDashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const direction = i18n.dir();
  const dateLocale = i18n.language === "ar" ? ar : enUS;

  const { data: stats, isLoading: statsLoading } = useAssetDashboardStats();
  const { data: conditionData, isLoading: conditionLoading } = useAssetConditionDistribution();
  const { data: categoryData, isLoading: categoryLoading } = useAssetCategoryDistribution();
  const { data: overdueInspections, isLoading: inspectionsLoading } = useOverdueInspections();
  const { data: overdueMaintenance, isLoading: maintenanceLoading } = useOverdueMaintenance();
  const { data: recentActivity, isLoading: activityLoading } = useRecentAssetActivity();

  // Prepare condition chart data
  const conditionChartData = conditionData
    ? Object.entries(conditionData)
        .filter(([_, value]) => value > 0)
        .map(([key, value]) => ({
          name: t(`assets.condition.${key}`),
          value,
          color: CONDITION_COLORS[key as keyof typeof CONDITION_COLORS],
        }))
    : [];

  // Prepare category chart data
  const categoryChartData = categoryData?.slice(0, 6) || [];

  return (
    <div className="space-y-6" dir={direction}>
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("assets.dashboard.title")}</h1>
          <p className="text-muted-foreground">{t("assets.dashboard.description")}</p>
        </div>
        <Button onClick={() => navigate("/assets")} variant="outline">
          {t("assets.dashboard.viewAllAssets")}
          <ArrowRight className="ms-2 h-4 w-4 rtl:rotate-180" />
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("assets.dashboard.totalAssets")}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("assets.dashboard.activeAssets")}</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-green-600">{stats?.active || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("assets.dashboard.underMaintenance")}</CardTitle>
            <Wrench className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-yellow-600">{stats?.under_maintenance || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("assets.dashboard.inactive")}</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-muted-foreground">{stats?.inactive || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Condition Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t("assets.dashboard.conditionDistribution")}</CardTitle>
            <CardDescription>{t("assets.dashboard.conditionDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {conditionLoading ? (
              <div className="flex h-[250px] items-center justify-center">
                <Skeleton className="h-40 w-40 rounded-full" />
              </div>
            ) : conditionChartData.length === 0 ? (
              <div className="flex h-[250px] items-center justify-center text-muted-foreground">
                {t("assets.dashboard.noData")}
              </div>
            ) : (
              <div className="h-[250px]" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={conditionChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {conditionChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Distribution Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t("assets.dashboard.categoryDistribution")}</CardTitle>
            <CardDescription>{t("assets.dashboard.categoryDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryLoading ? (
              <div className="flex h-[250px] items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : categoryChartData.length === 0 ? (
              <div className="flex h-[250px] items-center justify-center text-muted-foreground">
                {t("assets.dashboard.noData")}
              </div>
            ) : (
              <div className="h-[250px]" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChartData} layout="vertical">
                    <XAxis type="number" />
                    <YAxis 
                      type="category" 
                      dataKey="category_name" 
                      width={100}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Inspection Stats & Recent Inspections */}
      <div className="grid gap-6 lg:grid-cols-2">
        <InspectionStatsCard />
        <RecentInspectionsCard />
      </div>

      {/* Pending Transfers */}
      <PendingTransfersCard />

      {/* Alerts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Overdue Inspections */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                {t("assets.dashboard.overdueInspections")}
              </CardTitle>
              <CardDescription>{t("assets.dashboard.overdueInspectionsDescription")}</CardDescription>
            </div>
            {overdueInspections && overdueInspections.length > 0 && (
              <Badge variant="destructive">{overdueInspections.length}</Badge>
            )}
          </CardHeader>
          <CardContent>
            {inspectionsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !overdueInspections || overdueInspections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                <CheckCircle2 className="mb-2 h-8 w-8 text-green-500" />
                <p>{t("assets.dashboard.noOverdueInspections")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {overdueInspections.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/assets/${item.id}`)}
                  >
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.asset_code}</p>
                    </div>
                    <Badge variant="destructive">
                      {t("assets.dashboard.daysOverdue", { count: item.days_overdue })}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overdue Maintenance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                {t("assets.dashboard.overdueMaintenance")}
              </CardTitle>
              <CardDescription>{t("assets.dashboard.overdueMaintenanceDescription")}</CardDescription>
            </div>
            {overdueMaintenance && overdueMaintenance.length > 0 && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                {overdueMaintenance.length}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {maintenanceLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !overdueMaintenance || overdueMaintenance.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                <CheckCircle2 className="mb-2 h-8 w-8 text-green-500" />
                <p>{t("assets.dashboard.noOverdueMaintenance")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {overdueMaintenance.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/assets/${item.id}`)}
                  >
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.asset_code}</p>
                    </div>
                    <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                      {t("assets.dashboard.daysOverdue", { count: item.days_overdue })}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t("assets.dashboard.recentActivity")}
          </CardTitle>
          <CardDescription>{t("assets.dashboard.recentActivityDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !recentActivity || recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
              <p>{t("assets.dashboard.noRecentActivity")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      <Package className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm">
                        <span className="font-medium">{activity.actor_name}</span>
                        {" "}
                        <span className="text-muted-foreground">{t(`assets.dashboard.actions.${activity.action}`)}</span>
                        {" "}
                        <span className="font-medium">{activity.asset_name}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{activity.asset_code}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.created_at!), { addSuffix: true, locale: dateLocale })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
