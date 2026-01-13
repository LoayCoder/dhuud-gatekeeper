import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, eachDayOfInterval, parseISO, getDay, differenceInDays } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarIcon, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

interface RosterDateRangePickerProps {
  startDate: string;
  endDate: string;
  excludedDays: number[];
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onExcludedDaysChange: (days: number[]) => void;
  className?: string;
}

const WEEKDAYS = [
  { value: 0, label: 'Sunday', labelAr: 'الأحد' },
  { value: 1, label: 'Monday', labelAr: 'الاثنين' },
  { value: 2, label: 'Tuesday', labelAr: 'الثلاثاء' },
  { value: 3, label: 'Wednesday', labelAr: 'الأربعاء' },
  { value: 4, label: 'Thursday', labelAr: 'الخميس' },
  { value: 5, label: 'Friday', labelAr: 'الجمعة' },
  { value: 6, label: 'Saturday', labelAr: 'السبت' },
];

export function RosterDateRangePicker({
  startDate,
  endDate,
  excludedDays,
  onStartDateChange,
  onEndDateChange,
  onExcludedDaysChange,
  className
}: RosterDateRangePickerProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const locale = isRTL ? ar : enUS;

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (startDate && endDate) {
      return { from: parseISO(startDate), to: parseISO(endDate) };
    }
    return { from: new Date(), to: new Date() };
  });

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from) {
      onStartDateChange(format(range.from, 'yyyy-MM-dd'));
    }
    if (range?.to) {
      onEndDateChange(format(range.to, 'yyyy-MM-dd'));
    } else if (range?.from) {
      // If only start is selected, set end to same date
      onEndDateChange(format(range.from, 'yyyy-MM-dd'));
    }
  };

  const toggleExcludedDay = (day: number) => {
    if (excludedDays.includes(day)) {
      onExcludedDaysChange(excludedDays.filter(d => d !== day));
    } else {
      onExcludedDaysChange([...excludedDays, day]);
    }
  };

  // Calculate the number of valid days
  const calculateValidDays = (): number => {
    if (!startDate || !endDate) return 0;
    try {
      const dates = eachDayOfInterval({
        start: parseISO(startDate),
        end: parseISO(endDate)
      });
      return dates.filter(date => !excludedDays.includes(getDay(date))).length;
    } catch {
      return 0;
    }
  };

  const validDays = calculateValidDays();
  const totalDays = startDate && endDate ? differenceInDays(parseISO(endDate), parseISO(startDate)) + 1 : 0;
  const excludedCount = totalDays - validDays;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Date Range Selection */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1">
          <CalendarIcon className="h-4 w-4" />
          {t('security.roster.dateRange', 'Date Range')} *
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start text-start">
              <CalendarIcon className="h-4 w-4 me-2 flex-shrink-0" />
              {dateRange?.from ? (
                dateRange.to && dateRange.to.getTime() !== dateRange.from.getTime() ? (
                  <span>
                    {format(dateRange.from, 'PP', { locale })} → {format(dateRange.to, 'PP', { locale })}
                  </span>
                ) : (
                  format(dateRange.from, 'PP', { locale })
                )
              ) : (
                <span className="text-muted-foreground">{t('security.roster.selectDateRange', 'Select date range')}</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={handleDateRangeChange}
              numberOfMonths={2}
              locale={locale}
              disabled={{ before: new Date() }}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Off Days Selection */}
      <div className="space-y-2">
        <Label>{t('security.roster.offDays', 'Off Days (Exclude)')}</Label>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map(day => (
            <label
              key={day.value}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors",
                excludedDays.includes(day.value)
                  ? "bg-destructive/10 border-destructive/30 text-destructive"
                  : "hover:bg-muted"
              )}
            >
              <Checkbox
                checked={excludedDays.includes(day.value)}
                onCheckedChange={() => toggleExcludedDay(day.value)}
              />
              <span className="text-sm">{isRTL ? day.labelAr : day.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Preview */}
      {validDays > 0 && (
        <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-medium text-foreground">{validDays}</span> {t('security.roster.shiftsWillBeCreated', 'shift(s) will be created')}
            {excludedCount > 0 && (
              <span className="block text-xs">
                ({totalDays} {t('common.days', 'days')} - {excludedCount} {t('security.roster.offDays', 'off days')})
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
