import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { InspectionSchedule } from '@/hooks/use-inspection-schedules';
import i18n from '@/i18n';

interface ScheduleCalendarProps {
  schedules: InspectionSchedule[];
  onScheduleClick?: (schedule: InspectionSchedule) => void;
}

export function ScheduleCalendar({ schedules, onScheduleClick }: ScheduleCalendarProps) {
  const { t } = useTranslation();
  const direction = i18n.dir();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Get the day of week for the first day (0 = Sunday)
  const startDayOfWeek = monthStart.getDay();
  
  // Create empty cells for days before the month starts
  const leadingEmptyDays = Array(startDayOfWeek).fill(null);
  
  // Group schedules by their next_due date
  const schedulesByDate = useMemo(() => {
    const map = new Map<string, InspectionSchedule[]>();
    schedules.forEach(schedule => {
      if (schedule.next_due) {
        const dateKey = format(new Date(schedule.next_due), 'yyyy-MM-dd');
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(schedule);
      }
    });
    return map;
  }, [schedules]);
  
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'asset': return 'bg-blue-500';
      case 'area': return 'bg-green-500';
      case 'audit': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };
  
  const getTypeBadgeVariant = (type: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (type) {
      case 'asset': return 'default';
      case 'area': return 'secondary';
      case 'audit': return 'outline';
      default: return 'secondary';
    }
  };
  
  const weekDays = [
    t('schedules.days.sun'),
    t('schedules.days.mon'),
    t('schedules.days.tue'),
    t('schedules.days.wed'),
    t('schedules.days.thu'),
    t('schedules.days.fri'),
    t('schedules.days.sat'),
  ];
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {t('schedules.calendar')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(m => direction === 'rtl' ? addMonths(m, 1) : subMonths(m, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[140px] text-center font-medium">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(m => direction === 'rtl' ? subMonths(m, 1) : addMonths(m, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-4 mt-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span>{t('inspections.types.asset')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>{t('inspections.types.area')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <span>{t('inspections.types.audit')}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Leading empty cells */}
          {leadingEmptyDays.map((_, idx) => (
            <div key={`empty-${idx}`} className="h-24 bg-muted/20 rounded" />
          ))}
          
          {/* Days */}
          {daysInMonth.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const daySchedules = schedulesByDate.get(dateKey) || [];
            const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));
            
            return (
              <div
                key={dateKey}
                className={cn(
                  'h-24 p-1 border rounded relative transition-colors',
                  isToday(day) && 'border-primary bg-primary/5',
                  isPast && 'bg-muted/30',
                  !isPast && daySchedules.length > 0 && 'hover:bg-accent/50 cursor-pointer'
                )}
              >
                <span className={cn(
                  'text-xs font-medium',
                  isToday(day) && 'text-primary font-bold',
                  isPast && 'text-muted-foreground'
                )}>
                  {format(day, 'd')}
                </span>
                
                {/* Schedule indicators */}
                <div className="mt-1 space-y-0.5 overflow-hidden">
                  {daySchedules.slice(0, 3).map(schedule => (
                    <Popover key={schedule.id}>
                      <PopoverTrigger asChild>
                        <button
                          className={cn(
                            'w-full flex items-center gap-1 text-xs px-1 py-0.5 rounded truncate',
                            'hover:opacity-80 transition-opacity text-start'
                          )}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', getTypeColor(schedule.schedule_type))} />
                          <span className="truncate text-[10px]">
                            {i18n.language === 'ar' && schedule.name_ar ? schedule.name_ar : schedule.name}
                          </span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-3" side="right">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">
                              {i18n.language === 'ar' && schedule.name_ar ? schedule.name_ar : schedule.name}
                            </span>
                            <Badge variant={getTypeBadgeVariant(schedule.schedule_type)} className="text-[10px]">
                              {t(`inspections.types.${schedule.schedule_type}`)}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            <p>{schedule.reference_id}</p>
                            <p>{t('schedules.frequency.' + schedule.frequency_type)}</p>
                            {schedule.assigned_inspector && (
                              <p>{t('schedules.assignedTo')}: {schedule.assigned_inspector.full_name}</p>
                            )}
                          </div>
                          {onScheduleClick && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full mt-2"
                              onClick={() => onScheduleClick(schedule)}
                            >
                              {t('schedules.viewDetails')}
                            </Button>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  ))}
                  
                  {daySchedules.length > 3 && (
                    <span className="text-[10px] text-muted-foreground ps-1">
                      +{daySchedules.length - 3} {t('common.more')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
