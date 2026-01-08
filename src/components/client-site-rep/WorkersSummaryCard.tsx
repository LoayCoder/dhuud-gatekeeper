import { Users, CheckCircle, Clock, XCircle, Ban } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import type { ClientSiteRepWorkerSummary } from "@/hooks/contractor-management/use-client-site-rep-data";

interface WorkersSummaryCardProps {
  summary: ClientSiteRepWorkerSummary;
}

export function WorkersSummaryCard({ summary }: WorkersSummaryCardProps) {
  const { t } = useTranslation();

  const stats = [
    {
      label: t("clientSiteRep.approved", "Approved"),
      value: summary.approved,
      icon: CheckCircle,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-100 dark:bg-green-900/30",
    },
    {
      label: t("clientSiteRep.pending", "Pending"),
      value: summary.pending,
      icon: Clock,
      color: "text-yellow-600 dark:text-yellow-400",
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
    },
    {
      label: t("clientSiteRep.rejected", "Rejected"),
      value: summary.rejected,
      icon: XCircle,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-100 dark:bg-red-900/30",
    },
    {
      label: t("clientSiteRep.blacklisted", "Blacklisted"),
      value: summary.blacklisted,
      icon: Ban,
      color: "text-gray-600 dark:text-gray-400",
      bg: "bg-gray-100 dark:bg-gray-900/30",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-primary" />
          {t("clientSiteRep.workers", "Workers")}
          <span className="text-muted-foreground font-normal">({summary.total})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`${stat.bg} rounded-lg p-3 flex items-center gap-3`}
            >
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
