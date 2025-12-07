import { useTranslation } from 'react-i18next';
import { useDigestPreferences } from '@/hooks/use-digest-preferences';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail, Clock, Globe } from 'lucide-react';

export function DigestPreferences() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { preferences, isLoading, updatePreferences, timezoneOptions } = useDigestPreferences();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  const handleOptInChange = (checked: boolean) => {
    updatePreferences.mutate({ digest_opt_in: checked });
  };

  const handleTimeChange = (time: string) => {
    updatePreferences.mutate({ digest_preferred_time: time });
  };

  const handleTimezoneChange = (timezone: string) => {
    updatePreferences.mutate({ digest_timezone: timezone });
  };

  return (
    <div className="space-y-6" dir={direction}>
      <div className="text-start">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Mail className="h-5 w-5" />
          {t('digest.title', 'Daily Digest Email')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('digest.description', 'Configure your daily HSSE manager digest email preferences')}
        </p>
      </div>

      <div className="space-y-4">
        {/* Opt-in Toggle */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label className="text-base">{t('digest.optIn', 'Receive Daily Digest')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('digest.optInDescription', 'Get a daily summary of pending closures, escalated actions, and at-risk items')}
            </p>
          </div>
          <Switch
            checked={preferences?.digest_opt_in ?? true}
            onCheckedChange={handleOptInChange}
            disabled={updatePreferences.isPending}
          />
        </div>

        {/* Preferred Time */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t('digest.preferredTime', 'Preferred Delivery Time')}
          </Label>
          <Input
            type="time"
            value={preferences?.digest_preferred_time?.slice(0, 5) || '07:00'}
            onChange={(e) => handleTimeChange(e.target.value + ':00')}
            disabled={!preferences?.digest_opt_in || updatePreferences.isPending}
            className="w-full max-w-xs"
          />
          <p className="text-sm text-muted-foreground">
            {t('digest.timeNote', 'Digest will be sent at this time in your selected timezone')}
          </p>
        </div>

        {/* Timezone */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {t('digest.timezone', 'Timezone')}
          </Label>
          <Select
            value={preferences?.digest_timezone || 'Asia/Riyadh'}
            onValueChange={handleTimezoneChange}
            disabled={!preferences?.digest_opt_in || updatePreferences.isPending}
            dir={direction}
          >
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timezoneOptions.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
