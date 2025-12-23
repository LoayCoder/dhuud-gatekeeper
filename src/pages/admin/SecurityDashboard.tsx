import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  AlertTriangle, 
  Users, 
  Monitor, 
  Lock, 
  Unlock,
  Activity,
  Globe,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  Clock,
  XCircle
} from 'lucide-react';
import { 
  useSecurityDashboardStats, 
  useActiveSessions, 
  useSecurityScanResults,
  useInvalidateUserSession,
  useLoginHistory
} from '@/hooks/use-security-dashboard';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/use-toast';

function SeverityBadge({ severity }: { severity: string }) {
  const variants: Record<string, 'destructive' | 'default' | 'secondary' | 'outline'> = {
    critical: 'destructive',
    high: 'destructive',
    medium: 'default',
    low: 'secondary',
    info: 'outline',
  };
  
  return (
    <Badge variant={variants[severity] || 'default'} className="capitalize">
      {severity}
    </Badge>
  );
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  description,
  variant = 'default'
}: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType;
  description?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const iconColors = {
    default: 'text-muted-foreground',
    success: 'text-green-500',
    warning: 'text-yellow-500',
    danger: 'text-destructive',
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${iconColors[variant]}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function SecurityDashboard() {
  const { t } = useTranslation();
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useSecurityDashboardStats();
  const { data: sessions, isLoading: sessionsLoading } = useActiveSessions();
  const { data: findings, isLoading: findingsLoading } = useSecurityScanResults('open');
  const { data: loginHistory, isLoading: historyLoading } = useLoginHistory(20);
  const invalidateSession = useInvalidateUserSession();

  const handleInvalidateSession = async (sessionId: string) => {
    try {
      await invalidateSession.mutateAsync({ 
        sessionId, 
        reason: 'admin_terminated' 
      });
      toast({
        title: 'Session Terminated',
        description: 'The user session has been invalidated.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to terminate session.',
        variant: 'destructive',
      });
    }
  };

  const mfaAdoptionRate = stats 
    ? Math.round((stats.mfa_enabled_users / Math.max(stats.total_users, 1)) * 100) 
    : 0;

  const totalFindings = stats?.scan_findings 
    ? Object.values(stats.scan_findings).reduce((a, b) => (a || 0) + (b || 0), 0) 
    : 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8" />
            {t('Security Dashboard', 'Security Dashboard')}
          </h1>
          <p className="text-muted-foreground">
            {t('Monitor security status and threats', 'Monitor security status and threats')}
          </p>
        </div>
        <Button onClick={() => refetchStats()} variant="outline" size="sm">
          <RefreshCcw className="h-4 w-4 me-2" />
          {t('Refresh', 'Refresh')}
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('Active Sessions', 'Active Sessions')}
          value={stats?.active_sessions ?? 0}
          icon={Monitor}
          description={`${stats?.users_with_sessions ?? 0} unique users`}
        />
        <StatCard
          title={t('Suspicious Logins (7d)', 'Suspicious Logins (7d)')}
          value={stats?.suspicious_logins_7d ?? 0}
          icon={AlertTriangle}
          variant={stats?.suspicious_logins_7d ? 'warning' : 'default'}
        />
        <StatCard
          title={t('Failed Logins (24h)', 'Failed Logins (24h)')}
          value={stats?.failed_logins_24h ?? 0}
          icon={XCircle}
          variant={stats?.failed_logins_24h && stats.failed_logins_24h > 10 ? 'danger' : 'default'}
        />
        <StatCard
          title={t('Sessions Terminated (24h)', 'Sessions Terminated (24h)')}
          value={stats?.sessions_invalidated_24h ?? 0}
          icon={Unlock}
        />
      </div>

      {/* Security Health & MFA */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              {t('MFA Adoption', 'MFA Adoption')}
            </CardTitle>
            <CardDescription>
              {t('Percentage of users with MFA enabled', 'Percentage of users with MFA enabled')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{mfaAdoptionRate}%</span>
              <span className="text-sm text-muted-foreground">
                {stats?.mfa_enabled_users ?? 0} / {stats?.total_users ?? 0} users
              </span>
            </div>
            <Progress value={mfaAdoptionRate} className="h-3" />
            {mfaAdoptionRate < 50 && (
              <p className="text-sm text-yellow-600">
                ⚠️ {t('Low MFA adoption. Consider enforcing MFA for better security.', 'Low MFA adoption. Consider enforcing MFA for better security.')}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              {t('Security Findings', 'Security Findings')}
            </CardTitle>
            <CardDescription>
              {t('Open vulnerabilities by severity', 'Open vulnerabilities by severity')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {totalFindings === 0 ? (
              <div className="flex items-center gap-2 text-green-600">
                <ShieldCheck className="h-5 w-5" />
                <span>{t('No open security findings', 'No open security findings')}</span>
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(stats?.scan_findings || {}).map(([severity, count]) => (
                  <div key={severity} className="flex items-center justify-between">
                    <SeverityBadge severity={severity} />
                    <span className="font-mono">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="sessions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            {t('Active Sessions', 'Active Sessions')}
          </TabsTrigger>
          <TabsTrigger value="findings" className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            {t('Security Findings', 'Security Findings')}
          </TabsTrigger>
          <TabsTrigger value="logins" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            {t('Login History', 'Login History')}
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t('Recent Events', 'Recent Events')}
          </TabsTrigger>
        </TabsList>

        {/* Active Sessions Tab */}
        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>{t('Active User Sessions', 'Active User Sessions')}</CardTitle>
              <CardDescription>
                {t('Currently logged in users across all devices', 'Currently logged in users across all devices')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('User', 'User')}</TableHead>
                      <TableHead>{t('Location', 'Location')}</TableHead>
                      <TableHead>{t('Device', 'Device')}</TableHead>
                      <TableHead>{t('Last Activity', 'Last Activity')}</TableHead>
                      <TableHead>{t('Actions', 'Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessionsLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          {t('Loading...', 'Loading...')}
                        </TableCell>
                      </TableRow>
                    ) : sessions?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          {t('No active sessions', 'No active sessions')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      sessions?.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell className="font-mono text-xs">
                            {session.user_id.slice(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {session.ip_country || 'Unknown'} 
                              {session.ip_city && `, ${session.ip_city}`}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {session.ip_address}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">
                            {session.user_agent?.slice(0, 50) || 'Unknown'}
                          </TableCell>
                          <TableCell>
                            {formatDistanceToNow(new Date(session.last_activity_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleInvalidateSession(session.id)}
                              disabled={invalidateSession.isPending}
                            >
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Findings Tab */}
        <TabsContent value="findings">
          <Card>
            <CardHeader>
              <CardTitle>{t('Open Security Findings', 'Open Security Findings')}</CardTitle>
              <CardDescription>
                {t('Vulnerabilities and issues requiring attention', 'Vulnerabilities and issues requiring attention')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('Severity', 'Severity')}</TableHead>
                      <TableHead>{t('Category', 'Category')}</TableHead>
                      <TableHead>{t('Title', 'Title')}</TableHead>
                      <TableHead>{t('Resource', 'Resource')}</TableHead>
                      <TableHead>{t('Detected', 'Detected')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {findingsLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          {t('Loading...', 'Loading...')}
                        </TableCell>
                      </TableRow>
                    ) : findings?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          <div className="flex items-center justify-center gap-2 text-green-600 py-8">
                            <ShieldCheck className="h-6 w-6" />
                            <span>{t('No open security findings', 'No open security findings')}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      findings?.map((finding) => (
                        <TableRow key={finding.id}>
                          <TableCell>
                            <SeverityBadge severity={finding.severity} />
                          </TableCell>
                          <TableCell className="capitalize">{finding.category}</TableCell>
                          <TableCell>{finding.title}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {finding.affected_resource || '-'}
                          </TableCell>
                          <TableCell>
                            {formatDistanceToNow(new Date(finding.detected_at), { addSuffix: true })}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Login History Tab */}
        <TabsContent value="logins">
          <Card>
            <CardHeader>
              <CardTitle>{t('Recent Login Attempts', 'Recent Login Attempts')}</CardTitle>
              <CardDescription>
                {t('Login activity with risk analysis', 'Login activity with risk analysis')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('User', 'User')}</TableHead>
                      <TableHead>{t('Status', 'Status')}</TableHead>
                      <TableHead>{t('Location', 'Location')}</TableHead>
                      <TableHead>{t('Device', 'Device')}</TableHead>
                      <TableHead>{t('Risk', 'Risk')}</TableHead>
                      <TableHead>{t('Time', 'Time')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">
                          {t('Loading...', 'Loading...')}
                        </TableCell>
                      </TableRow>
                    ) : loginHistory?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          {t('No login history', 'No login history')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      loginHistory?.map((login) => (
                        <TableRow key={login.id} className={login.is_suspicious ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}>
                          <TableCell>
                            <div className="font-mono text-xs">
                              {login.user_id?.slice(0, 8)}...
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={login.login_successful ? 'default' : 'destructive'}>
                              {login.login_successful ? 'Success' : 'Failed'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {login.country || 'Unknown'}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {login.ip_address}
                            </span>
                          </TableCell>
                          <TableCell className="capitalize">
                            {login.device_type || '-'} / {login.browser || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                (login.risk_score || 0) > 70 ? 'destructive' : 
                                (login.risk_score || 0) > 40 ? 'default' : 
                                'secondary'
                              }
                            >
                              {login.risk_score || 0}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {formatDistanceToNow(new Date(login.created_at), { addSuffix: true })}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Events Tab */}
        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>{t('Recent Security Events', 'Recent Security Events')}</CardTitle>
              <CardDescription>
                {t('Security-related actions and alerts', 'Security-related actions and alerts')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {stats?.recent_events?.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    {t('No recent security events', 'No recent security events')}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stats?.recent_events?.map((event, index) => (
                      <div key={index} className="flex items-start gap-4 border-b pb-4 last:border-0">
                        <Activity className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <div className="font-medium">{event.action}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                          </div>
                          {event.new_value && (
                            <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto">
                              {JSON.stringify(event.new_value, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
