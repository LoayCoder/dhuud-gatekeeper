import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CheckCircle2, 
  Clock, 
  FileWarning, 
  AlertTriangle,
  XCircle,
  ArrowUpRight,
  Pause
} from "lucide-react";

interface PTWStatsRowProps {
  activePermits: number;
  pendingPermits: number;
  expiringToday: number;
  suspendedPermits: number;
  extendedPermits: number;
  closedPermits: number;
  isLoading?: boolean;
}

export function PTWStatsRow({
  activePermits,
  pendingPermits,
  expiringToday,
  suspendedPermits,
  extendedPermits,
  closedPermits,
  isLoading,
}: PTWStatsRowProps) {
  const { t } = useTranslation();

  const stats = [
    {
      label: t("ptw.stats.activePermits", "Active Permits"),
      value: activePermits,
      icon: CheckCircle2,
      iconColor: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: t("ptw.stats.pendingApproval", "Pending Approval"),
      value: pendingPermits,
      icon: Clock,
      iconColor: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      label: t("ptw.stats.expiringToday", "Expiring Today"),
      value: expiringToday,
      icon: AlertTriangle,
      iconColor: expiringToday > 0 ? "text-destructive" : "text-muted-foreground",
      bgColor: expiringToday > 0 ? "bg-destructive/10" : "bg-muted/50",
      highlight: expiringToday > 0,
    },
    {
      label: t("ptw.stats.suspended", "Suspended"),
      value: suspendedPermits,
      icon: Pause,
      iconColor: suspendedPermits > 0 ? "text-destructive" : "text-muted-foreground",
      bgColor: suspendedPermits > 0 ? "bg-destructive/10" : "bg-muted/50",
    },
    {
      label: t("ptw.stats.extended", "Extended"),
      value: extendedPermits,
      icon: ArrowUpRight,
      iconColor: "text-chart-4",
      bgColor: "bg-chart-4/10",
    },
    {
      label: t("ptw.stats.closedThisWeek", "Closed"),
      value: closedPermits,
      icon: XCircle,
      iconColor: "text-muted-foreground",
      bgColor: "bg-muted/50",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card 
            key={stat.label} 
            className={stat.highlight ? "border-destructive/50" : ""}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <div className={`p-1.5 rounded-full ${stat.bgColor}`}>
                <Icon className={`h-3.5 w-3.5 ${stat.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.highlight ? "text-destructive" : ""}`}>
                {stat.value}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
