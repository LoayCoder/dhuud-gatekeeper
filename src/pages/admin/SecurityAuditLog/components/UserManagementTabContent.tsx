import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TabsContent } from '@/components/ui/tabs';
import { Loader2, Shield, Search, Eye, AlertTriangle, Lock, UserPlus, UserMinus, UserCheck, UserX, Pencil, Users, KeyRound, LogIn, LogOut, ShieldCheck, ShieldOff, ShieldAlert, Clock, MapPin, Smartphone, Globe, Wifi } from 'lucide-react';
import { format } from 'date-fns';
import { CursorPagination } from '@/components/ui/cursor-pagination';
import { userEventLabels, securityEventLabels, accessTypeLabels, getRiskColor, USER_MANAGEMENT_EVENTS, SECURITY_EVENTS } from '../types';

type UserManagementState = {
  t: (key: string, defaultText: string) => string;
  userSearchQuery: string;
  setUserSearchQuery: (val: string) => void;
  userEventFilter: string;
  setUserEventFilter: (val: string) => void;
  userManagementLogs: Array<{ event_type: string, id: string, created_at: string, user_name: string, metadata?: { target_user_name?: string, target_user_email?: string, changes?: unknown } }> | null | undefined;
  textAlign: string;
  isUserMgmtLoading: boolean;
  filteredUserMgmtLogs: Array<{ event_type: string, id: string, created_at: string, user_name: string, metadata?: { target_user_name?: string, target_user_email?: string, changes?: unknown } }> | null | undefined;
  userMgmtPage: number;
  userMgmtHasNext: boolean;
  userMgmtHasPrev: boolean;
  userMgmtNextPage: () => void;
  userMgmtPrevPage: () => void;
  userMgmtFirstPage: () => void;
  userMgmtTotal: number | null;
  PAGE_SIZE: number;
  formatChanges: (changes: unknown) => string;
};

export function UserManagementTabContent({ state }: { state: UserManagementState }) {
  const { t, userSearchQuery, setUserSearchQuery, userEventFilter, setUserEventFilter, userManagementLogs, textAlign, isUserMgmtLoading, filteredUserMgmtLogs, userMgmtPage, userMgmtHasNext, userMgmtHasPrev, userMgmtNextPage, userMgmtPrevPage, userMgmtFirstPage, userMgmtTotal, PAGE_SIZE, formatChanges } = state;
  return (
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
  );
}
