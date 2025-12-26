import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { DepartmentPerformance } from '@/hooks/use-sla-analytics';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface DepartmentPerformanceTableProps {
  data: DepartmentPerformance[];
}

export function DepartmentPerformanceTable({ data }: DepartmentPerformanceTableProps) {
  const { t } = useTranslation();

  const getComplianceBadge = (rate: number) => {
    if (rate >= 90) {
      return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
        <TrendingUp className="w-3 h-3 me-1" />
        {rate}%
      </Badge>;
    } else if (rate >= 70) {
      return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
        {rate}%
      </Badge>;
    } else {
      return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
        <TrendingDown className="w-3 h-3 me-1" />
        {rate}%
      </Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('sla.departmentPerformance', 'Department Performance')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('common.department', 'Department')}</TableHead>
              <TableHead className="text-center">{t('sla.totalActions', 'Total Actions')}</TableHead>
              <TableHead className="text-center">{t('sla.onTime', 'On Time')}</TableHead>
              <TableHead className="text-center">{t('sla.breached', 'Breached')}</TableHead>
              <TableHead className="text-center">{t('sla.complianceRate', 'Compliance')}</TableHead>
              <TableHead className="text-center">{t('sla.avgResolution', 'Avg Resolution')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  {t('common.noData', 'No data available')}
                </TableCell>
              </TableRow>
            ) : (
              data.map((dept) => (
                <TableRow key={dept.departmentId}>
                  <TableCell className="font-medium">{dept.departmentName}</TableCell>
                  <TableCell className="text-center">{dept.totalActions}</TableCell>
                  <TableCell className="text-center text-green-600">{dept.completedOnTime}</TableCell>
                  <TableCell className="text-center text-red-600">{dept.breached}</TableCell>
                  <TableCell className="text-center">{getComplianceBadge(dept.complianceRate)}</TableCell>
                  <TableCell className="text-center">
                    {dept.avgResolutionDays} {t('common.days', 'days')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
