import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Loader2, 
  Search, 
  Monitor, 
  Smartphone, 
  Globe, 
  Clock, 
  XCircle,
  RefreshCw,
  AlertTriangle
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Session {
  id: string;
  user_id: string;
  session_token: string | null;
  ip_address: string | null;
  ip_country: string | null;
  ip_city: string | null;
  user_agent: string | null;
  device_fingerprint: string | null;
  is_valid: boolean | null;
  created_at: string;
  last_activity_at: string;
  expires_at: string;
  user_name?: string;
  user_email?: string;
}

interface ActiveSessionsTabProps {
  tenantId: string | null;
}

export function ActiveSessionsTab({ tenantId }: ActiveSessionsTabProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [sessionToTerminate, setSessionToTerminate] = useState<Session | null>(null);
  const [terminateAllDialogOpen, setTerminateAllDialogOpen] = useState(false);

  // Fetch active sessions
  const { data: sessions, isLoading, refetch } = useQuery({
    queryKey: ["active-sessions", tenantId],
    queryFn: async () => {
      let query = supabase
        .from("user_sessions")
        .select("*")
        .eq("is_valid", true)
        .gt("expires_at", new Date().toISOString())
        .order("last_activity_at", { ascending: false });

      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      }

      const { data: sessionsData, error } = await query;
      if (error) throw error;

      // Enrich with user names
      if (sessionsData && sessionsData.length > 0) {
        const userIds = [...new Set(sessionsData.map(s => s.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, { name: p.full_name, email: p.email }]) || []);

        return sessionsData.map(s => ({
          ...s,
          user_name: profileMap.get(s.user_id)?.name || null,
          user_email: profileMap.get(s.user_id)?.email || null,
        })) as unknown as Session[];
      }

      return (sessionsData || []) as unknown as Session[];
    },
    refetchInterval: 30000, // Refresh every 30s
  });

  // Terminate single session mutation
  const terminateSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from("user_sessions")
        .update({ 
          is_valid: false, 
          invalidated_reason: "admin_terminated",
          invalidated_at: new Date().toISOString()
        })
        .eq("id", sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: t("security.sessionTerminated", "Session Terminated"),
        description: t("security.sessionTerminatedDescription", "The session has been invalidated"),
      });
      queryClient.invalidateQueries({ queryKey: ["active-sessions"] });
      setSessionToTerminate(null);
    },
    onError: (error) => {
      toast({
        title: t("common.error", "Error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Terminate all sessions mutation
  const terminateAllMutation = useMutation({
    mutationFn: async () => {
      let query = supabase
        .from("user_sessions")
        .update({ 
          is_valid: false, 
          invalidated_reason: "admin_terminated_all",
          invalidated_at: new Date().toISOString()
        })
        .eq("is_valid", true);

      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      }

      const { error } = await query;
      if (error) throw error;

      // Log the action
      if (tenantId) {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("system_emergency_actions").insert({
          tenant_id: tenantId,
          action_type: "terminate_all_sessions",
          performed_by: user?.id,
          reason: "Manual termination by admin",
          affected_users_count: sessions?.length || 0,
        });
      }
    },
    onSuccess: () => {
      toast({
        title: t("security.allSessionsTerminated", "All Sessions Terminated"),
        description: t("security.allSessionsTerminatedDescription", "All active sessions have been invalidated"),
      });
      queryClient.invalidateQueries({ queryKey: ["active-sessions"] });
      setTerminateAllDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: t("common.error", "Error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredSessions = sessions?.filter(session => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      session.user_name?.toLowerCase().includes(query) ||
      session.user_email?.toLowerCase().includes(query) ||
      session.ip_address?.toLowerCase().includes(query) ||
      session.city?.toLowerCase().includes(query) ||
      session.country_code?.toLowerCase().includes(query)
    );
  });

  const parseUserAgent = (ua: string | null) => {
    if (!ua) return { browser: "Unknown", device: "Unknown" };
    
    const isMobile = /mobile|android|iphone|ipad/i.test(ua);
    const browser = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)/i)?.[1] || "Unknown";
    
    return {
      browser,
      device: isMobile ? "Mobile" : "Desktop",
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              {t("security.activeSessions", "Active Sessions")}
            </CardTitle>
            <CardDescription>
              {t("security.activeSessionsDescription", "Monitor and manage currently active user sessions")}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-4 w-4 me-2" />
              {t("common.refresh", "Refresh")}
            </Button>
            {filteredSessions && filteredSessions.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setTerminateAllDialogOpen(true)}
              >
                <XCircle className="h-4 w-4 me-2" />
                {t("security.terminateAll", "Terminate All")}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute top-3 start-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("security.searchSessions", "Search by user, IP, or location...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-10"
          />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4">
          <Badge variant="secondary">
            {filteredSessions?.length || 0} {t("security.sessions", "sessions")}
          </Badge>
        </div>

        {/* Sessions Table */}
        {filteredSessions && filteredSessions.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-start">{t("security.user", "User")}</TableHead>
                  <TableHead className="text-start">{t("security.location", "Location")}</TableHead>
                  <TableHead className="text-start">{t("security.device", "Device")}</TableHead>
                  <TableHead className="text-start">{t("security.lastActivity", "Last Activity")}</TableHead>
                  <TableHead className="text-start">{t("security.expires", "Expires")}</TableHead>
                  <TableHead className="text-end">{t("security.actions", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSessions.map((session) => {
                  const { browser, device } = parseUserAgent(session.user_agent);
                  return (
                    <TableRow key={session.id}>
                      <TableCell className="text-start">
                        <div className="flex flex-col">
                          <span className="font-medium">{session.user_name || "Unknown"}</span>
                          <span className="text-xs text-muted-foreground">{session.user_email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-start">
                        <div className="flex items-center gap-1">
                          <Globe className="h-3 w-3 text-muted-foreground" />
                          <span>{session.ip_city || "Unknown"}, {session.ip_country || "??"}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">{session.ip_address}</div>
                      </TableCell>
                      <TableCell className="text-start">
                        <div className="flex items-center gap-1">
                          {device === "Mobile" ? (
                            <Smartphone className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <Monitor className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span>{browser}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">{device}</div>
                      </TableCell>
                      <TableCell className="text-start">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span>{formatDistanceToNow(new Date(session.last_activity_at), { addSuffix: true })}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-start">
                        <span className="text-sm">
                          {format(new Date(session.expires_at), "MMM dd, HH:mm")}
                        </span>
                      </TableCell>
                      <TableCell className="text-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setSessionToTerminate(session)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t("security.noActiveSessions", "No active sessions found")}</p>
          </div>
        )}
      </CardContent>

      {/* Terminate Single Session Dialog */}
      <AlertDialog open={!!sessionToTerminate} onOpenChange={() => setSessionToTerminate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("security.terminateSession", "Terminate Session")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("security.terminateSessionConfirm", "Are you sure you want to terminate this session? The user will be logged out immediately.")}
              {sessionToTerminate && (
                <div className="mt-2 p-2 bg-muted rounded-md">
                  <p><strong>{sessionToTerminate.user_name}</strong></p>
                  <p className="text-sm">{sessionToTerminate.ip_address} - {sessionToTerminate.ip_city}, {sessionToTerminate.ip_country}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => sessionToTerminate && terminateSessionMutation.mutate(sessionToTerminate.id)}
              disabled={terminateSessionMutation.isPending}
            >
              {terminateSessionMutation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t("security.terminate", "Terminate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Terminate All Sessions Dialog */}
      <AlertDialog open={terminateAllDialogOpen} onOpenChange={setTerminateAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              {t("security.terminateAllSessions", "Terminate All Sessions")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("security.terminateAllConfirm", "This will immediately log out ALL users. Are you absolutely sure?")}
              <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/20 rounded-md border border-red-200">
                <p className="text-red-600 font-medium">
                  {filteredSessions?.length || 0} {t("security.sessionsWillBeTerminated", "sessions will be terminated")}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => terminateAllMutation.mutate()}
              disabled={terminateAllMutation.isPending}
            >
              {terminateAllMutation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t("security.terminateAll", "Terminate All")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
