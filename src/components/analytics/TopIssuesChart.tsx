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
  Cell,
} from 'recharts';

interface TopIssuesChartProps {
  data: Array<{
    id: string;
    question: string;
    question_ar?: string;
    category?: string;
    failureCount: number;
  }>;
  isArabic?: boolean;
}

export function TopIssuesChart({ data, isArabic = false }: TopIssuesChartProps) {
  const { t } = useTranslation();

  if (!data || data.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
        {t('analytics.noData', 'No data available')}
      </div>
    );
  }

  const chartData = data.map((item, index) => ({
    ...item,
    name: isArabic && item.question_ar ? item.question_ar : item.question,
    shortName: (isArabic && item.question_ar ? item.question_ar : item.question).slice(0, 40) + 
               ((isArabic && item.question_ar ? item.question_ar : item.question).length > 40 ? '...' : ''),
  }));

  // Color gradient based on position
  const getColor = (index: number) => {
    const colors = [
      'hsl(var(--destructive))',
      'hsl(0 84% 60%)',
      'hsl(25 95% 53%)',
      'hsl(38 92% 50%)',
      'hsl(45 93% 47%)',
      'hsl(var(--warning))',
      'hsl(var(--warning))',
      'hsl(var(--muted-foreground))',
      'hsl(var(--muted-foreground))',
      'hsl(var(--muted-foreground))',
    ];
    return colors[index] || colors[colors.length - 1];
  };

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            type="number"
            className="text-xs"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis 
            type="category"
            dataKey="shortName"
            width={200}
            className="text-xs"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            formatter={(value: number, name: string, props: any) => [
              value,
              t('analytics.failures', 'Failures'),
            ]}
            labelFormatter={(label: string, payload: any) => {
              if (payload && payload.length > 0) {
                return payload[0].payload.name;
              }
              return label;
            }}
          />
          <Bar 
            dataKey="failureCount" 
            name={t('analytics.failures', 'Failures')}
            radius={[0, 4, 4, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(index)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      {/* Legend/Details */}
      <div className="border rounded-lg divide-y max-h-[200px] overflow-auto">
        {chartData.map((item, index) => (
          <div 
            key={item.id}
            className="flex items-center justify-between p-3 hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <span 
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: getColor(index) }}
              />
              <div>
                <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                {item.category && (
                  <p className="text-xs text-muted-foreground">{item.category}</p>
                )}
              </div>
            </div>
            <span className="text-sm font-semibold">
              {item.failureCount} {t('analytics.failures', 'failures')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
