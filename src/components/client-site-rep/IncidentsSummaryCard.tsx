import { AlertTriangle, FileWarning, Search, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { ClientSiteRepIncidentSummary } from "@/hooks/contractor-management/use-client-site-rep-data";

interface IncidentsSummaryCardProps {
  summary: ClientSiteRepIncidentSummary;
}

export function IncidentsSummaryCard({ summary }: IncidentsSummaryCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleStatusClick = (status: string) => {
    navigate(`/incidents?status=${status}`);
  };

  const stats = [
    {
      label: t("clientSiteRep.open", "Open"),
      value: summary.open,
      icon: FileWarning,
      color: "text-red-600 dark:text-red-400",
      status: "open",
    },
    {
      label: t("clientSiteRep.underInvestigation", "Under Investigation"),
      value: summary.under_investigation,
      icon: Search,
      color: "text-yellow-600 dark:text-yellow-400",
      status: "investigation_in_progress",
    },
    {
      label: t("clientSiteRep.closed", "Closed"),
      value: summary.closed,
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400",
      status: "closed",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="h-5 w-5 text-primary" />
          {t("clientSiteRep.incidents", "Incidents")}
          <span className="text-muted-foreground font-normal">({summary.total})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center justify-center p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
              onClick={() => handleStatusClick(stat.status)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleStatusClick(stat.status)}
            >
              <stat.icon className={`h-6 w-6 ${stat.color} mb-1`} />
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground text-center">{stat.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
