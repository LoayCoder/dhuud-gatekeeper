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

  // Transform data for stacked bar chart
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
        },
      ]
    : [];

  const severityColors = {
    [t('kpiDashboard.fatality', 'Fatality')]: 'hsl(0 84% 60%)',
    [t('kpiDashboard.lostTimeInjury', 'LTI')]: 'hsl(25 95% 53%)',
    [t('kpiDashboard.restrictedWork', 'Restricted')]: 'hsl(45 93% 47%)',
    [t('kpiDashboard.medicalTreatment', 'Medical')]: 'hsl(200 95% 50%)',
    [t('kpiDashboard.firstAid', 'First Aid')]: 'hsl(142 71% 45%)',
    [t('kpiDashboard.nearMiss', 'Near Miss')]: 'hsl(210 15% 60%)',
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
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            {t('kpiDashboard.incidentsBySeverity', 'Incidents by Severity')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={severityChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              {Object.entries(severityColors).map(([key, color]) => (
                <Bar key={key} dataKey={key} stackId="a" fill={color} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Special Incident Type Counts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CircleDot className="h-5 w-5 text-primary" />
            {t('kpiDashboard.specialIncidentTypes', 'Incident Categories')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3 bg-green-500/5 border-green-500/20">
            <div className="flex items-center gap-3">
              <Leaf className="h-5 w-5 text-green-600" />
              <span className="font-medium">{t('kpiDashboard.environmentalIncidents', 'Environmental')}</span>
            </div>
            <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/30">
              {severityData?.environmental ?? 0}
            </Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3 bg-blue-500/5 border-blue-500/20">
            <div className="flex items-center gap-3">
              <Car className="h-5 w-5 text-blue-600" />
              <span className="font-medium">{t('kpiDashboard.vehicleIncidents', 'Vehicle/Equipment')}</span>
            </div>
            <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
              {severityData?.vehicle_equipment ?? 0}
            </Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3 bg-red-500/5 border-red-500/20">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-red-600" />
              <span className="font-medium">{t('kpiDashboard.securityIncidents', 'Security')}</span>
            </div>
            <Badge variant="secondary" className="bg-red-500/10 text-red-600 border-red-500/30">
              {severityData?.security ?? 0}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Frequency Trend Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            {t('kpiDashboard.frequencyTrend', 'Incident Frequency Trend')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trendData && trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[180px] items-center justify-center text-muted-foreground">
              {t('hsseDashboard.noData', 'No data available')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
