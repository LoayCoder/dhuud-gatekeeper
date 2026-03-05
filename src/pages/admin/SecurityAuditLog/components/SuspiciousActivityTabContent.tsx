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

type SuspiciousActivityState = {
  t: (key: string, defaultText: string) => string;
  suspiciousSearchQuery: string;
  setSuspiciousSearchQuery: (val: string) => void;
  suspiciousFilter: string;
  setSuspiciousFilter: (val: string) => void;
  suspiciousStats: { total: number, suspicious: number, failed: number, newDevices: number, vpnProxy: number };
  textAlign: string;
  loginHistoryLoading: boolean;
  filteredLoginHistory: Array<{ id: string, created_at: string, user_name: string, email: string, login_success: boolean, risk_score: number, city: string, country_code: string, ip_address: string, browser: string, platform: string, is_suspicious: boolean, is_new_device: boolean, is_new_location: boolean, is_vpn: boolean, is_proxy: boolean }>;
};

export function SuspiciousActivityTabContent({ state }: { state: SuspiciousActivityState }) {
  const { t, suspiciousSearchQuery, setSuspiciousSearchQuery, suspiciousFilter, setSuspiciousFilter, suspiciousStats, textAlign, loginHistoryLoading, filteredLoginHistory } = state;
  return (
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
  );
}
