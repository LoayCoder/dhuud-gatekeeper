import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, startOfWeek, addDays, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, isSameMonth, parseISO, addWeeks, addMonths, subWeeks, subMonths } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check, Clock, RefreshCw, Moon, Sun, Sunrise } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMyUpcomingShifts, useAcknowledgeShift, getAcknowledgmentStatus, type UpcomingShift } from '@/hooks/use-shift-roster';
import { ShiftScheduleCard } from './ShiftScheduleCard';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

type ViewMode = 'week' | 'month';

function getShiftIcon(startTime: string | null | undefined, size = 'h-3 w-3') {
  if (!startTime) return <Clock className={size} />;
  const hour = parseInt(startTime.split(':')[0], 10);
  if (hour >= 6 && hour < 12) return <Sunrise className={cn(size, 'text-amber-500')} />;
  if (hour >= 12 && hour < 18) return <Sun className={cn(size, 'text-yellow-500')} />;
  return <Moon className={cn(size, 'text-indigo-500')} />;
}

export function MyShiftCalendar() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const locale = isRTL ? ar : enUS;

  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expandedSections, setExpandedSections] = useState<string[]>(['upcoming']);

  const { data: shifts, isLoading } = useMyUpcomingShifts();
  const acknowledgeShift = useAcknowledgeShift();

  const today = new Date();

  // Generate calendar days
  const calendarDays = useMemo(() => {
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      return eachDayOfInterval({ start, end: addDays(start, 6) });
    } else {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
      const calendarEnd = addDays(startOfWeek(monthEnd, { weekStartsOn: 0 }), 6);
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    }
  }, [currentDate, viewMode]);

  // Map shifts by date
  const shiftsByDate = useMemo(() => {
    const map = new Map<string, UpcomingShift[]>();
    shifts?.forEach(shift => {
      const dateKey = shift.roster_date;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(shift);
    });
    return map;
  }, [shifts]);

  // Get today's and upcoming shifts for list view
  const { todayShifts, upcomingShifts } = useMemo(() => {
    const todayStr = format(today, 'yyyy-MM-dd');
    const todayList: UpcomingShift[] = [];
    const upcomingList: UpcomingShift[] = [];

    shifts?.forEach(shift => {
      if (shift.roster_date === todayStr) {
        todayList.push(shift);
      } else {
        upcomingList.push(shift);
      }
    });

    return { todayShifts: todayList, upcomingShifts: upcomingList };
  }, [shifts, today]);

  const navigate = (direction: 'prev' | 'next') => {
    if (viewMode === 'week') {
      setCurrentDate(direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    } else {
      setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    }
  };

  const goToToday = () => setCurrentDate(new Date());

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section) 
        : [...prev, section]
    );
  };

  const getStatusIndicator = (shift: UpcomingShift) => {
    const status = getAcknowledgmentStatus(shift);
    switch (status) {
      case 'acknowledged':
        return <Check className="h-2 w-2 text-green-500" />;
      case 'auto_acknowledged':
        return <RefreshCw className="h-2 w-2 text-blue-500" />;
      case 'pending':
        return <Clock className="h-2 w-2 text-amber-500" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Calendar View */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarIcon className="h-5 w-5" />
              {t('security.roster.mySchedule', 'My Shift Schedule')}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                <TabsList className="h-8">
                  <TabsTrigger value="week" className="text-xs px-2">
                    {t('common.week', 'Week')}
                  </TabsTrigger>
                  <TabsTrigger value="month" className="text-xs px-2">
                    {t('common.month', 'Month')}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('prev')}>
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {viewMode === 'week'
                  ? `${format(calendarDays[0], 'MMM d', { locale })} - ${format(calendarDays[6], 'MMM d, yyyy', { locale })}`
                  : format(currentDate, 'MMMM yyyy', { locale })
                }
              </span>
              <Button variant="outline" size="sm" onClick={goToToday} className="text-xs">
                {t('common.today', 'Today')}
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('next')}>
              <ChevronRight className="h-4 w-4 rtl:rotate-180" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Calendar Grid */}
          <div className={cn(
            "grid gap-1",
            viewMode === 'week' ? 'grid-cols-7' : 'grid-cols-7'
          )}>
            {/* Weekday Headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {t(`common.weekdays.${day.toLowerCase()}`, day)}
              </div>
            ))}

            {/* Calendar Days */}
            {calendarDays.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayShifts = shiftsByDate.get(dateKey) || [];
              const isCurrentDay = isSameDay(day, today);
              const isCurrentMonth = viewMode === 'month' ? isSameMonth(day, currentDate) : true;

              return (
                <div
                  key={dateKey}
                  className={cn(
                    "min-h-[60px] sm:min-h-[80px] border rounded-lg p-1 transition-colors",
                    isCurrentDay && "border-primary bg-primary/5",
                    !isCurrentMonth && "opacity-40",
                    dayShifts.length > 0 && "bg-muted/30"
                  )}
                >
                  <div className={cn(
                    "text-xs font-medium mb-1",
                    isCurrentDay && "text-primary"
                  )}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {dayShifts.slice(0, viewMode === 'week' ? 2 : 1).map(shift => (
                      <div 
                        key={shift.id} 
                        className="flex items-center gap-1 text-[10px] p-1 bg-background rounded truncate"
                      >
                        {getShiftIcon(shift.shift?.start_time, 'h-2 w-2')}
                        <span className="truncate hidden sm:inline">{shift.shift?.shift_name}</span>
                        {getStatusIndicator(shift)}
                      </div>
                    ))}
                    {dayShifts.length > (viewMode === 'week' ? 2 : 1) && (
                      <div className="text-[10px] text-muted-foreground text-center">
                        +{dayShifts.length - (viewMode === 'week' ? 2 : 1)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              {t('security.roster.acknowledged', 'Acknowledged')}
            </span>
            <span className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              {t('security.roster.pending', 'Pending')}
            </span>
            <span className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              {t('security.roster.autoAcknowledged', 'Auto')}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Today's Shifts */}
      {todayShifts.length > 0 && (
        <Collapsible open={expandedSections.includes('today')} onOpenChange={() => toggleSection('today')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {t('security.roster.todaysShift', "Today's Shift")}
                    <Badge variant="secondary">{todayShifts.length}</Badge>
                  </CardTitle>
                  <ChevronRight className={cn(
                    "h-4 w-4 transition-transform rtl:rotate-180",
                    expandedSections.includes('today') && "rotate-90 rtl:rotate-[270deg]"
                  )} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-3">
                {todayShifts.map(shift => (
                  <ShiftScheduleCard
                    key={shift.id}
                    shift={shift}
                    onAcknowledge={(id) => acknowledgeShift.mutate(id)}
                    isPending={acknowledgeShift.isPending}
                    isToday
                  />
                ))}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Upcoming Shifts */}
      {upcomingShifts.length > 0 && (
        <Collapsible open={expandedSections.includes('upcoming')} onOpenChange={() => toggleSection('upcoming')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {t('security.roster.upcomingShifts', 'Upcoming Shifts')}
                    <Badge variant="secondary">{upcomingShifts.length}</Badge>
                  </CardTitle>
                  <ChevronRight className={cn(
                    "h-4 w-4 transition-transform rtl:rotate-180",
                    expandedSections.includes('upcoming') && "rotate-90 rtl:rotate-[270deg]"
                  )} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-3">
                {upcomingShifts.slice(0, 7).map(shift => (
                  <div key={shift.id}>
                    <div className="text-xs text-muted-foreground mb-2">
                      {format(parseISO(shift.roster_date), 'EEEE, MMMM d', { locale })}
                    </div>
                    <ShiftScheduleCard
                      shift={shift}
                      onAcknowledge={(id) => acknowledgeShift.mutate(id)}
                      isPending={acknowledgeShift.isPending}
                    />
                  </div>
                ))}
                {upcomingShifts.length > 7 && (
                  <div className="text-center text-sm text-muted-foreground py-2">
                    +{upcomingShifts.length - 7} {t('security.roster.moreShifts', 'more shifts')}
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Empty State */}
      {!shifts?.length && (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {t('security.roster.noUpcomingShifts', 'No Upcoming Shifts')}
            </h3>
            <p className="text-muted-foreground text-center text-sm">
              {t('security.roster.noUpcomingShiftsDesc', 'You have no shifts scheduled. Contact your supervisor.')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
