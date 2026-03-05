import React from 'react';
import { FormField, FormItem, FormLabel, FormDescription, FormControl, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { HSSE_SEVERITY_LEVELS, calculateMinimumSeverity, isSeverityBelowMinimum, type SeverityLevelV2 } from '@/lib/hsse-severity-levels';

import { useIncidentReport } from './hooks/useIncidentReport';
export function Step3IncidentDetails({ viewProps }: { viewProps: ReturnType<typeof useIncidentReport> }) {
  const { t, direction, form, eventType } = viewProps;
  return (/* Incident: Severity & Actions */
    <Card>
      <CardHeader>
        <CardTitle>{t('severity.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ERP Activation Toggle */}
        <FormField
          control={form.control}
          name="erp_activated"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">{t('severity.erpActivated')}</FormLabel>
                <FormDescription>{t('severity.erpActivatedDescription')}</FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value || false}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Severity Selection with Validation */}
        <FormField
          control={form.control}
          name="severity"
          render={({ field }) => {
            const minSeverity = calculateMinimumSeverity(
              form.watch('injury_classification'),
              form.watch('erp_activated'),
              eventType);
            const showWarning = field.value && isSeverityBelowMinimum(field.value as SeverityLevelV2, minSeverity.minLevel);

            return (<FormItem>
              <FormLabel>{t('severity.ratingLabel')}</FormLabel>
              <FormDescription className="text-xs mb-2">
                {t('severity.ratingDescription')}
              </FormDescription>
              <Select onValueChange={field.onChange} value={field.value} dir={direction}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('common.select')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {HSSE_SEVERITY_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <div className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full ${level.bgColor}`} />
                        <div className="flex flex-col">
                          <span className="font-medium">{t(level.labelKey)}</span>
                          <span className="text-xs text-muted-foreground">{t(level.descriptionKey)}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Validation Warning */}
              {showWarning && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p>{t(`severity.${minSeverity.reason}`)}</p>
                      <p className="text-xs">{t('severity.overrideRequired')}</p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              <FormMessage />
            </FormItem>);
          }}
        />

        {/* Override Reason (shown when below minimum) */}
        {form.watch('severity') && isSeverityBelowMinimum(
          form.watch('severity') as SeverityLevelV2,
          calculateMinimumSeverity(
            form.watch('injury_classification'),
            form.watch('erp_activated'),
            eventType
          ).minLevel
        ) && (
            <FormField
              control={form.control}
              name="severity_override_reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-destructive">{t('severity.overrideReasonLabel')} *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('severity.overrideReasonPlaceholder')}
                      className="min-h-[80px] border-destructive"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-destructive text-xs">
                    {t('severity.overrideAuditWarning')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

        <FormField
          control={form.control}
          name="immediate_actions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('incidents.immediateActions')}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t('incidents.immediateActionsPlaceholder')}
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}