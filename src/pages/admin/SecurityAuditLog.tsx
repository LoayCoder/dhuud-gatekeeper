import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Shield, Search, Eye, AlertTriangle, Lock } from "lucide-react";
import { format } from "date-fns";
import { RTLWrapper } from "@/components/RTLWrapper";

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
  } | null;
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

export default function SecurityAuditLog() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [accessTypeFilter, setAccessTypeFilter] = useState<string>("all");

  // Fetch sensitive data access logs
  const { data: logs, isLoading } = useQuery({
    queryKey: ["security-audit-logs"],
    queryFn: async () => {
      // Get logs
      const { data: logsData, error } = await supabase
        .from("user_activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      
      // Filter for sensitive data access logs
      const sensitiveDataLogs = logsData.filter(
        (log) => {
          const metadata = log.metadata as ActivityLog["metadata"];
          return metadata?.sensitive_data_access === true;
        }
      );

      // Get unique user IDs and fetch their names
      const userIds = [...new Set(sensitiveDataLogs.map(log => log.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      return sensitiveDataLogs.map(log => ({
        ...log,
        user_name: profileMap.get(log.user_id) || null,
        metadata: log.metadata as ActivityLog["metadata"],
      })) as ActivityLog[];
    },
  });

  // Filter logs based on search and access type
  const filteredLogs = logs?.filter(log => {
    const matchesSearch = searchQuery === "" || 
      log.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.metadata?.access_type?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = accessTypeFilter === "all" || 
      log.metadata?.access_type === accessTypeFilter;
    
    return matchesSearch && matchesType;
  });

  // Get unique access types for filter dropdown
  const accessTypes = logs 
    ? [...new Set(logs.map(log => log.metadata?.access_type).filter(Boolean))]
    : [];

  return (
    <RTLWrapper className="container max-w-7xl py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          {t("securityAudit.title", "Security Audit Log")}
        </h1>
        <p className="text-muted-foreground">
          {t("securityAudit.description", "Monitor and review sensitive data access attempts across the platform")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("securityAudit.sensitiveDataAccess", "Sensitive Data Access")}</CardTitle>
          <CardDescription>
            {t("securityAudit.accessLogDescription", "Track who accessed sensitive information and when")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("securityAudit.searchPlaceholder", "Search by user or access type...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="[padding-inline-start:2.25rem]"
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
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{logs?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {t("securityAudit.totalAccesses", "Total Accesses")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-green-600">
                  {logs?.filter(l => l.metadata?.access_granted).length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("securityAudit.granted", "Granted")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-red-600">
                  {logs?.filter(l => !l.metadata?.access_granted).length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("securityAudit.denied", "Denied")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">
                  {new Set(logs?.map(l => l.user_id)).size || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("securityAudit.uniqueUsers", "Unique Users")}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Logs Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredLogs && filteredLogs.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("securityAudit.timestamp", "Timestamp")}</TableHead>
                    <TableHead>{t("securityAudit.user", "User")}</TableHead>
                    <TableHead>{t("securityAudit.accessType", "Access Type")}</TableHead>
                    <TableHead>{t("securityAudit.status", "Status")}</TableHead>
                    <TableHead>{t("securityAudit.details", "Details")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => {
                    const accessInfo = accessTypeLabels[log.metadata?.access_type || ""] || {
                      label: log.metadata?.access_type || "Unknown",
                      icon: <Eye className="h-3 w-3" />,
                      variant: "default" as const,
                    };
                    
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-sm">
                          {format(new Date(log.created_at), "MMM dd, yyyy HH:mm:ss")}
                        </TableCell>
                        <TableCell>
                          {log.user_name || t("common.unknown", "Unknown User")}
                        </TableCell>
                        <TableCell>
                          <Badge variant={accessInfo.variant} className="gap-1">
                            {accessInfo.icon}
                            {accessInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
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
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {log.metadata?.reason || "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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
    </RTLWrapper>
  );
}
