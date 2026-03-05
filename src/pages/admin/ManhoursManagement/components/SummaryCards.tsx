import { useTranslation } from 'react-i18next';
import { Users, Briefcase, Clock, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function SummaryCards({ state }: { state: { t: (k: string, f: string) => string; summary: { total_employee_hours?: number; total_contractor_hours?: number; total_hours?: number; record_count?: number } | null | undefined; formatNumber: (v: number) => string } }) {
  const { t, summary, formatNumber } = state;
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t('admin.manhours.employeeHours', 'Employee Hours')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">
            {formatNumber(summary?.total_employee_hours || 0)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            {t('admin.manhours.contractorHours', 'Contractor Hours')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-500">
            {formatNumber(summary?.total_contractor_hours || 0)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t('admin.manhours.totalHours', 'Total Hours')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatNumber(summary?.total_hours || 0)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t('admin.manhours.records', 'Records')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-muted-foreground">
            {summary?.record_count || 0}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
