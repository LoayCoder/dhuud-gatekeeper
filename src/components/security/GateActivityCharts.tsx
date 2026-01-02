import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import type { GateGuardStats } from '@/hooks/use-gate-guard-stats';

interface GateActivityChartsProps {
  hourlyTrend: GateGuardStats['hourlyTrend'];
  entryTypeBreakdown: GateGuardStats['entryTypeBreakdown'];
}

export function GateActivityCharts({ hourlyTrend, entryTypeBreakdown }: GateActivityChartsProps) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
      {/* Hourly Trend Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm sm:text-base">
            {t('security.gateDashboard.hourlyTrend', 'Hourly Entry/Exit Trend')}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          <div className="h-[160px] sm:h-[180px] md:h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="hour" 
                  tick={{ fontSize: 9 }} 
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fontSize: 9 }} 
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={30}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                  labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                />
                <Bar 
                  dataKey="entries" 
                  name={t('security.gateDashboard.entries', 'Entries')}
                  fill="hsl(var(--chart-1))" 
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="exits" 
                  name={t('security.gateDashboard.exits', 'Exits')}
                  fill="hsl(var(--chart-2))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Entry Type Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm sm:text-base">
            {t('security.gateDashboard.entryTypeBreakdown', 'Entry Type Breakdown')}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          <div className="h-[160px] sm:h-[180px] md:h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={entryTypeBreakdown}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="45%"
                  outerRadius={50}
                  innerRadius={30}
                  paddingAngle={2}
                  label={({ type, count }) => count > 0 ? `${count}` : ''}
                  labelLine={false}
                >
                  {entryTypeBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={30}
                  wrapperStyle={{ fontSize: '10px' }}
                  formatter={(value) => <span className="text-[10px] sm:text-xs">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
