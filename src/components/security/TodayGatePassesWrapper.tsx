import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck } from "lucide-react";
import { TodayGatePasses } from "@/components/contractors/TodayGatePasses";
import { useTodayApprovedPasses } from "@/hooks/contractor-management/use-material-gate-passes";
import { Skeleton } from "@/components/ui/skeleton";

export function TodayGatePassesWrapper() {
  const { t } = useTranslation();
  const { data: passes = [], isLoading } = useTodayApprovedPasses();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            {t("contractors.gatePasses.todayPasses", "Today's Approved Passes")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return <TodayGatePasses passes={passes} />;
}
