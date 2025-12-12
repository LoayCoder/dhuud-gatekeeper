import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, CartesianGrid, ReferenceLine } from "recharts";
import { TrendingUp, Filter, BarChart3, Eye, AlertTriangle } from "lucide-react";
import type { MonthlyTrendItem } from "@/hooks/use-hsse-event-dashboard";

interface Props {
  data: MonthlyTrendItem[];
  previousPeriodData?: MonthlyTrendItem[];
}

type ViewMode = 'all' | 'incidents' | 'observations';

export function EnhancedEventTrendChart({ data, previousPeriodData }: Props) {
  const { t, i18n } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [showComparison, setShowComparison] = useState(false);
  const isRTL = i18n.dir() === 'rtl';

  const chartData = data.map((item, index) => {
    const previousItem = previousPeriodData?.[index];
    return {
      ...item,
      monthLabel: new Date(item.month + '-01').toLocaleDateString(i18n.language, { 
        month: 'short', 
        year: '2-digit' 
      }),
      prev_total: previousItem?.total || null,
      prev_incidents: previousItem?.incidents || null,
      prev_observations: previousItem?.observations || null,
    };
  });

  // Calculate trend statistics
  const totalEvents = data.reduce((sum, item) => sum + item.total, 0);
  const totalIncidents = data.reduce((sum, item) => sum + item.incidents, 0);
  const totalObservations = data.reduce((sum, item) => sum + item.observations, 0);
  
  // Calculate month-over-month change
  const lastMonth = data[data.length - 1];
  const previousMonth = data[data.length - 2];
  const momChange = previousMonth && lastMonth 
    ? ((lastMonth.total - previousMonth.total) / previousMonth.total * 100).toFixed(0) 
    : null;

  if (data.length === 0) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {t('hsseDashboard.monthlyTrend')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground">
          {t('hsseDashboard.noData')}
        </CardContent>
      </Card>
    );
  }

  const getVisibleLines = () => {
    switch (viewMode) {
      case 'incidents':
        return ['incidents'];
      case 'observations':
        return ['observations'];
      default:
        return ['total', 'incidents', 'observations'];
    }
  };

  const visibleLines = getVisibleLines();

  return (
    <Card className="col-span-2">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {t('hsseDashboard.monthlyTrend')}
          </CardTitle>
          {momChange && (
            <Badge 
              variant={Number(momChange) > 0 ? "destructive" : "secondary"}
              className={Number(momChange) <= 0 ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" : ""}
            >
              {Number(momChange) > 0 ? '+' : ''}{momChange}% {t('hsseDashboard.vsLastMonth')}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ToggleGroup 
            type="single" 
            value={viewMode} 
            onValueChange={(v) => v && setViewMode(v as ViewMode)}
            className="bg-muted/50 rounded-lg p-0.5"
          >
            <ToggleGroupItem value="all" size="sm" className="text-xs px-3 data-[state=on]:bg-background">
              <BarChart3 className="h-3 w-3 me-1" />
              {t('hsseDashboard.filterAll', 'All')}
            </ToggleGroupItem>
            <ToggleGroupItem value="incidents" size="sm" className="text-xs px-3 data-[state=on]:bg-background">
              <AlertTriangle className="h-3 w-3 me-1" />
              {t('hsseDashboard.incidents')}
            </ToggleGroupItem>
            <ToggleGroupItem value="observations" size="sm" className="text-xs px-3 data-[state=on]:bg-background">
              <Eye className="h-3 w-3 me-1" />
              {t('hsseDashboard.observations')}
            </ToggleGroupItem>
          </ToggleGroup>
          
          {previousPeriodData && previousPeriodData.length > 0 && (
            <Button
              variant={showComparison ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowComparison(!showComparison)}
              className="text-xs"
            >
              <Filter className="h-3 w-3 me-1" />
              {t('hsseDashboard.comparePeriod', 'Compare')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-muted/30 rounded-lg">
          <div className="text-center">
            <p className="text-2xl font-bold">{totalEvents}</p>
            <p className="text-xs text-muted-foreground">{t('hsseDashboard.totalEvents')}</p>
          </div>
          <div className="text-center border-x border-border">
            <p className="text-2xl font-bold text-chart-2">{totalIncidents}</p>
            <p className="text-xs text-muted-foreground">{t('hsseDashboard.incidents')}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-chart-1">{totalObservations}</p>
            <p className="text-xs text-muted-foreground">{t('hsseDashboard.observations')}</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <LineChart 
            data={chartData} 
            margin={{ top: 5, right: isRTL ? 20 : 30, left: isRTL ? 30 : 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="monthLabel" 
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={50}
              reversed={isRTL}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              orientation={isRTL ? 'right' : 'left'}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: 10 }}
              iconType="circle"
            />
            
            {visibleLines.includes('total') && (
              <Line 
                type="monotone" 
                dataKey="total" 
                name={t('hsseDashboard.totalEvents')}
                stroke="hsl(var(--primary))" 
                strokeWidth={2.5}
                dot={{ r: 4, fill: 'hsl(var(--primary))' }}
                activeDot={{ r: 6 }}
              />
            )}
            
            {visibleLines.includes('incidents') && (
              <Line 
                type="monotone" 
                dataKey="incidents" 
                name={t('hsseDashboard.incidents')}
                stroke="hsl(var(--chart-2))" 
                strokeWidth={2}
                dot={{ r: 3, fill: 'hsl(var(--chart-2))' }}
              />
            )}
            
            {visibleLines.includes('observations') && (
              <Line 
                type="monotone" 
                dataKey="observations" 
                name={t('hsseDashboard.observations')}
                stroke="hsl(var(--chart-1))" 
                strokeWidth={2}
                dot={{ r: 3, fill: 'hsl(var(--chart-1))' }}
              />
            )}

            {/* Previous period comparison lines */}
            {showComparison && visibleLines.includes('total') && (
              <Line 
                type="monotone" 
                dataKey="prev_total" 
                name={t('hsseDashboard.previousPeriod', 'Previous Period')}
                stroke="hsl(var(--muted-foreground))" 
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
