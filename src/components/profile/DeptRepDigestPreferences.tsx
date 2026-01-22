import { useTranslation } from 'react-i18next';
import { useDeptRepDigestPreferences } from '@/hooks/use-dept-rep-digest-preferences';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail, Clock, Globe, Calendar } from 'lucide-react';

export function DeptRepDigestPreferences() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const { 
    preferences, 
    isLoading, 
    updatePreferences, 
    timezoneOptions, 
    frequencyOptions 
  } = useDeptRepDigestPreferences();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const handleOptInChange = (checked: boolean) => {
    updatePreferences.mutate({ dept_digest_opt_in: checked });
  };

  const handleFrequencyChange = (frequency: 'daily' | 'weekly') => {
    updatePreferences.mutate({ dept_digest_frequency: frequency });
  };

  const handleTimeChange = (time: string) => {
    updatePreferences.mutate({ digest_preferred_time: time });
  };

  const handleTimezoneChange = (timezone: string) => {
    updatePreferences.mutate({ digest_timezone: timezone });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          {isArabic ? 'البريد الملخص لتصاريح الدخول' : 'Gate Pass Digest Email'}
        </CardTitle>
        <CardDescription>
          {isArabic 
            ? 'استلم ملخصات يومية أو أسبوعية لأنشطة تصاريح الدخول في قسمك'
            : 'Receive daily or weekly summaries of gate pass activities in your department'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Opt-in Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="dept-digest-opt-in" className="text-base">
              {isArabic ? 'استلام ملخص تصاريح الدخول' : 'Receive Gate Pass Digest'}
            </Label>
            <p className="text-sm text-muted-foreground">
              {isArabic 
                ? 'احصل على ملخصات للطلبات الجديدة والموافقات المعلقة واتجاهات النشاط'
                : 'Get summaries of new submissions, pending approvals, and activity trends'}
            </p>
          </div>
          <Switch
            id="dept-digest-opt-in"
            checked={preferences?.dept_digest_opt_in ?? false}
            onCheckedChange={handleOptInChange}
            disabled={updatePreferences.isPending}
          />
        </div>

        {/* Frequency Selection */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {isArabic ? 'تكرار الملخص' : 'Digest Frequency'}
          </Label>
          <Select
            value={preferences?.dept_digest_frequency ?? 'daily'}
            onValueChange={(value) => handleFrequencyChange(value as 'daily' | 'weekly')}
            disabled={!preferences?.dept_digest_opt_in || updatePreferences.isPending}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {frequencyOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {isArabic ? option.labelAr : option.labelEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {isArabic 
              ? 'كم مرة ترغب في استلام الملخص؟'
              : 'How often would you like to receive the digest?'}
          </p>
        </div>

        {/* Preferred Time */}
        <div className="space-y-2">
          <Label htmlFor="dept-digest-time" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {isArabic ? 'الوقت المفضل' : 'Preferred Time'}
          </Label>
          <Input
            id="dept-digest-time"
            type="time"
            value={preferences?.digest_preferred_time ?? '08:00'}
            onChange={(e) => handleTimeChange(e.target.value)}
            disabled={!preferences?.dept_digest_opt_in || updatePreferences.isPending}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            {isArabic 
              ? 'متى تريد استلام الملخص؟'
              : 'When would you like to receive the digest?'}
          </p>
        </div>

        {/* Timezone Selection */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {isArabic ? 'المنطقة الزمنية' : 'Timezone'}
          </Label>
          <Select
            value={preferences?.digest_timezone ?? 'Asia/Riyadh'}
            onValueChange={handleTimezoneChange}
            disabled={!preferences?.dept_digest_opt_in || updatePreferences.isPending}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timezoneOptions.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
