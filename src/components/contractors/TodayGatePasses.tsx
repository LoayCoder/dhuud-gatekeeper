import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogIn, LogOut } from "lucide-react";
import { MaterialGatePass, useVerifyGatePass } from "@/hooks/contractor-management/use-material-gate-passes";

interface TodayGatePassesProps {
  passes: MaterialGatePass[];
}

export function TodayGatePasses({ passes }: TodayGatePassesProps) {
  const { t } = useTranslation();
  const verifyPass = useVerifyGatePass();

  if (passes.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">{t("contractors.gatePasses.noTodayPasses", "No approved passes for today")}</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("contractors.gatePasses.todayPasses", "Today's Approved Passes")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {passes.map((pass) => (
              <div key={pass.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium">{pass.pass_number}</span>
                    <Badge variant="outline">{pass.pass_type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{pass.material_description}</p>
                  <p className="text-xs text-muted-foreground">{pass.vehicle_number} • {pass.driver_name}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => verifyPass.mutate({ passId: pass.id, action: "entry" })}>
                    <LogIn className="h-4 w-4 me-1" /> {t("contractors.gatePasses.entry", "Entry")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => verifyPass.mutate({ passId: pass.id, action: "exit" })}>
                    <LogOut className="h-4 w-4 me-1" /> {t("contractors.gatePasses.exit", "Exit")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
