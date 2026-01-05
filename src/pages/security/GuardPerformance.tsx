import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Target, 
  Award, 
  TrendingUp, 
  Calendar,
  BarChart3,
  MapPin,
  AlertTriangle,
  CheckCircle,
  GraduationCap,
  Building2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GuardPerformanceCard } from '@/components/security/GuardPerformanceCard';
import { GuardTrainingList } from '@/components/security/GuardTrainingList';
import { TrainingExpiryAlerts } from '@/components/security/TrainingExpiryAlerts';
import { GuardSiteAssignments } from '@/components/security/GuardSiteAssignments';
import { useSecurityTeamStats, useGuardPerformanceSummary } from '@/hooks/use-guard-performance';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function GuardPerformance() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('month');
  const { data: teamStats, isLoading: loadingStats } = useSecurityTeamStats();
  const { data: summaries, isLoading: loadingSummaries } = useGuardPerformanceSummary(period);

  const avgScore = summaries?.length
    ? Math.round(summaries.reduce((sum, s) => sum + s.overall_score, 0) / summaries.length)
    : 0;

  const topPerformer = summaries?.[0];
  const needsAttention = summaries?.filter(s => s.overall_score < 70).length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t('security.guardPerformance', 'Guard Performance')}
          </h1>
          <p className="text-muted-foreground">
            {t('security.performanceDescription', 'Track and analyze security team performance metrics')}
          </p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
          <SelectTrigger className="w-40">
            <Calendar className="h-4 w-4 me-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">{t('security.thisWeek', 'This Week')}</SelectItem>
            <SelectItem value="month">{t('security.thisMonth', 'This Month')}</SelectItem>
            <SelectItem value="all">{t('security.allTime', 'All Time')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('security.teamAverage', 'Team Average')}
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingSummaries ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className={cn(
                  'text-2xl font-bold',
                  avgScore >= 80 ? 'text-green-500' : avgScore >= 60 ? 'text-amber-500' : 'text-destructive'
                )}>
                  {avgScore}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('security.overallScore', 'Overall performance score')}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('security.topPerformer', 'Top Performer')}
            </CardTitle>
            <Award className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {loadingSummaries ? (
              <Skeleton className="h-8 w-32" />
            ) : topPerformer ? (
              <>
                <div className="text-2xl font-bold truncate">{topPerformer.guard_name}</div>
                <p className="text-xs text-muted-foreground">
                  {topPerformer.overall_score}% {t('security.score', 'score')}
                </p>
              </>
            ) : (
              <div className="text-muted-foreground">-</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('security.patrolsToday', 'Patrols Today')}
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{teamStats?.today.patrols || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {teamStats?.week.patrols || 0} {t('security.thisWeekTotal', 'this week')}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('security.needsAttention', 'Needs Attention')}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {loadingSummaries ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <>
                <div className={cn(
                  'text-2xl font-bold',
                  needsAttention > 0 ? 'text-destructive' : 'text-green-500'
                )}>
                  {needsAttention}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('security.guardsBelow70', 'Guards scoring below 70%')}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team Activity Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <MapPin className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('security.checkpointsVerified', 'Checkpoints Verified')}</p>
                <p className="text-2xl font-bold">{teamStats?.today.checkpoints || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('security.incidentsReported', 'Incidents Reported')}</p>
                <p className="text-2xl font-bold">{teamStats?.today.incidents || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <MapPin className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('security.geofenceViolations', 'Geofence Violations')}</p>
                <p className="text-2xl font-bold">{teamStats?.today.violations || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('security.weeklyPatrols', 'Weekly Patrols')}</p>
                <p className="text-2xl font-bold">{teamStats?.week.patrols || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Training Expiry Alerts */}
      <TrainingExpiryAlerts />

      {/* Performance Tabs */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            {t('security.performance', 'Performance')}
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="gap-2">
            <Award className="h-4 w-4" />
            {t('security.leaderboard', 'Leaderboard')}
          </TabsTrigger>
          <TabsTrigger value="training" className="gap-2">
            <GraduationCap className="h-4 w-4" />
            {t('security.training', 'Training')}
          </TabsTrigger>
          <TabsTrigger value="sites" className="gap-2">
            <Building2 className="h-4 w-4" />
            {t('security.siteAssignments', 'Sites')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance">
          <GuardPerformanceCard period={period} />
        </TabsContent>

        <TabsContent value="leaderboard">
          <GuardPerformanceCard showLeaderboard />
        </TabsContent>

        <TabsContent value="training">
          <GuardTrainingList />
        </TabsContent>

        <TabsContent value="sites">
          <GuardSiteAssignments />
        </TabsContent>
      </Tabs>
    </div>
  );
}
