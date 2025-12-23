import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Users, 
  Activity, 
  AlertTriangle,
  Lock,
  Smartphone,
  Globe,
  Clock
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface SecurityOverviewTabProps {
  tenantId: string | null;
}

export function SecurityOverviewTab({ tenantId }: SecurityOverviewTabProps) {
  const { t } = useTranslation();

  // Fetch security stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ["security-overview-stats", tenantId],
    queryFn: async () => {
      // Get MFA stats using database function (includes user count and MFA count)
      const { data: mfaStats } = await supabase
        .rpc("get_mfa_stats", { p_tenant_id: tenantId || undefined });

      const totalUsers = mfaStats?.[0]?.total_users || 0;
      const mfaEnabledCount = mfaStats?.[0]?.mfa_enabled_count || 0;
      const mfaAdoption = totalUsers ? Math.round((mfaEnabledCount / totalUsers) * 100) : 0;

      // Get active sessions count
      let activeSessions = 0;
      if (tenantId) {
        const result = await (supabase
          .from("user_sessions")
          .select("id", { count: "exact", head: true }) as any)
          .eq("is_valid", true)
          .eq("tenant_id", tenantId)
          .gt("expires_at", new Date().toISOString());
        activeSessions = result.count || 0;
      } else {
        const result = await (supabase
          .from("user_sessions")
          .select("id", { count: "exact", head: true }) as any)
          .eq("is_valid", true)
          .gt("expires_at", new Date().toISOString());
        activeSessions = result.count || 0;
      }

      // Get suspicious login count (last 24h)
      let suspiciousQuery = supabase
        .from("login_history")
        .select("id", { count: "exact" })
        .eq("is_suspicious", true)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const { count: suspiciousLogins } = await suspiciousQuery;

      // Get failed login count (last 24h)
      let failedQuery = supabase
        .from("login_history")
        .select("id", { count: "exact" })
        .eq("login_success", false)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const { count: failedLogins } = await failedQuery;

      // Get glass break status
      let glassBreakActive = false;
      if (tenantId) {
        const { data: tenant } = await supabase
          .from("tenants")
          .select("glass_break_active, glass_break_expires_at")
          .eq("id", tenantId)
          .single();

        glassBreakActive = tenant?.glass_break_active || false;
      }

      // Get emergency actions count (last 7 days)
      let emergencyQuery = supabase
        .from("system_emergency_actions")
        .select("id", { count: "exact" })
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (tenantId) {
        emergencyQuery = emergencyQuery.eq("tenant_id", tenantId);
      }

      const { count: emergencyActions } = await emergencyQuery;

      return {
        totalUsers,
        mfaEnabledCount,
        mfaAdoption,
        activeSessions: activeSessions || 0,
        suspiciousLogins: suspiciousLogins || 0,
        failedLogins: failedLogins || 0,
        glassBreakActive,
        emergencyActions: emergencyActions || 0,
      };
    },
    refetchInterval: 30000, // Refresh every 30s
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Glass Break Warning Banner */}
      {stats?.glassBreakActive && (
        <Card className="border-red-500 bg-red-50 dark:bg-red-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-8 w-8 text-red-600" />
              <div>
                <h3 className="font-bold text-red-600">
                  {t("security.glassBreakActiveWarning", "🔓 Glass Break Mode Active")}
                </h3>
                <p className="text-sm text-red-600/80">
                  {t("security.glassBreakActiveDescription", "Emergency access bypass is currently enabled. Security checks may be reduced.")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("security.totalUsers", "Total Users")}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {t("security.activeAccounts", "Active accounts")}
            </p>
          </CardContent>
        </Card>

        {/* Active Sessions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("security.activeSessions", "Active Sessions")}
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.activeSessions}</div>
            <p className="text-xs text-muted-foreground">
              {t("security.currentlyLoggedIn", "Currently logged in")}
            </p>
          </CardContent>
        </Card>

        {/* Suspicious Logins (24h) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("security.suspiciousLogins", "Suspicious Logins")}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(stats?.suspiciousLogins || 0) > 0 ? 'text-amber-600' : 'text-green-600'}`}>
              {stats?.suspiciousLogins}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("security.last24Hours", "Last 24 hours")}
            </p>
          </CardContent>
        </Card>

        {/* Failed Logins (24h) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("security.failedLogins", "Failed Logins")}
            </CardTitle>
            <ShieldAlert className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(stats?.failedLogins || 0) > 5 ? 'text-red-600' : 'text-muted-foreground'}`}>
              {stats?.failedLogins}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("security.last24Hours", "Last 24 hours")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* MFA Adoption Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {t("security.mfaAdoption", "MFA Adoption")}
          </CardTitle>
          <CardDescription>
            {t("security.mfaAdoptionDescription", "Percentage of users with Multi-Factor Authentication enabled")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats?.mfaAdoption}%</span>
              <Badge variant={stats?.mfaAdoption && stats.mfaAdoption >= 80 ? "default" : "destructive"}>
                {stats?.mfaEnabledCount} / {stats?.totalUsers} {t("security.users", "users")}
              </Badge>
            </div>
            <Progress value={stats?.mfaAdoption || 0} className="h-3" />
            <p className="text-sm text-muted-foreground">
              {stats?.mfaAdoption && stats.mfaAdoption < 80 
                ? t("security.mfaLowWarning", "Consider enforcing MFA for all users to improve security")
                : t("security.mfaGood", "Good MFA adoption rate")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Security Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-green-500" />
              {t("security.securityStatus", "Security Status")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {stats?.glassBreakActive ? (
                <Badge variant="destructive">
                  {t("security.emergencyMode", "Emergency Mode")}
                </Badge>
              ) : stats?.suspiciousLogins && stats.suspiciousLogins > 0 ? (
                <Badge variant="secondary">
                  {t("security.attentionNeeded", "Attention Needed")}
                </Badge>
              ) : (
                <Badge variant="default" className="bg-green-600">
                  {t("security.allClear", "All Clear")}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Emergency Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {t("security.recentEmergencyActions", "Emergency Actions (7d)")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats?.emergencyActions}</div>
          </CardContent>
        </Card>

        {/* Device Security */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              {t("security.deviceSecurity", "Device Security")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">
              <Globe className="h-3 w-3 me-1" />
              {t("security.ipValidationEnabled", "IP Validation Enabled")}
            </Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
