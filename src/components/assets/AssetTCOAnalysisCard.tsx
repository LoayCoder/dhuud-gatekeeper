import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { TrendingUp, DollarSign, Calendar, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAssetTCOSummary } from '@/hooks/use-asset-cost-transactions';
import { cn } from '@/lib/utils';

interface AssetTCOAnalysisCardProps {
  assetId: string;
  currency?: string;
}

const COST_COLORS = {
  acquisition: 'hsl(var(--primary))',
  maintenance: 'hsl(142, 76%, 36%)', // green
  repair: 'hsl(25, 95%, 53%)', // orange
  energy: 'hsl(48, 96%, 53%)', // yellow
  insurance: 'hsl(189, 94%, 43%)', // cyan
  upgrade: 'hsl(271, 91%, 65%)', // purple
  other: 'hsl(var(--muted-foreground))',
};

export function AssetTCOAnalysisCard({ assetId, currency = 'SAR' }: AssetTCOAnalysisCardProps) {
  const { t } = useTranslation();
  const { data, isLoading } = useAssetTCOSummary(assetId);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-SA', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t('common.loading', 'Loading...')}
        </CardContent>
      </Card>
    );
  }

  const tco = data?.[0];
  if (!tco) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t('assets.tco.noData', 'No TCO data available')}
        </CardContent>
      </Card>
    );
  }

  // Prepare pie chart data
  const chartData = [
    { name: t('assets.tco.acquisition', 'Acquisition'), value: Number(tco.acquisition_cost) || 0, color: COST_COLORS.acquisition },
    { name: t('assets.tco.maintenance', 'Maintenance'), value: Number(tco.maintenance_cost) || 0, color: COST_COLORS.maintenance },
    { name: t('assets.tco.repair', 'Repair'), value: Number(tco.repair_cost) || 0, color: COST_COLORS.repair },
    { name: t('assets.tco.energy', 'Energy'), value: Number(tco.energy_cost) || 0, color: COST_COLORS.energy },
    { name: t('assets.tco.insurance', 'Insurance'), value: Number(tco.insurance_cost) || 0, color: COST_COLORS.insurance },
    { name: t('assets.tco.upgrade', 'Upgrades'), value: Number(tco.upgrade_cost) || 0, color: COST_COLORS.upgrade },
    { name: t('assets.tco.other', 'Other'), value: Number(tco.other_cost) || 0, color: COST_COLORS.other },
  ].filter(d => d.value > 0);

  const totalCost = Number(tco.total_cost_of_ownership) || 0;
  const monthsInService = Number(tco.months_in_service) || 1;
  const costPerMonth = Number(tco.cost_per_month) || 0;
  const acquisitionCost = Number(tco.acquisition_cost) || 0;
  const operationalCosts = totalCost - acquisitionCost;
  const operationalRatio = totalCost > 0 ? (operationalCosts / totalCost) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5 text-primary" />
          {t('assets.tco.title', 'Total Cost of Ownership Analysis')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="text-center p-4 rounded-lg bg-primary/10">
            <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              {t('assets.tco.totalCost', 'Total Cost')}
            </div>
            <p className="text-2xl font-bold mt-1 text-primary">{formatCurrency(totalCost)}</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {t('assets.tco.monthsInService', 'Months in Service')}
            </div>
            <p className="text-2xl font-bold mt-1">{monthsInService}</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              {t('assets.tco.costPerMonth', 'Cost/Month')}
            </div>
            <p className="text-2xl font-bold mt-1">{formatCurrency(costPerMonth)}</p>
          </div>
        </div>

        {/* Cost Breakdown Chart */}
        {chartData.length > 0 && (
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Operational vs Acquisition */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{t('assets.tco.operationalRatio', 'Operational Costs Ratio')}</span>
            <span className="font-medium">{operationalRatio.toFixed(1)}%</span>
          </div>
          <Progress value={operationalRatio} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t('assets.tco.acquisition', 'Acquisition')}: {formatCurrency(acquisitionCost)}</span>
            <span>{t('assets.tco.operational', 'Operational')}: {formatCurrency(operationalCosts)}</span>
          </div>
        </div>

        {/* Cost Breakdown List */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">{t('assets.tco.breakdown', 'Cost Breakdown')}</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {chartData.map((item) => (
              <div 
                key={item.name}
                className="flex items-center justify-between p-2 rounded border"
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm">{item.name}</span>
                </div>
                <span className="font-medium text-sm">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
