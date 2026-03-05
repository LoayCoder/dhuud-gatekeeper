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

type SecurityState = {
  t: (key: string, defaultText: string) => string;
  securitySearchQuery: string;
  setSecuritySearchQuery: (val: string) => void;
  securityEventFilter: string;
  setSecurityEventFilter: (val: string) => void;
  securityEventLogs: Array<{ event_type: string, id: string, created_at: string, user_name: string, ip_address?: string, metadata?: { ip_address?: string }, session_duration_seconds?: number }> | null | undefined;
  textAlign: string;
  isSecurityLoading: boolean;
  filteredSecurityLogs: Array<{ event_type: string, id: string, created_at: string, user_name: string, ip_address?: string, metadata?: { ip_address?: string }, session_duration_seconds?: number }> | null | undefined;
  securityPage: number;
  securityHasNext: boolean;
  securityHasPrev: boolean;
  securityNextPage: () => void;
  securityPrevPage: () => void;
  securityFirstPage: () => void;
  securityTotal: number | null;
  PAGE_SIZE: number;
};

export function SecurityEventsTabContent({ state }: { state: SecurityState }) {
  const { t, securitySearchQuery, setSecuritySearchQuery, securityEventFilter, setSecurityEventFilter, securityEventLogs, textAlign, isSecurityLoading, filteredSecurityLogs, securityPage, securityHasNext, securityHasPrev, securityNextPage, securityPrevPage, securityFirstPage, securityTotal, PAGE_SIZE } = state;
  return (
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
  );
}
