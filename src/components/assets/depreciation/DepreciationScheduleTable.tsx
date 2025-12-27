import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { DepreciationSchedule } from '@/hooks/use-depreciation-schedules';

interface DepreciationScheduleTableProps {
  schedules: DepreciationSchedule[];
  isLoading?: boolean;
  currency?: string;
  onDelete?: (scheduleId: string) => void;
  isDeleting?: boolean;
}

const PERIOD_TYPE_LABELS: Record<string, string> = {
  monthly: 'assets.depreciation.monthly',
  quarterly: 'assets.depreciation.quarterly',
  yearly: 'assets.depreciation.yearly',
};

export function DepreciationScheduleTable({
  schedules,
  isLoading,
  currency = 'SAR',
  onDelete,
  isDeleting,
}: DepreciationScheduleTableProps) {
  const { t } = useTranslation();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-SA', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'MMM yyyy');
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{t('assets.depreciation.noSchedules', 'No depreciation schedules generated yet')}</p>
        <p className="text-sm mt-1">
          {t('assets.depreciation.generatePrompt', 'Click "Generate Schedule" to create one')}
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-start">#</TableHead>
            <TableHead className="text-start">{t('assets.depreciation.period', 'Period')}</TableHead>
            <TableHead className="text-end">{t('assets.depreciation.openingValue', 'Opening Value')}</TableHead>
            <TableHead className="text-end">{t('assets.depreciation.depreciationAmount', 'Depreciation')}</TableHead>
            <TableHead className="text-end">{t('assets.depreciation.accumulated', 'Accumulated')}</TableHead>
            <TableHead className="text-end">{t('assets.depreciation.closingValue', 'Closing Value')}</TableHead>
            {onDelete && <TableHead className="w-12"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedules.map((schedule, index) => {
            const isCurrentPeriod = new Date(schedule.period_start) <= new Date() && 
                                    new Date(schedule.period_end) >= new Date();
            const isPast = new Date(schedule.period_end) < new Date();
            
            return (
              <TableRow 
                key={schedule.id}
                className={cn(
                  isCurrentPeriod && 'bg-primary/5 border-s-2 border-s-primary',
                  isPast && 'text-muted-foreground'
                )}
              >
                <TableCell className="font-medium text-start">{index + 1}</TableCell>
                <TableCell className="text-start">
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {formatDate(schedule.period_start)} - {formatDate(schedule.period_end)}
                    </span>
                    {isCurrentPeriod && (
                      <Badge variant="outline" className="w-fit mt-1 text-xs">
                        {t('assets.depreciation.current', 'Current')}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-end font-mono">
                  {formatCurrency(schedule.opening_value)}
                </TableCell>
                <TableCell className="text-end font-mono text-destructive">
                  -{formatCurrency(schedule.depreciation_amount)}
                </TableCell>
                <TableCell className="text-end font-mono">
                  {formatCurrency(schedule.accumulated_depreciation)}
                </TableCell>
                <TableCell className="text-end font-mono font-medium">
                  {formatCurrency(schedule.closing_value)}
                </TableCell>
                {onDelete && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => onDelete(schedule.id)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
