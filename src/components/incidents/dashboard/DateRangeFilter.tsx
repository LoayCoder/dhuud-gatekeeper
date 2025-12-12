import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface DateRangeFilterProps {
  onDateRangeChange: (startDate: Date | undefined, endDate: Date | undefined) => void;
}

type PresetRange = 'last7days' | 'last30days' | 'last90days' | 'thisMonth' | 'lastMonth' | 'custom';

export function DateRangeFilter({ onDateRangeChange }: DateRangeFilterProps) {
  const { t } = useTranslation();
  const [preset, setPreset] = useState<PresetRange>('last30days');
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();

  const handlePresetChange = (value: PresetRange) => {
    setPreset(value);
    const today = new Date();

    switch (value) {
      case 'last7days':
        onDateRangeChange(subDays(today, 7), today);
        break;
      case 'last30days':
        onDateRangeChange(subDays(today, 30), today);
        break;
      case 'last90days':
        onDateRangeChange(subDays(today, 90), today);
        break;
      case 'thisMonth':
        onDateRangeChange(startOfMonth(today), endOfMonth(today));
        break;
      case 'lastMonth':
        const lastMonth = subMonths(today, 1);
        onDateRangeChange(startOfMonth(lastMonth), endOfMonth(lastMonth));
        break;
      case 'custom':
        // Don't change dates, wait for user to pick
        break;
    }
  };

  const handleCustomDateChange = (start: Date | undefined, end: Date | undefined) => {
    setCustomStartDate(start);
    setCustomEndDate(end);
    if (start && end) {
      onDateRangeChange(start, end);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={preset} onValueChange={(v) => handlePresetChange(v as PresetRange)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder={t('hsseDashboard.dateRange')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="last7days">{t('hsseDashboard.dateRanges.last7Days', 'Last 7 Days')}</SelectItem>
          <SelectItem value="last30days">{t('hsseDashboard.dateRanges.last30Days', 'Last 30 Days')}</SelectItem>
          <SelectItem value="last90days">{t('hsseDashboard.dateRanges.last90Days', 'Last 90 Days')}</SelectItem>
          <SelectItem value="thisMonth">{t('hsseDashboard.dateRanges.thisMonth', 'This Month')}</SelectItem>
          <SelectItem value="lastMonth">{t('hsseDashboard.dateRanges.lastMonth', 'Last Month')}</SelectItem>
          <SelectItem value="custom">{t('hsseDashboard.dateRanges.custom', 'Custom')}</SelectItem>
        </SelectContent>
      </Select>

      {preset === 'custom' && (
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-[130px] justify-start text-start font-normal",
                  !customStartDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="me-2 h-4 w-4" />
                {customStartDate ? format(customStartDate, "PP") : t('hsseDashboard.startDate', 'Start')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customStartDate}
                onSelect={(date) => handleCustomDateChange(date, customEndDate)}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground">–</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-[130px] justify-start text-start font-normal",
                  !customEndDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="me-2 h-4 w-4" />
                {customEndDate ? format(customEndDate, "PP") : t('hsseDashboard.endDate', 'End')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customEndDate}
                onSelect={(date) => handleCustomDateChange(customStartDate, date)}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}
