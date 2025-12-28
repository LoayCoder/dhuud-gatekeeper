import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Wrench,
  Heart,
  Zap,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { RadialBarChart, RadialBar, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { useFleetHealthStats, useAtRiskAssets } from "@/hooks/use-asset-health-dashboard";
import { useHealthTrendData } from "@/hooks/use-asset-health-trend";
import { useAssetFailurePredictions } from "@/hooks/use-asset-health-scores";
import { cn } from "@/lib/utils";

// HSSA-compliant risk colors
const RISK_COLORS = {
  critical: "hsl(0, 84%, 60%)",      // Red - Danger
  high: "hsl(25, 95%, 53%)",         // Orange - Warning
  medium: "hsl(48, 96%, 53%)",       // Yellow - Caution
  low: "hsl(142, 76%, 36%)",         // Green - Safe
};

const TREND_ICONS = {
  improving: TrendingUp,
  declining: TrendingDown,
  stable: Minus,
};

interface RiskCardProps {
  label: string;
  count: number;
  color: string;
  variant: "critical" | "high" | "medium" | "low";
}

function RiskCard({ label, count, color, variant }: RiskCardProps) {
  const variantStyles = {
    critical: "border-destructive/50 bg-destructive/10",
    high: "border-orange-500/50 bg-orange-500/10",
    medium: "border-yellow-500/50 bg-yellow-500/10",
    low: "border-green-500/50 bg-green-500/10",
  };

  return (
    <div className={cn(
      "flex flex-col items-center justify-center rounded-lg border p-3 text-center",
      variantStyles[variant]
    )}>
      <span className="text-2xl font-bold" style={{ color }}>{count}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function HealthGauge({ score, isLoading }: { score: number; isLoading: boolean }) {
  const { t } = useTranslation();
  
  const getScoreColor = (s: number) => {
    if (s >= 80) return RISK_COLORS.low;
    if (s >= 60) return RISK_COLORS.medium;
    if (s >= 40) return RISK_COLORS.high;
    return RISK_COLORS.critical;
  };

  const gaugeData = [
    { name: "score", value: score, fill: getScoreColor(score) },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center">
        <Skeleton className="h-32 w-32 rounded-full" />
        <Skeleton className="mt-2 h-4 w-20" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative h-32 w-32">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="100%"
            barSize={12}
            data={gaugeData}
            startAngle={180}
            endAngle={0}
          >
            <RadialBar
              dataKey="value"
              cornerRadius={6}
              background={{ fill: "hsl(var(--muted))" }}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color: getScoreColor(score) }}>
            {score}
          </span>
          <span className="text-xs text-muted-foreground">{t("assets.health.score", "Score")}</span>
        </div>
      </div>
    </div>
  );
}

function TrendIndicator({ trend, count }: { trend: "improving" | "declining" | "stable"; count: number }) {
  const { t } = useTranslation();
  const Icon = TREND_ICONS[trend];
  
  const trendStyles = {
    improving: "text-green-600",
    declining: "text-destructive",
    stable: "text-muted-foreground",
  };

  const trendLabels = {
    improving: t("assets.health.improving", "Improving"),
    declining: t("assets.health.declining", "Declining"),
    stable: t("assets.health.stable", "Stable"),
  };

  return (
    <div className={cn("flex items-center gap-1 text-sm", trendStyles[trend])}>
      <Icon className="h-4 w-4" />
      <span>{trendLabels[trend]}</span>
      {count > 0 && <span className="text-muted-foreground">({count})</span>}
    </div>
  );
}

export function AssetHealthDashboardWidget() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const direction = i18n.dir();

  const { data: fleetStats, isLoading: statsLoading } = useFleetHealthStats();
  const { data: atRiskAssets, isLoading: atRiskLoading } = useAtRiskAssets(5);
  const { data: predictions } = useAssetFailurePredictions();
  const { data: trendData, isLoading: trendLoading } = useHealthTrendData();

  // Calculate prediction counts by severity
  const activePredictions = predictions?.filter(p => p.status === 'active') || [];
  const criticalPredictions = activePredictions.filter(p => p.severity === 'critical').length;
  const highPredictions = activePredictions.filter(p => p.severity === 'high').length;

  // Find most urgent prediction
  const mostUrgent = activePredictions
    .sort((a, b) => new Date(a.predicted_date).getTime() - new Date(b.predicted_date).getTime())[0];

  const daysUntilUrgent = mostUrgent
    ? Math.ceil((new Date(mostUrgent.predicted_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  // Determine overall trend
  const overallTrend = fleetStats 
    ? (fleetStats.improvingTrend > fleetStats.decliningTrend ? "improving" 
      : fleetStats.decliningTrend > fleetStats.improvingTrend ? "declining" 
      : "stable")
    : "stable";

  return (
    <Card dir={direction}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-destructive" />
            {t("assets.health.dashboardTitle", "Asset Health Overview")}
          </CardTitle>
          <CardDescription>
            {t("assets.health.dashboardDescription", "Fleet health status and predictive maintenance alerts")}
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/assets")}
          className="gap-1"
        >
          {t("common.viewAll", "View All")}
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Top Row: Health Gauge + Risk Distribution */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Fleet Health Score */}
          <div className="flex flex-col items-center justify-center rounded-lg border bg-muted/30 p-4">
            <HealthGauge score={fleetStats?.averageScore || 0} isLoading={statsLoading} />
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {t("assets.health.fleetHealth", "Fleet Health")}
              </span>
              {!statsLoading && <TrendIndicator trend={overallTrend as any} count={0} />}
            </div>
            <span className="text-xs text-muted-foreground">
              {fleetStats?.totalAssets || 0} {t("assets.health.assetsMonitored", "assets monitored")}
            </span>
          </div>

          {/* Risk Distribution */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              {t("assets.health.riskDistribution", "Risk Distribution")}
            </h4>
            {statsLoading ? (
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <RiskCard
                  label={t("assets.health.critical", "Critical")}
                  count={fleetStats?.criticalCount || 0}
                  color={RISK_COLORS.critical}
                  variant="critical"
                />
                <RiskCard
                  label={t("assets.health.high", "High")}
                  count={fleetStats?.highRiskCount || 0}
                  color={RISK_COLORS.high}
                  variant="high"
                />
                <RiskCard
                  label={t("assets.health.medium", "Medium")}
                  count={fleetStats?.mediumRiskCount || 0}
                  color={RISK_COLORS.medium}
                  variant="medium"
                />
                <RiskCard
                  label={t("assets.health.low", "Low")}
                  count={fleetStats?.lowRiskCount || 0}
                  color={RISK_COLORS.low}
                  variant="low"
                />
              </div>
            )}
          </div>
        </div>

        {/* At-Risk Assets Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              {t("assets.health.atRiskAssets", "At-Risk Assets")}
            </h4>
            {atRiskAssets && atRiskAssets.length > 0 && (
              <Badge variant="destructive">{atRiskAssets.length}</Badge>
            )}
          </div>

          {atRiskLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : !atRiskAssets || atRiskAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-6 text-center text-muted-foreground">
              <Activity className="mb-2 h-8 w-8 text-green-500" />
              <p>{t("assets.health.noAtRiskAssets", "No critical or high-risk assets")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {atRiskAssets.map((asset) => {
                const TrendIcon = asset.trend ? TREND_ICONS[asset.trend as keyof typeof TREND_ICONS] : Minus;
                return (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/assets/${asset.assetId}`)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{asset.assetName}</p>
                      <p className="text-xs text-muted-foreground">{asset.assetCode}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-end">
                        <Badge
                          variant="outline"
                          className={cn(
                            asset.riskLevel === "critical" && "border-destructive text-destructive",
                            asset.riskLevel === "high" && "border-orange-500 text-orange-600"
                          )}
                        >
                          {asset.score}
                        </Badge>
                      </div>
                      {asset.daysUntilFailure !== null && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {asset.daysUntilFailure} {t("assets.health.days", "days")}
                        </span>
                      )}
                      <TrendIcon className={cn(
                        "h-4 w-4",
                        asset.trend === "improving" && "text-green-500",
                        asset.trend === "declining" && "text-destructive",
                        asset.trend === "stable" && "text-muted-foreground"
                      )} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Row: Predictive Alerts + Maintenance */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Predictive Alerts */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-amber-500" />
              <h4 className="text-sm font-medium">
                {t("assets.health.predictiveAlerts", "Predictive Alerts")}
              </h4>
            </div>
            <div className="flex items-center gap-4 mb-2">
              <div className="text-center">
                <span className="text-xl font-bold text-destructive">{criticalPredictions}</span>
                <p className="text-xs text-muted-foreground">{t("assets.health.critical", "Critical")}</p>
              </div>
              <div className="text-center">
                <span className="text-xl font-bold text-orange-600">{highPredictions}</span>
                <p className="text-xs text-muted-foreground">{t("assets.health.high", "High")}</p>
              </div>
            </div>
            {mostUrgent && daysUntilUrgent !== null && (
              <p className="text-xs text-muted-foreground">
                {t("assets.health.nextPrediction", "Next")}: {mostUrgent.predicted_failure_type}{" "}
                <span className="font-medium text-foreground">
                  ({daysUntilUrgent} {t("assets.health.days", "days")})
                </span>
              </p>
            )}
          </div>

          {/* Maintenance Compliance */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wrench className="h-4 w-4 text-blue-500" />
              <h4 className="text-sm font-medium">
                {t("assets.health.maintenance", "Maintenance")}
              </h4>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("assets.health.compliance", "Compliance")}
                </span>
                <span className="text-sm font-medium">
                  {fleetStats?.averageComplianceRate || 0}%
                </span>
              </div>
              <Progress value={fleetStats?.averageComplianceRate || 0} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-destructive" />
                  {fleetStats?.overdueMaintenance || 0} {t("assets.health.overdue", "Overdue")}
                </span>
                <span>
                  {fleetStats?.upcomingMaintenance || 0} {t("assets.health.upcoming", "Upcoming")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Mini Trend Chart */}
        {!trendLoading && trendData && trendData.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              {t("assets.health.trendLast7Days", "Health Trend (Last 7 Days)")}
            </h4>
            <div className="h-20" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} hide />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip 
                    formatter={(value: number) => [`${value}`, t("assets.health.avgScore", "Avg Score")]}
                    labelFormatter={(label) => label}
                  />
                  <Area
                    type="monotone"
                    dataKey="averageScore"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.2)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
