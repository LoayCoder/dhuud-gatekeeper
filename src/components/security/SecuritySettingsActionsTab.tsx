import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Loader2, 
  Settings, 
  ShieldOff, 
  Power, 
  KeyRound,
  AlertTriangle,
  Clock,
  ShieldCheck,
  CheckCircle
} from "lucide-react";
import { GlassBreakDialog } from "./GlassBreakDialog";
import { SystemShutdownDialog } from "./SystemShutdownDialog";
import { useSecurityEmergencyActions } from "@/hooks/use-security-emergency-actions";
import { format } from "date-fns";

interface SecuritySettingsActionsTabProps {
  tenantId: string | null;
}

export function SecuritySettingsActionsTab({ tenantId }: SecuritySettingsActionsTabProps) {
  const { t } = useTranslation();
  const [glassBreakDialogOpen, setGlassBreakDialogOpen] = useState(false);
  const [shutdownDialogOpen, setShutdownDialogOpen] = useState(false);

  const {
    activateGlassBreak,
    deactivateGlassBreak,
    systemShutdown,
  } = useSecurityEmergencyActions();

  // Fetch tenant settings and status
  const { data: tenantData, isLoading } = useQuery({
    queryKey: ["tenant-security-settings", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data: tenant, error } = await supabase
        .from("tenants")
        .select("id, name, glass_break_active, glass_break_expires_at, system_shutdown_at, system_shutdown_reason")
        .eq("id", tenantId)
        .single();

      if (error) throw error;

      // Get active sessions count
      const { count: sessionCount } = await supabase
        .from("user_sessions")
        .select("id", { count: "exact" })
        .eq("tenant_id", tenantId)
        .eq("is_valid", true);

      // Get recent emergency actions
      const { data: recentActions } = await supabase
        .from("system_emergency_actions")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(5);

      return {
        ...tenant,
        activeSessionsCount: sessionCount || 0,
        recentActions: recentActions || [],
      };
    },
    enabled: !!tenantId,
  });

  const handleGlassBreakConfirm = async (reason: string, duration: number) => {
    if (!tenantId) return;
    await activateGlassBreak.mutateAsync({
      tenantId,
      reason,
      durationMinutes: duration,
    });
    setGlassBreakDialogOpen(false);
  };

  const handleDeactivateGlassBreak = async () => {
    if (!tenantId) return;
    await deactivateGlassBreak.mutateAsync({ tenantId });
  };

  const handleShutdownConfirm = async (reason: string) => {
    if (!tenantId) return;
    await systemShutdown.mutateAsync({ tenantId, reason });
    setShutdownDialogOpen(false);
  };

  if (!tenantId) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t("security.selectTenantFirst", "Please select a tenant to manage security settings")}</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            {t("security.currentStatus", "Current Status")}
          </CardTitle>
          <CardDescription>
            {t("security.securityStatusFor", "Security status for")} <strong>{tenantData?.name}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Glass Break Status */}
            <div className="p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{t("security.glassBreak", "Glass Break")}</span>
                {tenantData?.glass_break_active ? (
                  <Badge variant="destructive">🔓 {t("security.active", "Active")}</Badge>
                ) : (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <CheckCircle className="h-3 w-3 me-1" />
                    {t("security.inactive", "Inactive")}
                  </Badge>
                )}
              </div>
              {tenantData?.glass_break_active && tenantData?.glass_break_expires_at && (
                <p className="text-xs text-muted-foreground">
                  {t("security.expiresAt", "Expires")}: {format(new Date(tenantData.glass_break_expires_at), "MMM dd, HH:mm")}
                </p>
              )}
            </div>

            {/* Active Sessions */}
            <div className="p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{t("security.activeSessions", "Active Sessions")}</span>
                <Badge variant="secondary">{tenantData?.activeSessionsCount}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("security.currentlyLoggedIn", "Users currently logged in")}
              </p>
            </div>

            {/* Last Shutdown */}
            <div className="p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{t("security.lastShutdown", "Last Shutdown")}</span>
              </div>
              {tenantData?.system_shutdown_at ? (
                <p className="text-xs text-muted-foreground">
                  {format(new Date(tenantData.system_shutdown_at), "MMM dd, yyyy HH:mm")}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">{t("common.never", "Never")}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Actions */}
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            {t("security.emergencyActions", "Emergency Actions")}
          </CardTitle>
          <CardDescription>
            {t("security.emergencyActionsDescription", "Critical security actions for emergency situations. Use with caution.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Glass Break */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200">
            <div>
              <h4 className="font-medium flex items-center gap-2">
                <ShieldOff className="h-4 w-4" />
                {t("security.glassBreak", "Glass Break")}
              </h4>
              <p className="text-sm text-muted-foreground">
                {t("security.glassBreakDescription", "Temporarily bypass security checks for emergency access")}
              </p>
            </div>
            {tenantData?.glass_break_active ? (
              <Button
                variant="outline"
                className="border-green-600 text-green-600 hover:bg-green-50"
                onClick={handleDeactivateGlassBreak}
                disabled={deactivateGlassBreak.isPending}
              >
                {deactivateGlassBreak.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                🔒 {t("security.deactivate", "Deactivate")}
              </Button>
            ) : (
              <Button
                variant="outline"
                className="border-amber-600 text-amber-600 hover:bg-amber-50"
                onClick={() => setGlassBreakDialogOpen(true)}
              >
                🔓 {t("security.activate", "Activate")}
              </Button>
            )}
          </div>

          <Separator />

          {/* System Shutdown */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200">
            <div>
              <h4 className="font-medium flex items-center gap-2 text-red-600">
                <Power className="h-4 w-4" />
                {t("security.systemShutdown", "System Shutdown")}
              </h4>
              <p className="text-sm text-muted-foreground">
                {t("security.systemShutdownDescription", "Immediately terminate all active sessions")}
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setShutdownDialogOpen(true)}
              disabled={systemShutdown.isPending || (tenantData?.activeSessionsCount || 0) === 0}
            >
              {systemShutdown.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              <Power className="h-4 w-4 me-2" />
              {t("security.shutdown", "Shutdown")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Emergency Actions */}
      {tenantData?.recentActions && tenantData.recentActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t("security.recentEmergencyActions", "Recent Emergency Actions")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tenantData.recentActions.map((action: any) => (
                <div key={action.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant={action.action_type.includes("shutdown") ? "destructive" : "secondary"}>
                        {action.action_type.replace(/_/g, " ")}
                      </Badge>
                      {action.affected_users_count > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ({action.affected_users_count} {t("security.usersAffected", "users affected")})
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{action.reason}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(action.created_at), "MMM dd, HH:mm")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <GlassBreakDialog
        open={glassBreakDialogOpen}
        onOpenChange={setGlassBreakDialogOpen}
        onConfirm={handleGlassBreakConfirm}
        isLoading={activateGlassBreak.isPending}
        tenantName={tenantData?.name || ""}
      />

      <SystemShutdownDialog
        open={shutdownDialogOpen}
        onOpenChange={setShutdownDialogOpen}
        onConfirm={handleShutdownConfirm}
        isLoading={systemShutdown.isPending}
        tenantName={tenantData?.name || ""}
        activeSessionsCount={tenantData?.activeSessionsCount || 0}
      />
    </div>
  );
}
