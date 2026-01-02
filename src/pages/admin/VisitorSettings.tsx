import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Settings, Users, Bell, Clock, Shield, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { useVisitorWorkflowSettings, useUpdateVisitorWorkflowSettings } from '@/hooks/use-visitor-workflow-settings';

const settingsSchema = z.object({
  require_photo: z.boolean(),
  auto_approve_internal: z.boolean(),
  default_duration_hours: z.number().min(1).max(24),
  expiry_warning_minutes: z.number().min(15).max(120),
  notify_host_on_arrival: z.boolean(),
  notify_host_on_departure: z.boolean(),
  allow_multiple_active_visits: z.boolean(),
  require_security_approval: z.boolean(),
  max_visit_duration_hours: z.number().min(1).max(72),
  badge_valid_hours: z.number().min(1).max(24),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function VisitorSettings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: settings, isLoading } = useVisitorWorkflowSettings();
  const updateSettings = useUpdateVisitorWorkflowSettings();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      require_photo: false,
      auto_approve_internal: false,
      default_duration_hours: 4,
      expiry_warning_minutes: 60,
      notify_host_on_arrival: true,
      notify_host_on_departure: true,
      allow_multiple_active_visits: false,
      require_security_approval: true,
      max_visit_duration_hours: 24,
      badge_valid_hours: 8,
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        require_photo: settings.require_photo,
        auto_approve_internal: settings.auto_approve_internal,
        default_duration_hours: settings.default_duration_hours,
        expiry_warning_minutes: settings.expiry_warning_minutes,
        notify_host_on_arrival: settings.notify_host_on_arrival,
        notify_host_on_departure: settings.notify_host_on_departure,
        allow_multiple_active_visits: settings.allow_multiple_active_visits,
        require_security_approval: settings.require_security_approval,
        max_visit_duration_hours: settings.max_visit_duration_hours,
        badge_valid_hours: settings.badge_valid_hours,
      });
    }
  }, [settings, form]);

  const onSubmit = (values: SettingsFormValues) => {
    updateSettings.mutate(values);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            {t('admin.visitors.settings', 'Visitor Settings')}
          </h1>
          <p className="text-muted-foreground">
            {t('admin.visitors.settingsDesc', 'Configure visitor management workflow')}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Registration Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                {t('admin.visitors.registration', 'Registration')}
              </CardTitle>
              <CardDescription>
                {t('admin.visitors.registrationDesc', 'Configure visitor registration requirements')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="require_photo"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        {t('admin.visitors.requirePhoto', 'Require Photo')}
                      </FormLabel>
                      <FormDescription>
                        {t('admin.visitors.requirePhotoDesc', 'Visitors must capture photo during registration')}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="allow_multiple_active_visits"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>{t('admin.visitors.allowMultiple', 'Allow Multiple Active Visits')}</FormLabel>
                      <FormDescription>
                        {t('admin.visitors.allowMultipleDesc', 'Same visitor can have multiple active visit requests')}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Approval Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5" />
                {t('admin.visitors.approval', 'Approval')}
              </CardTitle>
              <CardDescription>
                {t('admin.visitors.approvalDesc', 'Configure security approval workflow')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="require_security_approval"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>{t('admin.visitors.requireApproval', 'Require Security Approval')}</FormLabel>
                      <FormDescription>
                        {t('admin.visitors.requireApprovalDesc', 'All visits must be approved by security before QR is issued')}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="auto_approve_internal"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>{t('admin.visitors.autoApproveInternal', 'Auto-Approve Internal Visitors')}</FormLabel>
                      <FormDescription>
                        {t('admin.visitors.autoApproveInternalDesc', 'Visitors registered by internal users are auto-approved')}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Timing Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5" />
                {t('admin.visitors.timing', 'Timing')}
              </CardTitle>
              <CardDescription>
                {t('admin.visitors.timingDesc', 'Configure visit duration and expiry settings')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="default_duration_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.visitors.defaultDuration', 'Default Visit Duration (hours)')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={24}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 4)}
                        />
                      </FormControl>
                      <FormDescription>
                        {t('admin.visitors.defaultDurationDesc', 'Default visit duration when creating new visits')}
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_visit_duration_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.visitors.maxDuration', 'Maximum Visit Duration (hours)')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={72}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 24)}
                        />
                      </FormControl>
                      <FormDescription>
                        {t('admin.visitors.maxDurationDesc', 'Maximum allowed visit duration')}
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="badge_valid_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.visitors.badgeValidHours', 'Badge Valid Hours')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={24}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 8)}
                        />
                      </FormControl>
                      <FormDescription>
                        {t('admin.visitors.badgeValidDesc', 'How long the QR badge remains valid after approval')}
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expiry_warning_minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.visitors.expiryWarning', 'Expiry Warning (minutes)')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={15}
                          max={120}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 60)}
                        />
                      </FormControl>
                      <FormDescription>
                        {t('admin.visitors.expiryWarningDesc', 'Send warning before visit expires')}
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="h-5 w-5" />
                {t('admin.visitors.notifications', 'Notifications')}
              </CardTitle>
              <CardDescription>
                {t('admin.visitors.notificationsDesc', 'Configure host notification preferences')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="notify_host_on_arrival"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>{t('admin.visitors.notifyArrival', 'Notify Host on Arrival')}</FormLabel>
                      <FormDescription>
                        {t('admin.visitors.notifyArrivalDesc', 'Send WhatsApp to host when visitor checks in at gate')}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notify_host_on_departure"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>{t('admin.visitors.notifyDeparture', 'Notify Host on Departure')}</FormLabel>
                      <FormDescription>
                        {t('admin.visitors.notifyDepartureDesc', 'Send WhatsApp to host when visitor checks out')}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Separator />

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={updateSettings.isPending}>
              {updateSettings.isPending 
                ? t('common.saving', 'Saving...') 
                : t('common.save', 'Save Changes')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
