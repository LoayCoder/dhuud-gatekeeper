import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MenuBasedAdminRoute } from "@/components/auth/MenuBasedAdminRoute";
import { CalendarCheck, Clock, Truck, Package, CheckCircle2 } from "lucide-react";
import { useDeptTodayPasses } from "@/features/contractors/hooks/use-dept-gate-passes";
import { MaterialGatePass } from "@/features/contractors/hooks/use-material-gate-passes";
import { GatePassDetailDialog } from '@/features/contractors';
import { GatePassTypeBadge } from '@/features/contractors';
import { format } from "date-fns";

function DeptTodayPassesContent() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";
  const { data: todayPasses, isLoading } = useDeptTodayPasses();
  const [selectedPass, setSelectedPass] = useState<MaterialGatePass | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handlePassClick = (pass: MaterialGatePass) => {
    setSelectedPass(pass);
    setDetailOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "success" | "warning" | "destructive"; label: string }> = {
      approved: { variant: "success", label: t("gatePasses.status.approved", "Approved") },
      entry_verified: { variant: "default", label: t("gatePasses.status.entry_verified", "Entry Verified") },
      completed: { variant: "success", label: t("gatePasses.status.completed", "Completed") },
    };
    const config = variants[status] || { variant: "secondary" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const today = new Date();

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("deptGatePasses.today.title", "Today's Passes")}
        </h1>
        <p className="text-muted-foreground">
          {t("deptGatePasses.today.description", "Active gate passes for today")} - {format(today, "PPPP")}
        </p>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-success/10">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{todayPasses?.length ?? 0}</p>
              <p className="text-sm text-muted-foreground">
                {t("deptGatePasses.today.activeCount", "active passes today")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Passes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5" />
            {t("deptGatePasses.today.listTitle", "Today's Gate Passes")}
          </CardTitle>
          <CardDescription>
            {t("deptGatePasses.today.listDesc", "Approved gate passes scheduled for today")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : !todayPasses?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">{t("deptGatePasses.today.noPasses", "No Passes Today")}</p>
              <p className="text-sm">
                {t("deptGatePasses.today.noPassesDesc", "No approved gate passes scheduled for today")}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {todayPasses.map(pass => (
                <div
                  key={pass.id}
                  onClick={() => handlePassClick(pass)}
                  className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="font-semibold">{pass.reference_number}</span>
                      <div className="flex items-center gap-2">
                        <GatePassTypeBadge isInternal={pass.is_internal_request} />
                        {getStatusBadge(pass.status)}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="line-clamp-1">{pass.material_description}</span>
                    </div>

                    {pass.time_window_start && pass.time_window_end && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {pass.time_window_start} - {pass.time_window_end}
                        </span>
                      </div>
                    )}

                    {pass.vehicle_plate && (
                      <div className="flex items-center gap-2 text-sm">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <span>{pass.vehicle_plate}</span>
                        {pass.driver_name && <span>• {pass.driver_name}</span>}
                      </div>
                    )}

                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        {pass.is_internal_request 
                          ? t("gatePasses.internalRequest", "Internal Request")
                          : `${pass.project?.project_name} • ${pass.company?.company_name}`
                        }
                      </p>
                    </div>

                    {pass.entry_time && (
                      <div className="flex items-center gap-2 text-xs text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>
                          {t("gatePasses.entryAt", "Entry at")} {pass.entry_time}
                        </span>
                        {pass.exit_time && (
                          <span>• {t("gatePasses.exitAt", "Exit at")} {pass.exit_time}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <GatePassDetailDialog
        pass={selectedPass}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}

export default function DeptTodayPasses() {
  return (
    <MenuBasedAdminRoute menuCode="dept_gate_pass_today">
      <DeptTodayPassesContent />
    </MenuBasedAdminRoute>
  );
}

