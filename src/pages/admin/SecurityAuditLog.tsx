import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Shield, Search, Eye, AlertTriangle, Lock, UserPlus, UserMinus, UserCheck, UserX, Pencil, Users, KeyRound, LogIn, LogOut, ShieldCheck, ShieldOff, ShieldAlert, Clock, MapPin, Smartphone, Globe, Wifi, LayoutDashboard, Monitor, Settings } from "lucide-react";
import { format } from "date-fns";
import { useCursorPagination, CursorPosition, buildCursorCondition } from "@/hooks/use-cursor-pagination";
import { CursorPagination } from "@/components/ui/cursor-pagination";
import { toast } from "@/hooks/use-toast";
import { TenantSecuritySelector } from "@/components/security/TenantSecuritySelector";
import { SecurityOverviewTab } from "@/components/security/SecurityOverviewTab";
import { ActiveSessionsTab } from "@/components/security/ActiveSessionsTab";
import { SecuritySettingsActionsTab } from "@/components/security/SecuritySettingsActionsTab";

interface ActivityLog {
  id: string;
  user_id: string;
  event_type: string;
  metadata: {
    sensitive_data_access?: boolean;
    access_type?: string;
    target_user_id?: string;
    target_visitor_id?: string;
    target_tenant_id?: string;
    access_granted?: boolean;
    reason?: string;
    timestamp?: string;
    target_user_name?: string;
    target_user_email?: string;
    changes?: Record<string, { from: unknown; to: unknown }>;
    ip_address?: string;
    user_agent?: string;
    risk_score?: number;
    risk_factors?: string[];
    is_suspicious?: boolean;
    is_new_device?: boolean;
    is_new_location?: boolean;
    country?: string;
    city?: string;
    login_success?: boolean;
    failure_reason?: string;
    device_fingerprint?: string;
  } | null;
  session_duration_seconds?: number | null;
  created_at: string;
  user_name?: string | null;
  ip_address?: string | null;
}

interface LoginHistoryRecord {
  id: string;
  user_id: string;
  email: string;
  ip_address: string | null;
  country_code: string | null;
  country_name: string | null;
  city: string | null;
  region: string | null;
  isp: string | null;
  is_vpn: boolean;
  is_proxy: boolean;
  device_fingerprint: string | null;
  user_agent: string | null;
  platform: string | null;
  browser: string | null;
  risk_score: number;
  risk_factors: string[];
  is_suspicious: boolean;
  is_new_device: boolean;
  is_new_location: boolean;
  login_success: boolean;
  failure_reason: string | null;
  created_at: string;
  user_name?: string | null;
}

const accessTypeLabels: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  profile_phone_viewed: { label: "Phone Number", icon: <Eye className="h-3 w-3" />, variant: "secondary" },
  profile_emergency_contact_viewed: { label: "Emergency Contact", icon: <Eye className="h-3 w-3" />, variant: "secondary" },
  visitor_national_id_viewed: { label: "Visitor National ID", icon: <AlertTriangle className="h-3 w-3" />, variant: "destructive" },
  blacklist_entry_viewed: { label: "Blacklist Entry", icon: <AlertTriangle className="h-3 w-3" />, variant: "destructive" },
  tenant_billing_viewed: { label: "Tenant Billing", icon: <Lock className="h-3 w-3" />, variant: "outline" },
  invitation_code_viewed: { label: "Invitation Code", icon: <Lock className="h-3 w-3" />, variant: "outline" },
};

const userEventLabels: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  user_created: { label: "User Created", icon: <UserPlus className="h-3 w-3" />, variant: "default" },
  user_updated: { label: "User Updated", icon: <Pencil className="h-3 w-3" />, variant: "secondary" },
  user_deactivated: { label: "User Deactivated", icon: <UserX className="h-3 w-3" />, variant: "destructive" },
  user_activated: { label: "User Activated", icon: <UserCheck className="h-3 w-3" />, variant: "default" },
  user_deleted: { label: "User Deleted", icon: <UserMinus className="h-3 w-3" />, variant: "destructive" },
};

const securityEventLabels: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  login: { label: "Login", icon: <LogIn className="h-3 w-3" />, variant: "default" },
  logout: { label: "Logout", icon: <LogOut className="h-3 w-3" />, variant: "secondary" },
  session_timeout: { label: "Session Timeout", icon: <Clock className="h-3 w-3" />, variant: "outline" },
  session_extended: { label: "Session Extended", icon: <Clock className="h-3 w-3" />, variant: "secondary" },
  mfa_enabled: { label: "MFA Enabled", icon: <ShieldCheck className="h-3 w-3" />, variant: "default" },
  mfa_disabled: { label: "MFA Disabled", icon: <ShieldOff className="h-3 w-3" />, variant: "destructive" },
  mfa_verification_failed: { label: "MFA Failed", icon: <ShieldAlert className="h-3 w-3" />, variant: "destructive" },
  backup_code_used: { label: "Backup Code Used", icon: <KeyRound className="h-3 w-3" />, variant: "destructive" },
};

