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

type SensitiveState = {
  t: (key: string, defaultText: string) => string;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  accessTypeFilter: string;
  setAccessTypeFilter: (val: string) => void;
  accessTypes: string[];
  sensitiveDataLogs: Array<{ id: string, created_at: string, user_id: string, user_name: string, metadata?: { access_type?: string, access_granted?: boolean, reason?: string } }> | null | undefined;
  textAlign: string;
  isSensitiveLoading: boolean;
  filteredSensitiveLogs: Array<{ id: string, created_at: string, user_id: string, user_name: string, metadata?: { access_type?: string, access_granted?: boolean, reason?: string } }> | null | undefined;
  sensitivePage: number;
  sensitiveHasNext: boolean;
  sensitiveHasPrev: boolean;
  sensitiveNextPage: () => void;
  sensitivePrevPage: () => void;
  sensitiveFirstPage: () => void;
  sensitiveTotal: number | null;
  PAGE_SIZE: number;
};

export function SensitiveDataAccessTabContent({ state }: { state: SensitiveState }) {
  const { t, searchQuery, setSearchQuery, accessTypeFilter, setAccessTypeFilter, accessTypes, sensitiveDataLogs, textAlign, isSensitiveLoading, filteredSensitiveLogs, sensitivePage, sensitiveHasNext, sensitiveHasPrev, sensitiveNextPage, sensitivePrevPage, sensitiveFirstPage, sensitiveTotal, PAGE_SIZE } = state;
  return (
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
  );
}
