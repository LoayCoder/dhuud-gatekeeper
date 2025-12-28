import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface FindingsTrendChartProps {
  data: Array<{
    date: string;
    critical?: number;
    major?: number;
    minor?: number;
    observation?: number;
    total: number;
  }>;
}

export function FindingsTrendChart({ data }: FindingsTrendChartProps) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        {t('analytics.noData', 'No data available')}
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MMM dd', { locale: isArabic ? ar : enUS });
    } catch {
      return dateStr;
    }
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="date" 
          tickFormatter={formatDate}
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <YAxis 
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
          labelFormatter={formatDate}
        />
        <Legend />
        <Bar 
          dataKey="critical" 
          name={t('classifications.critical', 'Critical')}
          stackId="a" 
          fill="hsl(var(--destructive))" 
        />
        <Bar 
          dataKey="major" 
          name={t('classifications.major', 'Major')}
          stackId="a" 
          fill="hsl(var(--warning))" 
        />
        <Bar 
          dataKey="minor" 
          name={t('classifications.minor', 'Minor')}
          stackId="a" 
          fill="hsl(var(--info))" 
        />
        <Bar 
          dataKey="observation" 
          name={t('classifications.observation', 'Observation')}
          stackId="a" 
          fill="hsl(var(--muted-foreground))" 
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
