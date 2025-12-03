import { useTranslation } from 'react-i18next';
import { ProfileUsageCard } from '@/components/billing/ProfileUsageCard';
import { LicensedUserQuotaCard } from '@/components/billing/LicensedUserQuotaCard';
import { useProfileUsage } from '@/hooks/use-profile-usage';
import { useLicensedUserQuota } from '@/hooks/use-licensed-user-quota';
import { useProfileBilling } from '@/hooks/use-profile-billing';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { formatSAR } from '@/lib/pricing-engine';
import { History, TrendingUp, PieChart } from 'lucide-react';
import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

const RTL_LANGUAGES = ['ar', 'ur'];

export default function UsageBilling() {
  const { t, i18n } = useTranslation();
  const { usage, isLoading: usageLoading } = useProfileUsage();
  const { quota, breakdown, isLoading: quotaLoading } = useLicensedUserQuota();
  const { billingRecords, isLoading: billingLoading } = useProfileBilling();
  const isRTL = RTL_LANGUAGES.includes(i18n.language);

  // Prepare trend data for line chart (last 6 months, sorted ascending)
  const trendData = useMemo(() => {
    if (!billingRecords?.length) return [];
    return [...billingRecords]
      .slice(0, 6)
      .reverse()
      .map((record) => ({
        month: format(new Date(record.billing_month), 'MMM'),
        total: record.total_profiles || 0,
        visitors: record.visitor_count || 0,
        members: record.member_count || 0,
        contractors: record.contractor_count || 0,
      }));
  }, [billingRecords]);

  // Prepare distribution data for pie chart
  const distributionData = useMemo(() => {
    const current = usage || billingRecords?.[0];
    if (!current) return [];
    return [
      { name: t('profileBilling.visitors'), value: current.visitor_count || 0 },
      { name: t('profileBilling.members'), value: current.member_count || 0 },
      { name: t('profileBilling.contractors'), value: current.contractor_count || 0 },
    ].filter((d) => d.value > 0);
  }, [usage, billingRecords, t]);

  const chartConfig = {
    total: { label: t('profileBilling.totalProfiles'), color: 'hsl(var(--chart-1))' },
    visitors: { label: t('profileBilling.visitors'), color: 'hsl(var(--chart-2))' },
    members: { label: t('profileBilling.members'), color: 'hsl(var(--chart-3))' },
    contractors: { label: t('profileBilling.contractors'), color: 'hsl(var(--chart-4))' },
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={isRTL ? 'text-end' : ''}>
        <h1 className="text-3xl font-bold">{t('profileBilling.title')}</h1>
        <p className="text-muted-foreground">{t('profileBilling.description')}</p>
      </div>

      {/* Current Usage Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProfileUsageCard usage={usage} isLoading={usageLoading} />
        <LicensedUserQuotaCard quota={quota} breakdown={breakdown} isLoading={quotaLoading} />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <TrendingUp className="h-5 w-5" />
              {t('profileBilling.usageTrend', 'Usage Trend')}
            </CardTitle>
            <CardDescription>
              {t('profileBilling.usageTrendDesc', 'Profile count over the last 6 months')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {billingLoading ? (
              <div className="h-[250px] flex items-center justify-center">
                <div className="animate-pulse bg-muted rounded w-full h-full" />
              </div>
            ) : trendData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--chart-1))' }}
                      name={t('profileBilling.totalProfiles')}
                    />
                    <Line
                      type="monotone"
                      dataKey="visitors"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--chart-2))' }}
                      name={t('profileBilling.visitors')}
                    />
                    <Line
                      type="monotone"
                      dataKey="members"
                      stroke="hsl(var(--chart-3))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--chart-3))' }}
                      name={t('profileBilling.members')}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                {t('common.noData')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profile Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <PieChart className="h-5 w-5" />
              {t('profileBilling.distribution', 'Profile Distribution')}
            </CardTitle>
            <CardDescription>
              {t('profileBilling.distributionDesc', 'Current breakdown by profile type')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {usageLoading || billingLoading ? (
              <div className="h-[250px] flex items-center justify-center">
                <div className="animate-pulse bg-muted rounded-full w-48 h-48" />
              </div>
            ) : distributionData.length > 0 ? (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={distributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {distributionData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [value, t('profileBilling.profiles')]}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                {t('common.noData')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <History className="h-5 w-5" />
            {t('profileBilling.billingHistory')}
          </CardTitle>
          <CardDescription>{t('profileBilling.billingHistoryDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {billingLoading ? (
            <div className="animate-pulse space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted rounded" />
              ))}
            </div>
          ) : billingRecords?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('profileBilling.month')}</TableHead>
                  <TableHead>{t('profileBilling.totalProfiles')}</TableHead>
                  <TableHead>{t('profileBilling.billableProfiles')}</TableHead>
                  <TableHead>{t('profileBilling.charges')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {format(new Date(record.billing_month), 'MMMM yyyy')}
                    </TableCell>
                    <TableCell>{record.total_profiles}</TableCell>
                    <TableCell>{record.billable_profiles}</TableCell>
                    <TableCell>{formatSAR(record.profile_charges)}</TableCell>
                    <TableCell>
                      <Badge variant={record.status === 'paid' ? 'default' : 'secondary'}>
                        {record.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              {t('profileBilling.noHistory')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
