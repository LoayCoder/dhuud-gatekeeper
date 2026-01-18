/**
 * Access Zone Time Selector
 * 
 * Component for selecting allowed days and time window.
 */
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

interface AccessZoneTimeSelectorProps {
  allowedDays: number[];
  onDaysChange: (days: number[]) => void;
  timeFrom: string;
  onTimeFromChange: (time: string) => void;
  timeUntil: string;
  onTimeUntilChange: (time: string) => void;
  className?: string;
}

const DAYS = [
  { value: 0, label: 'S', labelFull: 'Sun', labelAr: 'أ', labelFullAr: 'أحد' },
  { value: 1, label: 'M', labelFull: 'Mon', labelAr: 'ث', labelFullAr: 'اثنين' },
  { value: 2, label: 'T', labelFull: 'Tue', labelAr: 'ث', labelFullAr: 'ثلاثاء' },
  { value: 3, label: 'W', labelFull: 'Wed', labelAr: 'ر', labelFullAr: 'أربعاء' },
  { value: 4, label: 'T', labelFull: 'Thu', labelAr: 'خ', labelFullAr: 'خميس' },
  { value: 5, label: 'F', labelFull: 'Fri', labelAr: 'ج', labelFullAr: 'جمعة' },
  { value: 6, label: 'S', labelFull: 'Sat', labelAr: 'س', labelFullAr: 'سبت' },
];

const PRESETS = [
  { id: 'all', labelKey: 'allDays', days: [0, 1, 2, 3, 4, 5, 6] },
  { id: 'weekdays', labelKey: 'weekdays', days: [1, 2, 3, 4, 5] },
  { id: 'weekend', labelKey: 'weekend', days: [0, 6] },
  { id: 'sunThu', labelKey: 'sunToThu', days: [0, 1, 2, 3, 4] },
];

const TIME_PRESETS = [
  { id: 'office', labelKey: 'officeHours', from: '08:00', until: '17:00' },
  { id: 'morning', labelKey: 'morning', from: '06:00', until: '12:00' },
  { id: 'afternoon', labelKey: 'afternoon', from: '12:00', until: '18:00' },
  { id: 'allDay', labelKey: 'allDay', from: '00:00', until: '23:59' },
];

export function AccessZoneTimeSelector({
  allowedDays,
  onDaysChange,
  timeFrom,
  onTimeFromChange,
  timeUntil,
  onTimeUntilChange,
  className,
}: AccessZoneTimeSelectorProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  const toggleDay = (day: number) => {
    if (allowedDays.includes(day)) {
      onDaysChange(allowedDays.filter(d => d !== day));
    } else {
      onDaysChange([...allowedDays, day].sort());
    }
  };

  const applyDayPreset = (days: number[]) => {
    onDaysChange(days);
  };

  const applyTimePreset = (from: string, until: string) => {
    onTimeFromChange(from);
    onTimeUntilChange(until);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Days Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{t('visitors.zoneAccess.allowedDays', 'Allowed Days')}</Label>
          <div className="flex gap-1">
            {PRESETS.map(preset => (
              <Button
                key={preset.id}
                variant="ghost"
                size="sm"
                className="text-xs h-6 px-2"
                onClick={() => applyDayPreset(preset.days)}
              >
                {t(`visitors.zoneAccess.${preset.labelKey}`, preset.labelKey)}
              </Button>
            ))}
          </div>
        </div>
        
        <div className="flex gap-1 justify-center">
          {DAYS.map(day => (
            <button
              key={day.value}
              type="button"
              className={cn(
                "w-10 h-10 rounded-lg text-sm font-medium transition-colors",
                "border hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring",
                allowedDays.includes(day.value)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-input"
              )}
              onClick={() => toggleDay(day.value)}
              title={isRTL ? day.labelFullAr : day.labelFull}
            >
              {isRTL ? day.labelAr : day.label}
            </button>
          ))}
        </div>
      </div>

      {/* Time Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{t('visitors.zoneAccess.timeWindow', 'Time Window')}</Label>
          <div className="flex gap-1">
            {TIME_PRESETS.map(preset => (
              <Button
                key={preset.id}
                variant="ghost"
                size="sm"
                className="text-xs h-6 px-2"
                onClick={() => applyTimePreset(preset.from, preset.until)}
              >
                {t(`visitors.zoneAccess.${preset.labelKey}`, preset.labelKey)}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              {t('common.from', 'From')}
            </Label>
            <Input
              type="time"
              value={timeFrom}
              onChange={(e) => onTimeFromChange(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              {t('common.until', 'Until')}
            </Label>
            <Input
              type="time"
              value={timeUntil}
              onChange={(e) => onTimeUntilChange(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
