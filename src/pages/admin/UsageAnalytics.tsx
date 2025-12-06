import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { Activity, Users, LogIn, Shield, Clock } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { useState } from 'react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

// RTL-aware custom legend component
const CustomLegend = ({ payload, direction }: { payload?: Array<{ value: string; color: string }>; direction: 'rtl' | 'ltr' }) => {
  if (!payload) return null;
  
  return (
    <div 
      className="flex flex-wrap gap-4 justify-center mt-2"
      dir={direction}
    >
      {payload.map((entry, index) => (
        <div 
          key={`legend-${index}`} 
          className="flex items-center gap-2"
        >
          <div 
            className="w-3 h-3 rounded-full shrink-0" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-muted-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function UsageAnalytics() {
  const { t, i18n } = useTranslation();
  const [dateRange, setDateRange] = useState('7');
  const direction = i18n.dir();
  const isRTL = direction === 'rtl';

  // Fetch activity summary
  const { data: activitySummary } = useQuery({
    queryKey: ['activity-summary', dateRange],
    queryFn: async () => {
      const startDate = subDays(new Date(), parseInt(dateRange));
      
      const { data, error } = await supabase
        .from('user_activity_logs')
        .select('event_type, created_at')
        .gte('created_at', startDate.toISOString());
      
      if (error) throw error;

      // Count by event type
      const counts: Record<string, number> = {};
      data.forEach(log => {
        counts[log.event_type] = (counts[log.event_type] || 0) + 1;
      });

      return {
        total: data.length,
        logins: counts['login'] || 0,
        logouts: counts['logout'] || 0,
        sessionTimeouts: counts['session_timeout'] || 0,
        mfaEnabled: counts['mfa_enabled'] || 0,
        mfaDisabled: counts['mfa_disabled'] || 0,
        mfaFailed: counts['mfa_verification_failed'] || 0,
      };
    },
  });

  // Fetch daily activity for chart
  const { data: dailyActivity = [] } = useQuery({
    queryKey: ['daily-activity', dateRange],
    queryFn: async () => {
      const days = parseInt(dateRange);
      const result = [];

      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const start = startOfDay(date);
        const end = endOfDay(date);

        const { count: logins } = await supabase
          .from('user_activity_logs')
          .select('*', { count: 'exact', head: true })
          .eq('event_type', 'login')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());

        result.push({
          date: format(date, 'MMM d'),
          logins: logins || 0,
        });
      }

      return result;
    },
  });

  // Fetch recent activity logs
  const { data: recentLogs = [] } = useQuery({
    queryKey: ['recent-activity-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_activity_logs')
        .select(`
          id,
          event_type,
          created_at,
          session_duration_seconds,
          user_id
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fetch user profiles separately
      const userIds = [...new Set(data.map(log => log.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      return data.map(log => ({
        ...log,
        user_name: profileMap.get(log.user_id) || 'Unknown',
      }));
    },
  });

  // Fetch tenant usage stats
  const { data: tenantStats = [] } = useQuery({
    queryKey: ['tenant-usage-stats'],
    queryFn: async () => {
      const { data: tenants, error } = await supabase
        .from('tenants')
        .select('id, name, max_users_override, plan_id, plans(max_users)')
        .order('name');

      if (error) throw error;

      const stats = await Promise.all(
        tenants.map(async (tenant) => {
          const { count: userCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenant.id);

          const { count: loginCount } = await supabase
            .from('user_activity_logs')
            .select('*', { count: 'exact', head: true })
            .eq('event_type', 'login')
            .gte('created_at', subDays(new Date(), 30).toISOString());

          const plan = tenant.plans as { max_users: number } | null;
          const maxUsers = tenant.max_users_override || plan?.max_users || 5;

          return {
            id: tenant.id,
            name: tenant.name,
            userCount: userCount || 0,
            maxUsers,
            loginCount: loginCount || 0,
            usagePercent: maxUsers > 0 ? Math.round(((userCount || 0) / maxUsers) * 100) : 0,
          };
        })
      );

      return stats;
    },
  });

  // Event type breakdown for pie chart
  const eventTypeData = activitySummary ? [
    { name: t('analytics.logins'), value: activitySummary.logins },
    { name: t('analytics.logouts'), value: activitySummary.logouts },
    { name: t('analytics.sessionTimeouts'), value: activitySummary.sessionTimeouts },
    { name: t('analytics.mfaEvents'), value: activitySummary.mfaEnabled + activitySummary.mfaDisabled },
  ].filter(d => d.value > 0) : [];

  const getEventBadge = (eventType: string) => {
    switch (eventType) {
      case 'login':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">{t('analytics.login')}</Badge>;
      case 'logout':
        return <Badge variant="secondary">{t('analytics.logout')}</Badge>;
      case 'session_timeout':
        return <Badge variant="outline">{t('analytics.sessionTimeout')}</Badge>;
      case 'mfa_enabled':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">{t('analytics.mfaEnabled')}</Badge>;
      case 'mfa_disabled':
        return <Badge variant="destructive">{t('analytics.mfaDisabled')}</Badge>;
      case 'mfa_verification_failed':
        return <Badge variant="destructive">{t('analytics.mfaFailed')}</Badge>;
      default:
        return <Badge variant="outline">{eventType}</Badge>;
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="space-y-6" dir={direction}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="text-start">
          <h1 className="text-3xl font-bold tracking-tight">{t('analytics.title')}</h1>
          <p className="text-muted-foreground">{t('analytics.description')}</p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange} dir={direction}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent dir={direction}>
            <SelectItem value="7">{t('analytics.last7Days')}</SelectItem>
            <SelectItem value="14">{t('analytics.last14Days')}</SelectItem>
            <SelectItem value="30">{t('analytics.last30Days')}</SelectItem>
            <SelectItem value="90">{t('analytics.last90Days')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-start">{t('analytics.totalEvents')}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-start">
            <div className="text-2xl font-bold">{activitySummary?.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-start">{t('analytics.logins')}</CardTitle>
            <LogIn className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-start">
            <div className="text-2xl font-bold">{activitySummary?.logins || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-start">{t('analytics.sessionTimeouts')}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-start">
            <div className="text-2xl font-bold">{activitySummary?.sessionTimeouts || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-start">{t('analytics.mfaEvents')}</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-start">
            <div className="text-2xl font-bold">
              {(activitySummary?.mfaEnabled || 0) + (activitySummary?.mfaDisabled || 0) + (activitySummary?.mfaFailed || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4" dir={direction}>
        <TabsList className="flex flex-wrap h-auto gap-1 justify-start">
          <TabsTrigger value="overview">{t('analytics.overview')}</TabsTrigger>
          <TabsTrigger value="tenants">{t('analytics.tenantUsage')}</TabsTrigger>
          <TabsTrigger value="logs">{t('analytics.activityLogs')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Login Trend Chart */}
            <Card>
              <CardHeader className="text-start">
                <CardTitle className="text-base">{t('analytics.loginTrend')}</CardTitle>
                <CardDescription>{t('analytics.loginTrendDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="h-[340px]" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={isRTL ? [...dailyActivity].reverse() : dailyActivity}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs"
                      reversed={isRTL}
                      tick={{ fill: 'hsl(var(--foreground))' }}
                    />
                    <YAxis 
                      className="text-xs" 
                      orientation={isRTL ? 'right' : 'left'}
                      tick={{ fill: 'hsl(var(--foreground))' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        color: 'hsl(var(--foreground))',
                        direction: direction,
                        textAlign: isRTL ? 'right' : 'left',
                      }} 
                    />
                    <Legend 
                      content={({ payload }) => <CustomLegend payload={payload?.map(p => ({ value: t('analytics.logins'), color: p.color as string }))} direction={direction} />}
                      verticalAlign="bottom"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="logins" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                      name={t('analytics.logins')}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Event Type Distribution */}
            <Card>
              <CardHeader className="text-start">
                <CardTitle className="text-base">{t('analytics.eventDistribution')}</CardTitle>
                <CardDescription>{t('analytics.eventDistributionDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="h-[340px]" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={eventTypeData}
                      cx="50%"
                      cy="45%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {eventTypeData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        color: 'hsl(var(--foreground))',
                        direction: direction,
                        textAlign: isRTL ? 'right' : 'left',
                      }} 
                    />
                    <Legend 
                      content={({ payload }) => (
                        <CustomLegend 
                          payload={payload?.map((p, i) => ({ 
                            value: eventTypeData[i]?.name || p.value as string, 
                            color: p.color as string 
                          }))} 
                          direction={direction} 
                        />
                      )}
                      verticalAlign="bottom"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tenants">
          <Card>
            <CardHeader className="text-start">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t('analytics.tenantUsage')}
              </CardTitle>
              <CardDescription>{t('analytics.tenantUsageDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[440px] mb-6" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tenantStats.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      type="number"
                      orientation={isRTL ? 'top' : 'bottom'}
                      tick={{ fill: 'hsl(var(--foreground))' }}
                    />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={150} 
                      className="text-xs"
                      orientation={isRTL ? 'right' : 'left'}
                      tick={{ fill: 'hsl(var(--foreground))' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        color: 'hsl(var(--foreground))',
                        direction: direction,
                        textAlign: isRTL ? 'right' : 'left',
                      }} 
                    />
                    <Legend 
                      content={({ payload }) => (
                        <CustomLegend 
                          payload={payload?.map(p => ({ 
                            value: p.value as string, 
                            color: p.color as string 
                          }))} 
                          direction={direction} 
                        />
                      )}
                      verticalAlign="bottom"
                    />
                    <Bar dataKey="userCount" fill="hsl(var(--primary))" name={t('analytics.users')} />
                    <Bar dataKey="loginCount" fill="hsl(var(--chart-2))" name={t('analytics.logins30d')} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">{t('tenantManagement.columns.name')}</TableHead>
                    <TableHead className="text-start">{t('analytics.users')}</TableHead>
                    <TableHead className="text-start">{t('analytics.usage')}</TableHead>
                    <TableHead className="text-start">{t('analytics.logins30d')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenantStats.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium text-start">{tenant.name}</TableCell>
                      <TableCell className="text-start">{tenant.userCount} / {tenant.maxUsers}</TableCell>
                      <TableCell className="text-start">
                        <Badge variant={tenant.usagePercent >= 90 ? 'destructive' : tenant.usagePercent >= 70 ? 'secondary' : 'outline'}>
                          {tenant.usagePercent}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-start">{tenant.loginCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader className="text-start">
              <CardTitle>{t('analytics.recentActivity')}</CardTitle>
              <CardDescription>{t('analytics.recentActivityDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">{t('analytics.user')}</TableHead>
                    <TableHead className="text-start">{t('analytics.event')}</TableHead>
                    <TableHead className="text-start">{t('analytics.sessionDuration')}</TableHead>
                    <TableHead className="text-start">{t('analytics.timestamp')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium text-start">{log.user_name}</TableCell>
                      <TableCell className="text-start">{getEventBadge(log.event_type)}</TableCell>
                      <TableCell className="text-start">{formatDuration(log.session_duration_seconds)}</TableCell>
                      <TableCell className="text-muted-foreground text-start">
                        {format(new Date(log.created_at), 'PPp')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
