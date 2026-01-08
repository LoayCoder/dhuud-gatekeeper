import { Users, CheckCircle, Clock, XCircle, Ban, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { ClientSiteRepWorkerSummary } from "@/hooks/contractor-management/use-client-site-rep-data";

interface WorkersSummaryCardProps {
  summary: ClientSiteRepWorkerSummary;
  safetyOfficerCount?: number;
}

export function WorkersSummaryCard({ summary, safetyOfficerCount = 0 }: WorkersSummaryCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleStatusClick = (status: string) => {
    navigate(`/contractors/workers?status=${status}`);
  };

  const handleCardClick = () => {
    navigate("/contractors/workers");
  };

  // Calculate safety ratio
  const safetyRatio = safetyOfficerCount > 0 && summary.total > 0
    ? Math.ceil(summary.total / safetyOfficerCount)
    : 0;

  const stats = [
    {
      label: t("clientSiteRep.approved", "Approved"),
      value: summary.approved,
      icon: CheckCircle,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-100 dark:bg-green-900/30",
      status: "approved",
    },
    {
      label: t("clientSiteRep.pending", "Pending"),
      value: summary.pending,
      icon: Clock,
      color: "text-yellow-600 dark:text-yellow-400",
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
      status: "pending",
    },
    {
      label: t("clientSiteRep.rejected", "Rejected"),
      value: summary.rejected,
      icon: XCircle,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-100 dark:bg-red-900/30",
      status: "rejected",
    },
    {
      label: t("clientSiteRep.blacklisted", "Blacklisted"),
      value: summary.blacklisted,
      icon: Ban,
      color: "text-gray-600 dark:text-gray-400",
      bg: "bg-gray-100 dark:bg-gray-900/30",
      status: "blacklisted",
    },
  ];

  return (
    <Card>
      <CardHeader 
        className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg"
        onClick={handleCardClick}
      >
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-primary" />
          {t("clientSiteRep.workers", "Workers")}
          <span className="text-muted-foreground font-normal">({summary.total})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`${stat.bg} rounded-lg p-3 flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity`}
              onClick={() => handleStatusClick(stat.status)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleStatusClick(stat.status)}
            >
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Safety Officer Ratio */}
        <div className="border-t pt-3">
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-primary" />
            <span className="font-medium">
              {t("clientSiteRep.safetyCoverage", "Safety Coverage")}:
            </span>
            {safetyOfficerCount > 0 ? (
              <span className={safetyRatio > 25 ? "text-destructive font-medium" : "text-green-600 dark:text-green-400 font-medium"}>
                1 : {safetyRatio}
              </span>
            ) : (
              <span className="text-destructive font-medium">
                {t("clientSiteRep.noSafetyOfficerAssigned", "No Safety Officer")}
              </span>
            )}
          </div>
          {safetyOfficerCount > 0 && (
            <p className="text-xs text-muted-foreground mt-1 ps-6">
              ({safetyOfficerCount} {t("clientSiteRep.safetyOfficers", "Safety Officers")} : {summary.total} {t("clientSiteRep.workers", "Workers")})
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
