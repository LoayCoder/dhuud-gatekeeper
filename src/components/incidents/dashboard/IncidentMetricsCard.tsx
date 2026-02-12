import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { useIncidentMetricsBySeverity, useIncidentFrequencyTrend } from '@/hooks/use-incident-metrics';
import { Flame, Leaf, Car, ShieldAlert, AlertTriangle, Heart, Stethoscope, Bandage, CircleDot } from 'lucide-react';

interface IncidentMetricsCardProps {
  startDate: string;
  endDate: string;
  branchId?: string;
  siteId?: string;
}

export function IncidentMetricsCard({ startDate, endDate, branchId, siteId }: IncidentMetricsCardProps) {
  const { t } = useTranslation();
  const { data: severityData, isLoading: severityLoading } = useIncidentMetricsBySeverity(
    startDate,
    endDate,
    branchId,
    siteId
  );
  const { data: trendData, isLoading: trendLoading } = useIncidentFrequencyTrend(
    startDate,
    endDate,
    branchId,
    siteId
  );

  // Transform data for stacked bar chart — include ALL categories
  const severityChartData = severityData
    ? [
      {
        name: t('kpiDashboard.incidentsBySeverity', 'Incidents by Severity'),
        [t('kpiDashboard.fatality', 'Fatality')]: severityData.fatality,
        [t('kpiDashboard.lostTimeInjury', 'LTI')]: severityData.lost_time_injury,
        [t('kpiDashboard.restrictedWork', 'Restricted')]: severityData.restricted_work,
        [t('kpiDashboard.medicalTreatment', 'Medical')]: severityData.medical_treatment,
        [t('kpiDashboard.firstAid', 'First Aid')]: severityData.first_aid,
        [t('kpiDashboard.nearMiss', 'Near Miss')]: severityData.near_miss,
        [t('kpiDashboard.environmentalIncidents', 'Environmental')]: severityData.environmental,
        [t('kpiDashboard.vehicleIncidents', 'Vehicle/Equipment')]: severityData.vehicle_equipment,
        [t('kpiDashboard.securityIncidents', 'Security')]: severityData.security,
      },
    ]
    : [];

  const severityColors: Record<string, string> = {
    [t('kpiDashboard.fatality', 'Fatality')]: 'hsl(0, 90%, 35%)',
    [t('kpiDashboard.lostTimeInjury', 'LTI')]: 'hsl(0, 70%, 50%)',
    [t('kpiDashboard.restrictedWork', 'Restricted')]: 'hsl(30, 80%, 55%)',
    [t('kpiDashboard.medicalTreatment', 'Medical')]: 'hsl(45, 90%, 50%)',
    [t('kpiDashboard.firstAid', 'First Aid')]: 'hsl(142, 71%, 45%)',
    [t('kpiDashboard.nearMiss', 'Near Miss')]: 'hsl(210, 15%, 60%)',
    [t('kpiDashboard.environmentalIncidents', 'Environmental')]: 'hsl(142, 60%, 40%)',
    [t('kpiDashboard.vehicleIncidents', 'Vehicle/Equipment')]: 'hsl(210, 70%, 50%)',
    [t('kpiDashboard.securityIncidents', 'Security')]: 'hsl(0, 60%, 50%)',
  };

  if (severityLoading || trendLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-[300px]" />
        <Skeleton className="h-[300px]" />
        <Skeleton className="h-[150px]" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Stacked Bar Chart - Incidents by Severity */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            {t('kpiDashboard.incidentsBySeverity', 'Incidents by Severity')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={severityChartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
                itemStyle={{ fontSize: '12px', padding: '2px 0' }}
                cursor={{ fill: 'transparent' }}
              />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              {Object.entries(severityColors).map(([key, color]) => (
                <Bar key={key} dataKey={key} stackId="a" fill={color} radius={[0, 4, 4, 0]} barSize={40} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Special Incident Type Counts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <CircleDot className="h-5 w-5 text-primary" />
            {t('kpiDashboard.specialIncidentTypes', 'Incident Categories')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3 bg-emerald-500/5 border-emerald-500/20">
            <div className="flex items-center gap-3">
              <Leaf className="h-5 w-5 text-emerald-600" />
              <span className="font-medium text-sm">{t('kpiDashboard.environmentalIncidents', 'Environmental')}</span>
            </div>
            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
              {severityData?.environmental ?? 0}
            </Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3 bg-blue-500/5 border-blue-500/20">
            <div className="flex items-center gap-3">
              <Car className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-sm">{t('kpiDashboard.vehicleIncidents', 'Vehicle/Equipment')}</span>
            </div>
            <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 border-blue-500/30">
              {severityData?.vehicle_equipment ?? 0}
            </Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3 bg-red-500/5 border-red-500/20">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-red-600" />
              <span className="font-medium text-sm">{t('kpiDashboard.securityIncidents', 'Security')}</span>
            </div>
            <Badge variant="secondary" className="bg-red-500/10 text-red-700 border-red-500/30">
              {severityData?.security ?? 0}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Frequency Trend Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Flame className="h-5 w-5 text-orange-500" />
            {t('kpiDashboard.frequencyTrend', 'Incident Frequency Trend')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trendData && trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={{ fill: 'hsl(var(--background))', stroke: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[200px] items-center justify-center text-muted-foreground text-sm">
              {t('hsseDashboard.noData', 'No trending data available')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