const USER_MANAGEMENT_EVENTS = ['user_created', 'user_updated', 'user_deactivated', 'user_activated', 'user_deleted'] as const;
const SECURITY_EVENTS = ['login', 'logout', 'session_timeout', 'session_extended', 'mfa_enabled', 'mfa_disabled', 'mfa_verification_failed', 'backup_code_used'] as const;

function getRiskBadgeVariant(riskScore: number): "default" | "secondary" | "destructive" | "outline" {
  if (riskScore >= 75) return "destructive";
  if (riskScore >= 50) return "secondary";
  return "outline";
}

function getRiskColor(riskScore: number): string {
  if (riskScore >= 75) return "text-red-600";
  if (riskScore >= 50) return "text-amber-600";
  if (riskScore >= 25) return "text-yellow-600";
  return "text-green-600";
}

export default function SecurityAuditLog() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [searchQuery, setSearchQuery] = useState("");
  const [accessTypeFilter, setAccessTypeFilter] = useState<string>("all");
  const [userEventFilter, setUserEventFilter] = useState<string>("all");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [securityEventFilter, setSecurityEventFilter] = useState<string>("all");
  const [securitySearchQuery, setSecuritySearchQuery] = useState("");
  const [suspiciousSearchQuery, setSuspiciousSearchQuery] = useState("");
  const [suspiciousFilter, setSuspiciousFilter] = useState<string>("all");
  const [loginHistory, setLoginHistory] = useState<LoginHistoryRecord[]>([]);
  const [loginHistoryLoading, setLoginHistoryLoading] = useState(true);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  const PAGE_SIZE = 50;

  // Helper to enrich logs with user names
  const enrichLogsWithUserNames = async (logs: Array<{ id: string; user_id: string; event_type: string; metadata: unknown; created_at: string; ip_address?: string | null }>) => {
    if (logs.length === 0) return [];
    const userIds = [...new Set(logs.map(log => log.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

    return logs.map(log => ({
      ...log,
      user_name: profileMap.get(log.user_id) || null,
      metadata: log.metadata as ActivityLog["metadata"],
    })) as ActivityLog[];
  };

  // Fetch login history with suspicious activity
  const fetchLoginHistory = useCallback(async () => {
    setLoginHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from("login_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Enrich with user names
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(d => d.user_id).filter(Boolean))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

        setLoginHistory(data.map(d => ({
          ...d,
          risk_factors: d.risk_factors as string[] || [],
          user_name: profileMap.get(d.user_id) || null,
        })));
      } else {
        setLoginHistory([]);
      }
    } catch (error) {
      console.error("Failed to fetch login history:", error);
    } finally {
      setLoginHistoryLoading(false);
    }
  }, []);

  // Initial fetch and realtime subscription for login_history
  useEffect(() => {
    fetchLoginHistory();

    if (realtimeEnabled) {
      const channel = supabase
        .channel('login-history-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'login_history',
          },
          async (payload) => {
            console.log('New login history entry:', payload);
            
            // Fetch user name for the new entry
            const newEntry = payload.new as LoginHistoryRecord;
            if (newEntry.user_id) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", newEntry.user_id)
                .single();
              
              newEntry.user_name = profile?.full_name || null;
            }
            newEntry.risk_factors = (newEntry.risk_factors as string[]) || [];

            setLoginHistory(prev => [newEntry, ...prev.slice(0, 99)]);
            
            // Show toast for suspicious logins
            if (newEntry.is_suspicious) {
              toast({
                title: t("securityAudit.suspiciousLoginAlert", "Suspicious Login Alert"),
                description: `${newEntry.email} - Risk Score: ${newEntry.risk_score}`,
                variant: "destructive",
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [fetchLoginHistory, realtimeEnabled, t]);

  // Cursor pagination for security events
  const securityEventsQueryFn = useCallback(async (cursor?: CursorPosition) => {
    let query = supabase
      .from("user_activity_logs")
      .select("id, user_id, event_type, metadata, created_at, ip_address", { count: 'estimated' })
      .in("event_type", [...SECURITY_EVENTS]);

    const cursorCondition = buildCursorCondition(cursor, 'created_at', false);
    if (cursorCondition) {
      query = query.or(cursorCondition);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(PAGE_SIZE + 1);

    if (error) throw error;
    const enriched = await enrichLogsWithUserNames(data || []);
    return { data: enriched, count };
  }, []);

  const {
    data: securityEventLogs,
    isLoading: isSecurityLoading,
    hasNextPage: securityHasNext,
    hasPreviousPage: securityHasPrev,
    goToNextPage: securityNextPage,
    goToPreviousPage: securityPrevPage,
    goToFirstPage: securityFirstPage,
    totalEstimate: securityTotal,
    currentPage: securityPage,
  } = useCursorPagination<ActivityLog>({
    queryFn: securityEventsQueryFn,
    pageSize: PAGE_SIZE,
  });

  // Cursor pagination for user management logs
  const userMgmtQueryFn = useCallback(async (cursor?: CursorPosition) => {
    let query = supabase
      .from("user_activity_logs")
      .select("id, user_id, event_type, metadata, created_at", { count: 'estimated' })
      .in("event_type", [...USER_MANAGEMENT_EVENTS]);

    const cursorCondition = buildCursorCondition(cursor, 'created_at', false);
    if (cursorCondition) {
      query = query.or(cursorCondition);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(PAGE_SIZE + 1);

    if (error) throw error;
    const enriched = await enrichLogsWithUserNames(data || []);
    return { data: enriched, count };
  }, []);

  const {
    data: userManagementLogs,
    isLoading: isUserMgmtLoading,
    hasNextPage: userMgmtHasNext,
    hasPreviousPage: userMgmtHasPrev,
    goToNextPage: userMgmtNextPage,
    goToPreviousPage: userMgmtPrevPage,
    goToFirstPage: userMgmtFirstPage,
    totalEstimate: userMgmtTotal,
    currentPage: userMgmtPage,
  } = useCursorPagination<ActivityLog>({
    queryFn: userMgmtQueryFn,
    pageSize: PAGE_SIZE,
  });

  // Cursor pagination for sensitive data access logs
  const sensitiveQueryFn = useCallback(async (cursor?: CursorPosition) => {
    let query = supabase
      .from("user_activity_logs")
      .select("id, user_id, event_type, metadata, created_at", { count: 'estimated' })
      .filter('metadata->>sensitive_data_access', 'eq', 'true');

    const cursorCondition = buildCursorCondition(cursor, 'created_at', false);
    if (cursorCondition) {
      query = query.or(cursorCondition);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(PAGE_SIZE + 1);

    if (error) throw error;
    const enriched = await enrichLogsWithUserNames(data || []);
    return { data: enriched, count };
  }, []);

  const {
    data: sensitiveDataLogs,
    isLoading: isSensitiveLoading,
    hasNextPage: sensitiveHasNext,
    hasPreviousPage: sensitiveHasPrev,
    goToNextPage: sensitiveNextPage,
    goToPreviousPage: sensitivePrevPage,
    goToFirstPage: sensitiveFirstPage,
    totalEstimate: sensitiveTotal,
    currentPage: sensitivePage,
  } = useCursorPagination<ActivityLog>({
    queryFn: sensitiveQueryFn,
    pageSize: PAGE_SIZE,
  });

  // Filter sensitive data logs
  const filteredSensitiveLogs = sensitiveDataLogs?.filter(log => {
    const matchesSearch = searchQuery === "" || 
      log.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.metadata?.access_type?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = accessTypeFilter === "all" || 
      log.metadata?.access_type === accessTypeFilter;
    
    return matchesSearch && matchesType;
  });

  // Filter user management logs
  const filteredUserMgmtLogs = userManagementLogs?.filter(log => {
    const matchesSearch = userSearchQuery === "" || 
      log.user_name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      log.metadata?.target_user_name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      log.metadata?.target_user_email?.toLowerCase().includes(userSearchQuery.toLowerCase());
    
    const matchesType = userEventFilter === "all" || log.event_type === userEventFilter;
    
    return matchesSearch && matchesType;
  });

  // Filter security event logs
  const filteredSecurityLogs = securityEventLogs?.filter(log => {
    const matchesSearch = securitySearchQuery === "" || 
      log.user_name?.toLowerCase().includes(securitySearchQuery.toLowerCase());
    
    const matchesType = securityEventFilter === "all" || log.event_type === securityEventFilter;
    
    return matchesSearch && matchesType;
  });

  // Filter login history
  const filteredLoginHistory = loginHistory.filter(log => {
    const matchesSearch = suspiciousSearchQuery === "" || 
      log.email?.toLowerCase().includes(suspiciousSearchQuery.toLowerCase()) ||
      log.user_name?.toLowerCase().includes(suspiciousSearchQuery.toLowerCase()) ||
      log.city?.toLowerCase().includes(suspiciousSearchQuery.toLowerCase()) ||
      log.country_name?.toLowerCase().includes(suspiciousSearchQuery.toLowerCase());
    
    let matchesFilter = true;
    if (suspiciousFilter === "suspicious") {
      matchesFilter = log.is_suspicious;
    } else if (suspiciousFilter === "new_device") {
      matchesFilter = log.is_new_device;
    } else if (suspiciousFilter === "new_location") {
      matchesFilter = log.is_new_location;
    } else if (suspiciousFilter === "failed") {
      matchesFilter = !log.login_success;
    } else if (suspiciousFilter === "vpn") {
      matchesFilter = log.is_vpn || log.is_proxy;
    }
    
    return matchesSearch && matchesFilter;
  });

  const accessTypes = sensitiveDataLogs 
    ? [...new Set(sensitiveDataLogs.map(log => log.metadata?.access_type).filter(Boolean))]
    : [];

  const formatChanges = (changes: Record<string, { from: unknown; to: unknown }> | undefined) => {
    if (!changes || Object.keys(changes).length === 0) return "—";
    return Object.entries(changes)
      .map(([key, { from, to }]) => `${key}: ${String(from) || '(empty)'} → ${String(to) || '(empty)'}`)
      .join(", ");
  };

  const textAlign = 'text-start';

  // Calculate suspicious activity stats
  const suspiciousStats = {
    total: loginHistory.length,
    suspicious: loginHistory.filter(l => l.is_suspicious).length,
    failed: loginHistory.filter(l => !l.login_success).length,
    newDevices: loginHistory.filter(l => l.is_new_device).length,
    vpnProxy: loginHistory.filter(l => l.is_vpn || l.is_proxy).length,
  };

  return (
    <div className="container max-w-7xl py-8 space-y-8" dir={direction}>
      {/* Header */}
      <div className="text-start">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          {t("securityAudit.title", "Security Audit Log")}
        </h1>
        <p className="text-muted-foreground">
          {t("securityAudit.description", "Monitor and review security events and user management activities")}
        </p>
        {realtimeEnabled && (
          <Badge variant="outline" className="mt-2 gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            {t("securityAudit.realtime", "Real-time updates enabled")}
          </Badge>
        )}
      </div>

      {/* Tenant Selector */}
      <div className="flex items-center justify-between">
        <TenantSecuritySelector 
          selectedTenantId={selectedTenantId} 
          onTenantChange={setSelectedTenantId} 
        />
        {realtimeEnabled && (
          <Badge variant="outline" className="gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            {t("securityAudit.realtime", "Real-time updates enabled")}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="overview" className="space-y-6" dir={direction}>
        <div className="flex justify-start overflow-x-auto">
          <TabsList className="flex flex-wrap h-auto gap-1 w-full max-w-5xl">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              {t("securityAudit.overview", "Overview")}
            </TabsTrigger>
            <TabsTrigger value="suspicious-activity" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {t("securityAudit.suspiciousActivity", "Suspicious Activity")}
              {suspiciousStats.suspicious > 0 && (
                <Badge variant="destructive" className="ms-1">{suspiciousStats.suspicious}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="active-sessions" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              {t("securityAudit.activeSessions", "Active Sessions")}
            </TabsTrigger>
            <TabsTrigger value="security-events" className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              {t("securityAudit.securityEvents", "Security Events")}
            </TabsTrigger>
            <TabsTrigger value="user-management" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t("securityAudit.userManagement", "User Management")}
            </TabsTrigger>
            <TabsTrigger value="sensitive-access" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              {t("securityAudit.sensitiveAccess", "Data Access")}
            </TabsTrigger>
            <TabsTrigger value="settings-actions" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              {t("securityAudit.settingsActions", "Settings & Actions")}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <SecurityOverviewTab tenantId={selectedTenantId} />
        </TabsContent>

        {/* Active Sessions Tab */}
        <TabsContent value="active-sessions">
          <ActiveSessionsTab tenantId={selectedTenantId} />
        </TabsContent>

        {/* Suspicious Activity Tab (NEW) */}
        <TabsContent value="suspicious-activity">
          <Card>
            <CardHeader className="text-start">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                {t("securityAudit.suspiciousActivityTitle", "Suspicious Login Activity")}
              </CardTitle>
              <CardDescription>
                {t("securityAudit.suspiciousActivityDescription", "Monitor failed logins, new devices, unusual locations, and VPN/proxy usage")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute top-3 start-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("securityAudit.searchByEmailLocation", "Search by email or location...")}
                    value={suspiciousSearchQuery}
                    onChange={(e) => setSuspiciousSearchQuery(e.target.value)}
                    className="ps-10"
                  />
                </div>
                <Select value={suspiciousFilter} onValueChange={setSuspiciousFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder={t("securityAudit.filterByType", "Filter by type")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.all", "All Logins")}</SelectItem>
                    <SelectItem value="suspicious">{t("securityAudit.suspicious", "Suspicious Only")}</SelectItem>
                    <SelectItem value="failed">{t("securityAudit.failedOnly", "Failed Only")}</SelectItem>
                    <SelectItem value="new_device">{t("securityAudit.newDevice", "New Device")}</SelectItem>
                    <SelectItem value="new_location">{t("securityAudit.newLocation", "New Location")}</SelectItem>
                    <SelectItem value="vpn">{t("securityAudit.vpnProxy", "VPN/Proxy")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <Card>
                  <CardContent className={`pt-4 ${textAlign}`}>
                    <div className="text-2xl font-bold">{suspiciousStats.total}</div>
                    <p className="text-xs text-muted-foreground">
                      {t("securityAudit.totalLogins", "Total Logins")}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className={`pt-4 ${textAlign}`}>
                    <div className="text-2xl font-bold text-red-600">{suspiciousStats.suspicious}</div>
                    <p className="text-xs text-muted-foreground">
                      {t("securityAudit.suspicious", "Suspicious")}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className={`pt-4 ${textAlign}`}>
                    <div className="text-2xl font-bold text-amber-600">{suspiciousStats.failed}</div>
                    <p className="text-xs text-muted-foreground">
                      {t("securityAudit.failed", "Failed")}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className={`pt-4 ${textAlign}`}>
                    <div className="text-2xl font-bold text-blue-600">{suspiciousStats.newDevices}</div>
                    <p className="text-xs text-muted-foreground">
                      {t("securityAudit.newDevices", "New Devices")}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className={`pt-4 ${textAlign}`}>
                    <div className="text-2xl font-bold text-purple-600">{suspiciousStats.vpnProxy}</div>
                    <p className="text-xs text-muted-foreground">
                      {t("securityAudit.vpnProxy", "VPN/Proxy")}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Login History Table */}
              {loginHistoryLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredLoginHistory.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className={textAlign}>{t("securityAudit.timestamp", "Timestamp")}</TableHead>
                        <TableHead className={textAlign}>{t("securityAudit.user", "User")}</TableHead>
                        <TableHead className={textAlign}>{t("securityAudit.status", "Status")}</TableHead>
                        <TableHead className={textAlign}>{t("securityAudit.riskScore", "Risk")}</TableHead>
                        <TableHead className={textAlign}>{t("securityAudit.location", "Location")}</TableHead>
                        <TableHead className={textAlign}>{t("securityAudit.device", "Device")}</TableHead>
                        <TableHead className={textAlign}>{t("securityAudit.flags", "Flags")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLoginHistory.map((log) => (
                        <TableRow key={log.id} className={log.is_suspicious ? "bg-red-50 dark:bg-red-900/10" : ""}>
                          <TableCell className={`font-mono text-sm whitespace-nowrap ${textAlign}`}>
                            {format(new Date(log.created_at), "MMM dd, HH:mm:ss")}
                          </TableCell>
                          <TableCell className={textAlign}>
                            <div className="flex flex-col">
                              <span className="font-medium">{log.user_name || log.email}</span>
                              {log.user_name && (
                                <span className="text-xs text-muted-foreground">{log.email}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className={textAlign}>
                            {log.login_success ? (
                              <Badge variant="outline" className="text-green-600 border-green-600 gap-1">
                                <LogIn className="h-3 w-3" />
                                {t("securityAudit.success", "Success")}
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {t("securityAudit.failed", "Failed")}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className={textAlign}>
                            <div className="flex items-center gap-2">
                              <span className={`font-bold ${getRiskColor(log.risk_score)}`}>
                                {log.risk_score}
                              </span>
                              {log.risk_score >= 50 && (
                                <AlertTriangle className={`h-4 w-4 ${log.risk_score >= 75 ? 'text-red-500' : 'text-amber-500'}`} />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className={textAlign}>
                            <div className="flex items-center gap-1 text-sm">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span>{log.city || 'Unknown'}, {log.country_code || '??'}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {log.ip_address || 'No IP'}
                            </div>
                          </TableCell>
                          <TableCell className={textAlign}>
                            <div className="flex items-center gap-1 text-sm">
                              <Smartphone className="h-3 w-3 text-muted-foreground" />
                              <span>{log.browser || 'Unknown'}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {log.platform || 'Unknown OS'}
                            </div>
                          </TableCell>
                          <TableCell className={textAlign}>
                            <div className="flex flex-wrap gap-1">
                              {log.is_suspicious && (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertTriangle className="h-3 w-3 me-1" />
                                  {t("securityAudit.suspicious", "Suspicious")}
                                </Badge>
                              )}
                              {log.is_new_device && (
                                <Badge variant="secondary" className="text-xs">
                                  <Smartphone className="h-3 w-3 me-1" />
                                  {t("securityAudit.newDevice", "New Device")}
                                </Badge>
                              )}
                              {log.is_new_location && (
                                <Badge variant="secondary" className="text-xs">
                                  <Globe className="h-3 w-3 me-1" />
                                  {t("securityAudit.newLocation", "New Location")}
                                </Badge>
                              )}
                              {(log.is_vpn || log.is_proxy) && (
                                <Badge variant="outline" className="text-xs text-purple-600">
                                  <Wifi className="h-3 w-3 me-1" />
                                  VPN/Proxy
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t("securityAudit.noSuspiciousActivity", "No login activity found")}</p>
                  <p className="text-sm mt-1">
                    {t("securityAudit.noSuspiciousActivityDescription", "Login attempts with risk assessment will appear here")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Events Tab (Login, MFA, Backup Codes) */}
        <TabsContent value="security-events">
          <Card>
            <CardHeader className="text-start">
              <CardTitle>{t("securityAudit.securityEventsTitle", "Security Events")}</CardTitle>
              <CardDescription>
                {t("securityAudit.securityEventsDescription", "Track logins, MFA events, and backup code usage")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute top-3 start-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("securityAudit.searchUserPlaceholder", "Search by user...")}
                    value={securitySearchQuery}
                    onChange={(e) => setSecuritySearchQuery(e.target.value)}
                    className="ps-10"
                  />
                </div>
                <Select value={securityEventFilter} onValueChange={setSecurityEventFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder={t("securityAudit.filterByEvent", "Filter by event")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.all", "All Events")}</SelectItem>
                    {SECURITY_EVENTS.map((event) => (
                      <SelectItem key={event} value={event}>
                        {securityEventLabels[event]?.label || event}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className={`pt-4 ${textAlign}`}>
                    <div className="text-2xl font-bold">{securityEventLogs?.length || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {t("securityAudit.totalEvents", "Total Events")}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className={`pt-4 ${textAlign}`}>
                    <div className="text-2xl font-bold text-green-600">
                      {securityEventLogs?.filter(l => l.event_type === 'login').length || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("securityAudit.logins", "Logins")}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className={`pt-4 ${textAlign}`}>
                    <div className="text-2xl font-bold text-amber-600">
                      {securityEventLogs?.filter(l => l.event_type === 'backup_code_used').length || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("securityAudit.backupCodesUsed", "Backup Codes Used")}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className={`pt-4 ${textAlign}`}>
                    <div className="text-2xl font-bold text-red-600">
                      {securityEventLogs?.filter(l => l.event_type === 'mfa_verification_failed').length || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("securityAudit.mfaFailed", "MFA Failed")}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Security Events Table */}
              {isSecurityLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredSecurityLogs && filteredSecurityLogs.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className={textAlign}>{t("securityAudit.timestamp", "Timestamp")}</TableHead>
                        <TableHead className={textAlign}>{t("securityAudit.user", "User")}</TableHead>
                        <TableHead className={textAlign}>{t("securityAudit.event", "Event")}</TableHead>
                        <TableHead className={textAlign}>{t("securityAudit.details", "Details")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSecurityLogs.map((log) => {
                        const eventInfo = securityEventLabels[log.event_type] || {
                          label: log.event_type,
                          icon: <Shield className="h-3 w-3" />,
                          variant: "default" as const,
                        };
                        
                        return (
                          <TableRow key={log.id}>
                            <TableCell className={`font-mono text-sm whitespace-nowrap ${textAlign}`}>
                              {format(new Date(log.created_at), "MMM dd, yyyy HH:mm:ss")}
                            </TableCell>
                            <TableCell className={textAlign}>
                              {log.user_name || t("common.unknown", "Unknown")}
                            </TableCell>
                            <TableCell className={textAlign}>
                              <Badge variant={eventInfo.variant} className="gap-1">
                                {eventInfo.icon}
                                {eventInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell className={`text-sm text-muted-foreground ${textAlign}`}>
                              {log.ip_address && (
                                <span className="me-2">IP: {log.ip_address}</span>
                              )}
                              {log.metadata?.ip_address && (
                                <span className="me-2">IP: {log.metadata.ip_address}</span>
                              )}
                              {log.session_duration_seconds && (
                                <span>Duration: {Math.round(log.session_duration_seconds / 60)}min</span>
                              )}
                              {!log.ip_address && !log.metadata?.ip_address && !log.session_duration_seconds && "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <CursorPagination
                    currentPage={securityPage}
                    hasNextPage={securityHasNext}
                    hasPreviousPage={securityHasPrev}
                    isLoading={isSecurityLoading}
                    onNextPage={securityNextPage}
                    onPreviousPage={securityPrevPage}
                    onFirstPage={securityFirstPage}
                    totalEstimate={securityTotal}
                    pageSize={PAGE_SIZE}
                  />
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <ShieldCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t("securityAudit.noSecurityLogs", "No security events found")}</p>
                  <p className="text-sm mt-1">
                    {t("securityAudit.noSecurityLogsDescription", "Login, MFA, and backup code events will appear here")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Management Tab */}
        <TabsContent value="user-management">
          <Card>
            <CardHeader className={textAlign}>
              <CardTitle>{t("securityAudit.userActivityLog", "User Activity Log")}</CardTitle>
              <CardDescription>
                {t("securityAudit.userActivityDescription", "Track user creation, updates, activation, and deactivation events")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute top-3 start-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("securityAudit.searchUserPlaceholder", "Search by admin or target user...")}
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="ps-10"
                  />
                </div>
                <Select value={userEventFilter} onValueChange={setUserEventFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder={t("securityAudit.filterByEvent", "Filter by event")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.all", "All Events")}</SelectItem>
                    {USER_MANAGEMENT_EVENTS.map((event) => (
                      <SelectItem key={event} value={event}>
                        {userEventLabels[event]?.label || event}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <Card>
                  <CardContent className={`pt-4 ${textAlign}`}>
                    <div className="text-2xl font-bold">{userManagementLogs?.length || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {t("securityAudit.totalEvents", "Total Events")}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className={`pt-4 ${textAlign}`}>
                    <div className="text-2xl font-bold text-green-600">
                      {userManagementLogs?.filter(l => l.event_type === 'user_created').length || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("securityAudit.created", "Created")}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className={`pt-4 ${textAlign}`}>
                    <div className="text-2xl font-bold text-blue-600">
                      {userManagementLogs?.filter(l => l.event_type === 'user_updated').length || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("securityAudit.updated", "Updated")}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className={`pt-4 ${textAlign}`}>
                    <div className="text-2xl font-bold text-amber-600">
                      {userManagementLogs?.filter(l => l.event_type === 'user_activated').length || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("securityAudit.activated", "Activated")}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className={`pt-4 ${textAlign}`}>
                    <div className="text-2xl font-bold text-red-600">
                      {userManagementLogs?.filter(l => l.event_type === 'user_deactivated').length || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("securityAudit.deactivated", "Deactivated")}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* User Management Logs Table */}
              {isUserMgmtLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredUserMgmtLogs && filteredUserMgmtLogs.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className={textAlign}>{t("securityAudit.timestamp", "Timestamp")}</TableHead>
                        <TableHead className={textAlign}>{t("securityAudit.performedBy", "Performed By")}</TableHead>
                        <TableHead className={textAlign}>{t("securityAudit.action", "Action")}</TableHead>
                        <TableHead className={textAlign}>{t("securityAudit.targetUser", "Target User")}</TableHead>
                        <TableHead className={textAlign}>{t("securityAudit.changes", "Changes")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUserMgmtLogs.map((log) => {
                        const eventInfo = userEventLabels[log.event_type] || {
                          label: log.event_type,
                          icon: <Users className="h-3 w-3" />,
                          variant: "default" as const,
                        };
                        
                        return (
                          <TableRow key={log.id}>
                            <TableCell className={`font-mono text-sm whitespace-nowrap ${textAlign}`}>
                              {format(new Date(log.created_at), "MMM dd, yyyy HH:mm:ss")}
                            </TableCell>
                            <TableCell className={textAlign}>
                              {log.user_name || t("common.unknown", "Unknown")}
                            </TableCell>
                            <TableCell className={textAlign}>
                              <Badge variant={eventInfo.variant} className="gap-1">
                                {eventInfo.icon}
                                {eventInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell className={textAlign}>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {log.metadata?.target_user_name || "—"}
                                </span>
                                {log.metadata?.target_user_email && (
                                  <span className="text-xs text-muted-foreground">
                                    {log.metadata.target_user_email}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className={`text-sm text-muted-foreground max-w-[300px] ${textAlign}`}>
                              <span className="line-clamp-2" title={formatChanges(log.metadata?.changes)}>
                                {formatChanges(log.metadata?.changes)}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <CursorPagination
                    currentPage={userMgmtPage}
                    hasNextPage={userMgmtHasNext}
                    hasPreviousPage={userMgmtHasPrev}
                    isLoading={isUserMgmtLoading}
                    onNextPage={userMgmtNextPage}
                    onPreviousPage={userMgmtPrevPage}
                    onFirstPage={userMgmtFirstPage}
                    totalEstimate={userMgmtTotal}
                    pageSize={PAGE_SIZE}
                  />
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t("securityAudit.noUserLogs", "No user management events found")}</p>
                  <p className="text-sm mt-1">
                    {t("securityAudit.noUserLogsDescription", "User management activities will appear here")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sensitive Data Access Tab */}
        <TabsContent value="sensitive-access">
          <Card>
            <CardHeader className={textAlign}>
              <CardTitle>{t("securityAudit.sensitiveDataAccess", "Sensitive Data Access")}</CardTitle>
              <CardDescription>
                {t("securityAudit.accessLogDescription", "Track who accessed sensitive information and when")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute top-3 start-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("securityAudit.searchPlaceholder", "Search by user or access type...")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="ps-10"
                  />
                </div>
                <Select value={accessTypeFilter} onValueChange={setAccessTypeFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder={t("securityAudit.filterByType", "Filter by type")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.all", "All Types")}</SelectItem>
                    {accessTypes.map((type) => (
                      <SelectItem key={type} value={type!}>
                        {accessTypeLabels[type!]?.label || type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className={`pt-4 ${textAlign}`}>
                    <div className="text-2xl font-bold">{sensitiveDataLogs?.length || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {t("securityAudit.totalAccesses", "Total Accesses")}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className={`pt-4 ${textAlign}`}>
                    <div className="text-2xl font-bold text-green-600">
                      {sensitiveDataLogs?.filter(l => l.metadata?.access_granted).length || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("securityAudit.granted", "Granted")}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className={`pt-4 ${textAlign}`}>
                    <div className="text-2xl font-bold text-red-600">
                      {sensitiveDataLogs?.filter(l => !l.metadata?.access_granted).length || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("securityAudit.denied", "Denied")}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className={`pt-4 ${textAlign}`}>
                    <div className="text-2xl font-bold">
                      {new Set(sensitiveDataLogs?.map(l => l.user_id)).size || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("securityAudit.uniqueUsers", "Unique Users")}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Logs Table */}
              {isSensitiveLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredSensitiveLogs && filteredSensitiveLogs.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className={textAlign}>{t("securityAudit.timestamp", "Timestamp")}</TableHead>
                        <TableHead className={textAlign}>{t("securityAudit.user", "User")}</TableHead>
                        <TableHead className={textAlign}>{t("securityAudit.accessType", "Access Type")}</TableHead>
                        <TableHead className={textAlign}>{t("securityAudit.status", "Status")}</TableHead>
                        <TableHead className={textAlign}>{t("securityAudit.details", "Details")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSensitiveLogs.map((log) => {
                        const accessInfo = accessTypeLabels[log.metadata?.access_type || ""] || {
                          label: log.metadata?.access_type || "Unknown",
                          icon: <Eye className="h-3 w-3" />,
                          variant: "default" as const,
                        };
                        
                        return (
                          <TableRow key={log.id}>
                            <TableCell className={`font-mono text-sm ${textAlign}`}>
                              {format(new Date(log.created_at), "MMM dd, yyyy HH:mm:ss")}
                            </TableCell>
                            <TableCell className={textAlign}>
                              {log.user_name || t("common.unknown", "Unknown User")}
                            </TableCell>
                            <TableCell className={textAlign}>
                              <Badge variant={accessInfo.variant} className="gap-1">
                                {accessInfo.icon}
                                {accessInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell className={textAlign}>
                              {log.metadata?.access_granted ? (
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                  {t("securityAudit.granted", "Granted")}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-red-600 border-red-600">
                                  {t("securityAudit.denied", "Denied")}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className={`text-sm text-muted-foreground ${textAlign}`}>
                              {log.metadata?.reason || "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <CursorPagination
                    currentPage={sensitivePage}
                    hasNextPage={sensitiveHasNext}
                    hasPreviousPage={sensitiveHasPrev}
                    isLoading={isSensitiveLoading}
                    onNextPage={sensitiveNextPage}
                    onPreviousPage={sensitivePrevPage}
                    onFirstPage={sensitiveFirstPage}
                    totalEstimate={sensitiveTotal}
                    pageSize={PAGE_SIZE}
                  />
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t("securityAudit.noAccessLogs", "No sensitive data access logs found")}</p>
                  <p className="text-sm mt-1">
                    {t("securityAudit.noAccessLogsDescription", "Access to sensitive data will be logged here")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings & Actions Tab */}
        <TabsContent value="settings-actions">
          <SecuritySettingsActionsTab tenantId={selectedTenantId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
