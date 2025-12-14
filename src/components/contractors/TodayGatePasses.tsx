import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogIn, LogOut, Truck, Clock, CheckCircle } from "lucide-react";
import { MaterialGatePass, useVerifyGatePass } from "@/hooks/contractor-management/use-material-gate-passes";
import { format } from "date-fns";

interface TodayGatePassesProps {
  passes: MaterialGatePass[];
}

export function TodayGatePasses({ passes }: TodayGatePassesProps) {
  const { t } = useTranslation();
  const verifyPass = useVerifyGatePass();

  if (passes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t("contractors.gatePasses.noTodayPasses", "No approved passes for today")}
      </div>
    );
  }

  const getPassStatus = (pass: MaterialGatePass) => {
    if (pass.exit_time) return { label: t("contractors.gatePasses.exited", "Exited"), color: "outline" as const };
    if (pass.entry_time) return { label: t("contractors.gatePasses.onSite", "On Site"), color: "default" as const };
    return { label: t("contractors.gatePasses.pending", "Pending"), color: "secondary" as const };
  };

  const isWithinTimeWindow = (pass: MaterialGatePass) => {
    if (!pass.time_window_start || !pass.time_window_end) return true;
    const now = format(new Date(), "HH:mm");
    return now >= pass.time_window_start && now <= pass.time_window_end;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            {t("contractors.gatePasses.todayPasses", "Today's Approved Passes")}
            <Badge variant="secondary" className="ms-2">{passes.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {passes.map((pass) => {
              const status = getPassStatus(pass);
              const withinWindow = isWithinTimeWindow(pass);

              return (
                <div
                  key={pass.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    !withinWindow && !pass.entry_time ? "border-destructive/50 bg-destructive/5" : ""
                  }`}
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium">{pass.reference_number}</span>
                      <Badge variant={status.color}>{status.label}</Badge>
                      <Badge variant="outline">{t(`contractors.passType.${pass.pass_type}`, pass.pass_type)}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{pass.material_description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Truck className="h-3 w-3" />
                        {pass.vehicle_plate || "-"}
                      </span>
                      <span>{pass.driver_name || "-"}</span>
                      {pass.time_window_start && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {pass.time_window_start} - {pass.time_window_end}
                        </span>
                      )}
                    </div>
                    {pass.entry_time && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("contractors.gatePasses.entryAt", "Entry")}: {format(new Date(pass.entry_time), "HH:mm")}
                        {pass.exit_time && ` | ${t("contractors.gatePasses.exitAt", "Exit")}: ${format(new Date(pass.exit_time), "HH:mm")}`}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {!pass.entry_time && (
                      <Button
                        size="sm"
                        onClick={() => verifyPass.mutate({ passId: pass.id, action: "entry" })}
                        disabled={verifyPass.isPending}
                      >
                        <LogIn className="h-4 w-4 me-1" />
                        {t("contractors.gatePasses.entry", "Entry")}
                      </Button>
                    )}
                    {pass.entry_time && !pass.exit_time && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => verifyPass.mutate({ passId: pass.id, action: "exit" })}
                        disabled={verifyPass.isPending}
                      >
                        <LogOut className="h-4 w-4 me-1" />
                        {t("contractors.gatePasses.exit", "Exit")}
                      </Button>
                    )}
                    {pass.exit_time && (
                      <Badge variant="outline" className="self-center">
                        <CheckCircle className="h-3 w-3 me-1" />
                        {t("contractors.gatePasses.completed", "Completed")}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
