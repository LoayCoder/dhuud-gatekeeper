import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay } from 'date-fns';
import { Route, TrendingUp } from 'lucide-react';

type TimeRange = '7d' | '14d' | '30d';

interface PatrolTrendData {
  date: string;
  completed: number;
  total: number;
  rate: number;
  avgDuration: number;
  checkpointScans: number;
}

async function fetchPatrolTrends(days: number): Promise<PatrolTrendData[]> {
  const today = startOfDay(new Date());
  const startDate = subDays(today, days - 1);

  // Fetch all patrols in range
  const { data: patrols } = await supabase
    .from('security_patrols')
    .select('id, status, actual_start, actual_end')
    .gte('actual_start', startDate.toISOString())
    .is('deleted_at', null);

  // Fetch checkpoint logs
  const { data: checkpointLogs } = await supabase
    .from('patrol_checkpoint_logs')
    .select('patrol_id, scanned_at, time_spent_seconds')
    .gte('scanned_at', startDate.toISOString())
    .is('deleted_at', null);

  // Aggregate by day
  const dayData: Record<string, PatrolTrendData> = {};
  
  for (let i = 0; i < days; i++) {
    const date = subDays(today, days - 1 - i);
    const key = format(date, 'yyyy-MM-dd');
    dayData[key] = {
      date: format(date, 'EEE'),
      completed: 0,
      total: 0,
      rate: 0,
      avgDuration: 0,
      checkpointScans: 0,
    };
  }

  // Process patrols
  const durationsByDay: Record<string, number[]> = {};
  
  (patrols || []).forEach((p) => {
    if (!p.actual_start) return;
    const day = format(new Date(p.actual_start), 'yyyy-MM-dd');
    if (!dayData[day]) return;
    
    dayData[day].total++;
    if (p.status === 'completed') {
      dayData[day].completed++;
      
      // Calculate duration
      if (p.actual_end) {
        const duration = (new Date(p.actual_end).getTime() - new Date(p.actual_start).getTime()) / 60000;
        if (!durationsByDay[day]) durationsByDay[day] = [];
        durationsByDay[day].push(duration);
      }
    }
  });

  // Process checkpoint logs
  (checkpointLogs || []).forEach((log) => {
    if (!log.scanned_at) return;
    const day = format(new Date(log.scanned_at), 'yyyy-MM-dd');
    if (dayData[day]) {
      dayData[day].checkpointScans++;
    }
  });

  // Calculate rates and averages
  Object.keys(dayData).forEach((day) => {
    const d = dayData[day];
    d.rate = d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0;
    
    const durations = durationsByDay[day] || [];
    d.avgDuration = durations.length > 0 
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) 
      : 0;
  });

  return Object.values(dayData);
}

export function PatrolTrendsWidget() {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');

  const days = timeRange === '7d' ? 7 : timeRange === '14d' ? 14 : 30;

  const { data, isLoading } = useQuery({
    queryKey: ['patrol-trends', days],
    queryFn: () => fetchPatrolTrends(days),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Route className="h-5 w-5 text-primary" />
            {t('security.dashboard.patrolTrends', 'Patrol Trends')}
          </CardTitle>
          <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <TabsList className="h-8">
              <TabsTrigger value="7d" className="text-xs px-2 h-6">7D</TabsTrigger>
              <TabsTrigger value="14d" className="text-xs px-2 h-6">14D</TabsTrigger>
              <TabsTrigger value="30d" className="text-xs px-2 h-6">30D</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data ?? []}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-xs" 
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                yAxisId="left"
                className="text-xs" 
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                label={{ 
                  value: t('security.dashboard.patrols', 'Patrols'), 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { fill: 'hsl(var(--muted-foreground))', fontSize: 11 }
                }}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                className="text-xs" 
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                label={{ 
                  value: '%', 
                  position: 'insideRight',
                  style: { fill: 'hsl(var(--muted-foreground))', fontSize: 11 }
                }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 'var(--radius)'
                }} 
                formatter={(value: number, name: string) => {
                  if (name === 'rate') return [`${value}%`, t('security.dashboard.completionRate', 'Completion Rate')];
                  if (name === 'completed') return [value, t('security.dashboard.completed', 'Completed')];
                  if (name === 'checkpointScans') return [value, t('security.dashboard.checkpointScans', 'Scans')];
                  return [value, name];
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value: string) => {
                  if (value === 'completed') return t('security.dashboard.completedPatrols', 'Completed');
                  if (value === 'rate') return t('security.dashboard.completionRate', 'Rate (%)');
                  if (value === 'checkpointScans') return t('security.dashboard.scans', 'Scans');
                  return value;
                }}
              />
              <Bar 
                yAxisId="left"
                dataKey="completed" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
                opacity={0.8}
              />
              <Bar 
                yAxisId="left"
                dataKey="checkpointScans" 
                fill="hsl(var(--secondary))" 
                radius={[4, 4, 0, 0]}
                opacity={0.6}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="rate" 
                stroke="hsl(var(--accent-foreground))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--accent-foreground))', r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
