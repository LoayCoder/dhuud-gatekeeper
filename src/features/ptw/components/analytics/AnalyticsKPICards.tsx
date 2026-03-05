import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileCheck2,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
} from "lucide-react";

interface AnalyticsKPICardsProps {
  totalPermits: number;
  activePermits: number;
  closedPermits: number;
  cancelledPermits: number;
  avgLifecycleDays: number;
  monthlyAverage: number;
  isLoading?: boolean;
}

export function AnalyticsKPICards({
  totalPermits,
  activePermits,
  closedPermits,
  cancelledPermits,
  avgLifecycleDays,
  monthlyAverage,
  isLoading,
}: AnalyticsKPICardsProps) {
  const { t } = useTranslation();

  const kpis = [
    {
      label: t("ptw.analytics.totalPermits", "Total Permits"),
      value: totalPermits,
      icon: FileCheck2,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: t("ptw.analytics.activePermits", "Active"),
      value: activePermits,
      icon: Play,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      label: t("ptw.analytics.closedPermits", "Closed"),
      value: closedPermits,
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/30",
    },
    {
      label: t("ptw.analytics.cancelledPermits", "Cancelled"),
      value: cancelledPermits,
      icon: XCircle,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-100 dark:bg-red-900/30",
    },
    {
      label: t("ptw.analytics.avgLifecycle", "Avg Lifecycle"),
      value: `${avgLifecycleDays}d`,
      icon: Clock,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
    },
    {
      label: t("ptw.analytics.monthlyAvg", "Monthly Avg"),
      value: monthlyAverage,
      icon: TrendingUp,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground truncate">{kpi.label}</p>
                <p className="text-xl font-bold">{kpi.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
