import { useTranslation } from 'react-i18next';
import { format, differenceInDays } from 'date-fns';
import { Calendar, Clock, AlertTriangle, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useUpcomingSchedules, useOverdueSchedulesCount } from '@/hooks/use-inspection-schedules';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import i18n from '@/i18n';

export function UpcomingSchedulesCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: upcoming = [], isLoading } = useUpcomingSchedules(14);
  const { data: overdueCount = 0 } = useOverdueSchedulesCount();
  
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'asset': return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'area': return 'bg-green-500/10 text-green-700 border-green-200';
      case 'audit': return 'bg-purple-500/10 text-purple-700 border-purple-200';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };
  
  const getDaysLabel = (daysUntil: number) => {
    if (daysUntil < 0) return t('schedules.overdue');
    if (daysUntil === 0) return t('schedules.dueToday');
    if (daysUntil === 1) return t('schedules.dueTomorrow');
    return t('schedules.dueInDays', { days: daysUntil });
  };
  
  const getDaysVariant = (daysUntil: number): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (daysUntil < 0) return 'destructive';
    if (daysUntil <= 1) return 'default';
    if (daysUntil <= 3) return 'secondary';
    return 'outline';
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t('schedules.upcomingInspections')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t('schedules.upcomingInspections')}
          </CardTitle>
          {overdueCount > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {overdueCount} {t('schedules.overdue')}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {upcoming.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>{t('schedules.noUpcoming')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.slice(0, 5).map((schedule) => (
              <div
                key={schedule.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{schedule.name}</span>
                    <Badge variant="outline" className={cn('text-[10px]', getTypeColor(schedule.schedule_type))}>
                      {t(`inspections.types.${schedule.schedule_type}`)}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {schedule.reference_id} • {schedule.next_due && format(new Date(schedule.next_due), 'MMM d, yyyy')}
                  </div>
                </div>
                <Badge variant={getDaysVariant(schedule.days_until)}>
                  {getDaysLabel(schedule.days_until)}
                </Badge>
              </div>
            ))}
            
            <Button
              variant="ghost"
              className="w-full mt-2"
              onClick={() => navigate('/inspections/schedules')}
            >
              {t('schedules.viewAll')}
              <ChevronRight className="h-4 w-4 ms-1 rtl:rotate-180" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
