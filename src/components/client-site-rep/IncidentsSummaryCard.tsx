import { AlertTriangle, CircleDot, Search, CheckCircle2 } from "lucide-react";
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

  const handleCardClick = () => {
    navigate("/incidents");
  };

  const stats = [
    {
      label: t("clientSiteRep.open", "Open"),
      value: summary.open,
      icon: CircleDot,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-100 dark:bg-red-900/30",
      status: "open",
    },
    {
      label: t("clientSiteRep.underInvestigation", "Under Investigation"),
      value: summary.under_investigation,
      icon: Search,
      color: "text-yellow-600 dark:text-yellow-400",
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
      status: "investigation_in_progress",
    },
    {
      label: t("clientSiteRep.closed", "Closed"),
      value: summary.closed,
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-100 dark:bg-green-900/30",
      status: "closed",
    },
  ];

  return (
    <Card>
      <CardHeader 
        className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg"
        onClick={handleCardClick}
      >
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="h-5 w-5 text-primary" />
          {t("clientSiteRep.hsseEvents", "HSSE Events")}
          <span className="text-muted-foreground font-normal">({summary.total})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`${stat.bg} rounded-lg p-3 text-center cursor-pointer hover:opacity-80 transition-opacity`}
              onClick={() => handleStatusClick(stat.status)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleStatusClick(stat.status)}
            >
              <stat.icon className={`h-5 w-5 mx-auto ${stat.color}`} />
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
