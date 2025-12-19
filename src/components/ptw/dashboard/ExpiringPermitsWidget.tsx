import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Clock, Timer } from "lucide-react";
import { PTWPermit } from "@/hooks/ptw/use-ptw-permits";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";

interface ExpiringPermitsWidgetProps {
  expiringToday: number;
  expiringThisWeek: number;
  permits: PTWPermit[];
  isLoading?: boolean;
}

export function ExpiringPermitsWidget({
  expiringToday,
  expiringThisWeek,
  permits,
  isLoading,
}: ExpiringPermitsWidgetProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ar" ? ar : enUS;

  if (isLoading) {
    return (
      <Card className="border-warning/50 bg-warning/5">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const totalExpiring = expiringToday + expiringThisWeek;

  if (totalExpiring === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">
              {t("ptw.charts.expiringPermits", "Expiring Permits")}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4 text-muted-foreground">
            <p className="text-sm">
              {t("ptw.charts.noExpiringPermits", "No permits expiring soon")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={expiringToday > 0 ? "border-destructive/50 bg-destructive/5" : "border-warning/50 bg-warning/5"}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`h-4 w-4 ${expiringToday > 0 ? "text-destructive" : "text-warning"}`} />
            <CardTitle className="text-sm font-medium">
              {t("ptw.charts.expiringPermits", "Expiring Permits")}
            </CardTitle>
          </div>
          <Badge variant={expiringToday > 0 ? "destructive" : "outline"} className="text-xs">
            {totalExpiring} {t("ptw.charts.total", "total")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`p-2 rounded-lg ${expiringToday > 0 ? "bg-destructive/10" : "bg-muted"}`}>
            <div className="flex items-center gap-1.5">
              <Clock className={`h-3.5 w-3.5 ${expiringToday > 0 ? "text-destructive" : "text-muted-foreground"}`} />
              <span className="text-xs text-muted-foreground">
                {t("ptw.charts.today", "Today")}
              </span>
            </div>
            <p className={`text-xl font-bold ${expiringToday > 0 ? "text-destructive" : ""}`}>
              {expiringToday}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-warning/10">
            <div className="flex items-center gap-1.5">
              <Timer className="h-3.5 w-3.5 text-warning" />
              <span className="text-xs text-muted-foreground">
                {t("ptw.charts.thisWeek", "This Week")}
              </span>
            </div>
            <p className="text-xl font-bold">{expiringThisWeek}</p>
          </div>
        </div>

        {/* Permit list */}
        {permits.length > 0 && (
          <div className="space-y-1.5">
            {permits.slice(0, 3).map((permit) => {
              const endTime = permit.extended_until || permit.planned_end_time;
              const timeLeft = endTime
                ? formatDistanceToNow(new Date(endTime), { addSuffix: true, locale })
                : "";
              
              return (
                <Link
                  key={permit.id}
                  to={`/ptw/view/${permit.id}`}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-background/50 transition-colors text-sm"
                >
                  <span className="font-medium truncate">{permit.reference_id}</span>
                  <span className="text-xs text-muted-foreground">{timeLeft}</span>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
