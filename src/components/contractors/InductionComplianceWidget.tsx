import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Video, CheckCircle, Clock, AlertTriangle, XCircle } from "lucide-react";
import { useInductionComplianceStats } from "@/hooks/contractor-management/use-worker-inductions";

export function InductionComplianceWidget() {
  const { t } = useTranslation();
  const { data: stats, isLoading } = useInductionComplianceStats();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Video className="h-4 w-4" />
            {t("contractors.induction.compliance", "Induction Compliance")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-2 bg-muted rounded" />
            <div className="grid grid-cols-4 gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Video className="h-4 w-4" />
          {t("contractors.induction.compliance", "Induction Compliance")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Completion Rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {t("contractors.induction.completionRate", "Completion Rate")}
            </span>
            <span className="font-medium">{stats.completionRate}%</span>
          </div>
          <Progress value={stats.completionRate} className="h-2" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
              <CheckCircle className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold">{stats.completed}</p>
            <p className="text-xs text-muted-foreground">
              {t("contractors.induction.completed", "Completed")}
            </p>
          </div>

          <div className="rounded-lg border p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
              <Clock className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">
              {t("contractors.induction.pending", "Pending")}
            </p>
          </div>

          <div className="rounded-lg border p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-yellow-600 mb-1">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold">{stats.expiringSoon}</p>
            <p className="text-xs text-muted-foreground">
              {t("contractors.induction.expiringSoon", "Expiring Soon")}
            </p>
          </div>

          <div className="rounded-lg border p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
              <XCircle className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold">{stats.expired}</p>
            <p className="text-xs text-muted-foreground">
              {t("contractors.induction.expired", "Expired")}
            </p>
          </div>
        </div>

        {/* Alerts */}
        {stats.expiringSoon > 0 && (
          <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20 rounded-md p-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              {t(
                "contractors.induction.expiringAlert",
                "{{count}} inductions expiring within 30 days",
                { count: stats.expiringSoon }
              )}
            </span>
          </div>
        )}

        {stats.expired > 0 && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 rounded-md p-2">
            <XCircle className="h-4 w-4 shrink-0" />
            <span>
              {t(
                "contractors.induction.expiredAlert",
                "{{count}} inductions have expired",
                { count: stats.expired }
              )}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
