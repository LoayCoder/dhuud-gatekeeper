import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon } from 'lucide-react';
import { format, subDays, startOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';

type PresetRange = 'today' | '7days' | '30days' | 'thisWeek' | 'thisMonth' | 'custom';

interface AnalyticsDateRangeFilterProps {
  onDateRangeChange: (startDate: Date, endDate: Date) => void;
  className?: string;
}

export function AnalyticsDateRangeFilter({ onDateRangeChange, className }: AnalyticsDateRangeFilterProps) {
  const { t } = useTranslation();
  const [preset, setPreset] = useState<PresetRange>('7days');
  const [customStart, setCustomStart] = useState<Date | undefined>(undefined);
  const [customEnd, setCustomEnd] = useState<Date | undefined>(undefined);

  const handlePresetChange = (value: PresetRange) => {
    setPreset(value);
    const today = startOfDay(new Date());
    
    let start: Date;
    let end: Date = today;
    
    switch (value) {
      case 'today':
        start = today;
        break;
      case '7days':
        start = subDays(today, 6);
        break;
      case '30days':
        start = subDays(today, 29);
        break;
      case 'thisWeek':
        start = startOfWeek(today, { weekStartsOn: 0 });
        break;
      case 'thisMonth':
        start = startOfMonth(today);
        break;
      case 'custom':
        return; // Don't trigger callback for custom until dates are selected
      default:
        start = subDays(today, 6);
    }
    
    onDateRangeChange(start, end);
  };

  const handleCustomDateChange = (start?: Date, end?: Date) => {
    if (start) setCustomStart(start);
    if (end) setCustomEnd(end);
    
    const newStart = start || customStart;
    const newEnd = end || customEnd;
    
    if (newStart && newEnd) {
      onDateRangeChange(newStart, newEnd);
    }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Select value={preset} onValueChange={(v) => handlePresetChange(v as PresetRange)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder={t('security.analytics.selectRange', 'Select range')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">{t('security.analytics.today', 'Today')}</SelectItem>
          <SelectItem value="7days">{t('security.analytics.last7Days', 'Last 7 Days')}</SelectItem>
          <SelectItem value="30days">{t('security.analytics.last30Days', 'Last 30 Days')}</SelectItem>
          <SelectItem value="thisWeek">{t('security.analytics.thisWeek', 'This Week')}</SelectItem>
          <SelectItem value="thisMonth">{t('security.analytics.thisMonth', 'This Month')}</SelectItem>
          <SelectItem value="custom">{t('security.analytics.custom', 'Custom')}</SelectItem>
        </SelectContent>
      </Select>

      {preset === 'custom' && (
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {customStart ? format(customStart, 'MMM dd') : t('security.analytics.startDate', 'Start')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customStart}
                onSelect={(date) => handleCustomDateChange(date, undefined)}
                disabled={(date) => date > new Date()}
              />
            </PopoverContent>
          </Popover>
          
          <span className="text-muted-foreground">—</span>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {customEnd ? format(customEnd, 'MMM dd') : t('security.analytics.endDate', 'End')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customEnd}
                onSelect={(date) => handleCustomDateChange(undefined, date)}
                disabled={(date) => date > new Date() || (customStart ? date < customStart : false)}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}
