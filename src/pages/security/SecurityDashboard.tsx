import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Shield, 
  Users, 
  AlertTriangle, 
  Route, 
  MapPin,
  UserCheck,
  Clock,
  ArrowRight,
  RefreshCw,
  Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSecurityStats } from '@/hooks/use-security-stats';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format } from 'date-fns';

export default function SecurityDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { stats, isLoading, refetch } = useSecurityStats();

  const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  const quickActions = [
    { 
      label: t('security.dashboard.registerVisitor', 'Register Visitor'), 
      icon: UserCheck, 
      path: '/visitors/register',
      variant: 'default' as const
    },
    { 
      label: t('security.dashboard.startPatrol', 'Start Patrol'), 
      icon: Route, 
      path: '/security/patrols',
      variant: 'secondary' as const
    },
    { 
      label: t('security.dashboard.viewAlerts', 'View Alerts'), 
      icon: AlertTriangle, 
      path: '/security/command-center',
      variant: 'outline' as const
    },
    { 
      label: t('security.dashboard.commandCenter', 'Command Center'), 
      icon: MapPin, 
      path: '/security/command-center',
      variant: 'outline' as const
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t('security.dashboard.title', 'Security Dashboard')}
          </h1>
          <p className="text-muted-foreground">
            {t('security.dashboard.subtitle', 'Overview of security operations and real-time status')}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 me-2" />
          {t('common.refresh', 'Refresh')}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('security.dashboard.activeGuards', 'Active Guards')}
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.activeGuards ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  {t('security.dashboard.ofTotal', 'of {{total}} total', { total: stats?.totalGuards ?? 0 })}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('security.dashboard.visitorsToday', 'Visitors Today')}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.visitorsToday ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  {t('security.dashboard.currentlyOnSite', '{{count}} currently on site', { count: stats?.visitorsOnSite ?? 0 })}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('security.dashboard.openAlerts', 'Open Alerts')}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-destructive">{stats?.openAlerts ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  {t('security.dashboard.pendingAcknowledgment', 'pending acknowledgment')}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('security.dashboard.patrolsToday', 'Patrols Today')}
            </CardTitle>
            <Route className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.patrolsCompleted ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  {t('security.dashboard.completionRate', '{{rate}}% completion rate', { rate: stats?.patrolCompletionRate ?? 0 })}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('security.dashboard.quickActions', 'Quick Actions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {quickActions.map((action) => (
              <Button
                key={action.path}
                variant={action.variant}
                onClick={() => navigate(action.path)}
                className="gap-2"
              >
                <action.icon className="h-4 w-4" />
                {action.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Visitor Traffic Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('security.dashboard.visitorTraffic', 'Visitor Traffic (7 Days)')}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats?.visitorTrend ?? []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)'
                    }} 
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Patrol Completion Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('security.dashboard.patrolTrend', 'Patrol Completion Trend')}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={stats?.patrolTrend ?? []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis className="text-xs" domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)'
                    }} 
                    formatter={(value) => [`${value}%`, t('security.dashboard.completionRate', 'Completion Rate')]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="rate" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Alerts by Zone */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('security.dashboard.alertsByZone', 'Alerts by Zone')}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={stats?.alertsByZone ?? []}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    dataKey="count"
                    nameKey="zone"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {(stats?.alertsByZone ?? []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{t('security.dashboard.recentActivity', 'Recent Activity')}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/security/command-center')}>
              {t('common.viewAll', 'View All')}
              <ArrowRight className="h-4 w-4 ms-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {(stats?.recentActivity ?? []).slice(0, 5).map((activity, index) => (
                  <div key={index} className="flex items-center gap-3 rounded-lg border p-3">
                    <div className={`rounded-full p-2 ${
                      activity.type === 'alert' ? 'bg-destructive/10 text-destructive' :
                      activity.type === 'patrol' ? 'bg-primary/10 text-primary' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {activity.type === 'alert' ? <AlertTriangle className="h-4 w-4" /> :
                       activity.type === 'patrol' ? <Route className="h-4 w-4" /> :
                       <Activity className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">{activity.location}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(activity.timestamp), 'HH:mm')}
                    </div>
                    {activity.status && (
                      <Badge variant={activity.status === 'resolved' ? 'secondary' : 'destructive'}>
                        {activity.status}
                      </Badge>
                    )}
                  </div>
                ))}
                {(!stats?.recentActivity || stats.recentActivity.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t('security.dashboard.noRecentActivity', 'No recent activity')}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
