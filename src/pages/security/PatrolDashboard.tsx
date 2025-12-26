import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Play,
  Route,
  Users
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSecurityPatrols, usePatrolRoutes } from "@/hooks/use-security-patrols";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function PatrolDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const { data: activePatrols, isLoading: patrolsLoading } = useSecurityPatrols({ status: 'in_progress' });
  const { data: routes, isLoading: routesLoading } = usePatrolRoutes();
  const { data: completedPatrols } = useSecurityPatrols({ status: 'completed' });

  const todayPatrols = completedPatrols?.filter(p => {
    const patrolDate = new Date(p.actual_start);
    const today = new Date();
    return patrolDate.toDateString() === today.toDateString();
  }) || [];

  // Calculate actual compliance rate from completed patrols
  const calculateComplianceRate = () => {
    if (!completedPatrols || completedPatrols.length === 0) return 100;
    const withCheckpoints = completedPatrols.filter(p => p.checkpoints_visited !== undefined && p.checkpoints_total !== undefined);
    if (withCheckpoints.length === 0) return 100;
    const totalCompleted = withCheckpoints.reduce((sum, p) => sum + (p.checkpoints_visited || 0), 0);
    const totalExpected = withCheckpoints.reduce((sum, p) => sum + (p.checkpoints_total || 0), 0);
    return totalExpected > 0 ? Math.round((totalCompleted / totalExpected) * 100) : 100;
  };

  const stats = {
    activePatrols: activePatrols?.length || 0,
    completedToday: todayPatrols.length,
    totalRoutes: routes?.length || 0,
    avgCompliance: calculateComplianceRate(),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t('security.patrols.dashboard.title', 'Patrol Dashboard')}
          </h1>
          <p className="text-muted-foreground">
            {t('security.patrols.dashboard.description', 'Monitor active patrols and security operations')}
          </p>
        </div>
        <Button onClick={() => navigate('/security/patrols/execute')} size="lg" className="gap-2">
          <Play className="h-4 w-4" />
          {t('security.patrols.execution.start', 'Start Patrol')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('security.patrols.dashboard.activePatrols', 'Active Patrols')}
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {patrolsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats.activePatrols}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('security.patrols.dashboard.completedToday', 'Completed Today')}
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedToday}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('security.patrols.dashboard.totalRoutes', 'Total Routes')}
            </CardTitle>
            <Route className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {routesLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats.totalRoutes}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('security.patrols.dashboard.complianceRate', 'Compliance Rate')}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgCompliance}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Active Patrols */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('security.patrols.dashboard.activePatrols', 'Active Patrols')}
          </CardTitle>
          <CardDescription>
            {t('security.patrols.dashboard.activePatrolsDescription', 'Currently in-progress security patrols')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {patrolsLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : activePatrols && activePatrols.length > 0 ? (
            <div className="space-y-4">
              {activePatrols.map((patrol) => (
                <div 
                  key={patrol.id} 
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{patrol.route?.name || 'Unknown Route'}</p>
                      <p className="text-sm text-muted-foreground">
                        {t('security.patrols.execution.startedAt', 'Started')}: {format(new Date(patrol.actual_start), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                  <Badge variant="default">
                    {t('security.patrols.status.active', 'In Progress')}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Shield className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">
                {t('security.patrols.dashboard.noActivePatrols', 'No active patrols at the moment')}
              </p>
              <Button 
                onClick={() => navigate('/security/patrols/execute')} 
                variant="outline" 
                className="mt-4"
              >
                {t('security.patrols.execution.start', 'Start Patrol')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card 
          className="cursor-pointer transition-colors hover:bg-muted/50"
          onClick={() => navigate('/security/patrols/routes')}
        >
          <CardHeader>
          <CardTitle className="flex items-center gap-2">
              <Route className="h-5 w-5" />
              {t('security.patrols.dashboard.manageRoutes', 'Manage Routes')}
            </CardTitle>
            <CardDescription>
              {t('security.patrols.dashboard.manageRoutesDescription', 'Configure patrol routes and checkpoints')}
            </CardDescription>
          </CardHeader>
        </Card>

        <Card 
          className="cursor-pointer transition-colors hover:bg-muted/50"
          onClick={() => navigate('/security/patrols/history')}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t('security.patrols.dashboard.patrolHistory', 'Patrol History')}
            </CardTitle>
            <CardDescription>
              {t('security.patrols.dashboard.patrolHistoryDescription', 'View completed patrols and reports')}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
