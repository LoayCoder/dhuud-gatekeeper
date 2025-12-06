import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Shield, Search, Eye, AlertTriangle, Lock, UserPlus, UserMinus, UserCheck, UserX, Pencil, Users, KeyRound, LogIn, LogOut, ShieldCheck, ShieldOff, ShieldAlert, Clock } from "lucide-react";
import { format } from "date-fns";
import { useCursorPagination, CursorPosition, buildCursorCondition } from "@/hooks/use-cursor-pagination";
import { CursorPagination } from "@/components/ui/cursor-pagination";



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
  } | null;
  session_duration_seconds?: number | null;
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

export default function SecurityAuditLog() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [searchQuery, setSearchQuery] = useState("");
  const [accessTypeFilter, setAccessTypeFilter] = useState<string>("all");
  const [userEventFilter, setUserEventFilter] = useState<string>("all");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [securityEventFilter, setSecurityEventFilter] = useState<string>("all");
  const [securitySearchQuery, setSecuritySearchQuery] = useState("");

  const PAGE_SIZE = 50;

  // Helper to enrich logs with user names
  const enrichLogsWithUserNames = async (logs: Array<{ id: string; user_id: string; event_type: string; metadata: unknown; created_at: string }>) => {
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

  // Cursor pagination for security events
  const securityEventsQueryFn = useCallback(async (cursor?: CursorPosition) => {
    let query = supabase
      .from("user_activity_logs")
      .select("id, user_id, event_type, metadata, created_at", { count: 'estimated' })
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
      </div>

      <Tabs defaultValue="security-events" className="space-y-6" dir={direction}>
        <div className="flex justify-start">
          <TabsList className="flex flex-wrap h-auto gap-1 w-full max-w-2xl">
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
          </TabsList>
        </div>

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
                              {log.metadata?.ip_address && (
                                <span className="me-2">IP: {log.metadata.ip_address}</span>
                              )}
                              {log.session_duration_seconds && (
                                <span>Duration: {Math.round(log.session_duration_seconds / 60)}min</span>
                              )}
                              {!log.metadata?.ip_address && !log.session_duration_seconds && "—"}
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
                            <TableCell className={`text-sm text-muted-foreground max-w-[200px] truncate ${textAlign}`}>
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
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t("securityAudit.noLogs", "No sensitive data access logs found")}</p>
                  <p className="text-sm mt-1">
                    {t("securityAudit.noLogsDescription", "Access attempts will appear here when users view protected information")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
